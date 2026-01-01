import GoogleProvider from '@/components/GoogleProvider';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, SplashScreen } from 'expo-router'; // SplashScreen từ expo-router wrapper
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({ SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf') });
  const [readyToHide, setReadyToHide] = useState(false);

  // Khi fonts load -> cho biết chúng ta sẵn sàng ẩn splash nhưng đợi layout onLayout
  useEffect(() => {
    if (fontsLoaded) setReadyToHide(true);
  }, [fontsLoaded]);

  // onLayout callback: chỉ hide splash sau khi root view đã layout và fonts đã load
  const onLayoutRootView = useCallback(async () => {
    if (readyToHide) {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        // an toàn: có thể ném nếu chưa có splash đăng ký — log và ignore
        console.warn('SplashScreen.hideAsync() failed:', e);
      }
    }
  }, [readyToHide]);

  // IMPORTANT: Không return null — render view + Slot luôn
  return (
    <GoogleProvider>
      <AuthProvider>
        <SocketProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
              <Slot />
            </View>
          </ThemeProvider>
        </SocketProvider>
      </AuthProvider>
    </GoogleProvider>
  );
}
