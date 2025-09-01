import { useNavigation } from "@react-navigation/native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export default function HomeScreen() {
  const navigation = useNavigation<any>();

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: "350782448048-v79nef537mb92qnq8md0v6dlqpr1k8d9.apps.googleusercontent.com",
    androidClientId: "350782448048-jr1mflkb0k3gj59c19uli5tisenlus4u.apps.googleusercontent.com",
    webClientId: "350782448048-he72k4gtpp9nc779dgjv32godevja80v.apps.googleusercontent.co350782448048-gqq1leq1rl5npmo1p9mqh00e8ca5urnk.apps.googleusercontent.com", // quan trọng cho Expo Go / Web
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      fetchUserInfo(authentication?.accessToken);
    }
  }, [response]);

  const fetchUserInfo = async (token: string | undefined) => {
    if (!token) return;
    try {
      const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = await res.json();
      // 👉 Chuyển sang màn Profile và truyền user
      navigation.navigate("homePage", { user });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WELCOME TO VPAN</Text>

      <Image
        source={require("../../assets/images/logoVpan.png")}
        style={styles.logo}
      />

      <TouchableOpacity
        style={styles.buttonGoogle}
        disabled={!request}
        onPress={() => promptAsync()}
      >
        <Text style={styles.buttonText}>CONTINUE WITH GOOGLE</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonFacebook}>
        <Text style={styles.buttonText}>CONTINUE WITH FACEBOOK</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EFFFFF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 20,
    color: "#000",
  },
  logo: {
    width: 160,
    height: 160,
    marginVertical: 30,
    resizeMode: "contain",
  },
  buttonGoogle: {
    width: "90%",
    paddingVertical: 15,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    marginBottom: 15,
    elevation: 2,
  },
  buttonFacebook: {
    width: "90%",
    paddingVertical: 15,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    elevation: 2,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
});
