// VpanDashboard.merged.tsx
import * as expoAv from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import {
  ArrowRight, Bell, BookOpen, Crown, Edit2, Layers, LogOut, MessageSquare, Mic2,
  PenTool, Search, Sun, X
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions, Image, Modal,
  Platform,
  SafeAreaView, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View
} from 'react-native';
import { io, Socket } from 'socket.io-client';

import { useAuth } from '../../../context/AuthContext';
import api from '../../utils/api';
import { getPronunciationUrl, searchJapaneseWord } from '../../utils/jishoApi';

// ==================== ASSET ====================
const PROMO_IMAGE = require('../../../assets/images/NangVipNgay.png'); // chỉnh đường dẫn nếu cần

// ==================== TYPES ====================
interface JapaneseWord {
  japanese: { word?: string; reading?: string }[];
  senses: { english_definitions: string[] }[];
}
interface ResultItem {
  word: string;
  reading: string;
  meanings: string;
}
interface User {
  id: string;
  name: string;
  email: string;
  avatarURL?: string;
  token?: string;
}

// ==================== HELPERS ====================
// Keep safe avatar logic from old homepage (including ImgBB UA fix)
const getSafeAvatar = (user: { avatarURL?: string; email: string }) => {
  const avatarURL = user?.avatarURL && user.avatarURL.trim() !== '' ? user.avatarURL.trim() : null;

  if (avatarURL) {
    // Fix ImgBB không hiện ảnh do thiếu User-Agent
    if (avatarURL.includes('ibb.co') || avatarURL.includes('i.ibb.co')) {
      return {
        uri: avatarURL,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
        }
      } as any;
    }
    return { uri: avatarURL } as any;
  }

  // Fallback về pravatar
  return { uri: `https://i.pravatar.cc/300?u=${encodeURIComponent(user?.email || 'unknown')}` } as any;
};

const { width } = Dimensions.get('window');
const SOCKET_URL = 'https://vpan-api.onrender.com';

// Quick actions
const QUICK_ACTIONS = [
  { title: 'Flashcard', icon: Layers, color: '#f472b6', bg: '#f9a8d4' },
  { title: 'Luyện Thi', icon: PenTool, color: '#fb923c', bg: '#fdba74' },
  { title: 'Shadowing', icon: Mic2, color: '#38bdf8', bg: '#7dd3fc' },
  { title: 'Sách Song Ngữ', icon: BookOpen, color: '#8b5cf6', bg: '#c4b5fd' },
];

const flashcards = [
  { id: 1, title: 'Flashcard Ngữ pháp N3' },
  { id: 2, title: 'Flashcard Từ vựng N4' },
  { id: 3, title: 'Flashcard Kanji Sơ cấp' },
];

// ==================== COMPONENT ====================
export default function VpanDashboardMerged() {
  // promo modal state
  const [showPromo, setShowPromo] = useState(true); // true => show on mount

  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ResultItem[]>([]);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Chat state (restored)
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [recentChatsLoading, setRecentChatsLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // UI dropdowns (restored)
  const [showMessageDropdown, setShowMessageDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [chatSearchMode, setChatSearchMode] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatSearchLoading, setChatSearchLoading] = useState(false);
  const [searchResultsUsers, setSearchResultsUsers] = useState<User[]>([]);

  const isDark = theme === 'dark';

  // promo press handler -> navigate to /upvip
  const onPromoPress = () => {
    setShowPromo(false);
    router.push('/upgrade' as any);
  };

  // redirect if no user
  useEffect(() => {
    if (!user) {
      router.replace(Platform.OS === 'web' ? '/AuthScreen' : '/login');
    }
  }, [user]);

  useEffect(() => {
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
  }, [isDark]);

  // ==================== SOCKET (restore) ====================
  useEffect(() => {
    if (!user) return;
    const token = (user as any)?.token;
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => console.log('Socket connected:', socket.id));
    socket.on('onlineUsers', (ids: string[]) => setOnlineUsers(ids));

    // new message handling -> update recentChats
    socket.on('newMessage', (msg: any) => {
      try {
        if (msg.sender?.id === (user as any)?.id) return;
        setRecentChats(prev => {
          const filtered = prev.filter((c: any) => c.user.id !== msg.sender.id);
          const newChat = {
            id: msg.chatId || msg._id || Date.now().toString(),
            user: msg.sender,
            preview: msg.message || 'Đã gửi một tin nhắn',
            time: 'Vừa xong',
            avatar: getSafeAvatar(msg.sender),
          };
          return [newChat, ...filtered];
        });
      } catch (e) { console.warn(e); }
    });

    // notifications events
    socket.on('newNotification', (notif: any) => {
      setNotifications(prev => [notif, ...prev]);
      if (!notif.read) setUnreadCount(c => c + 1);
    });

    socket.on('notificationsList', (list: any[]) => {
      setNotifications(list);
      setUnreadCount(list.filter((n: any) => !n.read).length);
    });

    // recentChats list response
    socket.on('recentChats', (chats: any[]) => {
      try {
        const formatted = chats.map(chat => ({
          id: chat.chatId,
          user: chat.user || { id: 'unknown', name: 'Người dùng', email: '', avatarURL: '' },
          preview: chat.preview,
          time: formatTimeAgo(new Date(chat.lastMessageAt)),
          avatar: getSafeAvatar(chat.user),
        }));
        setRecentChats(formatted);
        setRecentChatsLoading(false);
      } catch (e) { console.warn(e); }
    });

    return () => {
      try { socket.disconnect(); } catch (e) {}
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // When opening notifications dropdown, ask server for list
  useEffect(() => {
    if (showNotifications && socketRef.current?.connected) {
      socketRef.current.emit('getNotifications');
    }
  }, [showNotifications]);

  // When opening message dropdown, fetch recent chats
  useEffect(() => {
    if (!showMessageDropdown || !user || !socketRef.current?.connected) {
      setRecentChats([]);
      return;
    }
    setRecentChatsLoading(true);
    socketRef.current.emit('getRecentChats');
  }, [showMessageDropdown, user]);

  // ==================== CHAT SEARCH (small) ====================
  useEffect(() => {
    if (!chatSearchMode || !user) {
      setSearchResultsUsers([]);
      setChatSearchLoading(false);
      return;
    }
    const token = (user as any)?.token;
    if (!token) return;
    const controller = new AbortController();

    const fetchUsers = async () => {
      setChatSearchLoading(true);
      try {
        const res = await api.get('/api/users/search', {
          params: { q: chatSearchQuery.trim() || undefined },
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const users: User[] = Array.isArray(res.data) ? res.data : [];
        setSearchResultsUsers(users.filter(u => u.id !== user.id));
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error('Lỗi tìm người chat:', err);
      } finally {
        setChatSearchLoading(false);
      }
    };

    const delay = chatSearchQuery ? 300 : 0;
    const timer = setTimeout(fetchUsers, delay);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [chatSearchMode, chatSearchQuery, user]);

  // ==================== JISHO SEARCH & PRONUNCIATION (from new) ====================
  const handleSearch = async () => {
    if (!search.trim()) return;
    setResults([]);
    try {
      const data: JapaneseWord[] = await searchJapaneseWord(search);
      const formatted: ResultItem[] = data.map((item: JapaneseWord) => ({
        word: item.japanese[0]?.word || item.japanese[0]?.reading || '',
        reading: item.japanese[0]?.reading || '',
        meanings: item.senses
          .flatMap((s) => s.english_definitions)
          .slice(0, 3)
          .join(', ') || '',
      }));
      setResults(formatted);
    } catch (err) {
      console.error('Lỗi tìm từ:', err);
    }
  };

  // const playPronunciation = async (text: string) => {
  //   if (!text) return;
  //   try {
  //     const url = await getPronunciationUrl(text);
  //     if (!url) return;

  //     if (Platform.OS === 'web') {
  //       const audio = new (window as any).Audio(url);
  //       audio.play().catch(() => {});
  //       return;
  //     }

  //     const { sound } = await expoAv.Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
  //     sound.setOnPlaybackStatusUpdate((status) => {
  //       if (status.isLoaded && status.didJustFinish) {
  //         sound.unloadAsync().catch(() => {});
  //       }
  //     });
  //   } catch (err) {
  //     console.error('Lỗi phát âm:', err);
  //   }
  // };

  const playPronunciation = async (text: string) => {
  if (!text) return;
  try {
    const url = await getPronunciationUrl(text);
    if (!url) return;

    console.log('playPronunciation url=', url);

    if (Platform.OS === 'web') {
      const audio = new (window as any).Audio(url);
      audio.play().catch((e: any) => console.warn('Web audio play failed', e));
      return;
    }

    let finalUrl = url;
    if (!/^https?:\/\//i.test(finalUrl) && !finalUrl.startsWith('file://')) {
      finalUrl = encodeURI(finalUrl);
    }

    // quick GET check
    let ok = false;
    try {
      const resp = await fetch(finalUrl, { method: 'GET', cache: 'no-store' });
      ok = resp.ok;
      if (!ok) console.warn('playPronunciation: GET returned', resp.status);
    } catch (e) {
      console.warn('playPronunciation: health check failed', e);
    }

    // nếu GET không ok -> download rồi play local
    if (!ok) {
      try {
        const dest = `${(FileSystem as any).cacheDirectory}tts_${encodeURIComponent(text)}.mp3`;
        const dl = await FileSystem.downloadAsync(finalUrl, dest);
        const info = await FileSystem.getInfoAsync(dl.uri);
        if (!info.exists) throw new Error('Downloaded file not exists');

        // create and play (local)
        const { sound } = await expoAv.Audio.Sound.createAsync({ uri: dl.uri }, { shouldPlay: true });
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync().catch(() => {});
          }
        });
        return;
      } catch (e) {
        console.warn('playPronunciation: download+play failed', e);
        return;
      }
    }

    // play remote directly
    const { sound } = await expoAv.Audio.Sound.createAsync({ uri: finalUrl }, { shouldPlay: true });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
  } catch (err) {
    console.error('Lỗi phát âm:', err);
  }
};

  // ==================== UI Helpers ====================
  const closeAll = () => {
    setShowMessageDropdown(false);
    setShowNotifications(false);
    setAvatarOpen(false);
    setChatSearchMode(false);
    setChatSearchQuery('');
  };

  const openChat = (targetUser: User) => {
    setShowMessageDropdown(false);
    setChatSearchMode(false);
    setChatSearchQuery('');
    router.push(`/chat/${targetUser.id}`);
  };

  const handleLogout = () => {
    setAvatarOpen(false);
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    try {
      await api.post('/api/logout', {}, { headers: { Authorization: `Bearer ${(user as any)?.token}` } });
    } catch (err) {
      console.error('Logout lỗi:', err);
    }
    logout();
    router.replace('/AuthScreen');
  };

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0b1220', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 18 }}>Đang chuyển hướng...</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={closeAll}>
      <SafeAreaView style={[styles.safe, isDark ? styles.darkBg : styles.lightBg]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        {/* HEADER */}
        <View style={[styles.header, isDark ? styles.headerDark : styles.headerLight]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
            <Search color={isDark ? '#94a3b8' : '#64748b'} size={20} style={{ marginLeft: 12 }} />
            <TextInput
              placeholder="Tìm từ tiếng Nhật..."
              placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              style={{ flex: 1, paddingVertical: 12, fontSize: 16, color: isDark ? '#e2e8f0' : '#1f2937' }}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => { setSearch(''); setResults([]); }}>
                <X color="#94a3b8" size={20} style={{ marginRight: 12 }} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconCircle} onPress={() => setShowMessageDropdown(s => !s)}>
              <MessageSquare color={isDark ? '#fff' : '#000'} width={20} height={20} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconCircle} onPress={() => setShowNotifications(s => !s)}>
              <View style={{ position: 'relative' }}>
                <Bell color={isDark ? '#fff' : '#000'} width={20} height={20} />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconCircle} onPress={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}>
              {isDark ? <Sun color="#ffd166" width={20} height={20} /> : <Sun color="#555" width={20} height={20} />}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setAvatarOpen(s => !s)} style={styles.avatarBtn}>
              <Image source={getSafeAvatar(user as any)} style={styles.avatar} />
            </TouchableOpacity>
          </View>
        </View>

        {/* MESSAGE DROPDOWN */}
        {showMessageDropdown && (
          <TouchableWithoutFeedback onPress={() => { }}>
            <View pointerEvents="box-none" style={[styles.messageDropdown, isDark ? styles.menuDark : styles.menuLight]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#444' }}>
                {chatSearchMode ? (
                  <>
                    <TouchableOpacity onPress={() => { setChatSearchMode(false); setChatSearchQuery(''); }}>
                      <X color={isDark ? '#fff' : '#000'} size={24} />
                    </TouchableOpacity>
                    <TextInput
                      placeholder="Tìm người để chat..."
                      placeholderTextColor="#888"
                      value={chatSearchQuery}
                      onChangeText={setChatSearchQuery}
                      autoFocus
                      style={{ flex: 1, color: isDark ? '#fff' : '#000', fontSize: 16, marginLeft: 10 }}
                    />
                  </>
                ) : (
                  <>
                    <Search color={isDark ? '#fff' : '#000'} size={22} />
                    <Text style={[styles.dropdownTitle, isDark ? styles.txtLight : styles.txtDark]}>Tin nhắn</Text>
                    <TouchableOpacity onPress={() => setChatSearchMode(true)}>
                      <Text style={{ color: '#1877f2', fontWeight: '600' }}>Tìm người</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <ScrollView style={styles.dropdownScroll}>
                {chatSearchMode ? (
                  chatSearchLoading ? (
                    <Text style={{ textAlign: 'center', padding: 20, color: '#888' }}>Đang tìm...</Text>
                  ) : searchResultsUsers?.length > 0 ? (
                    searchResultsUsers.map(u => (
                      <TouchableOpacity key={u.id} style={styles.messageItem} onPress={() => openChat(u)}>
                        <View style={{ position: 'relative' }}>
                          <Image source={getSafeAvatar(u)} style={styles.messageAvatar} />
                          {onlineUsers.includes(u.id) && <View style={styles.onlineDot} />}
                        </View>
                        <View style={styles.messageContent}>
                          <Text style={[styles.messageName, isDark ? styles.txtLight : styles.txtDark]}>{u.name}</Text>
                          <Text style={[styles.messagePreview, isDark ? styles.txtLightDim : styles.txtDarkDim]}>{u.email}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={{ textAlign: 'center', padding: 20, color: '#888' }}>Không tìm thấy</Text>
                  )
                ) : recentChatsLoading ? (
                  <Text style={{ textAlign: 'center', padding: 20, color: '#888' }}>Đang tải tin nhắn...</Text>
                ) : recentChats?.length > 0 ? (
                  recentChats.map((chat: any) => (
                    <TouchableOpacity key={chat.user.id} style={styles.messageItem} onPress={() => openChat(chat.user)}>
                      <View style={{ position: 'relative' }}>
                        <Image source={chat.avatar} style={styles.messageAvatar} />
                        {onlineUsers.includes(chat.user.id) && <View style={styles.onlineDot} />}
                      </View>
                      <View style={styles.messageContent}>
                        <View style={styles.messageHeader}>
                          <Text style={[styles.messageName, isDark ? styles.txtLight : styles.txtDark]} numberOfLines={1}>
                            {chat.user.name}
                          </Text>
                          <Text style={[styles.messageTime, isDark ? styles.txtLightDim : styles.txtDarkDim]}>
                            {chat.time}
                          </Text>
                        </View>
                        <Text style={[styles.messagePreview, isDark ? styles.txtLightDim : styles.txtDarkDim]} numberOfLines={1}>
                          {chat.preview}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={{ textAlign: 'center', padding: 20, color: '#888' }}>Chưa có tin nhắn nào</Text>
                )}
              </ScrollView>

              <TouchableOpacity style={styles.seeAllButton}>
                <Text style={styles.seeAllText}>Xem tất cả trong Messenger</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        )}

        {/* NOTIFICATIONS DROPDOWN */}
        {showNotifications && (
          <View pointerEvents="box-none" style={[styles.notificationDropdown, isDark ? styles.menuDark : styles.menuLight]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10 }}>
              <Text style={[styles.dropdownTitle, isDark ? styles.txtLight : styles.txtDark]}>Thông báo</Text>
              {unreadCount > 0 && <Text style={{ color: '#1877f2', fontSize: 13 }}>{unreadCount} mới</Text>}
            </View>

            <ScrollView style={styles.dropdownScroll}>
              {notifications?.length === 0 ? (
                <Text style={{ textAlign: 'center', padding: 30, color: '#888' }}>Chưa có thông báo</Text>
              ) : (
                notifications.map(notif => (
                  <TouchableOpacity
                    key={notif._id || notif.id}
                    style={[styles.notificationItem, !notif.read && { backgroundColor: 'rgba(59,130,246,0.08)' }]}
                  >
                    <Bell color="#1877f2" size={20} style={{ marginRight: 12 }} />
                    <View style={styles.notificationContent}>
                      <Text style={[styles.notificationText, isDark ? styles.txtLight : styles.txtDark]}>
                        {notif.message}
                      </Text>
                      <Text style={[styles.messageTime, isDark ? styles.txtLightDim : styles.txtDarkDim]}>
                        {notif.time || notif.createdAt}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity style={styles.seeAllButton} onPress={() => router.push('/notifications' as any)}>
              <Text style={styles.seeAllText}>Xem tất cả thông báo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AVATAR MENU */}
        {avatarOpen && (
          <View pointerEvents="box-none" style={[styles.avatarMenu, isDark ? styles.menuDark : styles.menuLight]}>
            <View style={styles.avatarMenuHeader}>
              <Image source={getSafeAvatar(user as any)} style={styles.menuAvatar} />
              <View style={{ marginLeft: 10 }}>
                <Text style={[styles.menuName, isDark ? styles.txtLight : styles.txtDark]}>{user.name}</Text>
                <Text style={[styles.menuRole, isDark ? styles.txtLightDim : styles.txtDarkDim]}>{user.email}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setAvatarOpen(false); router.push('/profile/edit'); }}>
              <Edit2 color={isDark ? '#fff' : '#2b2b2b'} width={18} height={18} />
              <Text style={[styles.menuText, isDark ? styles.txtLight : styles.txtDark]}>Chỉnh sửa hồ sơ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setAvatarOpen(false); router.push('/(auth)/(tabs)/MyFlashcardSetsScreen' as any); }}>
              <BookOpen color={isDark ? '#fff' : '#2b2b2b'} width={18} height={18} />
              <Text style={[styles.menuText, isDark ? styles.txtLight : styles.txtDark]}>Quản lý flashcard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: 'rgba(251, 191, 36, 0.12)' }]}
              onPress={() => { setAvatarOpen(false); router.push('/upgrade' as any); }}
            >
              <View style={{ backgroundColor: '#f59e0b', padding: 6, borderRadius: 8, marginRight: 10 }}>
                <Crown color="#fff" width={16} height={16} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuText, { color: '#f59e0b', fontWeight: '700' }]}>Nâng cấp Premier</Text>
                <Text style={{ fontSize: 11, color: isDark ? '#cbd5e1' : '#64748b' }}>Mở khóa tất cả tính năng</Text>
              </View>
              <ArrowRight color="#f59e0b" width={18} height={18} />
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: isDark ? '#374151' : '#e5e7eb', marginVertical: 6 }} />

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <LogOut color="#e11d48" width={18} height={18} />
              <Text style={[styles.menuText, { color: '#e11d48' }]}>Đăng xuất</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* MAIN CONTENT */}
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {/* Search results (Jisho) */}
          {results.length > 0 && (
            <View style={styles.card}>
              {results.map((item, i) => (
                <View key={i} style={{ paddingVertical: 14, borderBottomWidth: i === results.length - 1 ? 0 : 1, borderColor: '#334155' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 22, fontWeight: 'bold', color: isDark ? '#fff' : '#000' }}>
                        {item.word || item.reading}
                      </Text>
                      {item.word && item.reading && (
                        <Text style={{ fontSize: 16, color: '#3b82f6', marginVertical: 4 }}>【{item.reading}】</Text>
                      )}
                      <Text style={{ fontSize: 15, color: isDark ? '#cbd5e1' : '#475569' }}>{item.meanings}</Text>
                    </View>
                    <TouchableOpacity onPress={() => playPronunciation(item.word || item.reading)}>
                      <Mic2 color="#3b82f6" size={36} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Suggestions */}
          {results.length === 0 && search.length === 0 && (
            <View style={styles.card}>
              <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12, color: isDark ? '#fff' : '#000' }}>
                Gợi ý từ phổ biến
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {['食べる', '学校', '友達', 'ありがとう', 'おはよう'].map(w => (
                  <TouchableOpacity key={w} onPress={() => { setSearch(w); handleSearch(); }} style={{ backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>{w}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((action, i) => (
              <TouchableOpacity key={i} style={[styles.actionBtn, { backgroundColor: action.bg }]} onPress={() => {
                if (action.title === 'Flashcard') router.push('/FlashSet' as any);
                else if (action.title === 'Luyện Thi') router.push('/translate' as any);
                else if (action.title === 'Shadowing') router.push('/shadowTopic' as any);
                else if (action.title === 'Sách Song Ngữ') router.push('/books/list' as any);
              }}>
                <action.icon color={action.color} size={30} />
                <Text style={{ color: action.color, fontWeight: '800', marginTop: 8 }}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12, color: isDark ? '#fff' : '#000' }}>
              Flashcards bạn có thể làm
            </Text>
            {flashcards.map(f => (
              <Text key={f.id} style={{ color: isDark ? '#fff' : '#000', marginVertical: 4 }}>• {f.title}</Text>
            ))}
          </View>
        </ScrollView>

        {/* Logout Modal */}
        <Modal transparent visible={logoutModalVisible} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: isDark ? '#fff' : '#000' }}>Đăng xuất</Text>
              <Text style={{ marginVertical: 16, textAlign: 'center', color: isDark ? '#cbd5e1' : '#666' }}>
                Bạn có chắc muốn thoát?
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={{ flex: 1, padding: 14, backgroundColor: '#666', borderRadius: 12 }} onPress={() => setLogoutModalVisible(false)}>
                  <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1, padding: 14, backgroundColor: '#e11d48', borderRadius: 12 }} onPress={confirmLogout}>
                  <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>Đăng xuất</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Promo modal */}
        <Modal visible={showPromo} transparent animationType="fade" onRequestClose={() => setShowPromo(false)}>
          <View style={styles.promoOverlay}>
            <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowPromo(false)} />
            <View style={styles.cardWrapper}>
              <TouchableOpacity onPress={onPromoPress} activeOpacity={0.9} style={styles.imageBtn}>
                <Image source={PROMO_IMAGE} style={styles.promoImage} resizeMode="contain" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowPromo(false)} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

// ==================== UTIL ====================
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Vừa xong';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 172800) return 'Hôm qua';
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  return 'Lâu lắm rồi';
};

// ==================== STYLES (merge of both) ====================
const styles = StyleSheet.create({
  safe: { flex: 1 },
  lightBg: { backgroundColor: '#F3F7FB' },
  darkBg: { backgroundColor: '#0b1220' },

  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#e11d48',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  header: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, zIndex: 100 },
  headerLight: { backgroundColor: 'rgba(255,255,255,0.72)', borderBottomColor: '#e6e6e6', borderBottomWidth: 1 },
  headerDark: { backgroundColor: 'rgba(4,6,11,0.64)', borderBottomColor: 'rgba(255,255,255,0.06)', borderBottomWidth: 1 },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(200,200,200,0.08)' },

  avatarBtn: { marginLeft: 6, borderRadius: 21, overflow: 'hidden', borderWidth: 2, borderColor: '#3b82f6' },
  avatar: { width: 42, height: 42 },

  // avatar menu
  avatarMenu: { position: 'absolute', top: 64, right: 14, width: 240, borderRadius: 12, paddingVertical: 8, zIndex: 200, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 18, elevation: 10 },
  menuLight: { backgroundColor: '#fff', borderColor: '#e6e6e6', borderWidth: 1 },
  menuDark: { backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1 },
  avatarMenuHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  menuAvatar: { width: 44, height: 44, borderRadius: 22 },
  menuName: { fontSize: 16, fontWeight: '700' },
  menuRole: { fontSize: 13 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  menuText: { fontSize: 15 },

  // dropdowns
  messageDropdown: {
    position: 'absolute',
    top: 68,
    right: 12,
    maxWidth: 420,
    height: 480,
    alignSelf: 'center',
    borderRadius: 16,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'hidden',
  },
  notificationDropdown: { position: 'absolute', top: 64, right: 60, width: 360, height: 450, borderRadius: 12, zIndex: 200, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 10, overflow: 'hidden', paddingTop: 10 },
  dropdownTitle: { fontSize: 20, fontWeight: '800', paddingHorizontal: 15, marginBottom: 5 },
  dropdownScroll: { paddingHorizontal: 8 },

  seeAllButton: { paddingVertical: 10, backgroundColor: '#f0f2f5', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  seeAllText: { color: '#1877f2', fontWeight: '600', fontSize: 15 },

  messageItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8, marginVertical: 2 },
  messageAvatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 10 },
  messageContent: { flex: 1, justifyContent: 'center' },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  messageName: { fontSize: 15, fontWeight: '700' },
  messagePreview: { fontSize: 13 },
  messageTime: { fontSize: 12, marginLeft: 10 },

  notificationItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8, marginVertical: 2, backgroundColor: 'transparent' },
  notificationContent: { flex: 1, justifyContent: 'center' },
  notificationText: { fontSize: 14 },

  contentFullWidth: { padding: 16, paddingBottom: 60, flexGrow: 1 },

  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  actionBtn: { width: '48%', aspectRatio: 3.5, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },

  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },

  txtDark: { color: '#111827' },
  txtLight: { color: '#f8fafc' },
  txtDarkDim: { color: '#6b7280' },
  txtLightDim: { color: '#9ca3af' },

  footer: { paddingVertical: 14, alignItems: 'center' },
  footerText: { fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, backgroundColor: '#4ade80', borderRadius: 7, borderWidth: 3, borderColor: '#0b1220' },
  modalContent: { width: 300, borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 20 },

  // PROMO styles
  promoOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3000,
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cardWrapper: {
    width: '88%',
    maxWidth: 520,
    borderRadius: 16,
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  promoImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 16 / 9,
  },
  closeBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
    borderRadius: 16,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 8,
  },
  closeText: { fontSize: 16, fontWeight: '700' },
});
