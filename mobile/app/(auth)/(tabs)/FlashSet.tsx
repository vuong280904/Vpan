import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getItemAsync } from 'expo-secure-store';

// TODO: Replace with your actual API base URL
const API_URL = 'http://localhost:5000/api';

const getAuthToken = async () => {
  const token = await getItemAsync('token');
  return token;
};

export default function FlashcardSetsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sets, setSets] = useState([]);
  const [menuVisibleFor, setMenuVisibleFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setSets(data);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch flashcard sets');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while fetching flashcard sets.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFlashcardSets();
    }, [])
  );

  const filteredSets = sets.filter(set =>
    set.title && set.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNavigateToSet = (setId: string) => {
    // router.push(`/flashcard-set/${setId}`);
    console.log(`Navigating to set ${setId}`);
  };

  const handleEdit = (setId: string) => {
    console.log(`Editing set ${setId}`);
    setMenuVisibleFor(null);
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
              const response = await fetch(`${API_URL}/flashcard-sets/${setId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                setSets(prevSets => prevSets.filter(set => set._id !== setId));
                setMenuVisibleFor(null);
              } else {
                const data = await response.json();
                Alert.alert('Error', data.message || 'Failed to delete flashcard set');
              }
            } catch (error) {
              Alert.alert('Error', 'An error occurred while deleting the flashcard set.');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const renderSetItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleNavigateToSet(item._id)} style={styles.setItem}>
      <View style={styles.setItemDetails}>
        <Text style={styles.setTitle}>{item.title}</Text>
        <Text style={styles.setDescription}>{item.description}</Text>
        <Text style={styles.setInfo}>
          {item.flashcards ? item.flashcards.length : 0} cards · Updated on {new Date(item.updatedAt).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity onPress={() => setMenuVisibleFor(menuVisibleFor === item._id ? null : item._id)} style={styles.menuButton}>
        <Ionicons name="ellipsis-vertical" size={24} color="#666" />
      </TouchableOpacity>
      {menuVisibleFor === item._id && (
        <View style={styles.menu}>
          <TouchableOpacity onPress={() => handleEdit(item._id)} style={styles.menuItem}>
            <Text>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.menuItem}>
            <Text>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Flashcard Sets</Text>
      <View style={styles.controls}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search by title..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.newSetButton}>
          <Text style={styles.newSetButtonText}>New Set</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filteredSets}
        renderItem={renderSetItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text>No flashcard sets found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  controls: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  newSetButton: {
    marginLeft: 12,
    height: 40,
    paddingHorizontal: 16,
    backgroundColor: '#007bff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newSetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 16,
  },
  setItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  setItemDetails: {
    flex: 1,
  },
  setTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  setDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  setInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  menuButton: {
    padding: 8,
  },
  menu: {
    position: 'absolute',
    top: 48,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
});
