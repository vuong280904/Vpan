import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Image,
  Platform,
  Animated,
  Pressable, 
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:5000/api';

let getItemAsync: (key: string) => Promise<string | null>;

if (Platform.OS !== 'web') {
  try {
    const SecureStore = require('expo-secure-store');
    getItemAsync = SecureStore.getItemAsync;
  } catch (e) {
    getItemAsync = AsyncStorage.getItem;
  }
} else {
  getItemAsync = AsyncStorage.getItem;
}

const getAuthToken = async () => {
  try {
    const token = await getItemAsync('token');
    return token;
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
};

// Helper function to extract file extension
const getFileExtension = (uri: string) => {
  if (!uri) return '';
  const parts = uri.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
};

// Styles definition
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#007bff',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  flashcardItem: {
    height: 250,
    marginBottom: 16,
  },
  flashcardInner: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    backfaceVisibility: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  flashcardFront: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flashcardBack: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
  },
  flashcardImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#f0f0f0',
    resizeMode: 'contain',
  },
  imageFormatText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  flashcardContent: {
    padding: 16,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vocabulary: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  phonetic: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'center',
  },
  meaning: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  imagePickerButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#007bff',
    borderRadius: 8,
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
  },
  imagePickerText: {
    marginTop: 12,
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  imagePreview: {
    width: '100%',
    height: 160,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  createButton: {
    backgroundColor: '#007bff',
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  cardActions: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#3498db',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  cardButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
  },
});

const FlashcardItem = ({ item, onEdit, onDelete }: { item: any; onEdit: () => void; onDelete: (id: string) => void; }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const flipCard = () => {
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const frontStyle = {
    transform: [{ perspective: 1000 }, { rotateY: flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }],
    opacity: flipAnim.interpolate({ inputRange: [0, 0.5, 0.5, 1], outputRange: [1, 0, 0, 1] }),
    zIndex: isFlipped ? 0 : 1,
  };

  const backStyle = {
    transform: [{ perspective: 1000 }, { rotateY: flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] }) }],
    opacity: flipAnim.interpolate({ inputRange: [0, 0.5, 0.5, 1], outputRange: [0, 0, 1, 1] }),
    zIndex: isFlipped ? 1 : 0,
  };

  return (
    <View style={styles.flashcardItem}>
      <Pressable 
  onPress={flipCard} 
  style={{ flex: 1 }} 
  pointerEvents="box-none">

        {/* Mặt trước */}
        <Animated.View
          style={[styles.flashcardInner, styles.flashcardFront, frontStyle, { position: 'absolute', width: '100%', height: '100%' }]}
          pointerEvents={isFlipped ? 'none' : 'auto'}
        >
          {item.image && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: item.image.startsWith('http') ? item.image : `http://localhost:5000${item.image}` }} style={styles.flashcardImage} />
              <Text style={styles.imageFormatText}>{getFileExtension(item.image)}</Text>
            </View>
          )}
          <View style={styles.flashcardContent}>
            <Text style={styles.vocabulary}>{item.vocabulary}</Text>
            {item.phonetic && <Text style={styles.phonetic}>/{item.phonetic}/</Text>}
          </View>
        </Animated.View>

        {/* Mặt sau */}
        <Animated.View
          style={[styles.flashcardInner, styles.flashcardBack, backStyle, { position: 'absolute', width: '100%', height: '100%' }]}
          pointerEvents={isFlipped ? 'auto' : 'none'}
        >
          <View style={styles.flashcardContent}>
            <Text style={styles.meaning}>{item.meaning}</Text>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              style={[styles.cardButton, styles.editButton]}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil" size={18} color="#fff" />
              <Text style={styles.cardButtonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                console.log('DELETE PRESSED – GỌI XÓA ID:', item._id);
                onDelete(item._id ?? item.id); 
                console.log('ID được truyền sang handleDeleteFlashcard:', item._id ?? item.id);// ← Bây giờ sẽ chạy ngon 100%
              }}
              style={[styles.cardButton, styles.deleteButton]}
              activeOpacity={0.7}
            >
              <Ionicons name="trash" size={18} color="#fff" />
              <Text style={styles.cardButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
};

export default function FlashcardDetailScreen() {
  const { setId } = useLocalSearchParams();
  const router = useRouter();
  
  const [setData, setSetData] = useState<any>(null);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [editingFlashcard, setEditingFlashcard] = useState<any>(null);
  
  // Form states
  const [vocabulary, setVocabulary] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [meaning, setMeaning] = useState('');
  const [imageUri, setImageUri] = useState('');

  // Hàm này chỉ hiện Alert xác nhận – KHÔNG async
const handleDeleteFlashcard = (flashcardId: string) => {
  console.log('handleDeleteFlashcard called with ID:', flashcardId);

  // DÙNG window.confirm THAY CHO Alert.alert
  const confirmed = window.confirm('Bạn có chắc chắn muốn xóa flashcard này không?');
  
  if (confirmed) {
    performDelete(flashcardId);
  }
};

const performDelete = async (flashcardId: string) => {
  try {
    const token = await getAuthToken();
    if (!token) {
      window.alert('Lỗi: Chưa đăng nhập');
      return;
    }

    const res = await fetch(`${API_URL}/flashcards/${flashcardId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      setFlashcards(prev => prev.filter(c => c._id !== flashcardId));
      window.alert('Đã xóa flashcard thành công!');
    } else {
      const err = await res.json();
      window.alert('Lỗi: ' + (err.message || 'Không thể xóa'));
    }
  } catch (error) {
    window.alert('Lỗi mạng, vui lòng thử lại');
  }
};

  const handleUpdateFlashcard = async () => {
    if (!vocabulary.trim() || !meaning.trim()) {
      Alert.alert('Error', 'Vocabulary and meaning are required.');
      return;
    }

    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'Authentication failed. Please login again.');
        return;
      }

      const formData = new FormData();
      formData.append('vocabulary', vocabulary);
      formData.append('phonetic', phonetic);
      formData.append('meaning', meaning);

      // Only append image if it's a NEW image (from image picker, not from server)
      const isNewImage = imageUri && !imageUri.includes('localhost') && !imageUri.includes('http');
      
      console.log('=== UPDATE FLASHCARD DEBUG ===');
      console.log('Image URI:', imageUri);
      console.log('Contains localhost:', imageUri?.includes('localhost'));
      console.log('Starts with http:', imageUri?.startsWith('http'));
      console.log('Is new image:', isNewImage);
      
      if (isNewImage) {
        const filename = imageUri.split('/').pop() || 'image.jpg';
        console.log('Adding new image to update:', filename);
        formData.append('image', {
          uri: imageUri,
          type: 'image/jpeg',
          name: filename,
        } as any);
      } else {
        console.log('Keeping existing image, not sending new file');
      }

      console.log('Updating flashcard...');
      const response = await fetch(`${API_URL}/flashcards/${editingFlashcard._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      console.log('Update response:', response.status, data);

      if (!response.ok) {
        console.error('Flashcard update failed:', data);
        Alert.alert('Error', data.message || 'Failed to update flashcard');
        return;
      }

      // Update the flashcard in the list
      setFlashcards(prevFlashcards =>
        prevFlashcards.map(card => card._id === editingFlashcard._id ? data : card)
      );

      resetForm();
      setIsModalVisible(false);
      setModalMode('create');
      setEditingFlashcard(null);
      Alert.alert('Success', 'Flashcard updated successfully!');
    } catch (error) {
      console.error('Error updating flashcard:', error);
      Alert.alert('Error', 'An error occurred while updating the flashcard.');
    }
  };
  
  const fetchFlashcardSetData = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'You are not authenticated.');
        return;
      }

      const response = await fetch(`${API_URL}/flashcard-sets/${setId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setSetData(data);
        setFlashcards(data.flashcards || []);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch flashcard set');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while fetching flashcard set.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFlashcardSetData();
    }, [setId])
  );

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error(error);
    }
  };

  const handleCreateFlashcard = async () => {
    if (!vocabulary.trim() || !meaning.trim()) {
      Alert.alert('Error', 'Vocabulary and meaning are required.');
      return;
    }

    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'Authentication failed. Please login again.');
        return;
      }

      const formData = new FormData();
      formData.append('vocabulary', vocabulary);
      formData.append('phonetic', phonetic);
      formData.append('meaning', meaning);

      if (imageUri) {
        const filename = imageUri.split('/').pop() || 'image.jpg';
        
        // For web platform: convert blob URI to File object
        if (imageUri.startsWith('blob:')) {
          try {
            console.log('Converting blob URI to File...');
            const response = await fetch(imageUri);
            const blob = await response.blob();
            const file = new File([blob], filename, { type: blob.type });
            console.log('File created:', { name: file.name, size: file.size, type: file.type });
            formData.append('image', file);
          } catch (blobError) {
            console.error('Error converting blob to file:', blobError);
            formData.append('image', {
              uri: imageUri,
              type: 'image/jpeg',
              name: filename,
            } as any);
          }
        } else {
          // For native platforms: use standard FormData format
          formData.append('image', {
            uri: imageUri,
            type: 'image/jpeg',
            name: filename,
          } as any);
        }
      }

      console.log('Creating flashcard...');
      const response = await fetch(`${API_URL}/flashcards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      console.log('Flashcard response:', response.status, data);

      if (!response.ok) {
        console.error('Flashcard creation failed:', data);
        Alert.alert('Error', data.message || 'Failed to create flashcard');
        return;
      }

      // Get the actual setId (handle string array from router params)
      const actualSetId = Array.isArray(setId) ? setId[0] : setId;
      console.log('Linking flashcard to set:', actualSetId);

      // Associate flashcard with set
      const linkResponse = await fetch(`${API_URL}/flashcard-sets/${actualSetId}/flashcards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flashcardId: data._id,
        }),
      });

      const linkData = await linkResponse.json();
      console.log('Link response:', linkResponse.status, linkData);

      if (!linkResponse.ok) {
        console.error('Failed to link flashcard to set:', linkData);
        Alert.alert('Error', linkData.message || 'Failed to add flashcard to set');
        return;
      }

      // Refetch the flashcard set data to ensure consistency
      console.log('Refetching flashcard set data...');
      const refreshResponse = await fetch(`${API_URL}/flashcard-sets/${actualSetId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setFlashcards(refreshData.flashcards || []);
      } else {
        // Fallback: just update with the data we have
        setFlashcards(prevFlashcards => [data, ...prevFlashcards]);
      }

      resetForm();
      setIsModalVisible(false);
      Alert.alert('Success', 'Flashcard created successfully!');
    } catch (error) {
      console.error('Error creating flashcard:', error);
      Alert.alert('Error', 'An error occurred while creating the flashcard.');
    }
  };

  const resetForm = () => {
    setVocabulary('');
    setPhonetic('');
    setMeaning('');
    setImageUri('');
  };

  const handleEdit = (flashcard: any) => {
    setModalMode('edit');
    setEditingFlashcard(flashcard);
    setVocabulary(flashcard.vocabulary);
    setPhonetic(flashcard.phonetic);
    setMeaning(flashcard.meaning);
    setImageUri(flashcard.image ? `${API_URL.replace('/api', '')}${flashcard.image}` : '');
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setIsModalVisible(false);
    setModalMode('create');
    setEditingFlashcard(null);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>{setData?.title}</Text>
          <Text style={styles.subtitle}>
            {flashcards.length} card{flashcards.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setModalMode('create');
            setIsModalVisible(true);
          }}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Flashcards List */}
      <FlatList
        data={flashcards}
        renderItem={({ item }) => (
            <FlashcardItem 
                item={item} 
                onEdit={() => handleEdit(item)}
                onDelete={handleDeleteFlashcard}
                
            />
        )}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No flashcards yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to add your first flashcard
            </Text>
          </View>
        }
      />

      {/* Create Flashcard Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === 'create' ? 'Add Flashcard' : 'Edit Flashcard'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              {/* Vocabulary */}
              <Text style={styles.label}>Vocabulary *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter vocabulary word"
                placeholderTextColor="#999"
                value={vocabulary}
                onChangeText={setVocabulary}
              />

              {/* Phonetic */}
              <Text style={styles.label}>Phonetic Transcription</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., həˈləʊ"
                placeholderTextColor="#999"
                value={phonetic}
                onChangeText={setPhonetic}
              />

              {/* Meaning */}
              <Text style={styles.label}>Meaning *</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                placeholder="Enter the meaning"
                placeholderTextColor="#999"
                value={meaning}
                onChangeText={setMeaning}
                multiline
                numberOfLines={4}
              />

              {/* Image */}
              <Text style={styles.label}>Illustrative Image</Text>
              {imageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setImageUri('')}
                  >
                    <Ionicons name="close-circle" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={pickImage}
                >
                  <Ionicons name="image" size={32} color="#007bff" />
                  <Text style={styles.imagePickerText}>Tap to add image</Text>
                </TouchableOpacity>
              )}

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCloseModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.createButton]}
                  onPress={modalMode === 'create' ? handleCreateFlashcard : handleUpdateFlashcard}
                >
                  <Text style={styles.createButtonText}>
                    {modalMode === 'create' ? 'Create' : 'Save Changes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
