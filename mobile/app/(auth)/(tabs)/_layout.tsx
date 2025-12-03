// // app/(tabs)/_layout.tsx ← CHỈ CÒN ProtectedRoute, KHÔNG CẦN AuthProvider NỮA!
// import { Tabs } from "expo-router";
// import ProtectedRoute from "../../../components/ProtectedRoute";

// export default function TabsLayout() {
//   return (
//     <ProtectedRoute>
//       <Tabs screenOptions={{ headerShown: false }}>
//         <Tabs.Screen name="index" options={{ title: "Home" }} />
//         <Tabs.Screen name="explore" options={{ title: "Explore" }} />
//         {/* các tab khác */}
//       </Tabs>
//     </ProtectedRoute>
//   );
// }
// app/(auth)/(tabs)/_layout.tsx
// app/(auth)/_layout.tsx  ← TẠO MỚI FILE NÀY
import { Redirect, Slot } from 'expo-router';
import React from 'react';
import { useAuth } from '../../../context/AuthContext';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // hoặc loading spinner
  }

  if (!user) {
    return <Redirect href="/AuthScreen" />;
  }

  return <Slot />; // Cho phép vào (tabs)
}