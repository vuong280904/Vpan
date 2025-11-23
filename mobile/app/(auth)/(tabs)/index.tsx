// File: app/(tabs)/index.tsx  (VpanDashboard.tsx)
import { router } from 'expo-router';
import {
  Bell,
  Book,
  BookOpen,
  Edit2,
  Layers,
  LogOut,
  MessageSquare,
  Mic2,
  Moon,
  PenTool,
  Sun,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';

const { width } = Dimensions.get('window');

interface Message {
  id: number;
  from: string;
  preview: string;
  avatar: { uri: string };
  time: string;
}

const MOCK_MESSAGES: Message[] = [
  { id: 1, from: 'Mai', preview: 'Mình đã gửi bộ flashcard mới.', avatar: { uri: 'https://i.pravatar.cc/150?img=5' }, time: '10 phút trước' },
  { id: 2, from: 'An', preview: 'Nhớ ôn bài hôm nay nhé!', avatar: { uri: 'https://i.pravatar.cc/150?img=12' }, time: '1 giờ trước' },
  { id: 3, from: 'Phòng học JLPT', preview: 'Link bài kiểm tra mới đã được đăng.', avatar: { uri: 'https://i.pravatar.cc/150?img=33' }, time: '2 giờ trước' },
  { id: 4, from: 'Hoàng', preview: 'Tài liệu từ vựng N3 đã xong.', avatar: { uri: 'https://i.pravatar.cc/150?img=14' }, time: 'Hôm qua' },
];

const MOCK_NOTIFICATIONS = [
  { id: 1, text: 'Bài thi thử JLPT N3 đã sẵn sàng.', time: '5 phút trước' },
  { id: 2, text: 'Tài liệu N5 của bạn đã được cập nhật.', time: '3 giờ trước' },
  { id: 3, text: 'Hoàng đã phản hồi về bài Shadowing của bạn.', time: 'Hôm qua' },
];

const QUICK_ACTIONS = [
  { title: 'Flashcard', icon: Layers, color: '#f472b6', bg: '#f9a8d4' },
  { title: 'Luyện Thi', icon: PenTool, color: '#fb923c', bg: '#fdba74' },
  { title: 'Shadowing', icon: Mic2, color: '#38bdf8', bg: '#7dd3fc' },
  { title: 'Sách Song Ngữ', icon: Book, color: '#8b5cf6', bg: '#c4b5fd' },
];

export default function VpanDashboard() {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessageDropdown, setShowMessageDropdown] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false); // ← Modal đăng xuất

  const isDark = theme === 'dark';

  useEffect(() => {
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
  }, [isDark]);

  const handleLogout = () => {
    console.log('handleLogout được gọi');
    setAvatarOpen(false);
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    console.log('XÁC NHẬN ĐĂNG XUẤT');
    try {
      await logout();
      console.log('ĐÃ LOGOUT THÀNH CÔNG');
      router.replace('/login'); // ← An toàn nhất trong Expo Router + Tabs
    } catch (err) {
      console.log('Lỗi logout:', err);
    }
  };

  const flashcards = [
    { id: 1, title: 'Flashcard Ngữ pháp N3' },
    { id: 2, title: 'Flashcard Từ vựng N4' },
    { id: 3, title: 'Flashcard Kanji Sơ cấp' },
  ];

  const MessageItem = ({ message }: { message: Message }) => (
    <TouchableOpacity style={styles.messageItem}>
      <Image source={message.avatar} style={styles.messageAvatar} />
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={[styles.messageName, isDark ? styles.txtLight : styles.txtDark]} numberOfLines={1}>
            {message.from}
          </Text>
          <Text style={[styles.messageTime, isDark ? styles.txtLightDim : styles.txtDarkDim]}>
            {message.time}
          </Text>
        </View>
        <Text style={[styles.messagePreview, isDark ? styles.txtLightDim : styles.txtDarkDim]} numberOfLines={1}>
          {message.preview}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const NotificationItem = ({ notif }: { notif: { id: number; text: string; time: string } }) => (
    <TouchableOpacity style={styles.notificationItem}>
      <Bell color="#1877f2" size={20} style={{ marginRight: 10 }} />
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationText, isDark ? styles.txtLight : styles.txtDark]}>{notif.text}</Text>
        <Text style={[styles.messageTime, isDark ? styles.txtLightDim : styles.txtDarkDim]}>{notif.time}</Text>
      </View>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0b1220', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 18 }}>Đang chuyển hướng...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, isDark ? styles.darkBg : styles.lightBg]}>
      {/* Header */}
      <View style={[styles.header, isDark ? styles.headerDark : styles.headerLight]}>
        <TextInput
          placeholder="Tìm từ, flashcard hoặc bài học..."
          placeholderTextColor={isDark ? '#BDBDBD' : '#777'}
          style={[styles.searchInput, isDark ? styles.inputDark : styles.inputLight]}
        />

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconCircle}
            onPress={() => {
              setShowMessageDropdown(s => !s);
              setShowNotifications(false);
            }}
          >
            <MessageSquare color={isDark ? '#fff' : '#2b2b2b'} width={20} height={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconCircle}
            onPress={() => {
              setShowNotifications(s => !s);
              setShowMessageDropdown(false);
            }}
          >
            <Bell color={isDark ? '#fff' : '#2b2b2b'} width={20} height={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconCircle}
            onPress={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
          >
            {isDark ? <Sun color="#ffd166" width={20} height={20} /> : <Moon color="#555" width={20} height={20} />}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setAvatarOpen(s => !s)} style={styles.avatarBtn}>
            <Image
              source={{ uri: `https://i.pravatar.cc/150?u=${user.email}` }}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Thông báo */}
      {showNotifications && (
        <View pointerEvents="box-none" style={[styles.notificationDropdown, isDark ? styles.menuDark : styles.menuLight]}>
          <Text style={[styles.dropdownTitle, isDark ? styles.txtLight : styles.txtDark]}>Thông báo</Text>
          <ScrollView style={styles.dropdownScroll}>
            {MOCK_NOTIFICATIONS.map(n => (
              <NotificationItem key={n.id} notif={n} />
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>Xem tất cả thông báo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Dropdown Tin nhắn */}
      {showMessageDropdown && (
        <View pointerEvents="box-none" style={[styles.messageDropdown, isDark ? styles.menuDark : styles.menuLight]}>
          <Text style={[styles.dropdownTitle, isDark ? styles.txtLight : styles.txtDark]}>Tin nhắn gần đây</Text>
          <ScrollView style={styles.dropdownScroll}>
            {MOCK_MESSAGES.map(m => (
              <MessageItem key={m.id} message={m} />
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>Xem tất cả trong Messenger</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Avatar Dropdown */}
      {avatarOpen && (
        <View pointerEvents="box-none" style={[styles.avatarMenu, isDark ? styles.menuDark : styles.menuLight]}>
          <View style={styles.avatarMenuHeader}>
            <Image source={{ uri: `https://i.pravatar.cc/150?u=${user.email}` }} style={styles.menuAvatar} />
            <View style={{ marginLeft: 10 }}>
              <Text style={[styles.menuName, isDark ? styles.txtLight : styles.txtDark]}>{user.name}</Text>
              <Text style={[styles.menuRole, isDark ? styles.txtLightDim : styles.txtDarkDim]}>{user.email}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.menuItem}>
            <Edit2 color={isDark ? '#fff' : '#2b2b2b'} width={18} height={18} />
            <Text style={[styles.menuText, isDark ? styles.txtLight : styles.txtDark]}>Chỉnh sửa hồ sơ</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <BookOpen color={isDark ? '#fff' : '#2b2b2b'} width={18} height={18} />
            <Text style={[styles.menuText, isDark ? styles.txtLight : styles.txtDark]}>Quản lý flashcard</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <LogOut color="#e11d48" width={18} height={18} />
            <Text style={[styles.menuText, { color: '#e11d48' }]}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Nội dung chính */}
      <ScrollView contentContainerStyle={styles.contentFullWidth}>
        <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
          <Text style={[styles.sectionTitle, isDark ? styles.txtLight : styles.txtDark]}>Thống kê hôm nay</Text>
          <View style={styles.statRow}>
            <View style={styles.statColLeft}>
              <Text style={styles.statLabel}>Lượt học</Text>
              <Text style={[styles.statValue, isDark ? styles.txtLight : styles.txtDark]}>12</Text>
            </View>
            <View style={styles.statColCenter}>
              <Text style={styles.statLabel}>Số bài hoàn thành</Text>
              <Text style={[styles.statValue, isDark ? styles.txtLight : styles.txtDark]}>8</Text>
            </View>
            <View style={styles.statColRight}>
              <Text style={styles.statLabel}>Thời gian trung bình (phút)</Text>
              <Text style={[styles.statValue, isDark ? styles.txtLight : styles.txtDark]}>45</Text>
            </View>
          </View>
        </View>

<View style={styles.quickActionsGrid}>
  {QUICK_ACTIONS.map((action, index) => (
    <TouchableOpacity
      key={index}
      style={[styles.actionBtnV2, { backgroundColor: action.bg, shadowColor: action.color }]}
onPress={() => {
  if (action.title === 'Sách Song Ngữ') {
    router.push('/books/list' as any); // Dùng "as any" để bypass tạm thời
  } else if (action.title === 'Flashcard') {
    router.push('/FlashSet' as any);
  } else if (action.title === 'Luyện Thi') {
    router.push('/(quiz)' as any);
  } else if (action.title === 'Shadowing') {
    router.push('/(shadowing)' as any);
  }
}}
    >
      <action.icon color={action.color} size={30} />
      <Text style={[styles.actionTextV2, { color: action.color }]}>{action.title}</Text>
    </TouchableOpacity>
  ))}
</View>

        <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
          <Text style={[styles.sectionTitle, isDark ? styles.txtLight : styles.txtDark]}>
            Flashcards bạn có thể làm
          </Text>
          {flashcards.map(f => (
            <Text key={f.id} style={[styles.menuText, isDark ? styles.txtLight : styles.txtDark]}>
              {f.title}
            </Text>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, isDark ? styles.txtLightDim : styles.txtDarkDim]}>
            © {new Date().getFullYear()} Vpan — Học tiếng Nhật mọi lúc mọi nơi.
          </Text>
        </View>
      </ScrollView>

      {/* MODAL ĐĂNG XUẤT ĐẸP */}
      <Modal
        transparent={true}
        visible={logoutModalVisible}
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark ? styles.modalDark : styles.modalLight]}>
            <Text style={[styles.modalTitle, isDark ? styles.txtLight : styles.txtDark]}>
              Đăng xuất tài khoản
            </Text>
            <Text style={[styles.modalMessage, isDark ? styles.txtLightDim : styles.txtDarkDim]}>
              Bạn có chắc muốn thoát khỏi tài khoản này?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.modalBtnTextCancel}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnConfirm]} onPress={confirmLogout}>
                <Text style={styles.modalBtnTextConfirm}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  lightBg: { backgroundColor: '#F3F7FB' },
  darkBg: { backgroundColor: '#0b1220' },

  header: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, zIndex: 100 },
  headerLight: { backgroundColor: 'rgba(255,255,255,0.72)', borderBottomColor: '#e6e6e6', borderBottomWidth: 1 },
  headerDark: { backgroundColor: 'rgba(4,6,11,0.64)', borderBottomColor: 'rgba(255,255,255,0.06)', borderBottomWidth: 1 },
  searchInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, fontSize: 14, borderWidth: 1, height: 42 },
  inputLight: { backgroundColor: '#eef2f6', color: '#111', borderColor: '#eef2f6' },
  inputDark: { backgroundColor: '#1e293b', color: '#e6eef8', borderColor: '#1e293b' },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(200,200,200,0.2)' },

  avatarBtn: { marginLeft: 6, borderRadius: 21, overflow: 'hidden', borderWidth: 2, borderColor: '#3b82f6' },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarMenu: { position: 'absolute', top: 64, right: 14, width: 240, borderRadius: 12, paddingVertical: 8, zIndex: 200, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 18, elevation: 10 },
  menuLight: { backgroundColor: '#fff', borderColor: '#e6e6e6', borderWidth: 1 },
  menuDark: { backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1 },
  avatarMenuHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  menuAvatar: { width: 44, height: 44, borderRadius: 22 },
  menuName: { fontSize: 16, fontWeight: '700' },
  menuRole: { fontSize: 13 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  menuText: { fontSize: 15 },

  messageDropdown: { position: 'absolute', top: 64, right: 110, width: 360, height: 450, borderRadius: 12, zIndex: 200, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 10, overflow: 'hidden', paddingTop: 10 },
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

  notificationItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8, marginVertical: 2, backgroundColor: 'rgba(24,119,242,0.1)' },
  notificationContent: { flex: 1, justifyContent: 'center' },
  notificationText: { fontSize: 14 },

  contentFullWidth: { padding: 16, paddingBottom: 60, flexGrow: 1 },

  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20, marginHorizontal: -4 },
  actionBtnV2: { width: '48%', aspectRatio: 4.41, borderRadius: 16, padding: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8, marginHorizontal: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
  actionTextV2: { fontSize: 16, fontWeight: '800' },

  card: { borderRadius: 14, marginBottom: 16, overflow: 'hidden', padding: 16 },
  cardLight: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardDark: { backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1 },

  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statColLeft: { flex: 1, alignItems: 'flex-start' },
  statColCenter: { flex: 1, alignItems: 'center' },
  statColRight: { flex: 1, alignItems: 'flex-end' },
  statLabel: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '800' },

  txtDark: { color: '#111827' },
  txtLight: { color: '#f8fafc' },
  txtDarkDim: { color: '#6b7280' },
  txtLightDim: { color: '#9ca3af' },

  footer: { paddingVertical: 14, alignItems: 'center' },
  footerText: { fontSize: 12 },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 300,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  modalLight: { backgroundColor: '#fff' },
  modalDark: { backgroundColor: '#1e293b' },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#e5e7eb',
  },
  modalBtnConfirm: {
    backgroundColor: '#e11d48',
  },
  modalBtnTextCancel: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },
  modalBtnTextConfirm: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});