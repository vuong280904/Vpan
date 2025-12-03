// // app/_layout.tsx ← TÊN PHẢI LÀ _layout.tsx (có dấu gạch dưới)
// import GoogleProvider from "@/components/GoogleProvider"; // điều chỉnh đường dẫn nếu cần
// import { AuthProvider } from '@/context/AuthContext';
// import { SocketProvider } from '@/context/SocketContext';
// import { useColorScheme } from '@/hooks/useColorScheme';
// import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
// import { useFonts } from 'expo-font';
// import { Stack } from 'expo-router';
// import * as SplashScreen from 'expo-splash-screen';
// import { useEffect } from 'react';

// SplashScreen.preventAutoHideAsync();

// export default function RootLayout() {
//   const colorScheme = useColorScheme();
//   const [loaded] = useFonts({
//     SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
//   });

//   useEffect(() => {
//     if (loaded) SplashScreen.hideAsync();
//   }, [loaded]);

//   if (!loaded) return null;

//   return (
//     <GoogleProvider>
//       <AuthProvider>
//         <SocketProvider>
//           <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
//             <Stack screenOptions={{ headerShown: false }}>
//               <Stack.Screen name="login" />
//               <Stack.Screen name="register" />
//               <Stack.Screen name="(auth)" options={{ headerShown: false }} />
//               <Stack.Screen name="+not-found" />
//             </Stack>
//           </ThemeProvider>
//         </SocketProvider>
//       </AuthProvider>
//     </GoogleProvider>
//   );
// }
// app/_layout.tsx
// app/_layout.tsx
// app/_layout.tsx
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
  const [fontsLoaded] = useFonts({ SpaceMono: require('assets/fonts/SpaceMono-Regular.ttf') });
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
