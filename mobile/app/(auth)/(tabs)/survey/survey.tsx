// app/survey.tsx
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../../../context/AuthContext';
import api from '../../../utils/api';

export default function SurveyScreen() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [sponsoredBy, setSponsoredBy] = useState('');
  const [selfLevel, setSelfLevel] = useState<'N5' | 'N4' | 'N3' | 'N2' | 'N1' | null>(null);
  const [loading, setLoading] = useState(false);

  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];

  const handleNext = async () => {
    if (!name.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập họ và tên');
    if (!sponsoredBy.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập bạn biết app qua đâu');
    if (!selfLevel) return Alert.alert('Lỗi', 'Vui lòng chọn trình độ tự đánh giá');

    setLoading(true);
    try {
      // Cập nhật tạm name + sponsoredBy (level sẽ cập nhật sau khi test xong)
      await api.patch('/api/users/me/onboarding', {
        name: name.trim(),
        sponsoredBy: sponsoredBy.trim(),
      });

      // Chuyển sang bài test theo level tự chọn
      router.push(`../level-test/${selfLevel}`);
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể lưu thông tin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 10 }}>
          Chào mừng bạn đến với VPan! 🇯🇵
        </Text>
        <Text style={{ fontSize: 16, color: '#94a3b8', textAlign: 'center', marginBottom: 40 }}>
          Hãy hoàn thiện thông tin để chúng mình hỗ trợ bạn học tốt hơn nhé!
        </Text>

        {/* Họ và tên */}
        <Text style={{ color: '#e2e8f0', fontSize: 16, marginBottom: 8 }}>Họ và tên</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ví dụ: Nguyễn Văn A"
          placeholderTextColor="#64748b"
          style={{
            backgroundColor: '#1e293b',
            color: '#fff',
            padding: 16,
            borderRadius: 12,
            fontSize: 16,
            marginBottom: 24,
          }}
        />

        {/* Biết app qua đâu */}
        <Text style={{ color: '#e2e8f0', fontSize: 16, marginBottom: 8 }}>
          Bạn biết đến VPan qua đâu?
        </Text>
        <TextInput
          value={sponsoredBy}
          onChangeText={setSponsoredBy}
          placeholder="Ví dụ: TikTok, Facebook, bạn bè, Google..."
          placeholderTextColor="#64748b"
          style={{
            backgroundColor: '#1e293b',
            color: '#fff',
            padding: 16,
            borderRadius: 12,
            fontSize: 16,
            marginBottom: 32,
          }}
        />

        {/* Chọn trình độ tự đánh giá */}
        <Text style={{ color: '#e2e8f0', fontSize: 16, marginBottom: 16 }}>
          Bạn tự đánh giá trình độ tiếng Nhật hiện tại là?
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 40 }}>
          {levels.map((lvl) => (
            <TouchableOpacity
              key={lvl}
              onPress={() => setSelfLevel(lvl as any)}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: selfLevel === lvl ? '#3b82f6' : '#1e293b',
                borderWidth: 1,
                borderColor: selfLevel === lvl ? '#3b82f6' : '#334155',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>{lvl}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nút tiếp tục */}
        <TouchableOpacity
          onPress={handleNext}
          disabled={loading || !selfLevel}
          style={{
            backgroundColor: selfLevel ? '#3b82f6' : '#334155',
            padding: 18,
            borderRadius: 16,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: loading ? 0.7 : 1,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18, marginRight: 8 }}>
            {loading ? 'Đang xử lý...' : 'Bắt đầu kiểm tra trình độ'}
          </Text>
          <ChevronRight color="#fff" size={24} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}