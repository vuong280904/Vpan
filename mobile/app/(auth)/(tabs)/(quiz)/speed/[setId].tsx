// app/(auth)/(quiz)/speed/[setId].tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import QuestionCard from '../../../../../components/Quiz/QuestionCard';
import ResultScreen from '../../../../../components/Quiz/ResultScreen';
import api from '../../../../utils/api';

const API_URL = Platform.OS === "web" 
    ? "http://localhost:5000/api"
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
  const params = useLocalSearchParams<{ setId: string; reset?: string }>();
  const { setId, reset } = params;

  const [cards, setCards] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [finished, setFinished] = useState(false);

  const fetchCards = useCallback(async () => {
    if (!setId) return;

    try {
      // ƯU TIÊN DÙNG PUBLIC API TRƯỚC → an toàn, không gây lỗi 401
      const publicRes = await fetch(`${API_URL}/flashcard-sets/public/${setId}/flashcards`);

      if (publicRes.ok) {
        const publicData = await publicRes.json();
        const shuffled = [...publicData].sort(() => Math.random() - 0.5);
        setCards(shuffled);
        return; // Thành công với public → thoát luôn
      }

      // Nếu public lỗi (404 hoặc khác) → thử private (chỉ khi có token)
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Bộ thẻ không công khai và bạn chưa đăng nhập');
      }

      // Dùng API private
      const privateRes = await api.get(`/api/flashcard-sets/${setId}/flashcards`);
      const shuffled = [...privateRes.data].sort(() => Math.random() - 0.5);
      setCards(shuffled);

    } catch (err) {
      console.error('Lỗi tải flashcard cho Speed Run:', err);
      Alert.alert('Lỗi', 'Không thể tải bộ thẻ để làm quiz. Bộ này có thể không công khai hoặc không tồn tại.');
      router.back();
    }
  }, [setId]);

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