// app/(admin)/components/ShadowingTab.tsx
import React from "react";
import { Text } from "react-native";
import AdminTable from "@/components/AdminTable";

type Props = {
  data: { _id: string; title: string; description?: string }[];
};

export default function ShadowingTab({ data }: Props) {
  if (data.length === 0) {
    return (
      <Text style={{ textAlign: "center", color: "#999", fontSize: 18, marginTop: 100 }}>
        Chưa có chủ đề shadowing nào
      </Text>
    );
  }

  return (
    <AdminTable
      data={data}
      columns={["title", "description"]}
      labels={{ title: "Chủ đề", description: "Mô tả" }}
    />
  );
}