import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface Topic {
  _id: string;
  title: string;
  description: string;
}

const BASE_URL = 'http://localhost:5000';
const MASCOT = require('../../../assets/images/linhvat.png');

const ShadowTopicScreen = () => {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      setError(null);
      const res = await axios.get(`${BASE_URL}/api/shadow`);
      setTopics(res.data);
    } catch (err) {
      setError('Không tải được danh sách topic. Kiểm tra server / mạng.');
    } finally {
      setLoading(false);
    }
  };

  const handlePress = (id: string) => {
    router.push({
      pathname: '/(auth)/(tabs)/shadowSentences',
      params: { topicId: id },
    });
  };

  const renderItem = ({ item }: { item: Topic }) => (
    <TouchableOpacity style={styles.card} onPress={() => handlePress(item._id)}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.full}>        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 8 }}>Đang tải topic...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.full}>      
      <View style={styles.banner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Chào mừng bạn</Text>
          <Text style={styles.bannerSubtitle}>đến với lớp luyện nói của Pan</Text>
        </View>
        <Image source={MASCOT} style={styles.mascot} resizeMode="contain" />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {!error && topics.length === 0 && (
        <View style={styles.loadingContainer}>
          <Text>Không có topic nào.</Text>
        </View>
      )}

      {topics.length > 0 && (
        <FlatList
          data={topics}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.container}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  full: {
    flex: 1,
    backgroundColor: '#FFEAF7'  // nền hồng pastel cute anime // tím pastel nhạt hơn, ít chói  // pastel tím nhạt dịu mắt,
  },

  banner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(235, 211, 195, 0.6)',  // banner hồng ngọt kiểu anime // banner dịu hơn, giảm độ rực  // tím pastel nhẹ hơn,
    margin: 12,
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18 , // tăng bóng mềm kiểu anime5,
    shadowRadius: 6,
    elevation: 6,
  },
  bannerTitle: {
    color: '#d33d0bff',
    fontSize: 20,
    fontWeight: '800',
  },
  bannerSubtitle: {
    color: '#d33d0bff',
    fontSize: 14,
    marginTop: 2,
  },
  mascot: {
    width: 110,
    height: 110,
  },

  container: {
    padding: 12,
    paddingTop: 0,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },

  card: {
    flex: 1,
    backgroundColor: '#fff4c6ff',  // card vàng kem nhẹ kiểu anime // thẻ mint sáng hơn, hòa màu hơn  // xanh mint nhạt, hài hòa hơn,
    marginBottom: 12,
    padding: 16,
    borderRadius: 22,  // bo góc tròn hơn cho vibe anime,
    shadowColor: '#000',
    shadowOpacity: 0.18,  // tăng bóng mềm kiểu anime,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: '800' , // font đậm dễ thương,
    marginBottom: 6,
    color: '#4A2C2A'  // nâu soft kiểu anime,
  },
  description: {
    fontSize: 14,
    color: '#6B4E71'  // tím nhạt pastel,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
});

export default ShadowTopicScreen;
