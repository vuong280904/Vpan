// app/(admin)/modals/FlashcardSetModal.tsx
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "../../../app/(auth)/admin/index.styles";

type FlashcardSet = {
  _id?: string;
  title: string;
  description?: string;
  isPublic?: boolean;
  level?: string;
  publicFor?: 'shared' | 'free' | 'pro' | 'premium' | 'master' | 'lifetime';
};

type Props = {
  visible: boolean;
  currentSet: FlashcardSet | null;
  onClose: () => void;
  onSave: () => void;
  onUpdate: (updates: Partial<FlashcardSet>) => void;
};

export default function FlashcardSetModal({ visible, currentSet, onClose, onSave, onUpdate }: Props) {
  if (!currentSet) return null;

  const packages = [
    { value: 'shared', label: "Chỉ owner (riêng tư)" },
    { value: "free", label: "Free" },
    { value: "pro", label: "Pro" },
    { value: "premium", label: "Premium" },
    { value: "master", label: "Master" },
    { value: "lifetime", label: "Lifetime (cao nhất)" },
  ] as const;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { width: "95%", maxWidth: 600, maxHeight: "95%" }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <Text style={styles.modalTitle}>
              {currentSet._id ? "Sửa bộ flashcard" : "Tạo bộ flashcard mới"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={28} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <TextInput
              style={styles.input}
              placeholder="Tên bộ thẻ *"
              value={currentSet.title}
              onChangeText={(text) => onUpdate({ title: text })}
            />
            <TextInput
              style={[styles.input, { height: 100 }]}
              placeholder="Mô tả (tùy chọn)"
              multiline
              value={currentSet.description}
              onChangeText={(text) => onUpdate({ description: text })}
            />

            <View style={{ marginBottom: 24 }}>
              <Text style={{ marginBottom: 12, color: "#444", fontWeight: "600", fontSize: 16 }}>
                Level của bộ thẻ
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {["N5", "N4", "N3", "N2", "N1"].map(l => (
                  <TouchableOpacity
                    key={l}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      backgroundColor: currentSet.level === l ? "#4a00e0" : "#f0f0f0",
                      borderRadius: 12,
                    }}
                    onPress={() => onUpdate({ level: l })}
                  >
                    <Text style={{
                      color: currentSet.level === l ? "#fff" : "#000",
                      fontWeight: "600",
                      fontSize: 15
                    }}>
                      {l}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ marginBottom: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#eee" }}>
              <Text style={{ marginBottom: 16, color: "#444", fontWeight: "600", fontSize: 16 }}>
                Cài đặt hiển thị công khai
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 16 }}>
                <Text style={{ fontSize: 16, flex: 1 }}>Bộ thẻ công khai?</Text>
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    backgroundColor: currentSet.isPublic ? "#4CAF50" : "#e0e0e0",
                    borderRadius: 12,
                  }}
                  onPress={() => onUpdate({ isPublic: !currentSet.isPublic })}
                >
                  <Text style={{
                    color: currentSet.isPublic ? "#fff" : "#000",
                    fontWeight: "600",
                    fontSize: 15
                  }}>
                    {currentSet.isPublic ? "CÓ" : "KHÔNG"}
                  </Text>
                </TouchableOpacity>
              </View>

              {currentSet.isPublic && (
                <View>
                  <Text style={{ marginBottom: 12, color: "#333", fontWeight: "600" }}>
                    Công khai cho người dùng gói:
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    {packages.map((option) => (
                      <TouchableOpacity
                        key={option.value ?? "null"}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          backgroundColor: currentSet.publicFor === option.value ? "#4a00e0" : "#f0f0f0",
                          borderRadius: 12,
                          minWidth: 110,
                          alignItems: "center",
                        }}
                        onPress={() => onUpdate({ publicFor: option.value })}
                      >
                        <Text style={{
                          color: currentSet.publicFor === option.value ? "#fff" : "#000",
                          fontWeight: "600",
                          fontSize: 14,
                        }}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={{ fontSize: 12, color: "#888", marginTop: 12, lineHeight: 18 }}>
                    • "Chỉ owner": vẫn là riêng tư dù bật công khai{'\n'}
                    • "Free": tất cả người dùng đều thấy{'\n'}
                    • "Lifetime": chỉ người dùng có gói Lifetime trở lên
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
              <Text style={styles.saveText}>Lưu bộ thẻ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}