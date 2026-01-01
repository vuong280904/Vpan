import { Ionicons } from '@expo/vector-icons'; // ← Thêm để dùng icon back đẹp
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { styles } from './shadowTopic.styles';

interface Topic {
  _id: string;
  title: string;
  description: string;
}

const BASE_URL = Platform.OS === "web" 
    ? "http://localhost:5000"
    : "http://172.20.10.3:5000";
const MASCOT = require('../../../../assets/images/linhvat.png');

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
      pathname: '/(auth)/(tabs)/shadowing/shadowSentences',
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
          <ActivityIndicator size="large" color="#d33d0bff" />
          <Text style={{ marginTop: 8, color: '#d33d0bff' }}>Đang tải topic...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.full}>
      {/* ==================== HEADER VỚI NÚT BACK ==================== */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.replace("/(auth)/(tabs)")}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={28} color="#d33d0bff" />
        </TouchableOpacity>

        <Text style={styles.pageTitle}>Shadowing</Text>

        {/* View rỗng để cân bằng layout */}
        <View style={{ width: 48 }} />
      </View>

      {/* ==================== BANNER ==================== */}
      <View style={styles.banner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Chào mừng bạn</Text>
          <Text style={styles.bannerSubtitle}>đến với lớp luyện nói của Pan</Text>
        </View>
        <Image source={MASCOT} style={styles.mascot} resizeMode="contain" />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {!error && topics.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Không có topic nào.</Text>
        </View>
      )}

      {topics.length > 0 && (
        <FlatList
          data={topics}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}
    </SafeAreaView>
  );
};

export default ShadowTopicScreen;