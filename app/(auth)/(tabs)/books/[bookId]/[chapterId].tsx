// app/books/[bookId]/[chapterId].tsx
import { Audio } from 'expo-av';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Âm thanh local → NGHE ĐƯỢC 100% KHÔNG LỖI MẠNG
const PAGE_TURN_SOUND = require('../../../../../assets/sounds/page-turn.mp3');

type Chapter = {
  chapterTitle: string;
  illustration: string;
  content: { text: string; ruby: string; meaning: string }[];
};

const CHAPTERS: Record<string, Chapter> = {
  '1-1': {
    chapterTitle: "Chương 1: Yotsuba chuyển nhà!",
    illustration: "https://m.media-amazon.com/images/I/91+0p+6pOJL._AC_UF1000,1000_QL80_.jpg",
    content: [
      { text: "やっと引っ越してきたね！", ruby: "やっとひっこしてきたね", meaning: "Cuối cùng cũng chuyển nhà xong rồi!" },
      { text: "今日はとーちゃんとお買い物に行くんだよ！", ruby: "きょうはとーちゃんとおかいものにいくんだよ", meaning: "Hôm nay mình sẽ đi siêu thị với bố!" },
      { text: "「やっと会えたね！よろしくね！」", ruby: "やっとあえたね よろしくね", meaning: "Cuối cùng cũng được gặp rồi! Rất vui được làm quen!" },
      { text: "「よつば！」", ruby: "よつば", meaning: "Yotsuba!" },
      { text: "「よつばちゃん！いい名前だね！」", ruby: "よつばちゃん いいなまえだね", meaning: "Yotsuba-chan! Tên hay quá!" },
      { text: "「うん！とーちゃんは世界一優しいんだよ！」", ruby: "うん とーちゃんはせかいいちやさしいんだよ", meaning: "Ừ! Bố là người tốt nhất thế giới luôn!" },
    ]
  },
  '1-2': {
    chapterTitle: "Chương 2: Con ve sầu khổng lồ!",
    illustration: "https://m.media-amazon.com/images/I/91w9SIiIpDL._AC_UF1000,1000_QL80_.jpg",
    content: [
      { text: "「ねえ！見て見て！セミがいるよ！」", ruby: "ねえ みてみて セミがいるよ", meaning: "Này! Nhìn này! Có con ve sầu kìa!" },
      { text: "「とーちゃん！セミ取って！」", ruby: "とーちゃん セミとって", meaning: "Bố ơi! Bắt con ve giúp con!" },
      { text: "「やだー！こわいもん！」", ruby: "やだー こわいもん", meaning: "Không đâu! Sợ lắm!" },
      { text: "「やったー！とーちゃん大好き！」", ruby: "やったー とーちゃんだいすき", meaning: "Yeay! Bố tuyệt nhất!" },
    ]
  },
  '1-3': {
    chapterTitle: "Chương 3: Kem tan chảy!",
    illustration: "https://product.hstatic.net/200000287623/product/yotsuba___tap_3_bia_1_1039b78695e54b10a379b3254d914ac2_grande.png",
    content: [
      { text: "「ただいまー！」", ruby: "ただいまー", meaning: "Con về rồi đây!" },
      { text: "「うん！アイス買ってきたよ！」", ruby: "うん アイスかったよ", meaning: "Ừ! Mua kem về này!" },
      { text: "「早く食べよう！」", ruby: "はやくいべよう", meaning: "Ăn nhanh thôi!" },
      { text: "「アイス大好き！」", ruby: "アイスだいすき", meaning: "Con thích kem lắm!" },
    ]
  }
};

export default function EhonReader() {
  const params = useLocalSearchParams();
  const bookId = Array.isArray(params.bookId) ? params.bookId[0] : (params.bookId ?? '1');
  const chapterId = Array.isArray(params.chapterId) ? params.chapterId[0] : (params.chapterId ?? '1');
  const key = `${bookId}-${chapterId}`;
  const chapter = CHAPTERS[key] ?? CHAPTERS['1-1'];

  const [showTranslation, setShowTranslation] = useState(false);
  const [popup, setPopup] = useState<Chapter['content'][0] | null>(null);
  const [isTurning, setIsTurning] = useState(false);

  const currentNum = parseInt(chapterId || '1', 10);
  const hasPrev = currentNum > 1;
  const hasNext = currentNum < 3;

  // Fade animation
  const fadeAnim = new Animated.Value(1);

  // Phát âm thanh local → NGHE ĐƯỢC NGAY
  const playPageTurnSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        PAGE_TURN_SOUND,
        { shouldPlay: true, volume: 0.8 }
      );
      await sound.playAsync();
      // Tự động dọn dẹp
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('Âm thanh lỗi:', error);
    }
  };

  const goToChapter = (num: number) => {
    if (isTurning) return;
    setIsTurning(true);
    playPageTurnSound();

    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      router.replace(`/books/${bookId}/${num}`);

      // Fade in trang mới
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setIsTurning(false));
    });
  };

  return (
    <View style={styles.container}>
      {/* Trang với hiệu ứng fade */}
      <Animated.View style={[styles.pageContainer, { opacity: fadeAnim }]}>
        <View style={styles.mainLayout}>
          <View style={styles.imageColumn}>
            <Image source={{ uri: chapter.illustration }} style={styles.illustration} resizeMode="contain" />
          </View>

          <View style={styles.contentColumn}>
            <View style={styles.titleContainer}>
              <Text style={styles.chapterTitle}>{chapter.chapterTitle}</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
              {chapter.content.map((line, i) => (
                <View key={i} style={styles.line}>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => setPopup(line)}>
                    <Text style={styles.japaneseText}>{line.text}</Text>
                  </TouchableOpacity>
                  {showTranslation && <Text style={styles.translationText}>{line.meaning}</Text>}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Animated.View>

      {/* Popup */}
      <Modal visible={!!popup} transparent animationType="fade">
        <TouchableOpacity style={styles.popupOverlay} onPress={() => setPopup(null)}>
          <View style={styles.popup}>
            <Text style={styles.popupJp}>{popup?.text}</Text>
            <Text style={styles.popupRuby}>{popup?.ruby}</Text>
            <Text style={styles.popupVn}>{popup?.meaning}</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Thanh điều khiển */}
      <View style={styles.bottomBar} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.navBtn, (!hasPrev || isTurning) && styles.disabled]}
          onPress={() => hasPrev && goToChapter(currentNum - 1)}
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
          onPress={() => hasNext && goToChapter(currentNum + 1)}
          disabled={!hasNext || isTurning}
        >
          <ChevronRight color={hasNext ? "#fff" : "#666"} size={32} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdf6e3' },
  pageContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fdf6e3',
  },
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
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  popupJp: { fontSize: 30, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  popupRuby: { fontSize: 18, color: '#6b7280', marginBottom: 16, fontStyle: 'italic' },
  popupVn: { fontSize: 22, color: '#059669', fontWeight: '600', textAlign: 'center' },
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