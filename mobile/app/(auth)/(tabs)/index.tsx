// VpanDashboard.tsx
import { MaterialIcons } from '@expo/vector-icons'; // ← THÊM DÒNG NÀY
import * as expoAv from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ArrowRight, Bell, BookOpen, Crown, Edit2,
  Layers,
  LogOut, MessageSquare, Mic2,
  Moon,
  Plus, Search, Sun,
  X,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions, Image,
  Modal,
  Platform,
  SafeAreaView, ScrollView, StatusBar,
  Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import { styles } from './index.styles';

import { useAuth } from '../../../context/AuthContext';
import api from '../../utils/api';
import { getPronunciationUrl, searchJapaneseWord } from '../../utils/jishoApi';

// ==================== ASSET ====================
const PROMO_IMAGE = require('../../../assets/images/NangVipNgay.png');

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
  level?: string | null;         // ← THÊM TRƯỜNG NÀY
  sponsoredBy?: string | null;   // ← (tùy chọn, nếu muốn dùng luôn)
  plan?: string;              // 'free' | 'pro' | 'premium' | 'master' | 'lifetime'
  planExpiresAt?: string | null; // ISO string hoặc null
  role?: 'user' | 'teacher' | 'admin';
}

interface FlashcardSet {
  _id: string;
  title: string;
  description?: string;
  cardCount?: number;
  isPublic?: boolean;
  PublicFor?: string;
}

// ==================== HELPERS ====================
const getSafeAvatar = (user: { avatarURL?: string; email: string }) => {
  const avatarURL = user?.avatarURL && user.avatarURL.trim() !== '' ? user.avatarURL.trim() : null;

  if (avatarURL) {
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

  return { uri: `https://i.pravatar.cc/300?u=${encodeURIComponent(user?.email || 'unknown')}` } as any;
};

const { width } = Dimensions.get('window');
const SOCKET_URL = Platform.OS === "web"
  ? "https://vpan-api.onrender.com"
  : "http://172.20.10.3:5000";
const ITEMS_PER_PAGE = 4;

// ==================== COMPONENT ====================
export default function VpanDashboardMerged() {
  const [showPromo, setShowPromo] = useState(false);

  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ResultItem[]>([]);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [recentChatsLoading, setRecentChatsLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const [showMessageDropdown, setShowMessageDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [chatSearchMode, setChatSearchMode] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatSearchLoading, setChatSearchLoading] = useState(false);
  const [searchResultsUsers, setSearchResultsUsers] = useState<User[]>([]);

  const [myFlashcardSets, setMyFlashcardSets] = useState<FlashcardSet[]>([]);
  const [publicFlashcardSets, setPublicFlashcardSets] = useState<FlashcardSet[]>([]);
  const [loadingMySets, setLoadingMySets] = useState(true);
  const [loadingPublicSets, setLoadingPublicSets] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [publicPage, setPublicPage] = useState(1);

  const [fullUser, setFullUser] = useState<User | null>(null); // user đầy đủ từ API
  const [loadingUser, setLoadingUser] = useState(true); // trạng thái đang fetch
  const isDark = theme === 'dark';

  const onPromoPress = () => {
    setShowPromo(false);
    router.push('/upgrade/upgrade' as any);
  };
  // 👇 THAY THẾ HOÀN TOÀN useEffect này
  useEffect(() => {
    if (loadingUser) {
      // Đang tải → không hiện gì cả (không flash)
      return;
    }

    // Đã tải xong
    if (!fullUser?.plan || fullUser.plan === 'free') {
      setShowPromo(true);  // chỉ hiện khi là free
    } else {
      setShowPromo(false); // premium → ẩn luôn
    }
  }, [fullUser, loadingUser]);
  useEffect(() => {
    if (!user) {
      router.replace(Platform.OS === 'web' ? '/AuthScreen' : '/login');
      return;
    }

    // Fetch thông tin user đầy đủ từ backend để lấy trường level
    const fetchFullUser = async () => {
      try {
        setLoadingUser(true);
        const token = (user as any)?.token;
        const res = await api.get('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFullUser(res.data);
      } catch (err) {
        console.error('Lỗi lấy thông tin user:', err);
        // Nếu lỗi có thể logout hoặc để nguyên dashboard
      } finally {
        setLoadingUser(false);
      }
    };

    fetchFullUser();
  }, [user]);

  useEffect(() => {
    if (loadingUser) return; // đang tải thì chưa làm gì

    if (fullUser && (fullUser.level === null || fullUser.level === undefined)) {
      // Chưa có level → chuyển sang survey
      router.replace('/survey/survey');
    }
  }, [fullUser, loadingUser]);

  useEffect(() => {
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
  }, [isDark]);

  // ==================== FETCH FLASHCARD SETS ====================
// SỬA LẠI useEffect này (thay toàn bộ khối useEffect fetch flashcard sets)

useEffect(() => {
  if (!user) return;

  const token = (user as any)?.token;

  const fetchMySets = async () => {
    setLoadingMySets(true);
    try {
      const res = await api.get('/api/flashcard-sets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyFlashcardSets(res.data || []);
    } catch (err) {
      console.error('Lỗi lấy bộ flashcard của tôi:', err);
      setMyFlashcardSets([]);
    } finally {
      setLoadingMySets(false);
    }
  };

  const fetchPublicSets = async () => {
    setLoadingPublicSets(true);
    try {
      const res = await api.get('/api/flashcard-sets/public');
      let sets: FlashcardSet[] = res.data || [];

      // DEBUG: In ra thông tin user và dữ liệu nhận được
      console.log('=== DEBUG PUBLIC SETS ===');
      console.log('fullUser.plan:', fullUser?.plan);
      console.log('Số bộ public gốc:', sets.length);
      sets.forEach((set: any, idx) => {
        console.log(`Set ${idx}: ${set.title} | publicFor: ${set.publicFor || 'free'}`);
      });

      // LỌC THEO PLAN
      if (fullUser?.plan) {
        const userPlan = fullUser.plan;

        const planHierarchy: { [key: string]: number } = {
          free: 0,
          pro: 1,
          premium: 2,
          master: 3,
          lifetime: 4,
        };

        const userLevel = planHierarchy[userPlan] ?? 0;

        const filtered = sets.filter((set: any) => {
          const setPublicFor = set.publicFor || 'free';
          const setLevel = planHierarchy[setPublicFor] ?? 0;
          const allowed = setLevel <= userLevel;
          
          // DEBUG: In ra từng bộ có bị lọc không
          if (!allowed) {
            console.log(`LOẠI BỎ: "${set.title}" (publicFor: ${setPublicFor}) - user chỉ có ${userPlan}`);
          }
          
          return allowed;
        });

        console.log(`Sau khi lọc: còn ${filtered.length} bộ (user plan: ${userPlan})`);
        sets = filtered;
      } else {
        // Nếu chưa có plan → chỉ cho xem free
        console.log('Chưa có fullUser.plan → chỉ giữ các bộ publicFor: free');
        sets = sets.filter((set: any) => (set.publicFor || 'free') === 'free');
      }

      // SẮP XẾP THEO LEVEL JLPT (giữ nguyên)
      if (fullUser?.level) {
        const userLevel = fullUser.level.trim().toUpperCase();

        const getLevelScore = (setLevel: string): number => {
          const normalizedSetLevel = (setLevel || '').trim().toUpperCase();
          if (normalizedSetLevel === userLevel) return -100;
          if (!normalizedSetLevel) return 100;

          const order: { [key: string]: number } = {
            'N1': 1, 'N2': 2, 'N3': 3, 'N4': 4, 'N5': 5,
          };

          const userOrder = order[userLevel];
          const setOrder = order[normalizedSetLevel];

          if (userOrder === undefined || setOrder === undefined) return 50;
          return Math.abs(setOrder - userOrder);
        };

        sets = sets.sort((a: any, b: any) => {
          return getLevelScore(a.level) - getLevelScore(b.level);
        });
      }

      console.log('=== FINAL PUBLIC SETS:', sets.length, 'bộ ===');
      setPublicFlashcardSets(sets);
    } catch (err) {
      console.error('Lỗi lấy bộ flashcard public:', err);
      setPublicFlashcardSets([]);
    } finally {
      setLoadingPublicSets(false);
    }
  };

  fetchMySets();
  fetchPublicSets();
}, [user, fullUser?.plan, fullUser?.level]); // THÊM fullUser?.plan vào dependency!

  const totalPages = Math.ceil(myFlashcardSets.length / ITEMS_PER_PAGE);
  const paginatedSets = myFlashcardSets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ==================== SOCKET ====================
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

    socket.on('newNotification', (notif: any) => {
      setNotifications(prev => [notif, ...prev]);
      if (!notif.read) setUnreadCount(c => c + 1);
    });

    socket.on('notificationsList', (list: any[]) => {
      setNotifications(list);
      setUnreadCount(list.filter((n: any) => !n.read).length);
    });

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
      try { socket.disconnect(); } catch (e) { }
      socketRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    if (showNotifications && socketRef.current?.connected) {
      socketRef.current.emit('getNotifications');
    }
  }, [showNotifications]);

  useEffect(() => {
    if (!showMessageDropdown || !user || !socketRef.current?.connected) {
      setRecentChats([]);
      return;
    }
    setRecentChatsLoading(true);
    socketRef.current.emit('getRecentChats');
  }, [showMessageDropdown, user]);

  // ==================== CHAT SEARCH ====================
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

  // ==================== JISHO SEARCH & PRONUNCIATION ====================
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

  const playPronunciation = async (text: string) => {
    if (!text) return;
    try {
      const url = await getPronunciationUrl(text);
      if (!url) return;

      if (Platform.OS === 'web') {
        const audio = new (window as any).Audio(url);
        audio.play().catch((e: any) => console.warn('Web audio play failed', e));
        return;
      }

      let finalUrl = url;
      if (!/^https?:\/\//i.test(finalUrl) && !finalUrl.startsWith('file://')) {
        finalUrl = encodeURI(finalUrl);
      }

      let ok = false;
      try {
        const resp = await fetch(finalUrl, { method: 'GET', cache: 'no-store' });
        ok = resp.ok;
        if (!ok) console.warn('playPronunciation: GET returned', resp.status);
      } catch (e) {
        console.warn('playPronunciation: health check failed', e);
      }

      if (!ok) {
        try {
          const dest = `${(FileSystem as any).cacheDirectory}tts_${encodeURIComponent(text)}.mp3`;
          const dl = await FileSystem.downloadAsync(finalUrl, dest);
          const info = await FileSystem.getInfoAsync(dl.uri);
          if (!info.exists) throw new Error('Downloaded file not exists');

          const { sound } = await expoAv.Audio.Sound.createAsync({ uri: dl.uri }, { shouldPlay: true });
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              sound.unloadAsync().catch(() => { });
            }
          });
          return;
        } catch (e) {
          console.warn('playPronunciation: download+play failed', e);
          return;
        }
      }

      const { sound } = await expoAv.Audio.Sound.createAsync({ uri: finalUrl }, { shouldPlay: true });
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => { });
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
      await api.post('/api/logout', {}, {
        headers: { Authorization: `Bearer ${(user as any)?.token}` }
      });
    } catch (err) {
      console.error('Logout lỗi:', err);
    }

    // Thực hiện logout (xóa token, user state, v.v.)
    logout();

    // Kiểm tra platform
    if (Platform.OS !== 'web') {
      // Trên mobile → chuyển về trang login
      router.replace('/login');
    } else {
      // Trên web → giữ nguyên hành vi cũ hoặc cũng về /login nếu muốn thống nhất
      router.replace('/AuthScreen'); // hoặc router.replace('/login') nếu muốn thống nhất
    }
  };

  const createNewSet = () => {
    router.push('/flashSet' as any);
  };

  const openMySet = (setId: string) => {
    router.push(`/flashcards/${setId}`);
  };

  const openPublicSet = (setId: string) => {
    router.push(`/flashcards/${setId}`);
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
                <X color={isDark ? '#94a3b8' : '#64748b'} size={20} style={{ marginRight: 12 }} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={[styles.iconCircle, isDark ? styles.iconCircleDark : styles.iconCircleLight]} onPress={() => setShowMessageDropdown(s => !s)}>
              <MessageSquare color={isDark ? '#fff' : '#1f2937'} width={20} height={20} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.iconCircle, isDark ? styles.iconCircleDark : styles.iconCircleLight]} onPress={() => setShowNotifications(s => !s)}>
              <View style={{ position: 'relative' }}>
                <Bell color={isDark ? '#fff' : '#1f2937'} width={20} height={20} />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.iconCircle, isDark ? styles.iconCircleDark : styles.iconCircleLight]} onPress={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}>
              {isDark ? (
                <Sun color="#fbbf24" width={20} height={20} />
              ) : (
                <Moon color="#1f2937" width={20} height={20} />
              )}
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
              <View style={[styles.dropdownHeader, isDark ? styles.borderDark : styles.borderLight]}>
                {chatSearchMode ? (
                  <>
                    <TouchableOpacity onPress={() => { setChatSearchMode(false); setChatSearchQuery(''); }}>
                      <X color={isDark ? '#fff' : '#1f2937'} size={24} />
                    </TouchableOpacity>
                    <TextInput
                      placeholder="Tìm người để chat..."
                      placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                      value={chatSearchQuery}
                      onChangeText={setChatSearchQuery}
                      autoFocus
                      style={{ flex: 1, color: isDark ? '#fff' : '#1f2937', fontSize: 16, marginLeft: 10 }}
                    />
                  </>
                ) : (
                  <>
                    <Search color={isDark ? '#fff' : '#1f2937'} size={22} />
                    <Text style={[styles.dropdownTitle, isDark ? styles.txtLight : styles.txtDark]}>Tin nhắn</Text>
                    <TouchableOpacity onPress={() => setChatSearchMode(true)}>
                      <Text style={{ color: '#3b82f6', fontWeight: '600' }}>Tìm người</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <ScrollView style={styles.dropdownScroll}>
                {chatSearchMode ? (
                  chatSearchLoading ? (
                    <Text style={[styles.emptyText, isDark ? styles.txtLightDim : styles.txtDarkDim]}>Đang tìm...</Text>
                  ) : searchResultsUsers?.length > 0 ? (
                    searchResultsUsers.map(u => (
                      <TouchableOpacity key={u.id} style={[styles.messageItem, isDark ? styles.messageItemDark : styles.messageItemLight]} onPress={() => openChat(u)}>
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
                    <Text style={[styles.emptyText, isDark ? styles.txtLightDim : styles.txtDarkDim]}>Không tìm thấy</Text>
                  )
                ) : recentChatsLoading ? (
                  <Text style={[styles.emptyText, isDark ? styles.txtLightDim : styles.txtDarkDim]}>Đang tải tin nhắn...</Text>
                ) : recentChats?.length > 0 ? (
                  recentChats.map((chat: any) => (
                    <TouchableOpacity key={chat.user.id} style={[styles.messageItem, isDark ? styles.messageItemDark : styles.messageItemLight]} onPress={() => openChat(chat.user)}>
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
                  <Text style={[styles.emptyText, isDark ? styles.txtLightDim : styles.txtDarkDim]}>Chưa có tin nhắn nào</Text>
                )}
              </ScrollView>

              <TouchableOpacity style={[styles.seeAllButton, isDark ? styles.seeAllButtonDark : styles.seeAllButtonLight]}>
                <Text style={styles.seeAllText}>Xem tất cả trong Messenger</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        )}

        {/* NOTIFICATIONS DROPDOWN */}
        {showNotifications && (
          <View pointerEvents="box-none" style={[styles.notificationDropdown, isDark ? styles.menuDark : styles.menuLight]}>
            <View style={[styles.dropdownHeader, isDark ? styles.borderDark : styles.borderLight]}>
              <Text style={[styles.dropdownTitle, isDark ? styles.txtLight : styles.txtDark]}>Thông báo</Text>
              {unreadCount > 0 && <Text style={{ color: '#3b82f6', fontSize: 13 }}>{unreadCount} mới</Text>}
            </View>

            <ScrollView style={styles.dropdownScroll}>
              {notifications?.length === 0 ? (
                <Text style={[styles.emptyText, isDark ? styles.txtLightDim : styles.txtDarkDim]}>Chưa có thông báo</Text>
              ) : (
                notifications.map(notif => (
                  <TouchableOpacity
                    key={notif._id || notif.id}
                    style={[
                      styles.notificationItem,
                      isDark ? styles.notificationItemDark : styles.notificationItemLight,
                      !notif.read && (isDark ? styles.unreadDark : styles.unreadLight)
                    ]}
                  >
                    <Bell color="#3b82f6" size={20} style={{ marginRight: 12 }} />
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

            <TouchableOpacity style={[styles.seeAllButton, isDark ? styles.seeAllButtonDark : styles.seeAllButtonLight]} onPress={() => router.push('/notifications' as any)}>
              <Text style={styles.seeAllText}>Xem tất cả thông báo</Text>
            </TouchableOpacity>
          </View>
        )}

                {/* AVATAR MENU */}
        {avatarOpen && (
          <View pointerEvents="box-none" style={[styles.avatarMenu, isDark ? styles.menuDark : styles.menuLight]}>
            <View style={[styles.avatarMenuHeader, isDark ? styles.borderDark : styles.borderLight]}>
              <Image source={getSafeAvatar(user as any)} style={styles.menuAvatar} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={[styles.menuName, isDark ? styles.txtLight : styles.txtDark]}>{user.name}</Text>
                <Text style={[styles.menuRole, isDark ? styles.txtLightDim : styles.txtDarkDim]}>{user.email}</Text>

                {/* Hiển thị plan */}
                {fullUser?.plan && fullUser.plan !== 'free' && (
                  <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Crown color="#f59e0b" size={16} style={{ marginRight: 6 }} />
                    <Text style={{ color: '#f59e0b', fontWeight: '700', fontSize: 14 }}>
                      {fullUser.plan === 'pro' && 'Gói Pro'}
                      {fullUser.plan === 'premium' && 'Gói Premium'}
                      {fullUser.plan === 'master' && 'Gói Master'}
                      {fullUser.plan === 'lifetime' && 'Gói Lifetime'}
                    </Text>

                    {fullUser.planExpiresAt && fullUser.plan !== 'lifetime' && (
                      <>
                        <Text style={{ color: '#94a3b8', fontSize: 12, marginHorizontal: 8 }}>•</Text>
                        <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                          Hết hạn: {new Date(fullUser.planExpiresAt).toLocaleDateString('vi-VN')}
                        </Text>
                      </>
                    )}
                  </View>
                )}

                {(!fullUser?.plan || fullUser.plan === 'free') && (
                  <Text style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                    Tài khoản miễn phí
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity style={[styles.menuItem, isDark ? styles.menuItemDark : styles.menuItemLight]} onPress={() => { setAvatarOpen(false); router.push('/profile/edit'); }}>
              <Edit2 color={isDark ? '#fff' : '#1f2937'} width={18} height={18} />
              <Text style={[styles.menuText, isDark ? styles.txtLight : styles.txtDark]}>Chỉnh sửa hồ sơ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, isDark ? styles.menuItemDark : styles.menuItemLight]} onPress={() => { setAvatarOpen(false); router.push('/(auth)/(tabs)/MyFlashcardSetsScreen' as any); }}>
              <BookOpen color={isDark ? '#fff' : '#1f2937'} width={18} height={18} />
              <Text style={[styles.menuText, isDark ? styles.txtLight : styles.txtDark]}>Quản lý flashcard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.premiumItem]}
              onPress={() => { setAvatarOpen(false); router.push('/upgrade/upgrade' as any); }}
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

            {/* === NÚT MỚI: CHỈ HIỆN KHI LÀ ADMIN === */}
            {fullUser?.role === 'admin' && (
              <>
                <View style={[styles.divider, isDark ? styles.dividerDark : styles.dividerLight]} />

                <TouchableOpacity
                  style={[styles.menuItem, isDark ? styles.menuItemDark : styles.menuItemLight]}
                  onPress={() => {
                    setAvatarOpen(false);
                    router.push('/(auth)/admin'); // ← Trang admin panel
                  }}
                >
                  <MaterialIcons name="admin-panel-settings" size={20} color="#8b5cf6" />
                  <Text style={[styles.menuText, { color: '#8b5cf6', fontWeight: '700' }]}>
                    Admin Panel
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Đường kẻ phân cách trước Đăng xuất */}
            <View style={[styles.divider, isDark ? styles.dividerDark : styles.dividerLight]} />

            {/* Nút Đăng xuất */}
            <TouchableOpacity style={[styles.menuItem, isDark ? styles.menuItemDark : styles.menuItemLight]} onPress={handleLogout}>
              <LogOut color="#ef4444" width={18} height={18} />
              <Text style={[styles.menuText, { color: '#ef4444' }]}>Đăng xuất</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* MAIN CONTENT */}
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {/* Search results */}
          {results.length > 0 && (
            <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
              {results.map((item, i) => (
                <View key={i} style={[styles.resultItem, i !== results.length - 1 && (isDark ? styles.borderDark : styles.borderLight)]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.wordText, isDark ? styles.txtLight : styles.txtDark]}>
                        {item.word || item.reading}
                      </Text>
                      {item.word && item.reading && (
                        <Text style={styles.readingText}>【{item.reading}】</Text>
                      )}
                      <Text style={[styles.meaningText, isDark ? styles.txtLightDim : styles.txtDarkDim]}>{item.meanings}</Text>
                    </View>
                    <TouchableOpacity onPress={() => playPronunciation(item.word || item.reading)}>
                      <Mic2 color="#3b82f6" size={36} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Suggestions + Quick Actions */}
          {results.length === 0 && search.length === 0 && (
            <>
              {/* Gợi ý từ phổ biến */}


              {/* Quick Actions - ngay dưới gợi ý */}
              <View style={{ marginTop: 0, marginBottom: 16 }}>
                <Text
                  style={[
                    styles.sectionTitle,
                    isDark ? styles.txtLight : styles.txtDark,
                    { marginBottom: 12 },
                  ]}
                >
                  Tính năng nhanh
                </Text>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {/* Shadowing */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={{ flex: 1 }}
                    onPress={() => router.push('/shadowing/shadowTopic' as any)}
                  >
                    <LinearGradient
                      colors={['#38bdf8', '#6366f1']} // xanh -> tím
                      start={{ x: 1, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={{
                        borderRadius: 18,
                        padding: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 130,
                        shadowColor: '#6366f1',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 12,
                        elevation: 6,
                      }}
                    >
                      <Mic2 color="#fff" size={42} />
                      <Text
                        style={{
                          color: '#fff',
                          fontWeight: '800',
                          marginTop: 14,
                          fontSize: 16,
                          letterSpacing: 0.5,
                        }}
                      >
                        Shadowing
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Sách Song Ngữ */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={{ flex: 1 }}
                    onPress={() => router.push('/books/list' as any)}
                  >
                    <LinearGradient
                      colors={['#a78bfa', '#ec4899']} // tím -> hồng
                      start={{ x: 1, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={{
                        borderRadius: 18,
                        padding: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 130,
                        shadowColor: '#ec4899',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 12,
                        elevation: 6,
                      }}
                    >
                      <BookOpen color="#fff" size={42} />
                      <Text
                        style={{
                          color: '#fff',
                          fontWeight: '800',
                          marginTop: 14,
                          fontSize: 16,
                          letterSpacing: 0.5,
                        }}
                      >
                        Sách Song Ngữ
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* ==================== BỘ FLASHCARD CỦA TÔI ==================== */}
          <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.sectionTitle, isDark ? styles.txtLight : styles.txtDark]}>
                Bộ flashcard của tôi
              </Text>
              <TouchableOpacity onPress={createNewSet} style={styles.createButton}>
                <Plus color="#fff" size={20} />
                <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 6 }}>Tạo mới</Text>
              </TouchableOpacity>
            </View>

            {loadingMySets ? (
              <Text style={[styles.loadingText, isDark ? styles.txtLightDim : styles.txtDarkDim]}>Đang tải...</Text>
            ) : myFlashcardSets.length === 0 ? (
              <Text style={[styles.emptyText, isDark ? styles.txtLightDim : styles.txtDarkDim]}>Bạn chưa có bộ flashcard nào</Text>
            ) : (
              <>
                {paginatedSets.map((set: any) => (
                  <TouchableOpacity
                    key={set._id}
                    style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                    }}
                    onPress={() => openMySet(set._id)}
                  >
                    <Layers color="#3b82f6" size={44} style={{ marginRight: 16 }} />

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.setTitle, isDark ? styles.txtLight : styles.txtDark, { fontSize: 17, marginBottom: 4 }]}>
                        {set.title}
                      </Text>
                      <Text style={[styles.messagePreview, isDark ? styles.txtLightDim : styles.txtDarkDim, { fontSize: 14, marginBottom: 6 }]}>
                        {set.description || 'Không có mô tả'}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#3b82f6', fontWeight: '600' }}>
                        Cấp độ: {set.level || 'Undefined'}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.cardCountText, isDark ? styles.txtLightDim : styles.txtDarkDim]}>
                        {set.cardCount || set.flashcards?.length || 0} thẻ
                      </Text>
                      <Text style={[styles.messageTime, isDark ? styles.txtLightDim : styles.txtDarkDim]}>
                        {new Date(set.updatedAt || set.createdAt).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {totalPages > 1 && (
                  <View style={styles.pagination}>
                    <TouchableOpacity
                      onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={[styles.pageBtn, currentPage === 1 && styles.disabledBtn]}
                    >
                      <Text style={[styles.pageText, isDark ? styles.txtLight : styles.txtDark]}>‹</Text>
                    </TouchableOpacity>

                    <Text style={[styles.pageInfo, isDark ? styles.txtLightDim : styles.txtDarkDim]}>
                      Trang {currentPage} / {totalPages}
                    </Text>

                    <TouchableOpacity
                      onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={[styles.pageBtn, currentPage === totalPages && styles.disabledBtn]}
                    >
                      <Text style={[styles.pageText, isDark ? styles.txtLight : styles.txtDark]}>›</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>

          {/* ==================== FLASHCARDS BẠN CÓ THỂ LÀM (PUBLIC) ==================== */}
          <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
            <Text style={[styles.sectionTitle, isDark ? styles.txtLight : styles.txtDark]}>
              Flashcards bạn có thể làm
            </Text>

            {loadingPublicSets ? (
              <Text style={[styles.loadingText, isDark ? styles.txtLightDim : styles.txtDarkDim]}>Đang tải...</Text>
            ) : publicFlashcardSets.length === 0 ? (
              <Text style={[styles.emptyText, isDark ? styles.txtLightDim : styles.txtDarkDim]}>Chưa có bộ công khai nào</Text>
            ) : (
              <>
                {/* Phân trang cho public */}
                {(() => {
                  const publicTotalPages = Math.ceil(publicFlashcardSets.length / ITEMS_PER_PAGE);
                  const paginatedPublicSets = publicFlashcardSets.slice(
                    (publicPage - 1) * ITEMS_PER_PAGE,
                    publicPage * ITEMS_PER_PAGE
                  );

                  return (
                    <>
                      {paginatedPublicSets.map((set: any) => (
                        <TouchableOpacity
                          key={set._id}
                          style={{
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                          }}
                          onPress={() => openPublicSet(set._id)}
                        >
                          <Layers color="#8b5cf6" size={44} style={{ marginRight: 16 }} />

                          <View style={{ flex: 1 }}>
                            <Text style={[styles.setTitle, isDark ? styles.txtLight : styles.txtDark, { fontSize: 17, marginBottom: 4 }]}>
                              {set.title}
                            </Text>
                            <Text style={[styles.messagePreview, isDark ? styles.txtLightDim : styles.txtDarkDim, { fontSize: 14, marginBottom: 6 }]}>
                              {set.description || 'Không có mô tả'}
                            </Text>
                            <Text style={{ fontSize: 13, color: '#8b5cf6', fontWeight: '600' }}>
                              Cấp độ: {set.level || 'not set'}
                            </Text>
                          </View>

                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.cardCountText, isDark ? styles.txtLightDim : styles.txtDarkDim]}>
                              {set.cardCount || set.flashcards?.length || 0} thẻ
                            </Text>
                            <Text style={[styles.messageTime, isDark ? styles.txtLightDim : styles.txtDarkDim]}>
                              {new Date(set.updatedAt || set.createdAt).toLocaleDateString('vi-VN')}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}

                      {publicTotalPages > 1 && (
                        <View style={styles.pagination}>
                          <TouchableOpacity
                            onPress={() => setPublicPage(p => Math.max(1, p - 1))}
                            disabled={publicPage === 1}
                            style={[styles.pageBtn, publicPage === 1 && styles.disabledBtn]}
                          >
                            <Text style={[styles.pageText, isDark ? styles.txtLight : styles.txtDark]}>‹</Text>
                          </TouchableOpacity>

                          <Text style={[styles.pageInfo, isDark ? styles.txtLightDim : styles.txtDarkDim]}>
                            Trang {publicPage} / {publicTotalPages}
                          </Text>

                          <TouchableOpacity
                            onPress={() => setPublicPage(p => Math.min(publicTotalPages, p + 1))}
                            disabled={publicPage === publicTotalPages}
                            style={[styles.pageBtn, publicPage === publicTotalPages && styles.disabledBtn]}
                          >
                            <Text style={[styles.pageText, isDark ? styles.txtLight : styles.txtDark]}>›</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </View>
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
        </ScrollView>

      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Vừa xong';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 172800) return 'Hôm qua';
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  return 'Lâu lắm rồi';
}
