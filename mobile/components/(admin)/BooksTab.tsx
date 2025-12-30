// app/(admin)/components/BooksTab.tsx
import React from "react";
import { Text } from "react-native";
import AdminTable from "@/components/AdminTable";

type Props = {
  data: any[];
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
};

export default function BooksTab({ data, onEdit, onDelete }: Props) {
  if (data.length === 0) {
    return <Text style={{ textAlign: "center", color: "#999", fontSize: 18, marginTop: 100 }}>
      Chưa có sách nào
    </Text>;
  }

  return (
    <AdminTable
      data={data}
      columns={["title", "author", "level", "chapters"]}
      labels={{ title: "Tựa đề", author: "Tác giả", level: "Level", chapters: "Số chương" }}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}