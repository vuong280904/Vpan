// app/(admin)/components/Header.tsx
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../../app/(auth)/admin/index.styles";

const menuItems = [
  { key: "dashboard", label: "Thống kê", icon: "chart-pie" },
  { key: "books", label: "Sách", icon: "book" },
  { key: "chapters", label: "Chương", icon: "file-alt" },
  { key: "flashcards", label: "Flashcard", icon: "clone" },
  { key: "users", label: "Người dùng", icon: "users" },
  { key: "shadowing", label: "Shadowing", icon: "microphone" },
  { key: "payments", label: "Thanh toán", icon: "credit-card" },
];

type Props = {
  activeTab: string;
  search: string;
  onSearch: (text: string) => void;
  notificationsCount: number;
  onAddPress?: () => void;
  onNotifPress: () => void;
};

export default function Header({ activeTab, search, onSearch, notificationsCount, onAddPress, onNotifPress }: Props) {
  const currentLabel = menuItems.find(m => m.key === activeTab)?.label || "Dashboard";

  return (
    <View style={styles.header}>
      <Text style={styles.pageTitle}>{currentLabel}</Text>
      <View style={styles.headerActions}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm..."
          value={search}
          onChangeText={onSearch}
        />
        {(activeTab === "books" || activeTab === "flashcards" || activeTab === "chapters") && onAddPress && (
          <TouchableOpacity style={styles.addBtn} onPress={onAddPress}>
            <MaterialIcons name="add" size={24} color="#fff" />
            <Text style={styles.addBtnText}>
              {activeTab === "books" ? "Thêm sách" : activeTab === "flashcards" ? "Tạo bộ thẻ mới" : "Thêm chương"}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onNotifPress} style={styles.notifBtn}>
          <MaterialIcons name="notifications" size={28} color="#fff" />
          {notificationsCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>{notificationsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}