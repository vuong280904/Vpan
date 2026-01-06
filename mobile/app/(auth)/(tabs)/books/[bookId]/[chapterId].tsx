// app/books/[bookId]/[chapterId].tsx
import { Audio } from 'expo-av';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Mic,
  Plus,
  Volume2,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  ScrollView, // <-- Thêm dòng này
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useAuth } from '../../../../../context/AuthContext';
import api from '../../../../utils/api'; // giả sử bạn có api helper
import { getPronunciationUrl } from '../../../../utils/jishoApi'; // giữ nguyên đường dẫn của bạn

const PAGE_TURN_SOUND = require('../../../../../assets/sounds/page-turn.mp3');
const API_BASE = Platform.OS === "web" 
    ? "https://vpan-api.onrender.com"
    : "http://172.20.10.3:5000";

export default function EhonReader() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const bookId = Array.isArray(params.bookId) ? params.bookId[0] : (params.bookId ?? '');
  const chapterNum = Array.isArray(params.chapterId) ? params.chapterId[0] : (params.chapterId ?? '1');
  const chapterNumber = parseInt(chapterNum) || 1;

  const [chapter, setChapter] = useState<any>(null);
  const [totalChapters, setTotalChapters] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedLine, setSelectedLine] = useState<any>(null); // dòng đang chọn
  const [isTurning, setIsTurning] = useState(false);

  // Modal thêm flashcard
  const [showAddFlashcardModal, setShowAddFlashcardModal] = useState(false);
  const [flashcardSets, setFlashcardSets] = useState<any[]>([]);
  const [loadingSets, setLoadingSets] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [creatingNewSet, setCreatingNewSet] = useState(false);

  const fadeAnim = new Animated.Value(1);

  const fetchBookAndChapter = async () => {
    try {
      setLoading(true);
      const bookRes = await fetch(`${API_BASE}/api/books/${bookId}`);
      if (!bookRes.ok) throw new Error('Không tải được sách');
      const bookData = await bookRes.json();
      setTotalChapters(bookData.chapters?.length || 0);

      const chapterRes = await fetch(`${API_BASE}/api/books/${bookId}/chapter/${chapterNumber}`);
      if (!chapterRes.ok) {
        alert(`Chương ${chapterNumber} chưa tồn tại!`);
        return;
      }
      const chapterData = await chapterRes.json();
      setChapter(chapterData);
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!bookId) return;
    if (!params.chapterId) {
      router.replace(`/books/${bookId}/1`);
      return;
    }
    fetchBookAndChapter();
  }, [bookId, chapterNumber]);

  const hasPrev = chapterNumber > 1;
  const hasNext = chapterNumber < totalChapters;

  const playPageTurnSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(PAGE_TURN_SOUND, { shouldPlay: true, volume: 0.8 });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && (status as any).didJustFinish) sound.unloadAsync();
      });
    } catch (e) { }
  };

  const goToChapter = (num: number) => {
    if (isTurning || num < 1 || num > totalChapters) return;
    setIsTurning(true);
    playPageTurnSound();

    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      router.replace(`/books/${bookId}/${num}`);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start(() =>
        setIsTurning(false)
      );
    });
  };

  const goBackToList = () => {
    router.push('/books/list');
  };

  // ==================== PHÁT ÂM CÂU ====================
  const playSentencePronunciation = async (text: string) => {
    if (!text) return;
    try {
      const url = await getPronunciationUrl(text);
      if (!url) {
        Alert.alert('Lỗi', 'Không lấy được link phát âm');
        return;
      }

      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && (status as any).didJustFinish) {
          sound.unloadAsync().catch(() => { });
        }
      });
    } catch (err) {
      console.error('Lỗi phát âm:', err);
      Alert.alert('Lỗi', 'Không thể phát âm câu này');
    }
  };

  // ==================== LẤY DANH SÁCH FLASHCARD SET ====================
  const loadFlashcardSets = async () => {
    setLoadingSets(true);
    try {
      const res = await api.get('/api/flashcard-sets'); // điều chỉnh endpoint nếu khác
      setFlashcardSets(res.data || []);
    } catch (err) {
      console.error(err);
      Alert.alert('Lỗi', 'Không tải được danh sách bộ flashcard');
    } finally {
      setLoadingSets(false);
    }
  };

  // ==================== THÊM VÀO FLASHCARD ====================
  const addToFlashcard = async (setId?: string, newSetName?: string) => {
    if (!selectedLine || !user) return;

    try {
      let targetSetId = setId;

      // Nếu tạo mới
      if (!targetSetId && newSetName?.trim()) {
        const createRes = await api.post('/api/flashcard-sets', { name: newSetName.trim() });
        targetSetId = createRes.data.id;
      }

      if (!targetSetId) {
        Alert.alert('Lỗi', 'Không xác định được bộ flashcard');
        return;
      }

      // Thêm card vào set
      // Tạo flashcard mới và tự động thêm vào set
      await api.post('/api/flashcards', {
        vocabulary: selectedLine.text,
        meaning: selectedLine.meaning,
        phonetic: selectedLine.ruby || '',
        setId: targetSetId,  // ← Quan trọng: gửi setId để backend tự thêm vào set
      });

      Alert.alert('Thành công', 'Đã thêm câu vào flashcard!');
      setShowAddFlashcardModal(false);
      setNewSetName('');
      setCreatingNewSet(false);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể thêm vào flashcard');
    }
  };

  // ==================== CHUYỂN SANG TRANG LUYỆN PHÁT ÂM ====================
  const goToShadowingPractice = () => {
    if (!selectedLine) return;
    setSelectedLine(null);

    router.replace({
      pathname: '/shadowing/shadowSentences',
      params: {
        customSentence: selectedLine.text,
        customRuby: selectedLine.ruby || '',
        customMeaning: selectedLine.meaning,
      },
    });
  };

  if (loading || !chapter) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#92400e" />
        <Text style={{ marginTop: 16, color: '#92400e', fontSize: 18 }}>
          Đang tải chương {chapterNumber}...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={goBackToList}>
        <ArrowLeft color="#92400e" size={28} />
        <Text style={styles.backText}>Danh sách</Text>
      </TouchableOpacity>

      <View style={{ position: 'absolute', top: 60, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 8, zIndex: 100 }}>
        <Text style={{ color: 'white', fontSize: 12 }}>
          {chapterNumber} / {totalChapters}
        </Text>
      </View>

      <Animated.View style={[styles.pageContainer, { opacity: fadeAnim }]}>
        <View style={styles.mainLayout}>
          <View style={styles.imageColumn}>
            <Image source={{ uri: chapter.illustration }} style={styles.illustration} resizeMode="contain" />
          </View>

          <View style={styles.contentColumn}>
            <View style={styles.titleContainer}>
              <Text style={styles.chapterTitle}>{chapter.title}</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
              {chapter.content.map((line: any, i: number) => (
                <View key={i} style={styles.line}>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => setSelectedLine(line)}>
                    <Text style={styles.japaneseText}>{line.text}</Text>
                  </TouchableOpacity>
                  {showTranslation && <Text style={styles.translationText}>{line.meaning}</Text>}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Animated.View>

      {/* ==================== POPUP CHI TIẾT CÂU ==================== */}
      {/* ==================== POPUP CHI TIẾT CÂU - THIẾT KẾ MỚI ==================== */}
      <Modal visible={!!selectedLine} transparent animationType="fade">
        <TouchableOpacity style={styles.popupOverlay} activeOpacity={1} onPress={() => setSelectedLine(null)}>
          <TouchableWithoutFeedback>
            <View style={styles.newPopupContainer}>
              {/* Row chính: trái là nội dung, phải là các nút */}
              <View style={styles.newPopupRow}>
                {/* Bên trái: nội dung câu */}
                <View style={styles.leftContent}>
                  <Text style={styles.newPopupJp}>{selectedLine?.text}</Text>
                  {selectedLine?.ruby && (
                    <Text style={styles.newPopupRuby}>【{selectedLine.ruby}】</Text>
                  )}
                  <Text style={styles.newPopupVn}>{selectedLine?.meaning}</Text>
                </View>

                {/* Bên phải: 3 nút dọc */}
                <View style={styles.rightActions}>
                  {/* Nút Phát âm */}
                  <TouchableOpacity
                    style={[styles.newActionBtn, { backgroundColor: '#ebf5ff' }]}
                    onPress={() => playSentencePronunciation(selectedLine?.text)}
                  >
                    <Volume2 color="#2563eb" size={32} />
                    <Text style={styles.newActionText}>Phát âm</Text>
                  </TouchableOpacity>

                  {/* Nút Thêm flashcard */}
                  <TouchableOpacity
                    style={[styles.newActionBtn, { backgroundColor: '#ecfdf5' }]}
                    onPress={() => {
                      loadFlashcardSets();
                      setShowAddFlashcardModal(true);
                    }}
                  >
                    <Plus color="#059669" size={32} />
                    <Text style={styles.newActionText}>Thêm flashcard</Text>
                  </TouchableOpacity>

                  {/* Nút Luyện nói */}
                  <TouchableOpacity
                    style={[styles.newActionBtn, { backgroundColor: '#fff7ed' }]}
                    onPress={goToShadowingPractice}
                  >
                    <Mic color="#f97316" size={32} />
                    <Text style={styles.newActionText}>Luyện nói</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Nút đóng ở dưới */}
              <TouchableOpacity style={styles.newCloseBtn} onPress={() => setSelectedLine(null)}>
                <Text style={styles.newCloseText}>✕ Đóng</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* ==================== MODAL THÊM FLASHCARD ==================== */}
      <Modal visible={showAddFlashcardModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm vào Flashcard</Text>

            {/* Tạo mới */}
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setCreatingNewSet(true)}
            >
              <Plus color="#10b981" size={20} />
              <Text style={styles.optionText}>Tạo bộ flashcard mới</Text>
            </TouchableOpacity>

            {creatingNewSet && (
              <View style={{ marginTop: 10 }}>
                <TextInput
                  placeholder="Tên bộ flashcard mới..."
                  value={newSetName}
                  onChangeText={setNewSetName}
                  style={styles.input}
                  autoFocus
                />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: '#10b981' }]}
                    onPress={() => addToFlashcard(undefined, newSetName)}
                    disabled={!newSetName.trim()}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Tạo & Thêm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: '#666' }]}
                    onPress={() => {
                      setCreatingNewSet(false);
                      setNewSetName('');
                    }}
                  >
                    <Text style={{ color: '#fff' }}>Hủy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Thêm vào bộ có sẵn */}
            <Text style={{ marginTop: 20, marginBottom: 10, fontWeight: '600', color: '#444' }}>
              Hoặc thêm vào bộ hiện có:
            </Text>
            {loadingSets ? (
              <ActivityIndicator />
            ) : flashcardSets.length === 0 ? (
              <Text style={{ color: '#888', textAlign: 'center', padding: 20 }}>
                Bạn chưa có bộ flashcard nào
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 200 }}>
                {flashcardSets.map(set => (
                  <TouchableOpacity
                    key={set._id || set.id}  // dùng _id an toàn hơn
                    style={styles.setItem}
                    onPress={() => addToFlashcard(set._id || set.id)}
                  >
                    <Text style={styles.setName}>
                      {set.name || set.title || 'Bộ không tên'}
                    </Text>
                    <Text style={styles.setCount}>
                      {set.flashcards?.length || 0} thẻ
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setShowAddFlashcardModal(false);
                setCreatingNewSet(false);
                setNewSetName('');
              }}
            >
              <Text style={{ color: '#e11d48', fontWeight: '600' }}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================== BOTTOM BAR ==================== */}
      <View style={styles.bottomBar} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.navBtn, (!hasPrev || isTurning) && styles.disabled]}
          onPress={() => goToChapter(chapterNumber - 1)}
          disabled={!hasPrev || isTurning}
        >
          <ChevronLeft color={hasPrev ? "#fff" : "#666"} size={32} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowTranslation(v => !v)}>
          {showTranslation ? <EyeOff color="#60a5fa" size={28} /> : <Eye color="#60a5fa" size={28} />}
          <Text style={styles.toggleText}>{showTranslation ? "Ẩn dịch" : "Hiện dịch"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, (!hasNext || isTurning) && styles.disabled]}
          onPress={() => goToChapter(chapterNumber + 1)}
          disabled={!hasNext || isTurning}
        >
          <ChevronRight color={hasNext ? "#fff" : "#666"} size={32} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ==================== STYLES (cập nhật thêm) ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdf6e3' },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    zIndex: 100,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  backText: { marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#92400e' },
  pageContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fdf6e3' },
  mainLayout: { flex: 1, flexDirection: 'row' },
  imageColumn: {
    width: '35%',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderRightWidth: 3,
    borderRightColor: '#f0e6d2',
  },
  illustration: {
    width: '100%',
    height: 'auto',
    aspectRatio: 0.75,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  contentColumn: {
    width: '65%',
    backgroundColor: '#fdf6e3',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  titleContainer: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e0d4b8',
  },
  chapterTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#92400e',
    textAlign: 'center',
  },
  line: { marginBottom: 32 },
  japaneseText: {
    fontSize: 28,
    lineHeight: 50,
    color: '#1f2937',
    fontWeight: '600',
    textAlign: 'left',
  },
  translationText: {
    fontSize: 19,
    color: '#6b7280',
    marginTop: 10,
    fontStyle: 'italic',
    lineHeight: 30,
  },
  // ==================== STYLE CHO POPUP MỚI ====================
  newPopupContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '92%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 25,
    alignSelf: 'center',
  },
  newPopupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftContent: {
    flex: 1,
    paddingRight: 20,
  },
  newPopupJp: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1e293b',
    lineHeight: 50,
    textAlign: 'center',
    marginBottom: 16,
    numberOfLines: 1,
    adjustsFontSizeToFit: true,
    minimumFontSize: 24,
  } as TextStyle,  // ← THÊM DÒNG NÀY

  newPopupRuby: {
    fontSize: 22,
    color: '#3b82f6',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 32,
    numberOfLines: 1,
    adjustsFontSizeToFit: true,
    minimumFontSize: 16,
  } as TextStyle,  // ← THÊM DÒNG NÀY

  newPopupVn: {
    fontSize: 26,
    color: '#059669',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 38,
    numberOfLines: 1,
    adjustsFontSizeToFit: true,
    minimumFontSize: 20,
  } as TextStyle,  // ← THÊM DÒNG NÀY
  rightActions: {
    width: 140,
    justifyContent: 'space-between',
  },
  newActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  newActionText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  newCloseBtn: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  newCloseText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    backgroundColor: '#fff',
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
    width: '90%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  popupJp: { fontSize: 30, fontWeight: 'bold', color: '#1e293b', marginBottom: 8, textAlign: 'center' },
  popupRuby: { fontSize: 18, color: '#6b7280', marginBottom: 16, fontStyle: 'italic', textAlign: 'center' },
  popupVn: { fontSize: 22, color: '#059669', fontWeight: '600', textAlign: 'center', marginBottom: 24 },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  actionBtn: {
    alignItems: 'center',
    padding: 12,
    minWidth: 90,
  },
  actionText: { marginTop: 6, fontSize: 14, fontWeight: '600', color: '#444' },
  closePopupBtn: { padding: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    backgroundColor: '#fff',
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#1f2937' },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#f0fdf4', borderRadius: 12 },
  optionText: { marginLeft: 12, fontSize: 16, color: '#166534' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  smallBtn: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  setItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  setName: { fontSize: 16, fontWeight: '600' },
  setCount: { fontSize: 14, color: '#666' },
  cancelBtn: { marginTop: 20, alignItems: 'center', padding: 10 },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 3,
    borderTopColor: '#f0e6d2',
    elevation: 15,
  },
  navBtn: { padding: 14, backgroundColor: '#92400e', borderRadius: 50 },
  disabled: { backgroundColor: '#9ca3af' },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  toggleText: { marginLeft: 10, fontSize: 16, fontWeight: 'bold', color: '#92400e' },
});
