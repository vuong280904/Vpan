// @/components/Modals/MessageModal.tsx
import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { styles } from "../../../app/(auth)/admin/index.styles";

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
};

export const MessageModal = ({ visible, title, message, onClose }: Props) => {
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxWidth: 400 }]}>
          <Text style={styles.modalTitle}>{title || "Thông báo"}</Text>
          <Text style={{ textAlign: "center", marginVertical: 24, color: "#444", fontSize: 16 }}>{message}</Text>

          <TouchableOpacity style={styles.saveBtn} onPress={onClose}>
            <Text style={styles.saveText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};