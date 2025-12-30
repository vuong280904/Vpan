import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    // Android emulator
    return 'http://172.20.10.3:';
  } else if (Platform.OS === 'ios') {
    // iOS simulator
    return 'http://10.249.2.233:';
  } else {
    // Web hoặc thiết bị thật - đổi IP này thành IP máy tính của bạn
    return 'http://localhost:';
  }
};

export const API_BASE_URL = getBaseUrl();