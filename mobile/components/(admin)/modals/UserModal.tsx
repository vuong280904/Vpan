// app/(admin)/modals/UserModal.tsx
import React from "react";
import { Modal, View, Text, TextInput, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { styles } from "../../../app/(auth)/admin/index.styles";

type User = {
  id: string;
  name: string;
  email: string;
  role?: string;
};

type Props = {
  visible: boolean;
  currentUser: User | null;
  onClose: () => void;
  onSave: () => void;
  onChange: (updates: Partial<User>) => void;
};

export default function UserModal({ visible, currentUser, onClose, onSave, onChange }: Props) {
  if (!currentUser) return null;

  const roles = ['student', 'teacher', 'admin'] as const;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <Text style={styles.modalTitle}>Chỉnh sửa người dùng</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={28} color="#666" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Họ tên"
            value={currentUser.name}
            onChangeText={(t) => onChange({ name: t })}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={currentUser.email}
            onChangeText={(t) => onChange({ email: t })}
          />

          <Text style={{ marginBottom: 8, color: "#444", fontSize: 16 }}>Vai trò</Text>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
            {roles.map(r => (
              <TouchableOpacity
                key={r}
                style={{
                  flex: 1,
                  padding: 14,
                  backgroundColor: currentUser.role === r ? "#4a00e0" : "#f0f0f0",
                  borderRadius: 12,
                  alignItems: "center"
                }}
                onPress={() => onChange({ role: r })}
              >
                <Text style={{ color: currentUser.role === r ? "#fff" : "#000", fontWeight: "600" }}>
                  {r.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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