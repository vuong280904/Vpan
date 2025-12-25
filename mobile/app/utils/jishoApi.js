// import { Platform } from 'react-native';
// export async function searchJapaneseWord(keyword) {
//   if (!keyword || !keyword.trim()) return [];

//   const LOCALHOST = Platform.OS === "android" ? "10.0.2.2" : "192.168.1.9";

//   try {
//     const response = await fetch(
//       `http://192.168.2.7:/api/jishoApi/search?keyword=${encodeURIComponent(keyword)}`
//     );

//     if (!response.ok) {
//       console.error('Server trả về lỗi:', response.status);
//       return [];
//     }

//     const data = await response.json();
//     return data.data || data; // tùy server trả về
//   } catch (err) {
//     console.error('Lỗi khi gọi server Node.js:', err);
//     return [];
//   }
// }

// // New: return server audio endpoint URL (no fetching)
// export async function getPronunciationUrl(text) {
//   if (!text || !text.trim()) return '';

//   const LOCALHOST = Platform.OS === "android" ? "10.0.2.2" : "192.168.2.6";


//   // Return the server endpoint that proxies the TTS audio.
//   // The client can use this URL directly with Audio.Sound.createAsync({ uri }) or with HTML Audio on web
//   return `http://192.168.2.7:/api/jishoApi/audio?text=${encodeURIComponent(text)}`;
// }
// app/utils/jishoApi.js

// Nếu bạn dùng downloadAsync ở nơi khác, import legacy nếu muốn:
// import * as FileSystem from 'expo-file-system/legacy';

const BASE_HOST = 'vpan-api.onrender.com'; // sửa nếu IP server khác
const BASE_PORT = 5000;
const BASE_URL = `https://${BASE_HOST}:${BASE_PORT}`;

/**
 * Tìm từ tiếng Nhật
 * @param {string} keyword
 * @returns {Promise<any[]>}
 */
export async function searchJapaneseWord(keyword) {
  if (!keyword || !keyword.trim()) return [];

  try {
    const url = `${BASE_URL}/api/jishoApi/search?keyword=${encodeURIComponent(keyword)}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error('Server trả về lỗi:', response.status, url);
      return [];
    }

    const data = await response.json();
    return data.data || data;
  } catch (err) {
    console.error('Lỗi khi gọi server Node.js:', err);
    return [];
  }
}

/**
 * Trả về URL endpoint audio (client sẽ gọi url này)
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function getPronunciationUrl(text) {
  if (!text || !text.trim()) return '';

  // Chú ý: server phải expose route tương ứng: /api/jishoApi/audio
  return `${BASE_URL}/api/jishoApi/audio?text=${encodeURIComponent(text)}`;
}
