// components/CustomTabBar.tsx
import { useRouter, useSegments } from 'expo-router';
import { Book, Home, Search, User } from 'lucide-react-native';
import React from 'react';
import {
    Dimensions,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

// chỉnh đường dẫn ảnh nếu cần (so với file này)
const MASCOT = require('../assets/images/linhvat.png');

const TABS = [
  { name: 'index', label: 'Home', icon: Home },
  { name: 'explore', label: 'Explore', icon: Search },
  { name: 'FlashSet', label: 'FlashSet', icon: Book },
  { name: 'profile', label: 'Profile', icon: User },
];

export default function CustomTabBar() {
  const router = useRouter();
  const segments = useSegments();

  // segments ví dụ: ['(auth)','(tabs)','FlashSet'] hoặc ['(auth)','(tabs)'] cho index
  const lastSegment = segments.length > 0 ? String(segments[segments.length - 1]) : '';

  const buildPathFor = (name: string) => {
    // Home (index) route is the parent tabs path (no trailing 'index')
    if (name === 'index') return '/(auth)/(tabs)';
    // Other tabs: /(auth)/(tabs)/<name>
    return `/(auth)/(tabs)/${name}`;
  };

  const onPress = (name: string) => {
    const path = buildPathFor(name);
    // ép any để tránh lỗi TS khi path động
    router.push(path as any);
  };

  const isFocused = (tabName: string) => {
    // nếu đang ở root tabs (segments end === '(tabs)') và tabName === 'index' => focused
    if ((lastSegment === '(tabs)' || lastSegment === '') && tabName === 'index') return true;

    // direct exact match
    if (lastSegment.toLowerCase() === tabName.toLowerCase()) return true;

    // if lastSegment contains tabName (covers cases like 'FlashSet' vs 'FlashSet/something')
    if (lastSegment.toLowerCase().includes(tabName.toLowerCase())) return true;

    return false;
  };

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <View style={styles.backdrop} />
      <Image source={MASCOT} style={styles.mascot} resizeMode="contain" />
      <View style={styles.pill}>
        {TABS.map((t) => {
          const focused = isFocused(t.name);
          const Icon = t.icon;
          return (
            <TouchableOpacity
              key={t.name}
              onPress={() => onPress(t.name)}
              activeOpacity={0.85}
              style={styles.tab}
            >
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Icon color={focused ? '#fff' : '#9aa4b2'} size={20} />
              </View>
              <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const PILL_WIDTH = Math.min(width - 28, 760);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: 'center',
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    height: 78,
    borderRadius: 999,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.02)' : '#071029',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 12,
  },
  pill: {
    width: PILL_WIDTH,
    height: 64,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tab: { flex: 1, alignItems: 'center' },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  iconWrapActive: {
    backgroundColor: '#3bf654ff',
    transform: [{ scale: 1.03 }],
  },
  label: { fontSize: 11, color: '#9aa4b2', fontWeight: '700' },
  labelActive: { color: '#fff' },
  mascot: {
    position: 'absolute',
    top: -10,
    width: 88,
    height: 88,
    zIndex: 99999,
  },
});
