// src/context/AuthContext.tsx (hoặc đường dẫn hiện tại của bạn)

import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

type User = {
  id: string;
  name: string;
  email: string;
  avatarURL?: string;
  token?: string;
  role?: 'user' | 'teacher' | 'admin';
} | null;

type AuthContextType = {
  user: User;
  token: string | null;
  login: (token: string, userData: any) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  updateUser: (newUserData: any) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // ← rất quan trọng cho AuthLayout

  // 1️⃣ Load user + token từ storage khi app khởi động
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem("token"),
          AsyncStorage.getItem("user")
        ]);

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          const userWithToken = { ...parsedUser, token: storedToken };
          setToken(storedToken);
          setUser(userWithToken);
        }
        // Nếu không có token/user → vẫn để user = null, token = null
      } catch (e) {
        console.log("Lỗi load auth:", e);
      } finally {
        // ← QUAN TRỌNG: luôn set isLoading = false ở cuối
        setIsLoading(false);
      }
    };

    loadAuth();
  }, []);

  // 3️⃣ Login: lưu token + user, không redirect (giữ nguyên)
  const login = async (newToken: string, userData: any) => {
    const userWithToken = {
      ...userData,
      token: newToken,
      avatarURL: userData.avatarURL || null,
      role: userData.role || 'user'
    };

    setToken(newToken);
    setUser(userWithToken);

    await AsyncStorage.setItem("token", newToken);
    await AsyncStorage.setItem("user", JSON.stringify(userWithToken));
  };

  // 4️⃣ Cập nhật user (giữ nguyên)
  const updateUser = (newUserData: any) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...newUserData, token };
      AsyncStorage.setItem("user", JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  // 5️⃣ Logout (giữ nguyên)
  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.multiRemove(["token", "user"]);
    router.replace(Platform.OS === 'web' ? '/AuthScreen' : '/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải dùng trong AuthProvider");
  return context;
};