// app/(books)/list.tsx
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const BOOKS = [
  { id: '1', title: 'Yotsuba&!', level: 'N5-N4', chapters: 98 },
  { id: '2', title: 'Doraemon Song Ngữ', level: 'N5', chapters: 45 },
  { id: '3', title: 'Nhật ký Anne Frank', level: 'N3', chapters: 12 },
  { id: '4', title: 'Truyện ngắn Kawabata', level: 'N2', chapters: 8 },
];

export default function BooksList() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sách Song Ngữ</Text>
      <ScrollView style={styles.list}>
        {BOOKS.map(book => (
          <TouchableOpacity
            key={book.id}
            style={styles.bookCard}
            onPress={() => {
              // Mở chương đầu tiên (hoặc chương đang đọc dở sau này)
              router.push(`/books/${book.id}/1` as any);
            }}
          >
            <View style={styles.bookCover}>
              <Text style={styles.bookEmoji}>Book</Text>
            </View>
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle}>{book.title}</Text>
              <Text style={styles.bookLevel}>Cấp độ: {book.level}</Text>
              <Text style={styles.bookChapters}>{book.chapters} chương</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220', padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' },
  list: { flex: 1 },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  bookCover: {
    width: 80,
    height: 110,
    backgroundColor: '#334155',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bookEmoji: { fontSize: 40 },
  bookInfo: { flex: 1 },
  bookTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  bookLevel: { color: '#60a5fa', fontSize: 14, marginTop: 4 },
  bookChapters: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
});