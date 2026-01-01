import { Ionicons } from '@expo/vector-icons'; // ← Thêm để có icon back đẹp
import axios from 'axios';
import * as expoAv from 'expo-av';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { getPronunciationUrl } from '../../../utils/jishoApi';
import { styles } from './shadowSentences.styles';

// --- Types
interface Sentence {
  number: number;
  text: string;
}
interface TopicDetail {
  _id?: string;
  title: string;
  description: string;
  sentences: Sentence[];
}

// --- Assets & config
const BASE_URL = 
  Platform.OS === "web" 
    ? "http://localhost:5000"
    : "http://172.20.10.3:5000";
const LOCAL_FRAME_URI = require('../../../../assets/images/linhvat.png');
const FINISH_FRAME_URI = require('../../../../assets/images/nenlike.png');

// --- Component
const ShadowSentencesScreen: React.FC = () => {
  const params = useLocalSearchParams<{
    topicId?: string;
    customSentence?: string;
    customRuby?: string;
    customMeaning?: string;
  }>();
  const { topicId, customSentence, customRuby, customMeaning } = params;

  // data
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // mobile recording
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [finished, setFinished] = useState(false);

  // web recording
  const mediaRecorderRef = useRef<any | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecordingState, setIsRecordingState] = useState(false);

  // playback
  const [playback, setPlayback] = useState<Audio.Sound | null>(null);

  // modals
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [finishModalVisible, setFinishModalVisible] = useState(false);
  const [resultData, setResultData] = useState({
    score: 0,
    errors: [] as string[],
    sentenceNumber: 0,
    totalAfter: 0,
    isLast: false,
  });

  // fetch topic or use custom
  useEffect(() => {
    if (customSentence) {
      // Custom mode: tạo topic tạm với 1 câu
      const customTopic: TopicDetail = {
        title: 'Luyện nói câu tùy chỉnh',
        description: customMeaning || 'Từ sách song ngữ',
        sentences: [
          {
            number: 1,
            text: customSentence.trim(),
          },
        ],
      };
      setTopic(customTopic);
      setLoading(false);
      return;
    }

    // Normal mode: fetch từ server
    if (topicId) {
      fetchTopicDetail(String(topicId));
    } else {
      Alert.alert('Lỗi', 'Không có dữ liệu để luyện nói');
      setLoading(false);
    }

    return () => {
      (async () => {
        try {
          await playback?.unloadAsync();
        } catch (e) {}

        if (streamRef.current) {
          try {
            streamRef.current.getTracks().forEach((t) => t.stop());
          } catch (e) {}
          streamRef.current = null;
        }

        if (recording) {
          try {
            await recording.stopAndUnloadAsync();
          } catch (e) {}
        }
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, customSentence]);

  const fetchTopicDetail = async (id: string) => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/shadow/${id}`);
      setTopic(res.data);
    } catch (err) {
      console.error(err);
      Alert.alert('Lỗi', 'Không tải được dữ liệu topic.');
    } finally {
      setLoading(false);
    }
  };

  const playPronunciation = async (text: string) => {
    if (!text) return;
    try {
      const url = await getPronunciationUrl(text);
      if (!url) return;

      console.log('playPronunciation url=', url);

      if (Platform.OS === 'web') {
        const audio = new (window as any).Audio(url);
        audio.play().catch((e: any) => console.warn('Web audio play failed', e));
        return;
      }

      let finalUrl = url;
      if (!/^https?:\/\//i.test(finalUrl) && !finalUrl.startsWith('file://')) {
        finalUrl = encodeURI(finalUrl);
      }

      let ok = false;
      try {
        const resp = await fetch(finalUrl, { method: 'GET', cache: 'no-store' });
        ok = resp.ok;
      } catch (e) {}

      if (!ok) {
        try {
          const dest = `${(FileSystem as any).cacheDirectory}tts_${encodeURIComponent(text)}.mp3`;
          const dl = await FileSystem.downloadAsync(finalUrl, dest);
          const info = await FileSystem.getInfoAsync(dl.uri);
          if (!info.exists) throw new Error('Download failed');

          const { sound } = await expoAv.Audio.Sound.createAsync({ uri: dl.uri }, { shouldPlay: true });
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              sound.unloadAsync().catch(() => {});
            }
          });
          return;
        } catch (e) {
          console.warn('download+play failed', e);
          return;
        }
      }

      const { sound } = await expoAv.Audio.Sound.createAsync({ uri: finalUrl }, { shouldPlay: true });
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch (err) {
      console.error('Lỗi phát âm:', err);
    }
  };

  const currentSentence = topic?.sentences?.[currentIndex] ?? null;
  const totalSentences = topic?.sentences?.length ?? 0;
  const isCustomMode = !!customSentence;

  // ---------------- Mobile recording ----------------
  const startRecordingMobile = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền micro');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recResult = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recResult.recording);
      setRecordingUri(null);
    } catch (err) {
      console.error(err);
      Alert.alert('Lỗi', 'Không thể ghi âm');
    }
  };

  const stopRecordingMobile = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
    } catch (e) {}
    try {
      const uri = recording.getURI();
      setRecordingUri(uri ?? null);
    } catch (e) {
      setRecordingUri(null);
    } finally {
      setRecording(null);
    }
  };

  // ---------------- Web recording ----------------
  const startRecordingWeb = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const MediaRecorderClass = (window as any).MediaRecorder;
      if (!MediaRecorderClass) {
        Alert.alert('Trình duyệt không hỗ trợ ghi âm');
        return;
      }
      const mr = new MediaRecorderClass(stream);
      audioChunksRef.current = [];

      mr.onstart = () => setIsRecordingState(true);
      mr.ondataavailable = (e: any) => e.data && e.data.size > 0 && audioChunksRef.current.push(e.data);
      mr.onstop = () => {
        try {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const url = URL.createObjectURL(blob);
          setRecordingUri(url);
        } catch (e) {
          setRecordingUri(null);
        } finally {
          audioChunksRef.current = [];
          setIsRecordingState(false);
        }
      };

      mediaRecorderRef.current = mr;
      mr.start();
      setRecordingUri(null);
    } catch (err) {
      console.error(err);
      Alert.alert('Lỗi micro', 'Trình duyệt không cho phép ghi âm');
    }
  };

  const stopRecordingWeb = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    setIsRecordingState(false);
  };

  const startRecording = () => {
    if (Platform.OS === 'web') startRecordingWeb();
    else startRecordingMobile();
  };

  const stopRecording = () => {
    if (Platform.OS === 'web') stopRecordingWeb();
    else stopRecordingMobile();
  };

  const isRecording = Platform.OS === 'web' ? isRecordingState : !!recording;

  // playback recording của người dùng
  const playRecording = async () => {
    if (!recordingUri) return;
    try {
      await playback?.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri: recordingUri }, { shouldPlay: true });
      setPlayback(sound);
    } catch (err) {
      console.error('[Shadow] playRecording error', err);
      Alert.alert('Lỗi phát');
    }
  };

  // submit & next
  const submitAndNext = async () => {
    if (!currentSentence || !recordingUri) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const resp = await fetch(recordingUri);
        const blob = await resp.blob();
        formData.append('audio', blob, 'shadow.wav');
      } else {
        formData.append('audio', { uri: recordingUri, name: 'shadow.wav', type: 'audio/wav' } as any);
      }
      formData.append('text', currentSentence.text);

      const res = await axios.post(`${BASE_URL}/api/shadow/predict`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      const { score, errors } = res.data;
      const newTotal = totalScore + score;
      setTotalScore(newTotal);

      setResultData({
        score,
        errors,
        sentenceNumber: currentSentence.number,
        totalAfter: newTotal,
        isLast: currentIndex === totalSentences - 1,
      });

      setResultModalVisible(true);
    } catch (err) {
      console.error(err);
      Alert.alert('Lỗi', 'Không thể chấm điểm');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResultOk = () => {
    setResultModalVisible(false);
    if (resultData.isLast) {
      setFinished(true);
      setFinishModalVisible(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setRecordingUri(null);
    }
  };

  // ---------------- Render ----------------
  if (loading || !topic || !currentSentence) {
    return (
      <SafeAreaView style={styles.full}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progressPercent = totalSentences ? Math.round(((currentIndex + 1) / totalSentences) * 100) : 0;

  return (
    <SafeAreaView style={styles.full}>
      <TouchableOpacity 
          onPress={() => router.replace("/(auth)/(tabs)/shadowing/shadowTopic")}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isCustomMode ? 'Luyện nói câu tùy chỉnh' : topic.title}
        </Text>
        <Text style={styles.headerSubtitle}>
          {isCustomMode ? (customMeaning || 'Shadowing nhanh từ sách') : topic.description}
        </Text>
      </View>

      <View style={styles.container}>
        <View style={styles.progressRow}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            Câu {currentIndex + 1} / {totalSentences} · {progressPercent}%
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sentenceHeader}>
            <Text style={styles.sentenceNumber}>#{currentSentence.number}</Text>
            <Text style={styles.sentenceLength}>{currentSentence.text.length} ký tự</Text>
          </View>

          <Text style={styles.sentenceText}>{currentSentence.text}</Text>

          {/* Furigana nếu có (chỉ ở custom mode) */}
          {customRuby && (
            <Text style={styles.rubyText}>【{customRuby}】</Text>
          )}

          {/* Nút nghe mẫu */}
          <TouchableOpacity
            onPress={() => playPronunciation(currentSentence.text)}
            style={styles.sampleBtn}
          >
            <Text style={styles.sampleBtnText}>🔊 Nghe mẫu</Text>
          </TouchableOpacity>

          {/* Waveform placeholder */}
          <View style={styles.waveformPlaceholder}>
            <Text style={styles.waveformText}>
              {isRecording ? '🔴 Đang ghi âm...' : recordingUri ? '✅ Đã ghi âm xong' : 'Sẵn sàng ghi âm'}
            </Text>
          </View>

          <View style={styles.actionsRow}>
            {!isRecording ? (
              <TouchableOpacity onPress={startRecording} style={[styles.bigBtn, styles.btnRecord]} disabled={isSubmitting}>
                <Text style={styles.bigBtnText}>⏺️ Ghi âm</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={stopRecording} style={[styles.bigBtn, styles.btnStop]}>
                <Text style={styles.bigBtnText}>⏹️ Dừng</Text>
              </TouchableOpacity>
            )}

            <View style={styles.rightColumn}>
              <TouchableOpacity
                onPress={playRecording}
                disabled={!recordingUri || isRecording}
                style={[styles.smallBtn, (!recordingUri || isRecording) && styles.disabled]}
              >
                <Text style={styles.smallBtnText}>▶️ Nghe lại</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submitAndNext}
                disabled={!recordingUri || isSubmitting}
                style={[styles.smallBtn, styles.btnSubmit, (!recordingUri || isSubmitting) && styles.disabled]}
              >
                <Text style={styles.smallBtnText}>
                  {currentIndex === totalSentences - 1 ? 'Hoàn thành' : 'Chấm & tiếp'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.statusText}>
            {isRecording
              ? 'Đang ghi âm... Nói to và rõ ràng nhé!'
              : recordingUri
              ? 'Bản ghi đã sẵn sàng. Nghe lại hoặc chấm điểm.'
              : 'Nhấn "Ghi âm" để bắt đầu luyện nói.'}
          </Text>
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Tổng điểm hiện tại</Text>
          <Text style={styles.totalValue}>{totalScore.toFixed(1)}</Text>
        </View>
      </View>

      {/* Result Modal */}
      <Modal animationType="fade" transparent visible={resultModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Image source={LOCAL_FRAME_URI} style={styles.modalDecor} resizeMode="contain" />
            <Text style={styles.modalTitle}>Câu {resultData.sentenceNumber}</Text>
            <Text style={styles.modalScore}>Điểm: {resultData.score.toFixed(1)}</Text>
            <Text style={styles.modalErrors}>
              {resultData.errors.length ? 'Lỗi: ' + resultData.errors.join(', ') : 'Tuyệt vời! Hoàn hảo! 🎉'}
            </Text>
            <TouchableOpacity style={styles.modalOk} onPress={onResultOk}>
              <Text style={styles.modalOkText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Finish Modal */}
      <Modal animationType="fade" transparent visible={finishModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Image source={FINISH_FRAME_URI} style={styles.modalDecor} resizeMode="contain" />
            <Text style={styles.modalTitle}>Hoàn thành! 🎉</Text>
            <Text style={styles.modalSubtitle}>Bạn đã luyện xong {totalSentences} câu</Text>
            <Text style={styles.modalScore}>Tổng điểm: {totalScore.toFixed(1)}</Text>
            <TouchableOpacity style={[styles.modalOk, styles.modalClose]} onPress={() => router.back()}>
              <Text style={styles.modalOkText}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ShadowSentencesScreen;