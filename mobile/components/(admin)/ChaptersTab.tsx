// app/(admin)/components/ChaptersTab.tsx
import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { styles } from "../../app/(auth)/admin/index.styles";

type Chapter = {
  _id: string;
  chapterNumber: number;
  title: string;
  content: any[];
  illustration?: string;
};

type GroupedChapters = Record<string, Chapter[]>;

type Props = {
  groupedChapters: GroupedChapters;
  loading: boolean;
  onEdit: (chapter: Chapter) => void;
  onDelete: (id: string) => void;
};

export default function ChaptersTab({ groupedChapters, loading, onEdit, onDelete }: Props) {
  if (loading) {
    return <Text style={{ textAlign: "center", marginTop: 100, color: "#999" }}>Đang tải chương...</Text>;
  }

  if (Object.keys(groupedChapters).length === 0) {
    return (
      <Text style={{ textAlign: "center", color: "#999", fontSize: 18, marginTop: 100 }}>
        Chưa có chương nào
      </Text>
    );
  }

  return (
    <ScrollView>
      {Object.entries(groupedChapters).map(([bookTitle, chapters]) => (
        <View key={bookTitle} style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 22, fontWeight: "bold", color: "#1a1a2e", marginBottom: 16 }}>
            📚 {bookTitle} ({chapters.length} chương)
          </Text>

          {chapters
            .sort((a, b) => a.chapterNumber - b.chapterNumber)
            .map((chapter) => (
              <View
                key={chapter._id}
                style={{
                  backgroundColor: "#fff",
                  padding: 20,
                  borderRadius: 16,
                  marginBottom: 12,
                  elevation: 4,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                    Chương {chapter.chapterNumber}: {chapter.title}
                  </Text>
                  <Text style={{ color: "#666", marginTop: 4 }}>
                    {chapter.content.length} đoạn • Hình minh họa: {chapter.illustration ? "Có" : "Không"}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity onPress={() => onEdit(chapter)}>
                    <MaterialIcons name="edit" size={24} color="#4a00e0" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDelete(chapter._id)}>
                    <MaterialIcons name="delete" size={24} color="#e11d48" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
        </View>
      ))}
    </ScrollView>
  );
}