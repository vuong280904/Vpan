// app/(auth)/_layout.tsx

import GoogleProvider from '@/components/GoogleProvider';
import { useAuth } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, SplashScreen, router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function AuthLayout() {
  const colorScheme = useColorScheme();
  const { user, isLoading } = useAuth();

  const [fontsLoaded] = useFonts({
    SpaceMono: require('assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [readyToHide, setReadyToHide] = useState(false);

  useEffect(() => {
    if (fontsLoaded) setReadyToHide(true);
  }, [fontsLoaded]);

  const onLayoutRootView = useCallback(async () => {
    if (readyToHide) {
      try {
        await SplashScreen.hideAsync();
      } catch {}
    }
  }, [readyToHide]);

  // ⏳ Đợi auth load xong
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Đang xác thực...</Text>
      </View>
    );
  }

  // 🔐 Chưa login → đá về login
  if (!user) {
    router.replace('/AuthScreen');
    return null;
  }

  // ✅ Đã login → render app
  return (
    <GoogleProvider>
      <SocketProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
            <Slot />
          </View>
        </ThemeProvider>
      </SocketProvider>
    </GoogleProvider>
  );
}
