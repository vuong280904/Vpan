// app/(admin)/components/UsersTab.tsx
import AdminTable from "@/components/AdminTable";
import React from "react";
import { Image, Text, View } from "react-native";
import { styles } from "../../app/(auth)/admin/index.styles";

type Props = {
  data: any[];
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
};

export default function UsersTab({ data, onEdit, onDelete }: Props) {
  if (data.length === 0) {
    return <Text style={{ textAlign: "center", color: "#999", fontSize: 18, marginTop: 100 }}>
      Chưa có người dùng nào
    </Text>;
  }

  return (
    <AdminTable
      data={data}
      columns={["avatarURL", "name", "email", "role"]}
      labels={{ avatarURL: "", name: "Họ tên", email: "Email", role: "Vai trò" }}
      renderItem={(item) => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {item.avatarURL ? (
            <Image source={{ uri: item.avatarURL }} style={{ width: 40, height: 40, borderRadius: 20 }} />
          ) : (
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#ccc", justifyContent: "center", alignItems: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                {item.name[0]?.toUpperCase() || "U"}
              </Text>
            </View>
          )}
          <Text style={styles.mainText}>{item.name}</Text>
        </View>
      )}
      renderBadge={(item) => {
        const r = (item.role || "student").toLowerCase();
        return (
          <Text style={[
            styles.roleBadge,
            r === "admin" && styles.roleAdmin,
            r === "teacher" && styles.roleTeacher
          ]}>
            {r.toUpperCase()}
          </Text>
        );
      }}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}