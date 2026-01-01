import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";  // ← Thêm để điều hướng
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
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
  onTabChange: (tab: string) => void;
  onLogout: () => void;
};

export default function Sidebar({ activeTab, onTabChange, onLogout }: Props) {
  const goToUserDashboard = () => {
    router.replace('/(auth)/(tabs)'); // ← Chuyển về dashboard người dùng
  };

  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>VP</Text>
        </View>
        <Text style={styles.sidebarTitle}>Admin Panel</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {menuItems.map(item => (
          <TouchableOpacity
            key={item.key}
            style={[styles.menuItem, activeTab === item.key && styles.menuItemActive]}
            onPress={() => onTabChange(item.key)}
          >
            <FontAwesome5
              name={item.icon}
              size={20}
              color={activeTab === item.key ? "#fff" : "#aaa"}
            />
            <Text
              style={[
                styles.menuText,
                activeTab === item.key && styles.menuTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* === NÚT MỚI: VỀ DASHBOARD NGƯỜI DÙNG === */}
      <TouchableOpacity style={styles.dashboardMenuItem} onPress={goToUserDashboard}>
        <MaterialIcons name="dashboard" size={20} color="#4ade80" />
        <Text style={styles.dashboardMenuText}>Về Dashboard</Text>
      </TouchableOpacity>

      {/* Nút Đăng xuất */}
      <TouchableOpacity style={styles.logoutMenuItem} onPress={onLogout}>
        <MaterialIcons name="logout" size={20} color="#ff6b6b" />
        <Text style={styles.logoutMenuText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}