// @/services/config.ts
import { Platform } from 'react-native';

const getBaseUrl = () => {
  // 1. Android Emulator (qua Android Studio hoặc Expo Go trên máy thật)
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  // 2. iOS Simulator
  if (Platform.OS === 'ios') {
    return 'http://localhost:5000';
  }

  // 3. Web → luôn dùng localhost vì server chạy trên chính máy đó
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }

  // 4. Thiết bị thật (điện thoại thật kết nối cùng WiFi với máy tính)
  // → DÙNG IP WIFI HIỆN TẠI CỦA BẠN: 192.168.1.8
  return 'http://192.168.1.8:5000';
};

export const API_BASE_URL = getBaseUrl();