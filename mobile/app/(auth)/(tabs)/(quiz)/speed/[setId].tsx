// app/(auth)/(quiz)/speed/[setId].tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import QuestionCard from '../../../../../components/Quiz/QuestionCard';
import ResultScreen from '../../../../../components/Quiz/ResultScreen';

const API_URL = Platform.OS === "web"
  ? "https://vpan-api.onrender.com/api"
  : "http://172.20.10.3:5000/api";

// Xử lý SecureStore / AsyncStorage để lấy token
let getItemAsync: (key: string) => Promise<string | null>;

if (Platform.OS !== 'web') {
  try {
    const SecureStore = require('expo-secure-store');
    getItemAsync = SecureStore.getItemAsync;
  } catch (e) {
    getItemAsync = AsyncStorage.getItem;
  }
} else {
  getItemAsync = AsyncStorage.getItem;
}

const getAuthToken = async () => {
  try {
    const token = await getItemAsync('token');
    return token;
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
};

export default function SpeedRun() {
  const params = useLocalSearchParams<{
    setId: string;
    questionCount?: string;  // ← Thêm cái này
    reset?: string
  }>();
  const { setId, questionCount: qcParam, reset } = params;

  const [cards, setCards] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [finished, setFinished] = useState(false);

const fetchCards = useCallback(async () => {
  if (!setId) return;

  try {
    // DÙNG ROUTE CHUYÊN DỤNG CHO QUIZ – HỖ TRỢ CẢ SHARED, PUBLIC, PRIVATE
    let res = await fetch(`${API_URL}/flashcard-sets/${setId}/quiz-flashcards`);

    if (res.ok) {
      const data = await res.json();
      await processAndSetCards(data);
      return;
    }

    // Nếu vẫn lỗi (ví dụ mạng, server), thử fallback với token (nếu có)
    const token = await getAuthToken();
    if (token) {
      res = await fetch(`${API_URL}/flashcard-sets/${setId}/quiz-flashcards`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        await processAndSetCards(data);
        return;
      }
    }

    throw new Error('Không thể tải bộ thẻ');

  } catch (err) {
    console.error('Lỗi tải flashcard cho Speed Run:', err);
    Alert.alert('Lỗi', 'Không thể tải bộ thẻ để làm quiz. Bộ này có thể không tồn tại hoặc link đã hết hạn.');
    router.back();
  }
}, [setId]);

// Tách riêng hàm xử lý để dùng chung
const processAndSetCards = async (data: any[]) => {
  const questionCount = qcParam ? parseInt(qcParam) : null;

  let cardsToUse = data;

  if (questionCount && questionCount > 0 && questionCount < data.length) {
    // Trộn rồi cắt lấy đúng số lượng
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    cardsToUse = shuffled.slice(0, questionCount);
  } else {
    // Dùng hết và trộn
    cardsToUse = [...data].sort(() => Math.random() - 0.5);
  }

  setCards(cardsToUse);
};

  // Load lần đầu
  useEffect(() => {
    fetchCards();
    setCurrent(0);
    setScore(0);
    setFinished(false);
    setStartTime(Date.now());
  }, [fetchCards]);

  // Restart khi có param reset
  useEffect(() => {
    if (!reset) return;

    if (cards.length > 0) {
      const reshuffled = [...cards].sort(() => Math.random() - 0.5);
      setCards(reshuffled);
    } else {
      fetchCards();
    }

    setCurrent(0);
    setScore(0);
    setFinished(false);
    setStartTime(Date.now());
  }, [reset]);

  const handleAnswer = (correct: boolean) => {
    if (correct) setScore(s => s + 1);

    if (current < cards.length - 1) {
      setTimeout(() => setCurrent(c => c + 1), 800);
    } else {
      setFinished(true);
    }
  };

  if (finished) {
    const timeUsed = Math.floor((Date.now() - startTime) / 1000);
    return (
      <ResultScreen
        score={score}
        total={cards.length}
        timeUsed={timeUsed}
        mode="speed"
        setId={setId!}
      />
    );
  }

  if (cards.length === 0) {
    return (
      <Text style={{ color: '#fff', textAlign: 'center', marginTop: 120, fontSize: 18 }}>
        Đang tải câu hỏi...
      </Text>
    );
  }

  const currentCard = cards[current];

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#0b1220' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
          Câu {current + 1}/{cards.length}
        </Text>
        <Text style={{ color: '#60a5fa', fontSize: 17, fontWeight: '600' }}>
          Thời gian: {Math.floor((Date.now() - startTime) / 1000)}s
        </Text>
      </View>

      {/* Câu hỏi */}
      <QuestionCard
        card={currentCard}
        allCards={cards}
        onAnswer={handleAnswer}
      />

      {/* Điểm hiện tại */}
      <View style={{ marginTop: 40, alignItems: 'center' }}>
        <Text style={{ color: '#60a5fa', fontSize: 24, fontWeight: 'bold' }}>
          Điểm: {score}
        </Text>
      </View>
    </View>
  );
}
