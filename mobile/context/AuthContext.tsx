import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

type User = { id: string; name: string; email: string } | null;

type AuthContextType = {
  user: User;
  token: string | null;
  login: (token: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([
          AsyncStorage.getItem("token"),
          AsyncStorage.getItem("user")
        ]);
        if (t && u) { setToken(t); setUser(JSON.parse(u)); }
      } catch (e) { console.log(e); }
      finally { setIsLoading(false); }
    })();
  }, []);

  const login = async (newToken: string, userData: User) => {
    setToken(newToken);
    setUser(userData);
    await AsyncStorage.setItem("token", newToken);
    await AsyncStorage.setItem("user", JSON.stringify(userData));
    router.replace("/(auth)/(tabs)");
  };

  const logout = async () => {
    setUser(null); setToken(null);
    await AsyncStorage.multiRemove(["token", "user"]);
    router.replace("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải dùng trong AuthProvider");
  return context;
};