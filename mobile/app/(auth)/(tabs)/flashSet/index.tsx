// File: screens/FlashcardSetsScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Conditional secure store
// Dùng AsyncStorage thống nhất cho mọi nền tảng (vì login đang lưu bằng AsyncStorage)
const getItemAsync = AsyncStorage.getItem;

const API_URL = 
  Platform.OS === "web" 
    ? "http://localhost:5000/api"
    : "http://172.20.10.3:5000/api";

const getAuthToken = async () => {
  try {
    const token = await getItemAsync('token');
    return token;
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
};

const LINHVAT = require('../../../../assets/images/linhvat.png');

export default function FlashcardSetsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sets, setSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Thao tác đã hoàn tất.');
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [mascotOpen, setMascotOpen] = useState(false);

  // Form states
  const [newSetTitle, setNewSetTitle] = useState('');
  const [newSetDescription, setNewSetDescription] = useState('');
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editSetTitle, setEditSetTitle] = useState('');
  const [editSetDescription, setEditSetDescription] = useState('');
  const [deletingSetId, setDeletingSetId] = useState<string | null>(null);

  const fetchFlashcardSets = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      console.log('Token lấy được:', token ? token.substring(0, 20) + '...' : 'NULL'); // log xem có token không
      if (!token) {
        setErrorMessage('Bạn chưa đăng nhập.');
        setErrorModalVisible(true);
        return;
      }
      const response = await fetch(`${API_URL}/flashcard-sets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setSets(Array.isArray(data) ? data : []);
      } else {
        setErrorMessage(data.message || 'Không thể tải danh sách');
        setErrorModalVisible(true);
      }
    } catch (error) {
      setErrorMessage('Lỗi kết nối khi tải dữ liệu');
      setErrorModalVisible(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFlashcardSets();
    }, [])
  );

  const filteredSets = sets.filter(
    (set) => set.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNavigateToSet = (setId: string) => {
    router.push({
      pathname: '/(auth)/flashcards/[setId]',
      params: { setId },
    });
  };

  const openEditModal = (setId: string) => {
    const set = sets.find((s) => s._id === setId);
    if (set) {
      setEditingSetId(setId);
      setEditSetTitle(set.title);
      setEditSetDescription(set.description || '');
      setEditModalVisible(true);
    }
  };

  const confirmDelete = (setId: string) => {
    setDeletingSetId(setId);
    setDeleteModalVisible(true);
  };

  const handleDelete = async () => {
    if (!deletingSetId) return;
    setDeleteModalVisible(false);

    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/flashcard-sets/${deletingSetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setSets((prev) => prev.filter((s) => s._id !== deletingSetId));
        setSuccessMessage('Đã xóa bộ flashcard thành công!');
        setSuccessModalVisible(true);
      } else {
        const data = await response.json();
        setErrorMessage(data.message || 'Không thể xóa');
        setErrorModalVisible(true);
      }
    } catch (error) {
      setErrorMessage('Lỗi kết nối khi xóa');
      setErrorModalVisible(true);
    }
  };

  const handleCreateSet = async () => {
    if (!newSetTitle.trim()) {
      setErrorMessage('Vui lòng nhập tiêu đề bộ flashcard');
      setErrorModalVisible(true);
      return;
    }

    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/flashcard-sets`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newSetTitle.trim(),
          description: newSetDescription.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Tạo object đầy đủ để hiển thị ngay lập tức
        const newSet = {
          _id: data.id || data._id || Date.now().toString(), // fallback nếu backend không trả
          title: newSetTitle.trim(),
          description: newSetDescription.trim() || null,
          flashcards: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setSets((prev) => [newSet, ...prev]);

        setNewSetTitle('');
        setNewSetDescription('');
        setCreateModalVisible(false);
        setSuccessMessage('Tạo bộ flashcard thành công!');
        setSuccessModalVisible(true);
      } else {
        setErrorMessage(data.message || 'Không thể tạo bộ mới');
        setErrorModalVisible(true);
      }
    } catch (error) {
      setErrorMessage('Lỗi kết nối khi tạo bộ mới');
      setErrorModalVisible(true);
    }
  };

  const handleUpdateSet = async () => {
    if (!editSetTitle.trim()) {
      setErrorMessage('Vui lòng nhập tiêu đề');
      setErrorModalVisible(true);
      return;
    }

    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/flashcard-sets/${editingSetId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editSetTitle.trim(),
          description: editSetDescription.trim(),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSets((prev) =>
          prev.map((set) => (set._id === editingSetId ? data : set))
        );
        setEditModalVisible(false);
        setSuccessMessage('Cập nhật thành công!');
        setSuccessModalVisible(true);
      } else {
        setErrorMessage(data.message || 'Không thể cập nhật');
        setErrorModalVisible(true);
      }
    } catch (error) {
      setErrorMessage('Lỗi kết nối khi cập nhật');
      setErrorModalVisible(true);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFlashcardSets();
  };

  const renderSetItem = ({ item }: { item: any }) => (
    <View style={styles.setItem}>
      <TouchableOpacity onPress={() => handleNavigateToSet(item._id)} style={{ flex: 1 }}>
        <View style={styles.setItemDetails}>
          <Text style={styles.setTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={styles.setDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <Text style={styles.setInfo}>
            {item.flashcards?.length || 0} thẻ ·{' '}
            {new Date(item.updatedAt || item.createdAt).toLocaleDateString('vi-VN')}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actionButtons}>
        <TouchableOpacity onPress={() => openEditModal(item._id)} style={styles.actionBtn}>
          <Ionicons name="pencil" size={20} color="#3b82f6" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => confirmDelete(item._id)} style={styles.actionBtn}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
<View style={styles.headerContainer}>
  <TouchableOpacity 
    onPress={() => router.back()} 
    style={styles.backButton}
    activeOpacity={0.7}
  >
    <Ionicons name="arrow-back" size={28} color="#fff" />
  </TouchableOpacity>

  <View style={styles.headerText}>
    <Text style={styles.title}>Flashcard</Text>
    <Text style={styles.subtitle}>Học Từ Vựng Cùng Pan Nào!!!</Text>
  </View>

  <TouchableOpacity style={styles.mascotBtn} onPress={() => setMascotOpen(true)}>
    <Image source={LINHVAT as any} style={styles.mascotSmall} />
  </TouchableOpacity>
</View>

      {/* Controls */}
      <View style={styles.controls}>
        <TextInput
          placeholder="Tìm theo tiêu đề..."
          placeholderTextColor="#9ca3af"
          style={styles.searchBar}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.newSetButton} onPress={() => setCreateModalVisible(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newSetButtonText}>Bộ mới</Text>
        </TouchableOpacity>
      </View>

      {/* List or Empty */}
      {filteredSets.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Image source={LINHVAT as any} style={styles.emptyMascot} />
          <Text style={styles.emptyTitle}>Chưa có bộ flashcard nào</Text>
          <Text style={styles.emptySub}>Tạo bộ đầu tiên để bắt đầu học nào!</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => setCreateModalVisible(true)}>
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={styles.createBtnText}>Tạo bộ mới</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredSets}
          renderItem={renderSetItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setCreateModalVisible(true)}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo bộ flashcard mới</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Tiêu đề bộ"
              value={newSetTitle}
              onChangeText={setNewSetTitle}
            />

            <TextInput
              style={[styles.modalInput, { height: 110, textAlignVertical: 'top' }]}
              placeholder="Mô tả (tuỳ chọn)"
              value={newSetDescription}
              onChangeText={setNewSetDescription}
              multiline
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.modalBtnTextCancel}>Hủy</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleCreateSet}
              >
                <Text style={styles.modalBtnTextPrimary}>Tạo</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa bộ flashcard</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Tiêu đề bộ"
              value={editSetTitle}
              onChangeText={setEditSetTitle}
            />

            <TextInput
              style={[styles.modalInput, { height: 110, textAlignVertical: 'top' }]}
              placeholder="Mô tả (tuỳ chọn)"
              value={editSetDescription}
              onChangeText={setEditSetDescription}
              multiline
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalBtnTextCancel}>Hủy</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleUpdateSet}
              >
                <Text style={styles.modalBtnTextPrimary}>Lưu</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.content}>
            <Ionicons name="warning-outline" size={48} color="#ef4444" style={{ marginBottom: 16 }} />
            <Text style={modalStyles.title}>Xóa bộ flashcard?</Text>
            <Text style={modalStyles.message}>Hành động này không thể hoàn tác.</Text>

            <View style={modalStyles.buttons}>
              <Pressable
                onPress={() => setDeleteModalVisible(false)}
                style={[modalStyles.button, modalStyles.cancelButton]}
              >
                <Text style={modalStyles.cancelText}>Hủy</Text>
              </Pressable>
              <Pressable
                onPress={handleDelete}
                style={[modalStyles.button, modalStyles.deleteButton]}
              >
                <Text style={modalStyles.deleteText}>Xóa</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal - ĐẸP HƠN */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.content}>
            <Ionicons name="checkmark-circle" size={64} color="#10b981" style={{ marginBottom: 16 }} />
            <Text style={modalStyles.title}>Thành công!</Text>
            <Text style={modalStyles.message}>{successMessage}</Text>
            <Pressable
              onPress={() => setSuccessModalVisible(false)}
              style={modalStyles.fullButton}
            >
              <Text style={modalStyles.fullButtonText}>Tuyệt vời!</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Error Modal - ĐẸP HƠN */}
      <Modal visible={errorModalVisible} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.content}>
            <Ionicons name="close-circle" size={64} color="#ef4444" style={{ marginBottom: 16 }} />
            <Text style={modalStyles.title}>Oops!</Text>
            <Text style={modalStyles.message}>{errorMessage}</Text>
            <Pressable
              onPress={() => setErrorModalVisible(false)}
              style={modalStyles.fullButton}
            >
              <Text style={modalStyles.fullButtonText}>Đã hiểu</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Mascot Modal */}
      <Modal visible={mascotOpen} transparent animationType="fade" onRequestClose={() => setMascotOpen(false)}>
        <View style={styles.mascotOverlay}>
          <TouchableOpacity style={styles.mascotBackdrop} activeOpacity={1} onPress={() => setMascotOpen(false)} />
          <View style={styles.mascotCard}>
            <Image source={LINHVAT as any} style={styles.mascotLarge} resizeMode="contain" />
            <Text style={styles.mascotText}>Chú linh vật chúc bạn học tốt! ✨</Text>
            <TouchableOpacity style={styles.mascotCloseBtn} onPress={() => setMascotOpen(false)}>
              <Text style={styles.mascotCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 35, fontWeight: '800', color: '#651801ff' },
  subtitle: { color: '#c37208ff', marginTop: 4 },

  mascotBtn: { width: 56, height: 56, borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff', elevation: 6 },
  mascotSmall: { width: 52, height: 52 },

  controls: { flexDirection: 'row', marginBottom: 12 },
  searchBar: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e6edf3',
  },
  newSetButton: {
    marginLeft: 10,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  newSetButtonText: { color: '#fff', marginLeft: 8, fontWeight: '700' },

  listContainer: { paddingBottom: 120 },

  setItem: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  setItemDetails: { flex: 1, paddingRight: 12 },
  setTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  setDescription: { marginTop: 6, color: '#64748b', fontSize: 13 },
  setInfo: { marginTop: 8, color: '#94a3b8', fontSize: 12 },

  actionButtons: { flexDirection: 'row', gap: 12 },
  actionBtn: { padding: 8, borderRadius: 8, backgroundColor: '#f3f4f6' },

  emptyWrap: { alignItems: 'center', marginTop: 48 },
  emptyMascot: { width: 180, height: 180, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  emptySub: { color: '#64748b', marginTop: 6, marginBottom: 16 },
  createBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
  },
  createBtnText: { color: '#fff', fontWeight: '700', marginLeft: 8 },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    backgroundColor: '#2563eb',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  modalInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e6edf3',
    marginBottom: 12,
  },
headerContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 20,
  paddingTop: 10, // để tránh dính status bar
},
backButton: {
  padding: 12,
  backgroundColor: '#2563eb', // đổi sang màu xanh đậm để nổi bật
  borderRadius: 16,
  marginRight: 16,
  elevation: 4,
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: 4,
},
headerText: {
  flex: 1,
},
  modalButtons: { flexDirection: 'row', marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnPrimary: { backgroundColor: '#2563eb', marginLeft: 8 },
  modalBtnCancel: { backgroundColor: '#e6eef8' },
  modalBtnTextPrimary: { color: '#fff', fontWeight: '700' },
  modalBtnTextCancel: { color: '#0f172a', fontWeight: '700' },

  mascotOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mascotBackdrop: { position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.55)' },
  mascotCard: { width: '90%', backgroundColor: '#fff', borderRadius: 16, padding: 18, alignItems: 'center' },
  mascotLarge: { width: '100%', height: 220, marginBottom: 8 },
  mascotText: { color: '#334155', textAlign: 'center', marginBottom: 12, fontSize: 16 },
  mascotCloseBtn: { backgroundColor: '#2563eb', paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10 },
  mascotCloseText: { color: '#fff', fontWeight: '700' },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  message: { fontSize: 16, color: '#4b5563', textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  fullButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 160,
  },
  fullButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    textAlign: 'center',
  },
  buttons: { flexDirection: 'row', width: '100%', gap: 12 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelButton: { backgroundColor: '#e5e7eb' },
  deleteButton: { backgroundColor: '#ef4444' },
  cancelText: { color: '#374151', fontWeight: '600', fontSize: 16 },
  deleteText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});