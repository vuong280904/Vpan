import { getPronunciationUrl, searchJapaneseWord } from '@/api/jishoApi';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useState } from 'react';
import {
  ActivityIndicator, Dimensions, Image, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import Carousel from 'react-native-reanimated-carousel';

const { width } = Dimensions.get('window');

// Kiểu dữ liệu từ server
interface JapaneseWord {
  japanese: { word?: string; reading?: string }[];
  senses: { english_definitions: string[] }[];
}

// Kiểu dữ liệu hiển thị trong state
interface ResultItem {
  word: string;
  reading: string;
  meanings: string;
}

export default function HomeScreen() {
  const slides = [
    { id: 1, image: require('../../assets/images/quangcao4.png') },
    { id: 2, image: require('../../assets/images/quangcao5.png') },
    { id: 3, image: require('../../assets/images/quangcao3.png') },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔍 Gọi server Node.js
  const handleSearch = async () => {
    if (!search.trim()) return;

    setLoading(true);
    setResults([]);

    try {
      const data: JapaneseWord[] = await searchJapaneseWord(search);

      const formatted: ResultItem[] = data.map((item: JapaneseWord) => ({
        word: item.japanese[0]?.word || item.japanese[0]?.reading || '',
        reading: item.japanese[0]?.reading || '',
        meanings: item.senses
          ?.flatMap((s: { english_definitions: string[] }) => s.english_definitions)
          .slice(0, 3)
          .join(', ') || '',
      }));

      setResults(formatted);
    } catch (err) {
      console.error('Lỗi khi tìm từ:', err);
    } finally {
      setLoading(false);
    }
  };

  // Play TTS pronunciation (reading preferred, fallback to word)
  const playPronunciation = async (text: string) => {
    if (!text) return;
    try {
      const url = await getPronunciationUrl(text);
      if (!url) return;

      if (Platform.OS === 'web') {
        // Use browser Audio on web (expo-av has limited web support)
        try {
          const WebAudioCtor: any = (globalThis as any).Audio;
          if (!WebAudioCtor) throw new Error('Audio not supported in this environment');

          // Create element, set crossOrigin BEFORE assigning src
          const audio: any = new WebAudioCtor();
          try { audio.crossOrigin = 'anonymous'; } catch (e) {}
          audio.preload = 'auto';
          audio.src = url;

          audio.onerror = (ev: any) => {
            console.error('Web audio load error:', ev);
          };

          // play returns a promise in modern browsers
          const playPromise = audio.play();
          if (playPromise && typeof playPromise.then === 'function') {
            await playPromise;
          }

          audio.addEventListener('ended', () => {
            try { audio.pause(); audio.src = ''; } catch (e) {}
          });
        } catch (err) {
          console.error('Web audio error:', err);
        }
        return;
      }

      // Native (iOS/Android) playback using expo-av
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status && 'didJustFinish' in status && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (err) {
      console.error('Lỗi khi phát âm:', err);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/images/logoVpan.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <TouchableOpacity>
          <Image
            source={require('../../assets/images/react-logo.png')}
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>

      {/* Carousel */}
      <View style={styles.carouselContainer}>
        <Carousel
          loop
          width={width}
          height={180}
          autoPlay
          autoPlayInterval={3000}
          data={slides}
          scrollAnimationDuration={1000}
          onSnapToItem={(index) => setCurrentIndex(index)}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <Image source={item.image} style={styles.slideImage} resizeMode="cover" />
            </View>
          )}
        />

        {/* Dot indicator */}
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, { opacity: currentIndex === index ? 1 : 0.3 }]}
            />
          ))}
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Nhập từ tiếng Nhật..."
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity onPress={handleSearch}>
          <Ionicons name="search" size={22} color="#444" style={styles.searchIcon} />
        </TouchableOpacity>
      </View>

      {/* Kết quả tìm kiếm */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 10 }} />
      ) : results.length > 0 ? (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultTitle}>Kết quả tìm kiếm:</Text>
          {results.map((item: ResultItem, index: number) => (
            <View key={index} style={styles.resultItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.word}>{item.word}</Text>
                  {item.reading ? <Text style={styles.reading}>[{item.reading}]</Text> : null}
                  <Text style={styles.meaning}>{item.meanings}</Text>
                </View>
                <TouchableOpacity onPress={() => playPronunciation(item.reading || item.word)} style={styles.playButton}>
                  <Ionicons name="volume-high-outline" size={22} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Grid chức năng */}
      <View style={styles.grid}>
        <TouchableOpacity style={[styles.card, { backgroundColor: '#FAD9E6' }]}>
          <Ionicons name="albums-outline" size={32} color="#fff" />
          <Text style={styles.cardText}>Flash card</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, { backgroundColor: '#F9C4C1' }]}>
          <Ionicons name="pencil" size={32} color="#fff" />
          <Text style={styles.cardText}>Luyện Thi</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, { backgroundColor: '#F5D999' }]}>
          <Ionicons name="mic" size={32} color="#fff" />
          <Text style={styles.cardText}>Shadowing</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, { backgroundColor: '#B9C9F5' }]}>
          <Ionicons name="book" size={32} color="#fff" />
          <Text style={styles.cardText}>Sách Song Ngữ</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EAF9FF', paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  logo: { width: 180, height: 60 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  carouselContainer: { alignItems: 'center', marginBottom: 15 },
  slide: { borderRadius: 12, overflow: 'hidden', alignItems: 'center' },
  slideImage: { width: width * 0.9, height: 180, borderRadius: 12 },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 20, paddingHorizontal: 10, paddingVertical: 8, boxShadow: '0px 3px 6px rgba(0,0,0,0.05)', marginBottom: 25 },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },
  searchIcon: { marginLeft: 8 },
  resultsContainer: { marginTop: 10, paddingHorizontal: 16 },
  resultTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  resultItem: { backgroundColor: '#f5f5f5', borderRadius: 10, padding: 12, marginBottom: 10 },
  word: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  reading: { fontSize: 16, color: '#555', marginVertical: 4 },
  meaning: { fontSize: 15, color: '#666' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15 },
  card: { width: width * 0.4, height: 100, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  cardText: { marginTop: 8, color: '#fff', fontWeight: '600', fontSize: 14 },
  playButton: { marginLeft: 12, padding: 8 },
});
