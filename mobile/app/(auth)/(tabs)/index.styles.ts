import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  // Base
  safe: { flex: 1 },
  lightBg: { backgroundColor: '#f8fafc' },
  darkBg: { backgroundColor: '#0f172a' },

  // Header
  header: { 
    height: 64, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 14, 
    zIndex: 100 
  },
  headerLight: { 
    backgroundColor: '#ffffff', 
    borderBottomColor: '#e2e8f0', 
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerDark: { 
    backgroundColor: '#1e293b', 
    borderBottomColor: 'rgba(255,255,255,0.08)', 
    borderBottomWidth: 1 
  },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  
  iconCircle: { 
    width: 42, 
    height: 42, 
    borderRadius: 21, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  iconCircleLight: {
    backgroundColor: '#f1f5f9',
  },
  iconCircleDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  avatarBtn: { 
    marginLeft: 6, 
    borderRadius: 21, 
    overflow: 'hidden', 
    borderWidth: 2, 
    borderColor: '#3b82f6' 
  },
  avatar: { width: 42, height: 42 },

  // Badge
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  // Avatar Menu
  avatarMenu: { 
    position: 'absolute', 
    top: 70, 
    right: 14, 
    width: 260, 
    borderRadius: 12, 
    paddingVertical: 8, 
    zIndex: 200, 
    shadowColor: '#000', 
    shadowOpacity: 0.2, 
    shadowRadius: 18, 
    elevation: 10 
  },
  
  avatarMenuHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    borderBottomWidth: 1,
  },
  menuAvatar: { width: 48, height: 48, borderRadius: 24 },
  menuName: { fontSize: 16, fontWeight: '700' },
  menuRole: { fontSize: 13, marginTop: 2 },
  
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    paddingHorizontal: 12, 
    paddingVertical: 11,
  },
  menuItemLight: {
    backgroundColor: 'transparent',
  },
  menuItemDark: {
    backgroundColor: 'transparent',
  },
  menuText: { fontSize: 15, fontWeight: '500' },
  
  premiumItem: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    marginHorizontal: 8,
    borderRadius: 8,
    paddingVertical: 10,
  },

  divider: { 
    height: 1, 
    marginVertical: 6,
    marginHorizontal: 8,
  },
  dividerLight: {
    backgroundColor: '#e5e7eb',
  },
  dividerDark: {
    backgroundColor: '#334155',
  },

  // Dropdowns
  messageDropdown: {
    position: 'absolute',
    top: 70,
    right: 12,
    width: Math.min(420, width - 24),
    height: 480,
    borderRadius: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'hidden',
  },
  
  notificationDropdown: { 
    position: 'absolute', 
    top: 70, 
    right: 60, 
    width: Math.min(360, width - 24), 
    height: 450, 
    borderRadius: 12, 
    zIndex: 200, 
    shadowColor: '#000', 
    shadowOpacity: 0.25, 
    shadowRadius: 10, 
    elevation: 10, 
    overflow: 'hidden',
  },

  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },

  dropdownTitle: { 
    fontSize: 20, 
    fontWeight: '800',
    flex: 1,
    marginRight: 10,
  },
  
  dropdownScroll: { 
    paddingHorizontal: 8,
    paddingTop: 4,
  },

  seeAllButton: { 
    paddingVertical: 12, 
    alignItems: 'center', 
    borderTopWidth: 1,
  },
  seeAllButtonLight: {
    backgroundColor: '#f8fafc',
    borderTopColor: '#e2e8f0',
  },
  seeAllButtonDark: {
    backgroundColor: '#1e293b',
    borderTopColor: '#334155',
  },
  seeAllText: { 
    color: '#3b82f6', 
    fontWeight: '600', 
    fontSize: 15 
  },

  messageItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 10, 
    paddingHorizontal: 10, 
    borderRadius: 8, 
    marginVertical: 2,
  },
  messageItemLight: {
    backgroundColor: 'transparent',
  },
  messageItemDark: {
    backgroundColor: 'transparent',
  },
  
  messageAvatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    marginRight: 12 
  },
  messageContent: { flex: 1, justifyContent: 'center' },
  messageHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  messageName: { 
    fontSize: 15, 
    fontWeight: '700',
    flex: 1,
  },
  messagePreview: { 
    fontSize: 13, 
    marginTop: 3,
  },
  messageTime: { 
    fontSize: 12, 
    marginLeft: 10 
  },

  notificationItem: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    paddingVertical: 10, 
    paddingHorizontal: 10, 
    borderRadius: 8, 
    marginVertical: 2,
  },
  notificationItemLight: {
    backgroundColor: 'transparent',
  },
  notificationItemDark: {
    backgroundColor: 'transparent',
  },
  unreadLight: {
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  unreadDark: {
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  notificationContent: { flex: 1, justifyContent: 'center' },
  notificationText: { fontSize: 14, lineHeight: 20 },

  onlineDot: { 
    position: 'absolute', 
    bottom: 2, 
    right: 2, 
    width: 14, 
    height: 14, 
    backgroundColor: '#22c55e', 
    borderRadius: 7, 
    borderWidth: 3,
  },

  // Menu styles
  menuLight: { 
    backgroundColor: '#ffffff', 
    borderColor: '#e5e7eb', 
    borderWidth: 1 
  },
  menuDark: { 
    backgroundColor: '#1e293b', 
    borderColor: 'rgba(255,255,255,0.1)', 
    borderWidth: 1 
  },

  // Cards
  card: { 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLight: {
    backgroundColor: '#ffffff',
  },
  cardDark: {
    backgroundColor: '#1e293b',
  },

  // Search Results
  resultItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  wordText: {
    fontSize: 22,
    fontWeight: '700',
  },
  readingText: {
    fontSize: 16,
    color: '#3b82f6',
    marginVertical: 4,
  },
  meaningText: {
    fontSize: 15,
    lineHeight: 22,
  },

  // Suggestions
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  suggestionBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },

  // Flashcard Sets
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 4,
  },
  
  mySetItem: {
    width: '100%',
    minHeight: 120,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  
  publicSetItem: {
    width: '100%',
    minHeight: 120,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  
  setItemLight: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  setItemDark: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  
  setTitle: {
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'left',
    marginTop: 0,
    minHeight: 0,
  },
  
  cardCountText: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 16,
  },
  pageBtn: {
    padding: 8,
    minWidth: 36,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.4,
  },
  pageText: {
    fontSize: 18,
    fontWeight: '600',
  },
  pageInfo: {
    fontSize: 14,
  },

  // Text styles
  txtDark: { color: '#111827' },
  txtLight: { color: '#f8fafc' },
  txtDarkDim: { color: '#6b7280' },
  txtLightDim: { color: '#94a3b8' },

  // Borders
  borderLight: {
    borderColor: '#e5e7eb',
  },
  borderDark: {
    borderColor: '#334155',
  },

  // States
  loadingText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
  },

  // Modal
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'center', 
    alignItems: 'center' 
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
    elevation: 20 
  },

  // Promo
  promoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  closeText: { 
    fontSize: 16, 
    fontWeight: '700' 
  },
});