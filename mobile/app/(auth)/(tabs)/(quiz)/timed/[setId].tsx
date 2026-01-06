// app/(auth)/(quiz)/timed/[setId].tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import QuestionCard from '../../../../../components/Quiz/QuestionCard';
import ResultScreen from '../../../../../components/Quiz/ResultScreen';
import Timer from '../../../../../components/Quiz/Timer';

const API_URL = Platform.OS === "web"
  ? "https://vpan-api.onrender.com/api"
  : "http://172.20.10.3:5000/api";

const INITIAL_TIME = 600; // 10 phút = 600 giây

// Xử lý SecureStore / AsyncStorage
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

export default function TimedQuiz() {
  const params = useLocalSearchParams<{
    setId: string;
    questionCount?: string;   // ← Thêm để nhận số lượng câu hỏi
    reset?: string;
  }>();
  const { setId, questionCount: qcParam, reset } = params;

  const [cards, setCards] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [finished, setFinished] = useState(false);

  // === TẢI DỮ LIỆU – DÙNG ROUTE QUIZ-FLASHCARDS NHƯ SPEEDRUN ===
  const fetchCards = useCallback(async () => {
    if (!setId) return;

    try {
      let res = await fetch(`${API_URL}/flashcard-sets/${setId}/quiz-flashcards`);

      if (res.ok) {
        const data = await res.json();
        await processAndSetCards(data);
        return;
      }

      // Fallback nếu cần token (private set)
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
      console.error('Lỗi tải flashcard cho Timed Quiz:', err);
      Alert.alert('Lỗi', 'Không thể tải bộ thẻ để làm quiz. Bộ này có thể không tồn tại hoặc link đã hết hạn.');
      router.back();
    }
  }, [setId]);

  // === XỬ LÝ SỐ LƯỢNG CÂU HỎI ===
  const processAndSetCards = async (data: any[]) => {
    const questionCount = qcParam ? parseInt(qcParam) : null;

    let cardsToUse = data;

    if (questionCount && questionCount > 0 && questionCount < data.length) {
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      cardsToUse = shuffled.slice(0, questionCount);
    } else {
      cardsToUse = [...data].sort(() => Math.random() - 0.5);
    }

    setCards(cardsToUse);
  };

  // === LOAD LẦN ĐẦU ===
  useEffect(() => {
    fetchCards();
    setCurrent(0);
    setScore(0);
    setFinished(false);
    setTimeLeft(INITIAL_TIME);
  }, [fetchCards]);

  // === LÀM LẠI KHI NHẤN "LÀM LẠI" ===
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
    setTimeLeft(INITIAL_TIME);
  }, [reset]);

  // === ĐỒNG HỒ ĐẾM NGƯỢC ===
  useEffect(() => {
    if (timeLeft <= 0 || finished) {
      setFinished(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, finished]);

  // === XỬ LÝ TRẢ LỜI ===
  const handleAnswer = (correct: boolean) => {
    if (correct) setScore(s => s + 1);

    if (current < cards.length - 1) {
      setTimeout(() => setCurrent(c => c + 1), 800);
    } else {
      setFinished(true);
    }
  };

  // === KẾT THÚC (hết giờ hoặc làm xong) ===
  if (finished || timeLeft <= 0) {
    const timeUsed = INITIAL_TIME - timeLeft;
    return (
      <ResultScreen
        score={score}
        total={cards.length}
        timeUsed={timeUsed}
        mode="timed"
        setId={setId!}
      />
    );
  }

  // === ĐANG TẢI ===
  if (cards.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b1220' }}>
        <Text style={{ color: '#fff', fontSize: 18 }}>Đang tải câu hỏi...</Text>
      </View>
    );
  }

  const currentCard = cards[current];

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#0b1220' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
          Câu {current + 1}/{cards.length}
        </Text>

        <Timer seconds={timeLeft} size={52} initialSeconds={INITIAL_TIME} />
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
