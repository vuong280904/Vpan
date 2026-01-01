// app/level-test/[level].tsx
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    Modal,
    SafeAreaView,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import api from '../../../utils/api';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

const QUESTIONS: Record<'N5' | 'N4' | 'N3' | 'N2' | 'N1', Question[]> = {
  N5: [
    { question: "これは _____ です。", options: ["本", "水", "車", "食べ物"], correctAnswer: 0 },
    { question: "私は学生 _____ 。", options: ["です", "でした", "じゃない", "あります"], correctAnswer: 0 },
    { question: "読み方: 山", options: ["やま", "かわ", "うみ", "そら"], correctAnswer: 0 },
    { question: "昨日、映画を _____ 。", options: ["見ました", "食べました", "行きました", "飲みました"], correctAnswer: 0 },
    { question: "これは _____ 本ですか？", options: ["誰の", "どれの", "どの", "何の"], correctAnswer: 3 },
    { question: "お茶を _____ ください。", options: ["あげます", "くれます", "もらいます", "ください"], correctAnswer: 3 },
    { question: "読み方: 食べる", options: ["たべる", "のむ", "みる", "ねる"], correctAnswer: 0 },
    { question: "友達 _____ 来ます。", options: ["が", "を", "に", "で"], correctAnswer: 0 },
    { question: "今、何時 _____ か。", options: ["です", "ですか", "ですかね", "ですね"], correctAnswer: 1 },
    { question: "これは _____ ですか？", options: ["高い", "高いです", "高いですか", "高かったです"], correctAnswer: 2 },
  ],

  N4: [
    { question: "毎日、7時に _____ 。", options: ["起きます", "寝ます", "食べます", "行きます"], correctAnswer: 0 },
    { question: "本を _____ います。", options: ["読み", "読んで", "読む", "読んだ"], correctAnswer: 1 },
    { question: "日本へ _____ に行きますか？", options: ["いつ", "どこ", "だれ", "なぜ"], correctAnswer: 0 },
    { question: "雨が _____ から、出かけません。", options: ["降って", "降る", "降った", "降ります"], correctAnswer: 0 },
    { question: "読み方: 学校", options: ["がっこう", "びょういん", "えき", "としょかん"], correctAnswer: 0 },
    { question: "これは _____ より大きいです。", options: ["それ", "あれ", "これ", "どれ"], correctAnswer: 0 },
    { question: "日本語を _____ 勉強します。", options: ["毎日", "毎日で", "毎日を", "毎日が"], correctAnswer: 0 },
    { question: "友達に _____ をあげました。", options: ["プレゼント", "プレゼントを", "プレゼントに", "プレゼントが"], correctAnswer: 0 },
    { question: "読み方: 買う", options: ["かう", "いく", "くる", "する"], correctAnswer: 0 },
    { question: "映画は _____ 面白かったです。", options: ["とても", "とてもに", "とてもで", "とてもが"], correctAnswer: 0 },
  ],

  N3: [
    { question: "雨が降る _____ 、傘を持って行きなさい。", options: ["なら", "とき", "前に", "あとで"], correctAnswer: 0 },
    { question: "この問題は _____ 難しいです。", options: ["かなり", "たいへん", "ちょっと", "あまり"], correctAnswer: 0 },
    { question: "彼は _____ から、日本語が上手です。", options: ["毎日勉強する", "毎日勉強している", "毎日勉強した", "毎日勉強して"], correctAnswer: 1 },
    { question: "読み方: 環境", options: ["かんきょう", "けいざい", "ぶんか", "れきし"], correctAnswer: 0 },
    { question: "この本は _____ 読む価値があります。", options: ["ぜひ", "きっと", "たぶん", "もしかして"], correctAnswer: 0 },
    { question: "電車 _____ 遅れてしまいました。", options: ["に", "で", "を", "が"], correctAnswer: 1 },
    { question: "この服は _____ 着てみてください。", options: ["一度", "一回", "一度に", "一回に"], correctAnswer: 0 },
    { question: "日本語の勉強 _____ 続けています。", options: ["を", "に", "で", "が"], correctAnswer: 0 },
    { question: "彼は _____ 医者になりたいと言っています。", options: ["どうしても", "どうにか", "どうでも", "どうか"], correctAnswer: 0 },
    { question: "この映画は _____ 見るべきです。", options: ["絶対に", "もちろん", "たぶん", "もしかして"], correctAnswer: 0 },
  ],

  N2: [
    { question: "この計画は _____ 実行に移すべきだ。", options: ["早急に", "急に", "すぐに", "やがて"], correctAnswer: 0 },
    { question: "彼の意見に _____ 賛成です。", options: ["完全に", "まったく", "ほとんど", "少しも"], correctAnswer: 0 },
    { question: "この問題の解決 _____ 努力しています。", options: ["に", "へ", "を", "で"], correctAnswer: 0 },
    { question: "読み方: 懸念", options: ["けねん", "けんねん", "かんねん", "けんえん"], correctAnswer: 0 },
    { question: "この資料は _____ 参考になります。", options: ["大いに", "たいして", "あまり", "少しも"], correctAnswer: 0 },
    { question: "彼は _____ 失敗しても諦めない。", options: ["何度", "何回", "何度も", "何回も"], correctAnswer: 0 },
    { question: "この結果は _____ 予想外だった。", options: ["まさに", "ちょうど", "たぶん", "もしかして"], correctAnswer: 0 },
    { question: "この技術は _____ 実用化が難しい。", options: ["まだ", "もう", "すでに", "いまに"], correctAnswer: 0 },
    { question: "彼の行動は _____ 理解しがたい。", options: ["実に", "実に", "とても", "かなり"], correctAnswer: 0 },
    { question: "この政策は _____ 効果を上げている。", options: ["着実に", "急に", "すぐに", "やがて"], correctAnswer: 0 },
  ],

  N1: [
    { question: "この現象は _____ 解明されていない。", options: ["未だに", "すでに", "いまに", "やがて"], correctAnswer: 0 },
    { question: "彼の主張は _____ 根拠を欠いている。", options: ["決定的に", "明らかに", "全く", "少しも"], correctAnswer: 0 },
    { question: "この問題は _____ 深刻化している。", options: ["ますます", "だんだん", "次第に", "徐々に"], correctAnswer: 0 },
    { question: "読み方: 憂慮", options: ["ゆうりょ", "ゆうろ", "ゆりょ", "ゆうり"], correctAnswer: 0 },
    { question: "この決定は _____ 避けられなかった。", options: ["やむを得ず", "わざと", "わざわざ", "たまたま"], correctAnswer: 0 },
    { question: "彼の態度には _____ 違和感を覚える。", options: ["ある種の", "何らかの", "いくつかの", "すべての"], correctAnswer: 0 },
    { question: "この理論は _____ 実証されていない。", options: ["依然として", "すでに", "もう", "いまに"], correctAnswer: 0 },
    { question: "この状況下では _____ 慎重を期すべきだ。", options: ["一層", "さらに", "もっと", "ますます"], correctAnswer: 0 },
    { question: "彼の発言は _____ 皮肉を含んでいた。", options: ["微かに", "明らかに", "全く", "少しも"], correctAnswer: 0 },
    { question: "この政策は _____ 抜本的な改革を要する。", options: ["まさに", "ちょうど", "たぶん", "もしかして"], correctAnswer: 0 },
  ],
};

const LEVEL_ORDER = ['N5', 'N4', 'N3', 'N2', 'N1'];
const INDEX_MAP = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };

export default function LevelTestScreen() {
  const { level } = useLocalSearchParams<{ level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' }>();

  if (!level || !QUESTIONS[level]) {
    // Modal lỗi level không hợp lệ
    return (
      <Modal visible transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#1e293b', padding: 24, borderRadius: 16, width: '85%', alignItems: 'center' }}>
            <Text style={{ color: '#ef4444', fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>Lỗi</Text>
            <Text style={{ color: '#cbd5e1', fontSize: 16, textAlign: 'center', marginBottom: 24 }}>
              Level không hợp lệ. Vui lòng thử lại.
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ backgroundColor: '#3b82f6', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const questions = QUESTIONS[level];

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Modal states
  const [showNoAnswerModal, setShowNoAnswerModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [finalResult, setFinalResult] = useState<{ score: number; level: string } | null>(null);

  const handleAnswer = (index: number) => {
    setSelected(index);
  };

  const handleNext = () => {
    if (selected === null) {
      setShowNoAnswerModal(true);
      return;
    }

    // Tính điểm
    if (selected === questions[currentQ].correctAnswer) {
      setScore(score + 1);
    }

    if (currentQ < 9) {
      setCurrentQ(currentQ + 1);
      setSelected(null);
    } else {
      finishTest(score + (selected === questions[currentQ].correctAnswer ? 1 : 0));
    }
  };

  const finishTest = async (finalScore: number) => {
    setSubmitting(true);

    let finalLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' = level;

    if (finalScore >= 6) {
      // Giữ nguyên
    } else if (finalScore >= 3) {
      const idx = INDEX_MAP[level];
      if (idx > 0) finalLevel = LEVEL_ORDER[idx - 1] as any;
    } else {
      const idx = INDEX_MAP[level];
      finalLevel = idx >= 2 ? (LEVEL_ORDER[idx - 2] as any) : 'N5';
    }

    try {
      await api.patch('/api/users/me/onboarding', { level: finalLevel });

      setFinalResult({ score: finalScore, level: finalLevel });
      setShowSuccessModal(true);
    } catch (err: any) {
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const q = questions[currentQ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      {/* Progress header */}
      <View style={{ padding: 20 }}>
        <Text style={{ color: '#94a3b8', fontSize: 16, marginBottom: 8 }}>
          Bài kiểm tra trình độ {level}
        </Text>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>
          Câu {currentQ + 1}/10
        </Text>
        <View style={{ height: 8, backgroundColor: '#1e293b', borderRadius: 4, marginVertical: 16 }}>
          <View
            style={{
              width: `${((currentQ + 1) / 10) * 100}%`,
              height: '100%',
              backgroundColor: '#3b82f6',
              borderRadius: 4,
            }}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
        <Text style={{ color: '#fff', fontSize: 22, marginBottom: 32, lineHeight: 36, fontWeight: '500' }}>
          {q.question}
        </Text>

        {q.options.map((opt, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => handleAnswer(idx)}
            disabled={submitting}
            style={{
              backgroundColor: selected === idx ? '#3b82f6' : '#1e293b',
              padding: 20,
              borderRadius: 14,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: selected === idx ? '#3b82f6' : '#334155',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 18 }}>
              {String.fromCharCode(65 + idx)}. {opt}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={handleNext}
          disabled={selected === null || submitting}
          style={{
            backgroundColor: selected !== null ? '#10b981' : '#334155',
            padding: 20,
            borderRadius: 16,
            marginTop: 40,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 19 }}>
            {currentQ === 9 ? 'Hoàn thành bài kiểm tra' : 'Tiếp theo'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ==================== MODALS ==================== */}

      {/* Modal chưa chọn đáp án */}
      <Modal visible={showNoAnswerModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#1e293b', padding: 24, borderRadius: 16, width: '85%', alignItems: 'center' }}>
            <Text style={{ color: '#fbbf24', fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>Chưa chọn đáp án</Text>
            <Text style={{ color: '#cbd5e1', fontSize: 16, textAlign: 'center', marginBottom: 24 }}>
              Vui lòng chọn một đáp án trước khi tiếp tục.
            </Text>
            <TouchableOpacity
              onPress={() => setShowNoAnswerModal(false)}
              style={{ backgroundColor: '#3b82f6', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal lỗi lưu kết quả */}
      <Modal visible={showErrorModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#1e293b', padding: 24, borderRadius: 16, width: '85%', alignItems: 'center' }}>
            <Text style={{ color: '#ef4444', fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>Lỗi</Text>
            <Text style={{ color: '#cbd5e1', fontSize: 16, textAlign: 'center', marginBottom: 24 }}>
              Không thể lưu kết quả. Vui lòng kiểm tra kết nối và thử lại.
            </Text>
            <TouchableOpacity
              onPress={() => setShowErrorModal(false)}
              style={{ backgroundColor: '#ef4444', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal hoàn thành thành công */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#1e293b', padding: 28, borderRadius: 20, width: '90%', alignItems: 'center' }}>
            <Text style={{ fontSize: 32, marginBottom: 16 }}>Hoàn thành!</Text>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 12 }}>
              Bạn đạt {finalResult?.score}/10 câu đúng
            </Text>
            <Text style={{ color: '#10b981', fontSize: 28, fontWeight: '800', marginVertical: 20 }}>
              Trình độ: {finalResult?.level}
            </Text>
            <Text style={{ color: '#cbd5e1', fontSize: 16, textAlign: 'center', marginBottom: 32 }}>
              Chào mừng bạn bắt đầu hành trình học tiếng Nhật! 🇯🇵
            </Text>
            <TouchableOpacity
              onPress={() => router.replace('/(auth)/(tabs)') as any} // hoặc đường dẫn dashboard của bạn
              style={{ backgroundColor: '#10b981', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 16 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>Vào học ngay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}