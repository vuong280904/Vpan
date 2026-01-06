import { MessageModal } from '@/components/(admin)/modals/MessageModal';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'; // ← Đảm bảo có dòng này
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { getPronunciationUrl, searchJapaneseWord } from '../../utils/jishoApi'; // ← Đảm bảo đường dẫn đúng đến file jishoApi.js của bạn
import { styles } from './flashcards.styles';

const API_URL = Platform.OS === "web"
  ? "https://vpan-api.onrender.com/api"
  : "http://172.20.10.3:5000/api";

// Dùng AsyncStorage thống nhất cho mọi nền tảng (vì login đang lưu bằng AsyncStorage)
const getItemAsync = AsyncStorage.getItem;

const getAuthToken = async () => {
  try {
    const token = await getItemAsync('token');
    return token;
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
};

const getFileExtension = (uri: string) => {
  if (!uri) return '';
  const parts = uri.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
};

const FlashcardItem = ({ item, onEdit, onDelete }: { item: any, onEdit: () => void, onDelete: () => void }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;

  const flipCard = () => {
    const toValue = isFlipped ? 0 : 180;
    Animated.spring(flipAnimation, {
      toValue,
      friction: 8,
      tension: 10,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    setIsFlipped(!isFlipped);
  };
  const playPronunciation = async () => {
    try {
      const soundUrl = getPronunciationUrl(item.vocabulary);
      if (!soundUrl) {
        Alert.alert('Thông báo', 'Không có âm thanh cho từ này');
        return;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: soundUrl },
        { shouldPlay: true }
      );

      await sound.playAsync();

      // Tự động unload sau khi phát xong
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Lỗi phát âm:', error);
      Alert.alert('Lỗi', 'Không thể phát âm thanh');
    }
  };
  const frontAnimatedStyle = {
    transform: [
      {
        rotateY: flipAnimation.interpolate({
          inputRange: [0, 180],
          outputRange: ['0deg', '180deg'],
        }),
      },
    ],
  };

  const backAnimatedStyle = {
    transform: [
      {
        rotateY: flipAnimation.interpolate({
          inputRange: [0, 180],
          outputRange: ['180deg', '360deg'],
        }),
      },
    ],
  };


  return (
    <TouchableOpacity onPress={flipCard} activeOpacity={0.8}>
      <View style={styles.flashcardItem}>
        <Animated.View
          style={[styles.flashcardInner, styles.flashcardFront, frontAnimatedStyle]}
        >
          {item.image && (
            <View style={styles.imageContainer}>
              <Image
                source={{
                  uri: item.image.startsWith('http')
                    ? item.image
                    : `${API_URL.replace('/api', '')}${item.image}`,
                }}
                style={styles.flashcardImage}
              />
            </View>
          )}
          <View style={styles.flashcardContent}>
            <Text style={styles.vocabulary}>{item.vocabulary}</Text>
            {item.phonetic && (
              <Text style={styles.phonetic}>/{item.phonetic}/</Text>
            )}
          </View>
        </Animated.View>

        <Animated.View
          style={[styles.flashcardInner, styles.flashcardBack, backAnimatedStyle]}
        >
          <View style={styles.flashcardContent}>
            <Text style={styles.meaning}>{item.meaning}</Text>
          </View>

          {/* NÚT HÀNH ĐỘNG: Phát âm + Edit + Delete */}
          <View style={styles.cardActions}>
            {/* Nút phát âm */}
            <TouchableOpacity onPress={playPronunciation} style={[styles.cardButton, styles.playButton]}>
              <Ionicons name="volume-high" size={20} color="#fff" />
              <Text style={styles.cardButtonText}>Phát âm</Text>
            </TouchableOpacity>

            {/* Nút Edit */}
            <TouchableOpacity onPress={onEdit} style={[styles.cardButton, styles.editButton]}>
              <Ionicons name="pencil" size={20} color="#fff" />
              <Text style={styles.cardButtonText}>Edit</Text>
            </TouchableOpacity>

            {/* Nút Delete */}
            <TouchableOpacity onPress={onDelete} style={[styles.cardButton, styles.deleteButton]}>
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.cardButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

export default function FlashcardDetailScreen() {
  const params = useLocalSearchParams();
  const rawSetId = params.setId || params.id; // params.setId có thể là string | string[]

  // XỬ LÝ TRƯỜNG HỢP ARRAY (khi dùng [setId].tsx)
  const setId = Array.isArray(rawSetId) ? rawSetId[0] : rawSetId;
  const router = useRouter();
  const { user } = useAuth();

  const [setData, setSetData] = useState<any>(null);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [filteredFlashcards, setFilteredFlashcards] = useState<any[]>([]); // ← THÊM STATE MỚI
  const [searchQuery, setSearchQuery] = useState(''); // ← THÊM STATE TÌM KIẾM
  const [loading, setLoading] = useState(true);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingFlashcard, setEditingFlashcard] = useState<any>(null);

  const [selectedMode, setSelectedMode] = useState<'speed' | 'timed'>('speed');
  const [customQuestionCount, setCustomQuestionCount] = useState<string>(''); // chuỗi để dễ xử lý input
  const [questionCountError, setQuestionCountError] = useState<string>(''); // để hiển thị lỗi

  const [vocabulary, setVocabulary] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [meaning, setMeaning] = useState('');
  const [imageUri, setImageUri] = useState('');

  // Thêm các state này vào phần khai báo state
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isSharing, setIsSharing] = useState(false); // loading khi đang cập nhật

  const [messageModalVisible, setMessageModalVisible] = useState(false);

  // Thêm vào phần state
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importModalConfig, setImportModalConfig] = useState<{
    title: string;
    message: string;
    onConfirm?: () => void;
  } | null>(null);

  const [deleteFlashcardModalVisible, setDeleteFlashcardModalVisible] = useState(false);
  const [flashcardToDelete, setFlashcardToDelete] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<{
    display: string;
    kanji: string;
    hiragana: string;
    vietMeaning: string;
  }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Modal luyện thi
  const [practiceModalVisible, setPracticeModalVisible] = useState(false);

  const isOwner = user && setData && (
    setData.owner === user.id ||
    (typeof setData.owner === 'object' && (setData.owner._id === user.id || setData.owner.id === user.id))
  );
  const showImportModal = (config: {
    title: string;
    message: string;
    onConfirm?: () => void;
  }) => {
    setImportModalConfig(config);
    setImportModalVisible(true);
  };
  const handleDeleteFlashcard = (flashcardId: string) => {
    setFlashcardToDelete(flashcardId);
    setDeleteFlashcardModalVisible(true);
  };

  const confirmDeleteFlashcard = async () => {
    if (!flashcardToDelete) return;

    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'Authentication failed. Please login again.');
        setDeleteFlashcardModalVisible(false);
        return;
      }

      const response = await fetch(`${API_URL}/flashcards/${flashcardToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const responseData = await response.json();

      if (response.ok) {
        setFlashcards(prev => prev.filter(card => card._id !== flashcardToDelete));
        Alert.alert('Success', 'Flashcard deleted successfully!');
      } else {
        Alert.alert('Error', responseData.message || `Failed to delete flashcard (${response.status})`);
      }
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      Alert.alert('Error', 'An error occurred while deleting the flashcard.');
    } finally {
      setDeleteFlashcardModalVisible(false);
      setFlashcardToDelete(null);
    }
  };

  const cancelDeleteFlashcard = () => {
    setDeleteFlashcardModalVisible(false);
    setFlashcardToDelete(null);
  };

  const handleUpdateFlashcard = async () => {
    if (!vocabulary.trim() || !meaning.trim()) {
      Alert.alert('Error', 'Vocabulary and meaning are required.');
      return;
    }

    try {
      const token = await getAuthToken();
      if (!token) return Alert.alert('Error', 'Authentication failed.');

      const formData = new FormData();
      formData.append('vocabulary', vocabulary);
      formData.append('phonetic', phonetic);
      formData.append('meaning', meaning);

      if (imageUri && !imageUri.includes('localhost')) {
        const filename = imageUri.split('/').pop() || 'image.jpg';
        formData.append('image', { uri: imageUri, type: 'image/jpeg', name: filename } as any);
      }
      if (imageUri) {
        if (Platform.OS === 'web') {
          const file = await uriToFile(imageUri);
          formData.append('image', file);
        } else {
          const filename = imageUri.split('/').pop() || 'image.jpg';
          formData.append('image', {
            uri: imageUri,
            type: 'image/jpeg',
            name: filename,
          } as any);
        }
      }

      const response = await fetch(`${API_URL}/flashcards/${editingFlashcard._id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.message || 'Failed to update flashcard');
        return;
      }

      setFlashcards(prev => prev.map(card => card._id === editingFlashcard._id ? data : card));
      resetForm();
      setIsModalVisible(false);
      setModalMode('create');
      setEditingFlashcard(null);
      Alert.alert('Success', 'Flashcard updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'An error occurred while updating the flashcard.');
    }
  };
  const disableLinkSharing = async () => {
    if (isSharing) return;

    try {
      setIsSharing(true);
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Lỗi', 'Bạn cần đăng nhập');
        return;
      }

      const actualSetId = Array.isArray(setId) ? setId[0] : setId;

      const response = await fetch(`${API_URL}/flashcard-sets/${actualSetId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicFor: null, // ← quan trọng: đặt về null để hủy chia sẻ
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        Alert.alert('Lỗi', error.message || 'Không thể hủy chia sẻ');
        return;
      }

      // Cập nhật local state
      setSetData((prev: any) => ({ ...prev, publicFor: null }));
      setShareLink(''); // xóa link cũ

      Alert.alert('Thành công', 'Đã hủy chia sẻ link. Bộ thẻ giờ chỉ bạn mới xem được.');
      setShareModalVisible(false);

    } catch (error) {
      console.error('Lỗi hủy chia sẻ:', error);
      Alert.alert('Lỗi', 'Không thể kết nối đến server');
    } finally {
      setIsSharing(false);
    }
  };
  const enableLinkSharing = async () => {
    if (isSharing) return;

    try {
      setIsSharing(true);
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Lỗi', 'Bạn cần đăng nhập để chia sẻ');
        return;
      }

      const actualSetId = Array.isArray(setId) ? setId[0] : setId;

      const response = await fetch(`${API_URL}/flashcard-sets/${actualSetId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicFor: 'shared', // ← quan trọng
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        Alert.alert('Lỗi', error.message || 'Không thể bật chia sẻ link');
        return;
      }

      // Cập nhật local data
      setSetData((prev: any) => ({ ...prev, publicFor: 'shared' }));

      // Tạo link chia sẻ
      const origin = Platform.OS === 'web' ? window.location.origin : 'https://yourdomain.com'; // thay domain thật khi deploy
      const link = `${origin}/flashcards/${actualSetId}?setId=${actualSetId}`;
      setShareLink(link);

    } catch (error) {
      console.error('Lỗi bật chia sẻ:', error);
      Alert.alert('Lỗi', 'Không thể kết nối đến server');
    } finally {
      setIsSharing(false);
    }
  };

  // Hàm xử lý import Excel
  const handleImportCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv'],
        copyToCacheDirectory: false,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const fileUri = result.assets[0].uri;

      const response = await fetch(fileUri);
      const csvText = await response.text();

      // Parse CSV thủ công (rất đơn giản vì chỉ 3 cột)
      const lines = csvText.split('\n').filter(line => line.trim());

      // Bỏ header
      const data = lines.slice(1).map(line => {
        const [vocabulary, phonetic, meaning] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        return { vocabulary, phonetic: phonetic || '', meaning };
      }).filter(item => item.vocabulary && item.meaning);

      if (data.length === 0) {
        showImportModal({ title: 'Thông báo', message: 'Không có dữ liệu hợp lệ' });
        return;
      }

      showImportModal({
        title: 'Xác nhận import',
        message: `Tìm thấy ${data.length} từ. Thêm vào bộ thẻ?`,
        onConfirm: () => uploadExcelData(data),
      });

    } catch (error) {
      console.error(error);
      showImportModal({ title: 'Lỗi', message: 'Không thể đọc file CSV' });
    }
  };

  const uploadExcelData = async (rows: any[]) => {
    const token = await getAuthToken();
    if (!token) {
      showImportModal({
        title: 'Lỗi',
        message: 'Bạn cần đăng nhập lại',
      });
      return;
    }

    const actualSetId = Array.isArray(setId) ? setId[0] : setId;

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/flashcard-sets/${actualSetId}/import-excel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flashcards: rows }),
      });

      const result = await response.json();

      if (response.ok) {
        showImportModal({
          title: 'Thành công',
          message: `Đã thêm ${result.addedCount || rows.length} thẻ mới!`,
        });
        fetchFlashcardSetData();
      } else {
        showImportModal({
          title: 'Lỗi',
          message: result.message || 'Không thể import dữ liệu',
        });
      }
    } catch (error) {
      console.error('Lỗi upload:', error);
      showImportModal({
        title: 'Lỗi',
        message: 'Không thể kết nối đến server',
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!setId || setId === 'undefined' || setId === '') {
      Alert.alert('Lỗi', 'Link không hợp lệ hoặc bộ thẻ không tồn tại.');
      router.back();
    }
  }, [setId]);
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFlashcards(flashcards);
      return;
    }

    const timer = setTimeout(() => {
      const lowerQuery = searchQuery.toLowerCase().trim();

      const filtered = flashcards.filter(card => {
        const vocab = (card.vocabulary || '').toLowerCase();
        const phonetic = (card.phonetic || '').toLowerCase();
        const meaning = (card.meaning || '').toLowerCase();

        return vocab.includes(lowerQuery) ||
          phonetic.includes(lowerQuery) ||
          meaning.includes(lowerQuery);
      });

      setFilteredFlashcards(filtered);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, flashcards]);
  useEffect(() => {
    if (!vocabulary.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const results = await searchJapaneseWord(vocabulary);

        const newSuggestions = await Promise.all(
          results.slice(0, 4).map(async (item: any) => {
            const jap = item.japanese[0] || {};
            const kanji = jap.word || jap.reading || vocabulary;
            const hiragana = jap.reading || kanji;

            // Lấy nghĩa tiếng Anh đầu tiên
            const englishMeanings = item.senses?.[0]?.english_definitions || [];
            const englishMeaning = englishMeanings[0] || 'Không có nghĩa';

            // Dịch sang tiếng Việt (gọi backend proxy)
            let vietMeaning = englishMeaning;
            try {
              const translateRes = await fetch(`${API_URL}/translate?text=${encodeURIComponent(englishMeaning + ' (Japanese word)')}&target=vi`);
              if (translateRes.ok) {
                const translateData = await translateRes.json();
                vietMeaning = translateData.translatedText || englishMeaning;
              }
            } catch (translateErr) {
              console.warn('Lỗi dịch nghĩa:', translateErr);
            }

            return {
              display: `${kanji} (${hiragana}) - ${vietMeaning}`,
              kanji,
              hiragana,
              vietMeaning,
            };
          })
        );

        setSuggestions(newSuggestions);
        setShowSuggestions(true);
      } catch (err) {
        console.error('Lỗi tìm kiếm Jisho:', err);
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [vocabulary]);

  const selectSuggestion = (item: { kanji: string; hiragana: string }) => {
    setVocabulary(item.kanji);
    setPhonetic(item.hiragana);
    setShowSuggestions(false); // Ẩn ngay khi chọn
  };

  // Reset khi mở modal
  useEffect(() => {
    if (isModalVisible) {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [isModalVisible]);
  useEffect(() => {
    if (practiceModalVisible) {
      setCustomQuestionCount('');
      setQuestionCountError('');
    }
  }, [practiceModalVisible]);
  // Đồng bộ filteredFlashcards khi flashcards thay đổi (ví dụ: thêm/xóa thẻ)
  useEffect(() => {
    setFilteredFlashcards(flashcards);
  }, [flashcards]);
  const fetchFlashcardSetData = async () => {
    if (!setId || setId === 'undefined') {
      console.log('Lỗi', 'Không thể tải bộ thẻ: ID không hợp lệ.');
      router.back();
      return;
    }

    try {
      setLoading(true);
      let response = await fetch(`${API_URL}/flashcard-sets/${setId}`);
      // ...

      // Trường hợp 1: Thành công ngay (public hoặc shared link – không cần token)
      if (response.ok) {
        const data = await response.json();
        setSetData(data);
        setFlashcards(data.flashcards || []);
        setFilteredFlashcards(data.flashcards || []); // Quan trọng: gán filtered để FlatList hiển thị
        setLoading(false);
        return;
      }

      // Trường hợp 2: Không public/shared → thử với token (private set của owner)
      const token = await getAuthToken();
      if (token) {
        response = await fetch(`${API_URL}/flashcard-sets/${setId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setSetData(data);
          setFlashcards(data.flashcards || []);
          setFilteredFlashcards(data.flashcards || []);
          setLoading(false);
          return;
        }
      }

      // Nếu cả 2 cách đều thất bại
      Alert.alert(
        'Không thể truy cập',
        'Bộ flashcard này không tồn tại, đã bị xóa, hoặc link không hợp lệ.'
      );
      router.back();

    } catch (error) {
      console.error('Lỗi tải bộ flashcard:', error);
      Alert.alert('Lỗi kết nối', 'Không thể tải dữ liệu. Vui lòng kiểm tra mạng và thử lại.');
      router.back();
    }
  };

  // ------------------- GỌI HÀM KHI MÀN HÌNH ĐƯỢC FOCUS -------------------
  useFocusEffect(
    useCallback(() => {
      fetchFlashcardSetData();
    }, [setId])
  );

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };
  const uriToFile = async (uri: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();

    const ext = blob.type.split('/')[1] || 'jpg';
    const filename = `image-${Date.now()}.${ext}`;

    return new File([blob], filename, { type: blob.type });
  };
  const handleCreateFlashcard = async () => {
    if (!vocabulary.trim() || !meaning.trim()) {
      Alert.alert('Error', 'Vocabulary and meaning are required.');
      return;
    }

    try {
      const token = await getAuthToken();
      if (!token) return Alert.alert('Error', 'Authentication failed.');

      const formData = new FormData();
      formData.append('vocabulary', vocabulary);
      formData.append('phonetic', phonetic);
      formData.append('meaning', meaning);

      if (imageUri) {
        if (Platform.OS === 'web') {
          const file = await uriToFile(imageUri);
          formData.append('image', file);
        } else {
          const filename = imageUri.split('/').pop() || 'image.jpg';
          formData.append('image', {
            uri: imageUri,
            type: 'image/jpeg',
            name: filename,
          } as any);
        }
      }


      const response = await fetch(`${API_URL}/flashcards`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.message || 'Failed to create flashcard');
        return;
      }

      const actualSetId = Array.isArray(setId) ? setId[0] : setId;

      const linkResponse = await fetch(`${API_URL}/flashcard-sets/${actualSetId}/flashcards`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flashcardId: data._id }),
      });

      if (!linkResponse.ok) {
        Alert.alert('Error', 'Failed to add flashcard to set');
        return;
      }

      const refreshResponse = await fetch(`${API_URL}/flashcard-sets/${actualSetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setFlashcards(refreshData.flashcards || []);
      } else {
        setFlashcards(prev => [data, ...prev]);
      }

      resetForm();
      setIsModalVisible(false);
      Alert.alert('Success', 'Flashcard created successfully!');
    } catch (error) {
      Alert.alert('Error', 'An error occurred while creating the flashcard.');
    }
  };

  const resetForm = () => {
    setVocabulary('');
    setPhonetic('');
    setMeaning('');
    setImageUri('');
  };

  const handleEdit = (flashcard: any) => {
    setModalMode('edit');
    setEditingFlashcard(flashcard);
    setVocabulary(flashcard.vocabulary);
    setPhonetic(flashcard.phonetic || '');
    setMeaning(flashcard.meaning);
    setImageUri(flashcard.image ? `${API_URL.replace('/api', '')}${flashcard.image}` : '');
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setIsModalVisible(false);
    setModalMode('create');
    setEditingFlashcard(null);
  };

  const startPractice = (mode: 'speed' | 'timed', questionCount: number | 'all') => {
    setPracticeModalVisible(false);
    const actualSetId = Array.isArray(setId) ? setId[0] : setId;

    router.push({
      pathname: `/(auth)/(quiz)/${mode}/[setId]`,
      params: {
        setId: actualSetId,
        questionCount: questionCount === 'all' ? flashcards.length : questionCount
      }
    } as any);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      {/* Header với tiêu đề và số lượng kết quả */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/(auth)/(tabs)/flashSet")}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>

        <View style={styles.headerTitle}>
          <Text style={styles.title}>{setData?.title || 'Flashcard Set'}</Text>
          <Text style={styles.subtitle}>
            {searchQuery
              ? `${filteredFlashcards.length} / ${flashcards.length} thẻ`
              : `${flashcards.length} thẻ`
            }
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: '#10b981' }]}
            onPress={() => {
              if (flashcards.length < 4) {
                setMessageModalVisible(true);
              } else {
                setPracticeModalVisible(true);
              }
            }}
          >
            <Ionicons name="play" size={22} color="#fff" />
          </TouchableOpacity>

          {isOwner && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setModalMode('create');
                setIsModalVisible(true);
              }}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          )}
          {isOwner && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: '#8b5cf6' }]}
              onPress={() => {
                // Nếu đã shared rồi → hiện modal có link luôn
                if (setData?.publicFor === 'shared') {
                  const origin = Platform.OS === 'web' ? window.location.origin : 'https://yourdomain.com';
                  const link = `${origin}/flashcards/${setId}?setId=${setId}`;
                  setShareLink(link);
                  setShareModalVisible(true);
                } else {
                  // Chưa shared → hiện modal xác nhận
                  setShareModalVisible(true);
                }
              }}
            >
              <Ionicons name="share-social" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* THANH TÌM KIẾM ĐẸP MỚI */}
      <View style={styles.searchBarContainer}>
        <View style={[styles.searchBar, searchQuery ? styles.searchBarFocused : null]}>
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm từ vựng, nghĩa hoặc âm đọc..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="never" // Tắt nút clear mặc định để dùng custom
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={22} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>



      {/* Danh sách flashcard - dùng filteredFlashcards */}
      <FlatList
        data={filteredFlashcards}  // ← ĐỔI TỪ flashcards SANG filteredFlashcards
        renderItem={({ item }) => (
          <FlashcardItem
            item={item}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDeleteFlashcard(item._id)}
          />
        )}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Không tìm thấy thẻ nào' : 'No flashcards yet'}
            </Text>
            {isOwner && !searchQuery && (
              <Text style={styles.emptySubtext}>Tap the + button to add your first flashcard</Text>
            )}
            {isOwner && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: '#6366f1' }]} // màu tím
                  onPress={handleImportCSV}
                >
                  <Ionicons name="document-attach" size={24} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    setModalMode('create');
                    setIsModalVisible(true);
                  }}
                >
                  <Ionicons name="add" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
      />
      {/* MODAL IMPORT EXCEL */}
      {/* Thông báo không đủ thẻ - dùng component MessageModal có sẵn */}
      <MessageModal
        visible={messageModalVisible}
        title="Không thể luyện thi"
        message="Số lượng thẻ trong bộ chưa đủ để làm bài test (tối thiểu 4 thẻ)."
        onClose={() => setMessageModalVisible(false)}
      />
      {/* Modal chia sẻ link - KHÔNG DÙNG Alert, tất cả xử lý trong modal */}
      <Modal visible={shareModalVisible} transparent animationType="slide" onRequestClose={() => setShareModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 24 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#0f172a' }}>
                Chia sẻ bộ thẻ
              </Text>
              <TouchableOpacity onPress={() => setShareModalVisible(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            {setData?.publicFor === 'shared' ? (
              <>
                <Text style={{ fontSize: 16, textAlign: 'center', color: '#059669', marginBottom: 16 }}>
                  Bộ thẻ đang được chia sẻ qua link
                </Text>
                <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 }}>
                  Ai có link đều có thể xem và luyện thi bộ này
                </Text>

                {/* Hiển thị link */}
                <View style={{ backgroundColor: '#f3f4f6', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, color: '#1f2937', textAlign: 'center' }} selectable>
                    {shareLink}
                  </Text>
                </View>

                {/* Nút copy link */}
                <TouchableOpacity
                  style={{
                    backgroundColor: '#3b82f6',
                    padding: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    marginBottom: 20,
                  }}
                  onPress={async () => {
                    if (Platform.OS === 'web') {
                      await navigator.clipboard.writeText(shareLink);
                      // Hiển thị thông báo thành công ngay trong modal (không dùng Alert)
                      Alert.alert('Đã copy!', 'Link đã được sao chép vào clipboard');
                    } else {
                      await Share.share({ message: shareLink });
                    }
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                    Copy link chia sẻ
                  </Text>
                </TouchableOpacity>

                {/* Xác nhận hủy chia sẻ - TRONG MODAL, KHÔNG DÙNG Alert */}


                <View style={{ flexDirection: 'row', gap: 12 }}>


                  <TouchableOpacity
                    style={{ flex: 1, padding: 16, backgroundColor: '#ef4444', borderRadius: 12 }}
                    onPress={disableLinkSharing}
                    disabled={isSharing}
                  >
                    <Text style={{ textAlign: 'center', color: '#fff', fontWeight: '700' }}>
                      {isSharing ? 'Đang hủy...' : 'Hủy chia sẻ'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 16, textAlign: 'center', color: '#1f2937', marginBottom: 16 }}>
                  Bạn có muốn bật chia sẻ qua link?
                </Text>
                <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 32 }}>
                  Sau khi bật, bất kỳ ai có link đều có thể xem và luyện thi bộ thẻ này
                </Text>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    style={{ flex: 1, padding: 16, backgroundColor: '#e2e8f0', borderRadius: 12 }}
                    onPress={() => setShareModalVisible(false)}
                  >
                    <Text style={{ textAlign: 'center', fontWeight: '600', color: '#1f2937' }}>Hủy</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1, padding: 16, backgroundColor: '#10b981', borderRadius: 12 }}
                    onPress={enableLinkSharing}
                    disabled={isSharing}
                  >
                    <Text style={{ textAlign: 'center', color: '#fff', fontWeight: '700' }}>
                      {isSharing ? 'Đang bật...' : 'Đồng ý, bật chia sẻ'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setShareModalVisible(false)}>
              <Text style={{ color: '#64748b', textAlign: 'center', fontSize: 16 }}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={importModalVisible} transparent animationType="fade" onRequestClose={() => setImportModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 12, textAlign: 'center' }}>
              {importModalConfig?.title || 'Thông báo'}
            </Text>
            <Text style={{ fontSize: 16, textAlign: 'center', color: '#64748b', marginBottom: 32 }}>
              {importModalConfig?.message || ''}
            </Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              {importModalConfig?.onConfirm ? (
                <>
                  <TouchableOpacity
                    style={{ flex: 1, padding: 14, backgroundColor: '#e2e8f0', borderRadius: 12 }}
                    onPress={() => setImportModalVisible(false)}
                  >
                    <Text style={{ fontWeight: '600', color: '#0f172a', textAlign: 'center' }}>Hủy</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1, padding: 14, backgroundColor: '#10b981', borderRadius: 12 }}
                    onPress={() => {
                      importModalConfig.onConfirm?.();
                      setImportModalVisible(false);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>Thêm ngay</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={{ flex: 1, padding: 14, backgroundColor: '#3b82f6', borderRadius: 12 }}
                  onPress={() => setImportModalVisible(false)}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>Đóng</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
      {/* Modal xóa flashcard */}
      <Modal visible={deleteFlashcardModalVisible} transparent animationType="fade" onRequestClose={cancelDeleteFlashcard}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 }}>
              Delete Flashcard
            </Text>
            <Text style={{ fontSize: 16, textAlign: 'center', color: '#64748b', marginBottom: 24 }}>
              Are you sure you want to delete this flashcard? This action cannot be undone.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={{ flex: 1, padding: 14, backgroundColor: '#e2e8f0', borderRadius: 12 }} onPress={cancelDeleteFlashcard}>
                <Text style={{ fontWeight: '600', color: '#0f172a', textAlign: 'center' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 14, backgroundColor: '#ef4444', borderRadius: 12 }} onPress={confirmDeleteFlashcard}>
                <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal cấu hình luyện thi nâng cao */}
      <Modal visible={practiceModalVisible} transparent animationType="slide" onRequestClose={() => setPracticeModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 24, maxHeight: '90%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#0f172a' }}>
                Cấu hình bài kiểm tra
              </Text>
              <TouchableOpacity onPress={() => setPracticeModalVisible(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 18, fontWeight: '600', color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>
              {setData?.title}
            </Text>
            <Text style={{ fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 32 }}>
              {flashcards.length} thẻ có sẵn
            </Text>

            {/* Chọn chế độ */}
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#333' }}>
              Chọn chế độ
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 18,
                  borderRadius: 16,
                  backgroundColor: selectedMode === 'speed' ? '#f472b6' : '#f3f4f6',
                  alignItems: 'center',
                }}
                onPress={() => setSelectedMode('speed')}
              >
                <Ionicons name="flash" size={32} color={selectedMode === 'speed' ? '#fff' : '#f472b6'} />
                <Text style={{ marginTop: 8, fontWeight: '700', fontSize: 16, color: selectedMode === 'speed' ? '#fff' : '#1f2937' }}>
                  Speed Test
                </Text>
                <Text style={{ fontSize: 13, color: selectedMode === 'speed' ? '#fce7f3' : '#64748b', marginTop: 4 }}>
                  Làm nhanh nhất có thể
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 18,
                  borderRadius: 16,
                  backgroundColor: selectedMode === 'timed' ? '#fb923c' : '#f3f4f6',
                  alignItems: 'center',
                }}
                onPress={() => setSelectedMode('timed')}
              >
                <Ionicons name="timer" size={32} color={selectedMode === 'timed' ? '#fff' : '#fb923c'} />
                <Text style={{ marginTop: 8, fontWeight: '700', fontSize: 16, color: selectedMode === 'timed' ? '#fff' : '#1f2937' }}>
                  Timed Test
                </Text>
                <Text style={{ fontSize: 13, color: selectedMode === 'timed' ? '#fffbe6' : '#64748b', marginTop: 4 }}>
                  Giới hạn 10 phút
                </Text>
              </TouchableOpacity>
            </View>

            {/* Chọn số lượng câu hỏi */}
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#333' }}>
              Số lượng câu hỏi
            </Text>

            {/* Nút "Tất cả" nhanh */}
            <TouchableOpacity
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: customQuestionCount === '' || parseInt(customQuestionCount) === flashcards.length ? '#3b82f6' : '#e2e8f0',
                marginBottom: 16,
              }}
              onPress={() => {
                setCustomQuestionCount('');
                setQuestionCountError('');
              }}
            >
              <Text style={{
                fontWeight: '600',
                color: customQuestionCount === '' || parseInt(customQuestionCount) === flashcards.length ? '#fff' : '#1f2937'
              }}>
                Tất cả ({flashcards.length} thẻ)
              </Text>
            </TouchableOpacity>

            {/* Ô nhập số */}
            <View style={{ marginBottom: 8 }}>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: questionCountError ? '#ef4444' : '#cbd5e1',
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 18,
                  backgroundColor: '#fff',
                  textAlign: 'center',
                }}
                placeholder="Nhập số lượng (ví dụ: 15)"
                placeholderTextColor="#94a3b8"
                value={customQuestionCount}
                onChangeText={(text) => {
                  setCustomQuestionCount(text);
                  setQuestionCountError('');

                  // Validate ngay khi nhập
                  if (text === '') return;

                  const num = parseInt(text);
                  if (isNaN(num) || num < 1) {
                    setQuestionCountError('Vui lòng nhập số lớn hơn 0');
                  } else if (num > flashcards.length) {
                    setQuestionCountError(`Tối đa chỉ có ${flashcards.length} thẻ`);
                  }
                }}
                keyboardType="number-pad"
                maxLength={flashcards.length.toString().length + 1}
              />
            </View>

            {/* Note hướng dẫn */}
            <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 32 }}>
              Bạn có thể nhập bất kỳ số nào từ 1 đến {flashcards.length}
            </Text>

            {/* Hiển thị lỗi nếu có */}
            {questionCountError ? (
              <Text style={{ fontSize: 14, color: '#ef4444', textAlign: 'center', marginBottom: 16 }}>
                {questionCountError}
              </Text>
            ) : null}

            {/* Nút bắt đầu */}
            <TouchableOpacity
              style={{
                backgroundColor: '#10b981',
                padding: 16,
                borderRadius: 16,
                alignItems: 'center',
              }}
              onPress={() => {
                let finalCount: number;

                if (customQuestionCount === '' || parseInt(customQuestionCount) === flashcards.length) {
                  finalCount = flashcards.length; // Tất cả
                } else {
                  const num = parseInt(customQuestionCount);
                  if (isNaN(num) || num < 1 || num > flashcards.length) {
                    setQuestionCountError(
                      num > flashcards.length
                        ? `Tối đa chỉ có ${flashcards.length} thẻ`
                        : 'Vui lòng nhập số hợp lệ'
                    );
                    return;
                  }
                  finalCount = num;
                }

                startPractice(selectedMode, finalCount);
              }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                Bắt đầu làm bài
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 16 }} onPress={() => setPracticeModalVisible(false)}>
              <Text style={{ color: '#64748b', textAlign: 'center', fontSize: 16 }}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Modal tạo/sửa flashcard */}
      <Modal visible={isModalVisible} transparent animationType="slide" onRequestClose={handleCloseModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === 'create' ? 'Add Flashcard' : 'Edit Flashcard'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              {/* Ô VOCABULARY VỚI GỢI Ý - ĐÃ FIX CHE & ẨN */}
              <View style={{ position: 'relative', marginBottom: 30, zIndex: 1000 }}>
                <Text style={styles.label}>Vocabulary *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập romaji, kanji hoặc hiragana (vd: kaihatsu)"
                  placeholderTextColor="#999"
                  value={vocabulary}
                  onChangeText={setVocabulary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {/* Loading */}
                {isLoadingSuggestions && (
                  <View style={styles.suggestionLoading}>
                    <ActivityIndicator size="small" color="#007bff" />
                    <Text style={{ marginLeft: 8, color: '#666' }}>Đang tìm...</Text>
                  </View>
                )}

                {/* Danh sách gợi ý - có nghĩa tiếng Việt */}
                {showSuggestions && suggestions.length > 0 && (
                  <View style={styles.suggestionBox}>
                    {suggestions.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.suggestionItem}
                        onPress={() => selectSuggestion(item)}
                      >
                        <Text style={{ fontSize: 17, fontWeight: '500', color: '#1f2937' }}>
                          {item.display}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Phonetic */}
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.label}>Phonetic (Hiragana)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tự động điền"
                  placeholderTextColor="#999"
                  value={phonetic}
                  onChangeText={setPhonetic}
                />
              </View>

              {/* ... Meaning và Image giữ nguyên ... */}
              <Text style={styles.label}>Meaning *</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                placeholder="Enter the meaning"
                placeholderTextColor="#999"
                value={meaning}
                onChangeText={setMeaning}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Illustrative Image</Text>
              {imageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => setImageUri('')}>
                    <Ionicons name="close-circle" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                  <Ionicons name="image" size={32} color="#007bff" />
                  <Text style={styles.imagePickerText}>Tap to add image</Text>
                </TouchableOpacity>
              )}

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCloseModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.createButton]}
                  onPress={modalMode === 'create' ? handleCreateFlashcard : handleUpdateFlashcard}
                >
                  <Text style={styles.createButtonText}>
                    {modalMode === 'create' ? 'Create' : 'Save Changes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
