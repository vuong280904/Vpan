import axios from 'axios';
import * as expoAv from 'expo-av';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getPronunciationUrl } from '../../utils/jishoApi';

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
const BASE_URL = 'http://vpan-api.onrender.com';
const LOCAL_FRAME_URI = require('../../../assets/images/linhvat.png');
const FINISH_FRAME_URI = require('../../../assets/images/nenlike.png');

// --- Component
const ShadowSentencesScreen: React.FC = () => {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();

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

  // fetch topic
  useEffect(() => {
    if (topicId) fetchTopicDetail(String(topicId));

    return () => {
      (async () => {
        try {
          await playback?.unloadAsync();
        } catch (e) {
          // ignore
        }

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
  }, [topicId]);

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
  
      // quick GET check
      let ok = false;
      try {
        const resp = await fetch(finalUrl, { method: 'GET', cache: 'no-store' });
        ok = resp.ok;
        if (!ok) console.warn('playPronunciation: GET returned', resp.status);
      } catch (e) {
        console.warn('playPronunciation: health check failed', e);
      }
  
      // nếu GET không ok -> download rồi play local
      if (!ok) {
        try {
          const dest = `${(FileSystem as any).cacheDirectory}tts_${encodeURIComponent(text)}.mp3`;
          const dl = await FileSystem.downloadAsync(finalUrl, dest);
          const info = await FileSystem.getInfoAsync(dl.uri);
          if (!info.exists) throw new Error('Downloaded file not exists');
  
          // create and play (local)
          const { sound } = await expoAv.Audio.Sound.createAsync({ uri: dl.uri }, { shouldPlay: true });
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              sound.unloadAsync().catch(() => {});
            }
          });
          return;
        } catch (e) {
          console.warn('playPronunciation: download+play failed', e);
          return;
        }
      }
  
      // play remote directly
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
      mr.onerror = (err: any) => console.error('MediaRecorder error', err);
      mr.onstop = () => {
        try {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const url = URL.createObjectURL(blob);
          setRecordingUri(url);
        } catch (e) {
          setRecordingUri(null);
        } finally {
          audioChunksRef.current = [];
          mediaRecorderRef.current = null;
          setIsRecordingState(false);
        }
      };

      mediaRecorderRef.current = mr;
      mr.start();
      setRecordingUri(null);
      setIsRecordingState(true);
    } catch (err) {
      console.error(err);
      Alert.alert('Lỗi micro', 'Trình duyệt không cho phép ghi âm');
    }
  };

  const stopRecordingWeb = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch (e) {
        console.error(e);
      }
      setTimeout(() => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') setIsRecordingState(false);
      }, 600);
    } else {
      setIsRecordingState(false);
    }
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

  // playback
  const playRecording = async () => {
if (!recordingUri) {
      console.warn('[Shadow] playRecording: no recordingUri');
      return;
    }
    console.log('[Shadow] playRecording uri=', recordingUri);
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
      // reset recording state for the next sentence
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{topic.title}</Text>
        <Text style={styles.headerSubtitle}>{topic.description}</Text>
      </View>

      <View style={styles.container}>
        <View style={styles.progressRow}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressLabel}>Câu {currentIndex + 1} / {totalSentences} · {progressPercent}%</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sentenceHeader}>
            <Text style={styles.sentenceNumber}>#{currentSentence.number}</Text>
            <Text style={styles.sentenceLength}>{currentSentence.text.length} ký tự</Text>
          </View>

          <Text style={styles.sentenceText}>{currentSentence.text}</Text>

          {/* waveform placeholder */}
          <View style={styles.waveformPlaceholder}>
            <Text style={styles.waveformText} onPress={() => playPronunciation(currentSentence.text)}>🔊 Waveform</Text>
          </View>

          <View style={styles.actionsRow}>
            {!isRecording ? (
              <TouchableOpacity onPress={startRecording} style={[styles.bigBtn, styles.btnRecord]} disabled={isSubmitting || finished}>
                <Text style={styles.bigBtnText}>⏺️ Ghi âm</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={stopRecording} style={[styles.bigBtn, styles.btnStop]}>
                <Text style={styles.bigBtnText}>⏹️ Dừng</Text>
              </TouchableOpacity>
            )}

            <View style={styles.rightColumn}>
              <TouchableOpacity onPress={playRecording} disabled={!recordingUri || isRecording} style={[styles.smallBtn, !recordingUri && styles.disabled]}>
                <Text style={styles.smallBtnText}>▶️ Nghe</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={submitAndNext} disabled={!recordingUri || isSubmitting || finished} style={[styles.smallBtn, styles.btnSubmit, (!recordingUri || isSubmitting || finished) && styles.disabled]}>
                <Text style={styles.smallBtnText}>{currentIndex === totalSentences - 1 ? 'Hoàn thành' : 'Chấm & tiếp'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.statusText}>
            {isRecording ? 'Đang ghi âm... Nhấn Dừng khi hoàn tất.' : recordingUri ? 'Bản ghi sẵn sàng — có thể nghe hoặc chấm điểm.' : 'Nhấn Ghi âm để bắt đầu.'}
          </Text>

        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Tổng điểm</Text>
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
            <Text style={styles.modalErrors}>{resultData.errors.length ? 'Lỗi: ' + resultData.errors.join(', ') : 'Hoàn hảo!'}</Text>
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
            <Text style={styles.modalTitle}>Hoàn thành 🎉</Text>
            <Text style={styles.modalSubtitle}>Bạn đã hoàn thành {totalSentences} câu</Text>
            <Text style={styles.modalScore}>Tổng điểm: {totalScore.toFixed(1)}</Text>
            <TouchableOpacity style={[styles.modalOk, styles.modalClose]} onPress={() => setFinishModalVisible(false)}>
              <Text style={styles.modalOkText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// --- Styles (clean, accessible)
const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#0b1220' },
  header: { paddingTop: 18, paddingHorizontal: 18, paddingBottom: 10 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSubtitle: { color: '#94a3b8', marginTop: 6, fontSize: 13 },

  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#9ca3af', marginTop: 12 },

  progressRow: { marginBottom: 12 },
  progressBarBg: { height: 10, backgroundColor: '#111827', borderRadius: 999, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#3b82f6' },
  progressLabel: { marginTop: 8, color: '#cbd5e1', fontSize: 13, fontWeight: '600' },

  card: { backgroundColor: '#0f1724', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1f2a3a', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6 },
  sentenceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sentenceNumber: { color: '#93c5fd', fontWeight: '700' },
  sentenceLength: { color: '#64748b', fontSize: 12 },

  sentenceText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 30, marginBottom: 12 },
  waveformPlaceholder: { height: 56, borderRadius: 8, borderWidth: 1, borderColor: '#1f2937', justifyContent: 'center', alignItems: 'center', marginBottom: 12, backgroundColor: '#071023' },
  waveformText: { color: '#94a3b8' },

  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bigBtn: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, minWidth: 160, alignItems: 'center' },
  btnRecord: { backgroundColor: '#ef4444' },
  btnStop: { backgroundColor: '#f97316' },
  bigBtnText: { color: '#fff', fontWeight: '800' },

  rightColumn: { alignItems: 'flex-end' },
  smallBtn: { marginBottom: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#111827' },
  btnSubmit: { backgroundColor: '#10b981' },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.45 },

  statusText: { marginTop: 12, color: '#9aa4b2', fontSize: 13, textAlign: 'center' },

  totalBox: { marginTop: 18, alignItems: 'center' },
  totalLabel: { color: '#94a3b8', fontSize: 13 },
  totalValue: { color: '#60a5fa', fontSize: 24, fontWeight: '900', marginTop: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(2,6,23,0.7)', justifyContent: 'center', alignItems: 'center', padding: 18 },
  modalCard: { width: '90%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 12, padding: 22, alignItems: 'center', position: 'relative' },
  modalDecor: { width: 600, height: 240, position: 'absolute', top: -120 },
  modalTitle: { fontSize: 20, fontWeight: '900', marginTop: 40, color: '#0b1220' },
  modalSubtitle: { color: '#475569', marginTop: 6 },
  modalScore: { fontSize: 26, fontWeight: '900', color: '#b45309', marginTop: 10 },
  modalErrors: { marginTop: 10, color: '#334155', textAlign: 'center' },
  modalOk: { marginTop: 18, backgroundColor: '#3b82f6', paddingVertical: 12, paddingHorizontal: 36, borderRadius: 10 },
  modalClose: { backgroundColor: '#10b981' },
  modalOkText: { color: '#fff', fontWeight: '800' },
});

export default ShadowSentencesScreen;
