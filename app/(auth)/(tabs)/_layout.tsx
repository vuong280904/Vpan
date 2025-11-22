// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { AuthProvider } from "../../../context/AuthContext";

export default function TabsLayout() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <Tabs screenOptions={{ headerShown: false }}>
          <Tabs.Screen name="index" options={{ title: "Home" }} />
          {/* các tab khác */}
        </Tabs>
      </ProtectedRoute>
    </AuthProvider>
  );
}