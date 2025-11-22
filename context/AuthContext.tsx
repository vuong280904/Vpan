// context/AuthContext.tsx  ← THAY NGUYÊN FILE NÀY (ĐÃ CHỈNH SỬA)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { createContext, useContext, useEffect, useState } from 'react';

type User = {
  id: string;
  name: string;
  email: string;
  token: string;        // ← THÊM DÒNG NÀY
} | null;

type AuthContextType = {
  user: User;
  login: (token: string, userData: any) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const userData = await AsyncStorage.getItem('user');

        if (token && userData) {
          const parsed = JSON.parse(userData);
          setUser({ ...parsed, token }); // ← Đảm bảo token luôn có trong user
          console.log('ĐÃ TẢI USER + TOKEN TỪ STORAGE');
        }
      } catch (e) {
        console.log('Lỗi load auth:', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (token: string, userData: any) => {
    try {
      const userWithToken = { ...userData, token };
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(userWithToken));
      setUser(userWithToken);
      router.replace('/(auth)/(tabs)');
    } catch (error) {
      console.error('Lỗi login:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['token', 'user']);
      setUser(null);
      router.replace('/login');
    } catch (error) {
      console.log('Lỗi logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);