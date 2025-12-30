import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { getPronunciationUrl, searchJapaneseWord } from '../../utils/jishoApi'; // ← Đảm bảo đường dẫn đúng đến file jishoApi.js của bạn
import { styles } from './flashcards.styles';

const API_URL = Platform.OS === "web"
  ? "http://localhost:5000/api"
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
  const { setId } = useLocalSearchParams();
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

  const [vocabulary, setVocabulary] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [meaning, setMeaning] = useState('');
  const [imageUri, setImageUri] = useState('');

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
  // Đồng bộ filteredFlashcards khi flashcards thay đổi (ví dụ: thêm/xóa thẻ)
  useEffect(() => {
    setFilteredFlashcards(flashcards);
  }, [flashcards]);
  const fetchFlashcardSetData = async () => {
    let fetchedFlashcards: any[] = []; // ← Khai báo ngay từ đầu
    try {
      setLoading(true);
      const token = await getAuthToken();

      let targetSet = null;


      // Bước 1: Thử API public
      try {
        const publicRes = await fetch(`${API_URL}/flashcard-sets/public`);
        if (publicRes.ok) {
          const publicData = await publicRes.json();
          targetSet = publicData.find((s: any) => s._id === setId || s._id.toString() === setId);

          if (targetSet) {
            fetchedFlashcards = targetSet.flashcards || [];
            setSetData(targetSet);
            setFlashcards(fetchedFlashcards);
            setLoading(false);
            return;
          }
        }
      } catch (publicErr) {
        console.warn('API public lỗi (có thể do mạng), sẽ thử private nếu có token:', publicErr);
      }

      // Bước 2: Nếu không tìm thấy ở public → thử private
      if (token && !targetSet) {
        try {
          const privateRes = await fetch(`${API_URL}/flashcard-sets/${setId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (privateRes.ok) {
            const privateData = await privateRes.json();
            targetSet = privateData;
            fetchedFlashcards = privateData.flashcards || [];
          } else {
            Alert.alert('Lỗi', 'Không tìm thấy bộ flashcard hoặc bạn không có quyền truy cập');
            setLoading(false);
            return;
          }
        } catch (privateErr) {
          console.error('API private lỗi:', privateErr);
          Alert.alert('Lỗi', 'Không thể tải bộ flashcard');
          setLoading(false);
          return;
        }
      }

      if (!targetSet) {
        Alert.alert('Lỗi', 'Không tìm thấy bộ flashcard');
        setLoading(false);
        return;
      }

      // Gán dữ liệu chính
      setSetData(targetSet);
      setFlashcards(fetchedFlashcards);

    } catch (error) {
      console.error('Lỗi tổng quát khi tải flashcard set:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
      // ← Đây là vị trí đúng: fetchedFlashcards đã được gán đầy đủ
      setFilteredFlashcards(fetchedFlashcards);
    }
  };

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

  const startPractice = (mode: 'speed' | 'timed') => {
    setPracticeModalVisible(false);
    const actualSetId = Array.isArray(setId) ? setId[0] : setId;

    router.push({
      pathname: `/(auth)/(quiz)/${mode}/[setId]`,
      params: { setId: actualSetId }
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
        <TouchableOpacity onPress={() => router.back()}>
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
            onPress={() => setPracticeModalVisible(true)}
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

      {/* Modal chọn chế độ luyện thi */}
      <Modal visible={practiceModalVisible} transparent animationType="fade" onRequestClose={() => setPracticeModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 28 }]}>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: 16 }}>
              Luyện thi bộ thẻ
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>
              {setData?.title}
            </Text>
            <Text style={{ fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 32 }}>
              {flashcards.length} thẻ
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: '#f472b6',
                padding: 20,
                borderRadius: 16,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => startPractice('speed')}
            >
              <Ionicons name="flash" size={28} color="#fff" />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Speed Test</Text>
                <Text style={{ color: '#fce7f3', fontSize: 14 }}>Làm nhanh nhất có thể</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#fb923c',
                padding: 20,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => startPractice('timed')}
            >
              <Ionicons name="timer" size={28} color="#fff" />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Timed Test</Text>
                <Text style={{ color: '#fffbe6', fontSize: 14 }}>Có giới hạn thời gian (10 phút)</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 28 }} onPress={() => setPracticeModalVisible(false)}>
              <Text style={{ color: '#64748b', textAlign: 'center', fontSize: 16, fontWeight: '500' }}>Hủy</Text>
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