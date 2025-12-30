// app/(admin)/components/PaymentsTab.tsx
import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Linking } from "react-native";

type Payment = {
  _id: string;
  userId: { name: string; email: string };
  planId: string;
  amountSol: number;
  signature: string;
  status: "confirmed" | "pending";
  createdAt: string;
};

type Props = {
  data: Payment[];
};

export default function PaymentsTab({ data }: Props) {
  if (data.length === 0) {
    return (
      <Text style={{ textAlign: "center", color: "#999", fontSize: 18, marginTop: 100 }}>
        Chưa có thanh toán nào
      </Text>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20, color: "#1a1a2e" }}>
        Lịch sử thanh toán ({data.length})
      </Text>

      <ScrollView>
        {data
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((p) => (
            <View
              key={p._id}
              style={{
                backgroundColor: "#fff",
                padding: 20,
                borderRadius: 16,
                marginBottom: 16,
                elevation: 4,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                    {p.userId?.name || "Unknown"} ({p.userId?.email || "N/A"})
                  </Text>
                  <Text style={{ color: "#666", marginTop: 4 }}>
                    Gói: <Text style={{ fontWeight: "600" }}>{p.planId.toUpperCase()}</Text>
                  </Text>
                </View>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: "#f59e0b" }}>
                  {p.amountSol.toFixed(6)} SOL
                </Text>
              </View>

              <Text style={{ color: "#888", marginTop: 12, fontSize: 14 }}>
                Thời gian: {new Date(p.createdAt).toLocaleString("vi-VN")}
              </Text>

              <TouchableOpacity
                onPress={() => Linking.openURL(`https://explorer.solana.com/tx/${p.signature}?cluster=devnet`)}
                style={{ marginTop: 12 }}
              >
                <Text style={{ color: "#0066cc", textDecorationLine: "underline", fontSize: 14 }}>
                  Xem transaction: {p.signature.slice(0, 12)}...{p.signature.slice(-8)}
                </Text>
              </TouchableOpacity>

              <View style={{ marginTop: 12, alignItems: "flex-end" }}>
                <Text
                  style={{
                    color: p.status === "confirmed" ? "#2e7d32" : "#e67e22",
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  {p.status === "confirmed" ? "Đã xác nhận" : "Đang chờ"}
                </Text>
              </View>
            </View>
          ))}
      </ScrollView>
    </View>
  );
}