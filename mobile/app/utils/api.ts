// app/utils/api.ts
import axios from 'axios';
import { Platform } from 'react-native';

// IP máy bạn (đã test chạy ngon)
const HOST = '192.168.1.9:5000';

// Tự động chọn baseURL đúng nền tảng
const API_BASE = Platform.OS === 'web' 
  ? 'http://localhost:5000' 
  : `http://${HOST}`;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// (Tùy chọn) Thêm interceptor để log lỗi đẹp hơn
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;