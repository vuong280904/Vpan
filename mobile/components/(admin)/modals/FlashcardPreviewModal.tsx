// app/(admin)/modals/FlashcardPreviewModal.tsx
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Image, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../../../app/(auth)/admin/index.styles";

const API_URL = Platform.OS === "web" ? "http://localhost:5000/api" : "http://172.20.10.3:5000/api";

type Props = {
  visible: boolean;
  title: string;
  flashcards: any[];
  onClose: () => void;
};

export default function FlashcardPreviewModal({ visible, title, flashcards, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { width: "95%", maxWidth: 800, maxHeight: "90%", padding: 0 }]}>
          <View style={{ padding: 24, backgroundColor: "#4a00e0", borderTopLeftRadius: 20, borderTopRightRadius: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: "#fff" }}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 24, flex: 1 }}>
            {flashcards.length === 0 ? (
              <Text style={{ textAlign: "center", color: "#999", fontSize: 18, marginTop: 50 }}>
                Bộ thẻ này chưa có flashcard nào
              </Text>
            ) : (
              <View style={{ gap: 16 }}>
                {flashcards.map((card, index) => (
                  <View key={card._id} style={{ backgroundColor: "#f8f9fa", padding: 20, borderRadius: 16, borderLeftWidth: 5, borderLeftColor: "#4a00e0" }}>
                    <Text style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                      Thẻ {index + 1} / {flashcards.length}
                    </Text>
                    <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1a1a2e", marginBottom: 8 }}>
                      {card.vocabulary}
                    </Text>
                    {card.phonetic && (
                      <Text style={{ fontSize: 16, color: "#4a00e0", fontStyle: "italic", marginBottom: 8 }}>
                        {card.phonetic}
                      </Text>
                    )}
                    <Text style={{ fontSize: 18, color: "#333", lineHeight: 26 }}>
                      {card.meaning}
                    </Text>
                    {card.image && (
                      <Image
                        source={{ uri: `${API_URL}${card.image}` }}
                        style={{ width: "100%", height: 200, borderRadius: 12, marginTop: 12 }}
                        resizeMode="cover"
                      />
                    )}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: "#eee", alignItems: "center" }}>
            <Text style={{ color: "#666" }}>
              Tổng cộng: <Text style={{ fontWeight: "bold" }}>{flashcards.length}</Text> flashcard
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}