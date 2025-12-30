import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
    full: {
    flex: 1,
    backgroundColor: '#FFEAF7',
  },

  // Header mới với nút back
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#d33d0bff',
    textAlign: 'center',
    flex: 1,
    marginRight: -48, // bù lại nút back bên trái
  },

  banner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(235, 211, 195, 0.6)',
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  bannerTitle: {
    color: '#d33d0bff',
    fontSize: 20,
    fontWeight: '800',
  },
  bannerSubtitle: {
    color: '#d33d0bff',
    fontSize: 14,
    marginTop: 2,
  },
  mascot: {
    width: 110,
    height: 110,
  },

  listContainer: {
    padding: 12,
    paddingTop: 0,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },

  card: {
    flex: 1,
    backgroundColor: '#fff4c6ff',
    marginBottom: 12,
    padding: 16,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    color: '#4A2C2A',
  },
  description: {
    fontSize: 14,
    color: '#6B4E71',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    paddingHorizontal: 12,
    paddingTop: 12,
    textAlign: 'center',
  },
});