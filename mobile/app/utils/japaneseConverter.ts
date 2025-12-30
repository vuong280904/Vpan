// // utils/japaneseSuggestions.ts
// import { searchJapaneseWord } from './jishoApi'; // đường dẫn đúng đến file của bạn

// export const getJapaneseSuggestions = async (input: string): Promise<
//   { display: string; kanji: string; hiragana: string }[]
// > => {
//   if (!input.trim()) return [];

//   try {
//     const results = await searchJapaneseWord(input);

//     const suggestions: { display: string; kanji: string; hiragana: string }[] = [];

//     // Lấy tối đa 5 kết quả đầu (thường kết quả đầu là chính xác nhất)
//     for (const item of results.slice(0, 5)) {
//       // item.japanese: array các cách viết [{word: "開発", reading: "かいはつ"}, ...]
//       // Lấy cách viết đầu tiên (thường có Kanji)
//       const jap = item.japanese[0] || {};
//       const kanji = jap.word || jap.reading || '';
//       const hiragana = jap.reading || kanji;

//       if (kanji || hiragana) {
//         suggestions.push({
//           display: kanji === hiragana ? hiragana : `${kanji} (${hiragana})`,
//           kanji,
//           hiragana,
//         });
//       }
//     }

//     // Nếu không có kết quả → fallback hiragana đơn giản (tùy chọn)
//     if (suggestions.length === 0) {
//       const fallback = input; // hoặc dùng thư viện nhẹ để convert romaji → hira nếu muốn
//       suggestions.push({
//         display: fallback,
//         kanji: fallback,
//         hiragana: fallback,
//       });
//     }

//     return suggestions;
//   } catch (err) {
//     console.error("Lỗi gọi Jisho API:", err);
//     return [];
//   }
// };