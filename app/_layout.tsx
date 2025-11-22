// app/_layout.tsx  ← ĐÈ NGAY FILE CŨ BẰNG FILE NÀY LÀ XONG!
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

// THÊM 2 DÒNG NÀY
import { AuthProvider } from '../context/AuthContext'; // ← đường dẫn đúng tới file AuthContext.tsx của bạn

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null; // đang load font
  }

  return (
    // BỌC TOÀN BỘ APP BẰNG AuthProvider ← QUAN TRỌNG NHẤT!
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Các màn hình auth */}
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />

          {/* Tab chính (dashboard) */}
          <Stack.Screen name="(tabs)" />

          {/* 404 */}
          <Stack.Screen name="+not-found" />
        </Stack>

        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}