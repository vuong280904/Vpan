// app/(admin)/modals/NotificationModal.tsx
import React from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { styles } from "../../../app/(auth)/admin/index.styles";

type Notification = {
  _id: string;
  title: string;
  message: string;
  createdAt: string;
};

type Props = {
  visible: boolean;
  notifications: Notification[];
  newTitle: string;
  newMessage: string;
  onClose: () => void;
  onTitleChange: (text: string) => void;
  onMessageChange: (text: string) => void;
  onSend: () => void;
};

export default function NotificationModal({
  visible,
  notifications,
  newTitle,
  newMessage,
  onClose,
  onTitleChange,
  onMessageChange,
  onSend,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { height: "90%", width: "95%" }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <Text style={styles.modalTitle}>Thông báo hệ thống</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={28} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: "#f8f9fa", padding: 16, borderRadius: 16, marginBottom: 20 }}>
            <Text style={{ fontWeight: "bold", marginBottom: 10 }}>Gửi thông báo mới</Text>
            <TextInput style={styles.input} placeholder="Tiêu đề" value={newTitle} onChangeText={onTitleChange} />
            <TextInput style={[styles.input, { height: 100 }]} placeholder="Nội dung" multiline value={newMessage} onChangeText={onMessageChange} />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 10 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={onSend}>
                <Text style={styles.saveText}>Gửi</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView>
            {notifications.length === 0 ? (
              <Text style={{ textAlign: "center", color: "#999", marginTop: 50 }}>Chưa có thông báo nào</Text>
            ) : (
              notifications.map((n) => (
                <View key={n._id} style={{ backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: "#4a00e0" }}>
                  <Text style={{ fontWeight: "bold", fontSize: 16 }}>{n.title}</Text>
                  <Text style={{ color: "#444", marginVertical: 8 }}>{n.message}</Text>
                  <Text style={{ fontSize: 12, color: "#888" }}>{new Date(n.createdAt).toLocaleString("vi-VN")}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}