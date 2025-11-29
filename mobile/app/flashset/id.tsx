import "@/services/config"
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Platform, // <-- THÊM DÒNG NÀY
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getItemAsync } from 'expo-secure-store';
import { API_BASE_URL } from '@/services/config';
import { styles } from './id.style';

const getAuthToken = async () => {
  return getItemAsync('token');
};

export default function FlashSetDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [setDetails, setSetDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSetDetails = useCallback(async () => {
    try {
      setError(null);
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Lỗi', 'Bạn chưa đăng nhập');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/flashcard-sets/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok) {
        setSetDetails(data);
      } else {
        throw new Error(data.message || 'Không tải được bộ flashcard');
      }
    } catch (err: any) {
      setError(err.message);
      Alert.alert('Lỗi', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSetDetails();
  }, [fetchSetDetails]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSetDetails();
  }, [fetchSetDetails]);

  // === HÀM XÓA SET – HOẠT ĐỘNG 100% TRÊN WEB + MOBILE ===
    // HÀM XÓA SET CÓ LOG SIÊU CHI TIẾT – DÁN ĐÈ LÊN HÀM CŨ
  const handleDeleteSet = () => {
    console.log('BƯỚC 1: NÚT XÓA SET ĐƯỢC BẤM');

    const confirmDelete = () => {
      if (Platform.OS === 'web') {
        console.log('WEB: Hiện window.confirm');
        return window.confirm('XÓA TOÀN BỘ FLASHCARD SET NÀY?\nKhông thể hoàn tác!');
      } else {
        return new Promise<boolean>((resolve) => {
          Alert.alert(
            'Xóa bộ flashcard',
            'Tất cả flashcard sẽ bị xóa vĩnh viễn!',
            [
              { text: 'Hủy', style: 'cancel', onPress: () => {
                console.log('MOBILE: Người dùng bấm HỦY');
                resolve(false);
              }},
              { text: 'Xóa', style: 'destructive', onPress: () => {
                console.log('MOBILE: Người dùng bấm XÓA');
                resolve(true);
              }},
            ],
            { cancelable: true }
          );
        });
      }
    };

    confirmDelete().then((confirmed) => {
      console.log('KẾT QUẢ XÁC NHẬN →', confirmed ? 'ĐỒNG Ý XÓA' : 'HỦY');
      if (confirmed) deleteSetNow();
    });
  };

  // HÀM XÓA THỰC TẾ – CÓ LOG ĐẦY ĐỦ
  const deleteSetNow = async () => {
    console.log('\nBƯỚC 2: BẮT ĐẦU GỌI API XÓA SET');
    console.log('Set ID        :', id);
    console.log('Platform      :', Platform.OS);
    console.log('API_BASE_URL  :', API_BASE_URL);
    console.log('URL đầy đủ    :', `${API_BASE_URL}/api/flashcard-sets/${id}`);

    try {
      const token = await getAuthToken();
      console.log('Token tồn tại :', !!token);
      if (token) console.log('Token (20 ký tự đầu):', token.substring(0, 20) + '...');

      if (!token) {
        Platform.OS === 'web' ? window.alert('Chưa đăng nhập') : Alert.alert('Lỗi', 'Chưa đăng nhập');
        return;
      }

      console.log('ĐANG GỬI DELETE request...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(`${API_BASE_URL}/api/flashcard-sets/${id}`, {
        method: 'DELETE',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      console.log('NHẬN RESPONSE');
      console.log('Status  :', res.status);
      console.log('OK?     :', res.ok);

      const data = await res.json();
      console.log('Body    :', data);

      if (res.ok) {
        console.log('XÓA THÀNH CÔNG!');
        if (Platform.OS === 'web') {
          window.alert('Đã xóa bộ flashcard thành công!');
          // Web thì reload trang hoặc chuyển hướng
          window.location.href = '/flashcards';
        } else {
          Alert.alert('Thành công', 'Đã xóa bộ flashcard!', [{ text: 'OK', onPress: () => router.back() }]);
        }
      } else {
        console.log('XÓA THẤT BẠI');
        const msg = data.message || JSON.stringify(data);
        Platform.OS === 'web' ? window.alert('Lỗi: ' + msg) : Alert.alert('Lỗi', msg);
      }
    } catch (error: any) {
      console.log('CATCH ERROR');
      if (error.name === 'AbortError') {
        console.log('Timeout 10s – server không phản hồi');
        Platform.OS === 'web' ? window.alert('Server không phản hồi (timeout)') : Alert.alert('Lỗi', 'Server không phản hồi');
      } else {
        console.log('Lỗi mạng / khác:', error.message);
        Platform.OS === 'web' ? window.alert('Lỗi mạng: ' + error.message) : Alert.alert('Lỗi', 'Không kết nối được server');
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {setDetails?.title || 'Bộ flashcard'}
        </Text>

        {/* NÚT 3 CHẤM + XÓA SET */}
        <TouchableOpacity onPress={handleDeleteSet} style={styles.editButton}>
          <Ionicons name="trash-outline" size={26} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Danh sách flashcard sẽ ở đây */}
        <View style={styles.centered}>
          <Text>Danh sách flashcard sẽ hiển thị ở đây.</Text>
        </View>
      </ScrollView>

      {/* Nút thêm card */}
      <TouchableOpacity style={styles.fab} onPress={() => { /* mở modal tạo card */ }}>
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
}