// @/components/Modals/ConfirmModal.tsx
import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { styles } from "../../../app/(auth)/admin/index.styles";

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

export const ConfirmModal = ({ visible, title, message, confirmText = "Xác nhận", onConfirm, onCancel }: Props) => {
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxWidth: 400 }]}>
          <Text style={styles.modalTitle}>{title || "Xác nhận"}</Text>
          <Text style={{ textAlign: "center", marginBottom: 24, color: "#444" }}>{message}</Text>

          <View style={{ flexDirection: "row", justifyContent: "center", gap: 16 }}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: "#e11d48" }]} onPress={onConfirm}>
              <Text style={styles.saveText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};