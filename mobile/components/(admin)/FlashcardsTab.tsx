// app/(admin)/components/FlashcardsTab.tsx
import AdminTable from "@/components/AdminTable";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../../app/(auth)/admin/index.styles";

type Props = {
  data: any[];
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  onPreview: (item: any) => void;
};

export default function FlashcardsTab({ data, onEdit, onDelete, onPreview }: Props) {
  if (data.length === 0) {
    return <Text style={{ textAlign: "center", color: "#999", fontSize: 18, marginTop: 100 }}>
      Chưa có bộ flashcard nào
    </Text>;
  }

  return (
    <AdminTable
      data={data}
      columns={["title", "owner.name", "flashcardsCount", "isPublic", "publicFor", "level"]}
      labels={{
        title: "Tên bộ thẻ",
        "owner.name": "Chủ sở hữu",
        flashcardsCount: "Số thẻ",
        isPublic: "Công khai",
        publicFor: "Gói xem được",
        level: "Level"
      }}
      renderItem={(item) => (
        <TouchableOpacity
          onPress={() => onPreview(item)}
          style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
        >
          <MaterialIcons name="folder-open" size={28} color="#4a00e0" />
          <View>
            <Text style={styles.mainText}>{item.title}</Text>
            <Text style={{ fontSize: 12, color: "#666" }}>
              bởi {item.owner?.name || "Admin"}
            </Text>
          </View>
        </TouchableOpacity>
      )}
      renderBadge={(item: any) => {
        if (item.isPublic === true) return <Text style={styles.badgePublic}>Công khai</Text>;
        if (item.isPublic === false) return <Text style={styles.badgePrivate}>Riêng tư</Text>;

        if (!item.isPublic) return <Text style={{ color: "#999" }}>—</Text>;

        const labels: Record<string, string> = {
          free: "Free+",
          pro: "Pro+",
          premium: "Premium+",
          master: "Master+",
          lifetime: "Lifetime",
        };
        const colors: Record<string, string> = {
          free: "#4CAF50",
          pro: "#2196F3",
          premium: "#9C27B0",
          master: "#FF9800",
          lifetime: "#E91E63",
        };

        const value = item.publicFor ?? null;
        const label = value ? labels[value] || value : "Private";
        const bgColor = value ? colors[value] || "#666" : "#f0f0f0";

        return (
          <Text style={{
            backgroundColor: bgColor,
            color: "#fff",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            fontSize: 12,
            fontWeight: "600",
          }}>
            {label}
          </Text>
        );
      }}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}