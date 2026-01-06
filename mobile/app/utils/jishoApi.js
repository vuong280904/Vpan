// app/utils/jishoApi.js

import { Platform } from 'react-native';

// Cấu hình server
const PORT = 5000;
const MOBILE_HOST = '172.20.10.3'; // ← Thay đổi IP này khi bạn chuyển sang mạng WiFi khác

// Dùng Platform.select để tránh lỗi server-side rendering trên web
const BASE_URL = Platform.select({
  web: `https://vpan-api.onrender.com`,
  default: `http://${MOBILE_HOST}:${PORT}`,
});

/**
 * Tìm kiếm từ tiếng Nhật qua server proxy
 * @param {string} keyword - Từ cần tìm
 * @returns {Promise<any[]>} Mảng kết quả hoặc []
 */
export async function searchJapaneseWord(keyword) {
  if (!keyword || !keyword.trim()) return [];

  try {
    const url = `${BASE_URL}/api/jishoApi/search?keyword=${encodeURIComponent(keyword.trim())}`;
    
    const response = await fetch(url, {
      method: 'GET',
      // Tùy chọn: thêm timeout nếu cần
      // signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error('Server trả về lỗi:', response.status, response.statusText);
      console.error('URL gọi:', url);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.data || data.results || [];
  } catch (err) {
    console.error('Lỗi kết nối đến server Jisho proxy:', err);
    return [];
  }
}

/**
 * Trả về URL để phát âm (TTS) từ server proxy
 * Client sẽ dùng URL này trực tiếp với expo-av Audio.Sound hoặc <audio> trên web
 * @param {string} text - Văn bản cần phát âm (tiếng Nhật)
 * @returns {string} URL endpoint audio
 */
export function getPronunciationUrl(text) {
  if (!text || !text.trim()) return '';

  return `${BASE_URL}/api/jishoApi/audio?text=${encodeURIComponent(text.trim())}`;
}

// Optional: Export BASE_URL để dùng ở nơi khác nếu cần debug
// export { BASE_URL };
