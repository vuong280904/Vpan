// app/(admin)/modals/BookModal.tsx
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../../../app/(auth)/admin/index.styles";

type Book = {
  _id?: string;
  title: string;
  author: string;
  level?: string;
  coverImage?: string;
};

type Props = {
  visible: boolean;
  currentBook: Book;
  onClose: () => void;
  onSave: () => void;
  onChange: (updates: Partial<Book>) => void;
};

export default function BookModal({ visible, currentBook, onClose, onSave, onChange }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <Text style={styles.modalTitle}>
              {currentBook._id ? "Sửa sách" : "Thêm sách mới"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={28} color="#666" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Tựa đề *"
            value={currentBook.title}
            onChangeText={(t) => onChange({ title: t })}
          />
          <TextInput
            style={styles.input}
            placeholder="Tác giả *"
            value={currentBook.author}
            onChangeText={(t) => onChange({ author: t })}
          />
          <TextInput
            style={styles.input}
            placeholder="Link ảnh bìa (tùy chọn)"
            value={currentBook.coverImage}
            onChangeText={(t) => onChange({ coverImage: t })}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
              <Text style={styles.saveText}>Lưu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}