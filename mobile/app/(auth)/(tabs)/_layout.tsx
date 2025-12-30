// app/(auth)/_layout.tsx
import { Redirect, Slot } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native'; // ← Thêm import này
import { useAuth } from '../../../context/AuthContext';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // hoặc <LoadingSpinner /> nếu bạn có
  }

  if (!user) {
    // Nếu không phải web (tức là mobile) → redirect về /login
    // Nếu là web → giữ nguyên /AuthScreen
    if (Platform.OS !== 'web') {
      return <Redirect href="/login" />;
    }

    // Trường hợp web
    return <Redirect href="/AuthScreen" />;
  }

  // Người dùng đã đăng nhập → cho phép truy cập các route con (tabs)
  return <Slot />;
}