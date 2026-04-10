import axios from "axios";
import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

/* ================= TYPES ================= */

interface DiffChar {
  char: string;
  highlight: boolean;
}

interface GrammarDiff {
  userDiff: DiffChar[];
  aiDiff: DiffChar[];
}

interface GrammarResponse {
  corrected: string;
  isDifferent: boolean;
  diff?: GrammarDiff;
  vi?: string;
}

/* ================= CONFIG ================= */

const API_BASE = "http://localhost:5000";

/* ================= COMPONENT ================= */

export default function TranslateScreen() {
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [direction, setDirection] = useState<"ja-vi" | "vi-ja">("ja-vi");
  const [diff, setDiff] = useState<GrammarDiff | null>(null);
  const [loading, setLoading] = useState(false);

  const isWeb = Platform.OS === "web";
  const isWide = Dimensions.get("window").width >= 768;
  const horizontal = isWeb && isWide;

  /* ================= ACTIONS ================= */

  const swapLang = () => {
    setDirection(direction === "ja-vi" ? "vi-ja" : "ja-vi");
    setLeftText(rightText);
    setRightText(leftText);
    setDiff(null);
  };

  const handleLeftInput = async (text: string) => {
    setLeftText(text);
    setDiff(null);
    if (!text.trim()) return;

    if (direction === "ja-vi") {
      setLoading(true);
      try {
        const res = await axios.post<GrammarResponse>(
          `${API_BASE}/api/grammar/check`,
          { sentence: text, sourceLang: "ja" }
        );

        if (res.data.isDifferent && res.data.diff) {
          setDiff(res.data.diff);
          setRightText(res.data.vi || "");
        } else {
          setRightText(res.data.vi || "");
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRightInput = async (text: string) => {
    setRightText(text);
    setDiff(null);
    if (!text.trim()) return;

    if (direction === "vi-ja") {
      setLoading(true);
      try {
        // TODO: call translate VI → JA API
      } finally {
        setLoading(false);
      }
    }
  };

  /* ================= RENDER ================= */

  const renderDiff = (items: DiffChar[], color: string) => (
    <Text style={{ flexWrap: "wrap", marginTop: 4 }}>
      {items.map((c, i) => (
        <Text key={i} style={{ color: c.highlight ? color : "#000" }}>
          {c.char}
        </Text>
      ))}
    </Text>
  );

  const leftLabel = direction === "ja-vi" ? "Tiếng Nhật" : "Tiếng Việt";
  const rightLabel = direction === "ja-vi" ? "Tiếng Việt" : "Tiếng Nhật";

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View
        style={{
          flexDirection: horizontal ? "row" : "column",
          gap: 16,
        }}
      >
        {/* LEFT */}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{leftLabel}</Text>
          <TextInput
            multiline
            value={leftText}
            onChangeText={handleLeftInput}
            editable
            style={styles.textBox}
          />

          {diff && direction === "ja-vi" && (
            <>
              <Text style={styles.diffLabel}>Câu bạn nhập (đỏ)</Text>
              {renderDiff(diff.userDiff, "#e53935")}
            </>
          )}
        </View>

        {/* SWAP */}
        <TouchableOpacity style={styles.swapBtn} onPress={swapLang}>
          <Text style={{ fontSize: 18 }}>⇄</Text>
        </TouchableOpacity>

        {/* RIGHT */}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{rightLabel}</Text>
          <TextInput
            multiline
            value={rightText}
            onChangeText={handleRightInput}
            editable
            style={styles.textBox}
          />

          {diff && direction === "ja-vi" && (
            <>
              <Text style={styles.diffLabel}>Câu AI sửa (xanh)</Text>
              {renderDiff(diff.aiDiff, "#43a047")}
            </>
          )}
        </View>
      </View>

      {loading && <Text style={{ marginTop: 12 }}>AI đang xử lý…</Text>}
    </ScrollView>
  );
}

/* ================= STYLES ================= */

const styles: {
  textBox: TextStyle;
  swapBtn: ViewStyle;
  title: TextStyle;
  diffLabel: TextStyle;
} = {
  textBox: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    textAlignVertical: "top",
    backgroundColor: "#fff",
  },
  swapBtn: {
    alignSelf: "center",
    padding: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#bbb",
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontWeight: "600",
    marginBottom: 6,
  },
  diffLabel: {
    marginTop: 8,
    fontSize: 12,
    color: "#666",
  },
};
