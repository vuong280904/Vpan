// File: screens/FlashcardSetsScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Conditional import for secure store (only works on native)
let getItemAsync: (key: string) => Promise<string | null>;

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SecureStore = require('expo-secure-store');
    getItemAsync = SecureStore.getItemAsync;
  } catch (e) {
    getItemAsync = AsyncStorage.getItem;
  }
} else {
  getItemAsync = AsyncStorage.getItem;
}

// TODO: Replace with your actual API base URL
const API_URL = 'http://vpan-api.onrender.com/api';

const getAuthToken = async () => {
  try {
    const token = await getItemAsync('token');
    return token;
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
};

// -------------------- Mascot asset (safe) --------------------
// If you have a local file at app/assets/images/linhvat.png, uncomment the require below:
// const LINHVAT = require('../../../assets/images/linhvat.png');

// Otherwise use a remote fallback (safe for bundler)
const LINHVAT = require('../../../assets/images/linhvat.png');

// -------------------- Component --------------------
export default function FlashcardSetsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sets, setSets] = useState<any[]>([]);
  const [menuVisibleFor, setMenuVisibleFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [newSetTitle, setNewSetTitle] = useState('');
  const [newSetDescription, setNewSetDescription] = useState('');
  const [editSetTitle, setEditSetTitle] = useState('');
  const [editSetDescription, setEditSetDescription] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  // mascot modal
  const [mascotOpen, setMascotOpen] = useState(false);

  const fetchFlashcardSets = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'You are not authenticated.');
        setLoading(false);
        return;
      }
      const response = await fetch(`${API_URL}/flashcard-sets`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setSets(Array.isArray(data) ? data : []);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch flashcard sets');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while fetching flashcard sets.');
      console.error(error);
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
    set => set.title && set.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNavigateToSet = (setId: string) => {
    router.push({
      pathname: '/(auth)/flashcards/[setId]',
      params: { setId },
    });
  };

  const handleEdit = (setId: string) => {
    const set = sets.find(s => s._id === setId);
    if (set) {
      setEditingSetId(setId);
      setEditSetTitle(set.title);
      setEditSetDescription(set.description || '');
      setIsEditModalVisible(true);
      setMenuVisibleFor(null);
    }
  };

  const handleDelete = (setId: string) => {
    Alert.alert(
      'Delete Set',
      'Are you sure you want to delete this flashcard set?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setMenuVisibleFor(null) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getAuthToken();
              if (!token) {
                Alert.alert('Error', 'Authentication failed. Please login again.');
                setMenuVisibleFor(null);
                return;
              }

              const response = await fetch(`${API_URL}/flashcard-sets/${setId}`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              const responseData = await response.json();

              if (response.ok) {
                setSets(prevSets => prevSets.filter(set => set._id !== setId));
                setMenuVisibleFor(null);
                Alert.alert('Success', 'Flashcard set deleted successfully!');
              } else {
                Alert.alert('Error', responseData.message || `Failed to delete flashcard set (${response.status})`);
              }
            } catch (error) {
              console.error('Error deleting flashcard set:', error);
              Alert.alert('Error', 'An error occurred while deleting the flashcard set.');
              setMenuVisibleFor(null);
            }
          },
        },
      ]
    );
  };

  const handleCreateSet = async () => {
    if (!newSetTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for the flashcard set.');
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
          title: newSetTitle,
          description: newSetDescription,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSets(prevSets => [data, ...prevSets]);
        setNewSetTitle('');
        setNewSetDescription('');
        setIsModalVisible(false);
        Alert.alert('Success', 'Flashcard set created successfully!');
      } else {
        Alert.alert('Error', data.message || 'Failed to create flashcard set');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while creating the flashcard set.');
      console.error(error);
    }
  };

  const handleUpdateSet = async () => {
    if (!editSetTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for the flashcard set.');
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
          title: editSetTitle,
          description: editSetDescription,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSets(prevSets => prevSets.map(set => (set._id === editingSetId ? data : set)));
        setEditSetTitle('');
        setEditSetDescription('');
        setEditingSetId(null);
        setIsEditModalVisible(false);
        Alert.alert('Success', 'Flashcard set updated successfully!');
      } else {
        Alert.alert('Error', data.message || 'Failed to update flashcard set');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while updating the flashcard set.');
      console.error(error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFlashcardSets();
  };

  const handleCloseModal = () => {
    setNewSetTitle('');
    setNewSetDescription('');
    setIsModalVisible(false);
  };

  const handleCloseEditModal = () => {
    setEditSetTitle('');
    setEditSetDescription('');
    setEditingSetId(null);
    setIsEditModalVisible(false);
  };

  const renderSetItem = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => handleNavigateToSet(item._id)} style={styles.setItem}>
      <View style={styles.setItemDetails}>
        <Text style={styles.setTitle} numberOfLines={2}>{item.title}</Text>
        {item.description ? <Text style={styles.setDescription} numberOfLines={2}>{item.description}</Text> : null}
        <Text style={styles.setInfo}>
          {item.flashcards ? item.flashcards.length : 0} cards · Updated on {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <TouchableOpacity onPress={() => setMenuVisibleFor(menuVisibleFor === item._id ? null : item._id)} style={styles.menuButton}>
        <Ionicons name="ellipsis-vertical" size={22} color="#6b7280" />
      </TouchableOpacity>

      {menuVisibleFor === item._id && (
        <View style={styles.menu}>
          <TouchableOpacity onPress={() => handleEdit(item._id)} style={styles.menuItem}>
            <Text style={styles.menuText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.menuItem}>
            <Text style={[styles.menuText, { color: '#dc2626' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
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
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Flashcard</Text>
          <Text style={styles.subtitle}>Học Từ Vựng Cùng Pan Nào!!!</Text>
        </View>

        <TouchableOpacity style={styles.mascotBtn} onPress={() => setMascotOpen(true)} activeOpacity={0.9}>
          <Image source={LINHVAT as any} style={styles.mascotSmall} />
        </TouchableOpacity>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TextInput
          placeholder="Search by title..."
          placeholderTextColor="#9ca3af"
          style={styles.searchBar}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.newSetButton} onPress={() => setIsModalVisible(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newSetButtonText}>New Set</Text>
        </TouchableOpacity>
      </View>

      {/* List / Empty */}
      {filteredSets.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Image source={LINHVAT as any} style={styles.emptyMascot} />
          <Text style={styles.emptyTitle}>No flashcard sets yet</Text>
          <Text style={styles.emptySub}>Create your first set to start learning</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => setIsModalVisible(true)}>
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={styles.createBtnText}>Create set</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredSets}
          renderItem={renderSetItem}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}

      {/* Floating create */}
      <TouchableOpacity style={styles.fab} onPress={() => setIsModalVisible(true)}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal visible={isModalVisible} transparent animationType="slide" onRequestClose={handleCloseModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Flashcard Set</Text>
              <TouchableOpacity onPress={handleCloseModal}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Set Title"
              placeholderTextColor="#9ca3af"
              value={newSetTitle}
              onChangeText={setNewSetTitle}
            />

            <TextInput
              style={[styles.modalInput, { height: 110, textAlignVertical: 'top' }]}
              placeholder="Description (optional)"
              placeholderTextColor="#9ca3af"
              value={newSetDescription}
              onChangeText={setNewSetDescription}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={handleCloseModal}>
                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={handleCreateSet}>
                <Text style={styles.modalBtnTextPrimary}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={isEditModalVisible} transparent animationType="slide" onRequestClose={handleCloseEditModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Flashcard Set</Text>
              <TouchableOpacity onPress={handleCloseEditModal}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Set Title"
              placeholderTextColor="#9ca3af"
              value={editSetTitle}
              onChangeText={setEditSetTitle}
            />

            <TextInput
              style={[styles.modalInput, { height: 110, textAlignVertical: 'top' }]}
              placeholder="Description (optional)"
              placeholderTextColor="#9ca3af"
              value={editSetDescription}
              onChangeText={setEditSetDescription}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={handleCloseEditModal}>
                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={handleUpdateSet}>
                <Text style={styles.modalBtnTextPrimary}>Save</Text>
              </TouchableOpacity>
            </View>
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

// -------------------- Styles --------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 35, fontWeight: '800', color: '#651801ff' },
  subtitle: { color: '#c37208ff', marginTop: 4 },

  mascotBtn: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
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
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
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

  // Set item
  setItem: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  setItemDetails: { flex: 1, paddingRight: 8 },
  setTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  setDescription: { marginTop: 6, color: '#64748b', fontSize: 13 },
  setInfo: { marginTop: 8, color: '#94a3b8', fontSize: 12 },

  menuButton: { padding: 8, marginLeft: 6 },
  menu: {
    position: 'absolute',
    top: 48,
    right: 16,
    backgroundColor: '#ffcbcbff',
    borderRadius: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  menuItem: { paddingVertical: 12, paddingHorizontal: 16 },
  menuText: { fontSize: 15, color: '#111827' },

  // Empty state
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

  // Floating action
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
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalContent: {
    backgroundColor: '#ffffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  modalInput: {
    backgroundColor: '#fef9ffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e6edf3',
    marginBottom: 12,
  },
  modalButtons: { flexDirection: 'row', marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalBtnPrimary: { backgroundColor: '#2563eb', marginLeft: 8 },
  modalBtnCancel: { backgroundColor: '#e6eef8' },
  modalBtnTextPrimary: { color: '#fff', fontWeight: '700' },
  modalBtnTextCancel: { color: '#0f172a', fontWeight: '700' },

  // mascot modal
  mascotOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mascotBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  mascotCard: {
    width: '36%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    elevation: 20,
  },
  mascotLarge: { width: 420, height: 220, marginBottom: 8 },
  mascotText: { color: '#334155', textAlign: 'center', marginBottom: 12, fontSize: 16 },
  mascotCloseBtn: { backgroundColor: '#2563eb', paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10 },
  mascotCloseText: { color: '#fff', fontWeight: '700' },
});
