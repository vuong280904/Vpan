import React, { useState } from "react";
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

import { searchJapaneseWord } from '../../utils/jishoApi';

const SERVER = "http://192.168.2.7:5000";

type Message = {
  type: "user" | "bot";
  word: string;
  meaning: string;
};

export default function ShiritoriScreen() {

  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState<boolean>(false);

  const sendWord = async () => {

    const word = input.trim();
    if (!word) return;

    setInput("");

    try {

      // 1️⃣ Search nghĩa trước
      const searchResult = await searchJapaneseWord(word);

      if (!searchResult || searchResult.length === 0) {
        Alert.alert("❌ Word not found", "Từ này không tồn tại");
        return;
      }

      const meaning =
        searchResult?.[0]?.senses?.[0]?.english_definitions?.join(", ") ||
        "No meaning";

      // 2️⃣ gọi API Shiritori
      const response = await fetch(`${SERVER}/api/shiritori/play`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          word,
          difficulty: "easy"
        })
      });

      const data = await response.json();

      if (!data.valid) {
        Alert.alert("❌ Invalid word");
        return;
      }

      setMessages(prev => [
        ...prev,
        { type: "user", word, meaning }
      ]);

      setThinking(true);

      setTimeout(async () => {

        const botWord = data.bot_word;

        if (!botWord) {
          setThinking(false);
          Alert.alert("🎉 You win!");
          return;
        }

        const botSearch = await searchJapaneseWord(botWord);

        const botMeaning =
          botSearch?.[0]?.senses?.[0]?.english_definitions?.join(", ") ||
          "No meaning";

        setMessages(prev => [
          ...prev,
          { type: "bot", word: botWord, meaning: botMeaning }
        ]);

        setThinking(false);

      }, 1000);

    } catch (err) {

      console.error(err);
      Alert.alert("Server error");

    }

  };

  const renderItem = ({ item }: { item: Message }) => {

    return (
      <View
        style={[
          styles.message,
          item.type === "user" ? styles.user : styles.bot
        ]}
      >
        <Text style={styles.word}>{item.word}</Text>
        <Text style={styles.meaning}>{item.meaning}</Text>
      </View>
    );

  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>🎮 Shiritori</Text>

      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(_, index) => index.toString()}
      />

      {thinking && (
        <Text style={styles.thinking}>Bot is thinking...</Text>
      )}

      <View style={styles.inputRow}>

        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Nhập từ tiếng Nhật..."
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={sendWord}
        >
          <Text style={{ color: "#fff" }}>Send</Text>
        </TouchableOpacity>

      </View>

    </View>
  );

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff"
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20
  },

  message: {
    padding: 10,
    marginBottom: 10,
    borderRadius: 10,
    maxWidth: "80%"
  },

  user: {
    backgroundColor: "#cceeff",
    alignSelf: "flex-end"
  },

  bot: {
    backgroundColor: "#eee",
    alignSelf: "flex-start"
  },

  word: {
    fontSize: 18,
    fontWeight: "bold"
  },

  meaning: {
    fontSize: 14,
    color: "#555"
  },

  thinking: {
    textAlign: "center",
    marginVertical: 10,
    fontStyle: "italic"
  },

  inputRow: {
    flexDirection: "row",
    marginTop: 10
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10
  },

  button: {
    marginLeft: 10,
    backgroundColor: "#007AFF",
    paddingHorizontal: 15,
    justifyContent: "center",
    borderRadius: 8
  }

});