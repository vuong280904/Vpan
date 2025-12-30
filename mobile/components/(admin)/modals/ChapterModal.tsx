// app/(admin)/modals/ChapterModal.tsx
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { styles } from "../../../app/(auth)/admin/index.styles";

type Chapter = {
  _id?: string;
  bookId: string;
  chapterNumber: string | number;
  title: string;
  illustration: string;
  content: Array<{ text: string; ruby: string; meaning: string }>;
};

type Book = { _id?: string; title: string };

type Props = {
  visible: boolean;
  currentChapter: Chapter;
  books: Book[];
  selectedBookId: string;
  onClose: () => void;
  onSave: () => void;
  onSelectBook: (bookId: string) => void;
  onChange: (updates: Partial<Chapter>) => void;
  onAddSegment: () => void;
  onRemoveSegment: (index: number) => void;
};

export default function ChapterModal({
  visible,
  currentChapter,
  books,
  selectedBookId,
  onClose,
  onSave,
  onSelectBook,
  onChange,
  onAddSegment,
  onRemoveSegment,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, width: "100%", justifyContent: "center", alignItems: "center" }}>
          <View style={styles.chapterModalContainer}>
            <View style={styles.chapterModalHeader}>
              <Text style={styles.chapterModalTitle}>
                {currentChapter._id ? "Sửa chương" : "Thêm chương mới"}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.sectionTitle}>Chọn sách *</Text>
              <View style={styles.bookSelectorContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {books.length === 0 ? (
                    <Text style={styles.emptyText}>Chưa có sách nào</Text>
                  ) : (
                    books.map((book) => (
                      <TouchableOpacity
                        key={book._id}
                        style={[styles.bookTag, selectedBookId === book._id && styles.bookTagSelected]}
                        onPress={() => onSelectBook(book._id || "")}
                      >
                        <Text style={[styles.bookTagText, selectedBookId === book._id && styles.bookTagTextSelected]}>
                          {book.title}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Số chương"
                keyboardType="numeric"
                value={currentChapter.chapterNumber?.toString()}
                onChangeText={(t) => onChange({ chapterNumber: t })}
              />
              <TextInput
                style={styles.input}
                placeholder="Tiêu đề chương *"
                value={currentChapter.title}
                onChangeText={(t) => onChange({ title: t })}
              />
              <Text style={styles.sectionTitle}>Hình minh họa (tùy chọn)</Text>
              <TextInput
                style={styles.input}
                placeholder="Dán link hình (URL)"
                value={currentChapter.illustration}
                onChangeText={(t) => onChange({ illustration: t })}
              />

              <View style={{ marginBottom: 20 }}>
                <Text style={styles.sectionTitle}>
                  Nội dung chương ({currentChapter.content.length} đoạn)
                </Text>
                {currentChapter.content.map((segment, index) => (
                  <View key={index} style={styles.segmentCard}>
                    <View style={styles.segmentHeader}>
                      <Text style={styles.segmentIndex}>Đoạn {index + 1}</Text>
                      <TouchableOpacity onPress={() => onRemoveSegment(index)}>
                        <MaterialIcons name="delete" size={24} color="#e11d48" />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={[styles.input, styles.segmentInput]}
                      placeholder="Văn bản tiếng Nhật"
                      multiline
                      value={segment.text}
                      onChangeText={(t) => {
                        const newContent = [...currentChapter.content];
                        newContent[index].text = t;
                        onChange({ content: newContent });
                      }}
                    />
                    <TextInput
                      style={[styles.input, styles.segmentInput]}
                      placeholder="Ruby (hiragana)"
                      multiline
                      value={segment.ruby}
                      onChangeText={(t) => {
                        const newContent = [...currentChapter.content];
                        newContent[index].ruby = t;
                        onChange({ content: newContent });
                      }}
                    />
                    <TextInput
                      style={[styles.input, styles.segmentInput]}
                      placeholder="Nghĩa tiếng Việt"
                      multiline
                      value={segment.meaning}
                      onChangeText={(t) => {
                        const newContent = [...currentChapter.content];
                        newContent[index].meaning = t;
                        onChange({ content: newContent });
                      }}
                    />
                  </View>
                ))}
                <TouchableOpacity style={styles.addSegmentBtn} onPress={onAddSegment}>
                  <MaterialIcons name="add-circle-outline" size={24} color="#fff" />
                  <Text style={styles.addSegmentText}>Thêm đoạn mới</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.chapterModalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
                <Text style={styles.saveText}>Lưu chương</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}