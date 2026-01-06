// app/(admin)/hooks/useAdminData.ts
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

const API_URL = Platform.OS === "web" 
  ? "https://vpan-api.onrender.com/api" 
  : "http://172.20.10.3:5000/api";

export default function useAdminData(activeTab: string) {
  const { user, token, logout } = useAuth(); // ← Token lấy ở đây, KHÔNG cần truyền vào
  const router = useRouter();

  // === DATA STATES ===
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(true);

  const [stats, setStats] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [books, setBooks] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [groupedChapters, setGroupedChapters] = useState<Record<string, any[]>>({});

  const [users, setUsers] = useState<any[]>([]);
  const [flashcardSets, setFlashcardSets] = useState<any[]>([]);
  const [shadowTopics, setShadowTopics] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  // === FILTERED DATA ===
  const [filteredBooks, setFilteredBooks] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [filteredFlashcards, setFilteredFlashcards] = useState<any[]>([]);
  const [filteredShadowTopics, setFilteredShadowTopics] = useState<any[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
  const [filteredGroupedChapters, setFilteredGroupedChapters] = useState<Record<string, any[]>>({});

  // === MODAL STATES ===
  const [bookModal, setBookModal] = useState(false);
  const [currentBook, setCurrentBook] = useState<any>({ title: "", author: "", level: "N5", coverImage: "" });

  const [chapterModal, setChapterModal] = useState(false);
  const [currentChapter, setCurrentChapter] = useState<any>({
    bookId: "",
    chapterNumber: "",
    title: "",
    illustration: "",
    content: [{ text: "", ruby: "", meaning: "" }]
  });
  const [selectedBookId, setSelectedBookId] = useState("");

  const [userModal, setUserModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [flashcardModal, setFlashcardModal] = useState(false);
  const [currentFlashcardSet, setCurrentFlashcardSet] = useState<any>(null);

  const [flashcardPreviewModal, setFlashcardPreviewModal] = useState(false);
  const [selectedSetFlashcards, setSelectedSetFlashcards] = useState<any[]>([]);
  const [selectedSetTitle, setSelectedSetTitle] = useState("");

  const [notifModal, setNotifModal] = useState(false);
  const [newNotifTitle, setNewNotifTitle] = useState("");
  const [newNotifMessage, setNewNotifMessage] = useState("");

  const [messageModal, setMessageModal] = useState<{ visible: boolean; title?: string; message?: string }>({ visible: false });
  const [confirmModal, setConfirmModal] = useState<any>({ visible: false });

  // === HELPER FUNCTIONS ===
  const normalizeString = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "d");
  };

  const showMessage = (title: string, message: string) => {
    setMessageModal({ visible: true, title, message });
  };

  const showConfirm = (options: {
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => {
    setConfirmModal({
      visible: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || "Xác nhận",
      onConfirm: async () => {
        await options.onConfirm();
        setConfirmModal({ visible: false });
      },
      onCancel: options.onCancel || (() => setConfirmModal({ visible: false })),
    });
  };

  // === FETCH FUNCTIONS ===
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.log("Stats error:", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setNotifications(await res.json());
    } catch {}
  };

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    await Promise.all([fetchStats(), fetchNotifications()]);

    try {
      const headers = { Authorization: `Bearer ${token}` };

      if (activeTab === "books") {
        const res = await fetch(`${API_URL}/books`, { headers });
        const data = await res.json();
        setBooks(data || []);
      }

      if (activeTab === "chapters") {
        try {
          const res = await fetch(`${API_URL}/chapters`, { headers });
          if (res.ok) {
            const data = await res.json();
            setChapters(data);
            const grouped = data.reduce((acc: Record<string, any[]>, chapter: any) => {
              const bookTitle = chapter.book?.title || "Không rõ sách";
              if (!acc[bookTitle]) acc[bookTitle] = [];
              acc[bookTitle].push(chapter);
              return acc;
            }, {});
            setGroupedChapters(grouped);
          }
        } catch (err) {
          console.error("Lỗi load chapters:", err);
        } finally {
          setLoadingChapters(false);
        }
      }

      if (activeTab === "users") {
        const res = await fetch(`${API_URL}/users/search`, { headers });
        const data = await res.json();
        setUsers(data || []);
      }

      if (activeTab === "flashcards") {
        const url = user?.role === "admin"
          ? `${API_URL}/flashcard-sets/admin/all`
          : `${API_URL}/flashcard-sets`;
        const res = await fetch(url, { headers });
        const data = await res.json();
        const formatted = (data || []).map((set: any) => ({
          ...set,
          flashcardsCount: set.flashcardsCount ?? set.flashcards?.length ?? 0,
        }));
        setFlashcardSets(formatted);
      }

      if (activeTab === "shadowing") {
        const res = await fetch(`${API_URL}/shadow`, { headers });
        const data = await res.json();
        setShadowTopics(data || []);
      }

      if (activeTab === "payments") {
        const res = await fetch(`${API_URL}/admin/payments`, { headers });
        if (res.ok) {
          const data = await res.json();
          setPayments(data || []);
        }
      }
    } catch (err) {
      showMessage("Lỗi", "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, token]);

  // === SEARCH LOGIC ===
  useEffect(() => {
    const query = normalizeString(search.trim());

    if (!query) {
      setFilteredBooks(books);
      setFilteredUsers(users);
      setFilteredFlashcards(flashcardSets);
      setFilteredShadowTopics(shadowTopics);
      setFilteredPayments(payments);
      setFilteredGroupedChapters(groupedChapters);
      return;
    }

    // Books
    setFilteredBooks(books.filter(book =>
      normalizeString(book.title).includes(query) ||
      normalizeString(book.author).includes(query) ||
      (book.level && normalizeString(book.level).includes(query))
    ));

    // Users
    setFilteredUsers(users.filter(u =>
      normalizeString(u.name).includes(query) ||
      normalizeString(u.email).includes(query)
    ));

    // Flashcards
    setFilteredFlashcards(flashcardSets.filter(set =>
      normalizeString(set.title).includes(query) ||
      (set.owner?.name && normalizeString(set.owner.name).includes(query)) ||
      (set.level && normalizeString(set.level).includes(query))
    ));

    // Shadowing
    setFilteredShadowTopics(shadowTopics.filter(topic =>
      normalizeString(topic.title).includes(query) ||
      (topic.description && normalizeString(topic.description).includes(query))
    ));

    // Payments
    setFilteredPayments(payments.filter(p =>
      (p.userId?.name && normalizeString(p.userId.name).includes(query)) ||
      (p.userId?.email && normalizeString(p.userId.email).includes(query)) ||
      p.planId.toLowerCase().includes(query)
    ));

    // Chapters
    const filteredChapters = chapters.filter(chapter =>
      normalizeString(chapter.title).includes(query) ||
      (chapter.book?.title && normalizeString(chapter.book.title).includes(query))
    );
    const grouped = filteredChapters.reduce((acc: Record<string, any[]>, chapter: any) => {
      const bookTitle = chapter.book?.title || "Không rõ sách";
      if (!acc[bookTitle]) acc[bookTitle] = [];
      acc[bookTitle].push(chapter);
      return acc;
    }, {});
    setFilteredGroupedChapters(grouped);
  }, [search, books, users, flashcardSets, shadowTopics, payments, chapters, groupedChapters]);

  // === BOOK ACTIONS ===
  const openBookModal = (book?: any) => {
    setCurrentBook(book ?? { title: "", author: "", level: "N5", coverImage: "" });
    setBookModal(true);
  };

  const closeBookModal = () => setBookModal(false);

  const updateCurrentBook = (updates: Partial<any>) => {
    setCurrentBook((prev: any) => ({ ...prev, ...updates }));
  };

  const saveBook = async () => {
    if (!currentBook.title.trim() || !currentBook.author.trim()) {
      showMessage("Lỗi", "Vui lòng nhập tiêu đề và tác giả");
      return;
    }

    try {
      const method = currentBook._id ? "PATCH" : "POST";
      const url = currentBook._id ? `${API_URL}/books/${currentBook._id}` : `${API_URL}/books`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(currentBook),
      });

      if (res.ok) {
        const saved = await res.json();
        setBooks(prev =>
          currentBook._id
            ? prev.map(b => b._id === saved._id ? saved : b)
            : [...prev, saved]
        );
        closeBookModal();
        showMessage("Thành công", currentBook._id ? "Cập nhật thành công" : "Thêm sách mới");
      } else {
        const err = await res.json();
        showMessage("Lỗi", err.message || "Lưu thất bại");
      }
    } catch {
      showMessage("Lỗi", "Lỗi kết nối");
    }
  };

  const deleteBook = (id: string) => {
    showConfirm({
      title: "Xóa sách",
      message: "Chắc chắn xóa sách này?",
      confirmText: "Xóa",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/books/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            setBooks(prev => prev.filter(b => b._id !== id));
            showMessage("Thành công", "Đã xóa sách");
          }
        } catch {}
      }
    });
  };

  // === USER ACTIONS ===
  const openUserModal = (u: any) => {
    setCurrentUser(u);
    setUserModal(true);
  };

  const closeUserModal = () => setUserModal(false);

  const updateCurrentUser = (updates: Partial<any>) => {
    setCurrentUser((prev: any) => prev ? { ...prev, ...updates } : null);
  };

  const saveUser = async () => {
    if (!currentUser) return;

    try {
      const res = await fetch(`${API_URL}/users/${currentUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
        }),
      });

      if (res.ok) {
        const { user: updated } = await res.json();
        setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
        closeUserModal();
        showMessage("Thành công", "Cập nhật thành công");
      }
    } catch {}
  };

  const deleteUser = (id: string) => {
    showConfirm({
      title: "Xóa người dùng",
      message: "Chắc chắn xóa người dùng này?",
      confirmText: "Xóa",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/users/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            setUsers(prev => prev.filter(u => u.id !== id));
            showMessage("Thành công", "Đã xóa");
          }
        } catch {}
      }
    });
  };

  // === CHAPTER ACTIONS ===
  const openChapterModal = async (chapter?: any) => {
    if (books.length === 0) {
      try {
        const res = await fetch(`${API_URL}/books`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setBooks(await res.json());
      } catch {
        showMessage("Lỗi", "Không tải được danh sách sách");
      }
    }

    if (chapter) {
      setCurrentChapter({
        _id: chapter._id,
        bookId: chapter.book?._id || "",
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        illustration: chapter.illustration,
        content: chapter.content.length > 0 ? chapter.content : [{ text: "", ruby: "", meaning: "" }]
      });
      setSelectedBookId(chapter.book?._id || "");
    } else {
      setCurrentChapter({
        bookId: "",
        chapterNumber: "",
        title: "",
        illustration: "",
        content: [{ text: "", ruby: "", meaning: "" }]
      });
      setSelectedBookId("");
    }
    setChapterModal(true);
  };

  const closeChapterModal = () => setChapterModal(false);

  const selectBookForChapter = (bookId: string) => {
    setSelectedBookId(bookId);
    setCurrentChapter((prev: any) => ({ ...prev, bookId }));

    const chaptersOfBook = chapters.filter((c: any) => c.book?._id === bookId);
    const maxChapter = Math.max(...chaptersOfBook.map((c: any) => c.chapterNumber || 0), 0);
    setCurrentChapter((prev: any) => ({ ...prev, chapterNumber: maxChapter + 1 }));
  };

  const updateCurrentChapter = (updates: Partial<any>) => {
    setCurrentChapter((prev: any) => ({ ...prev, ...updates }));
  };

  const addChapterSegment = () => {
    setCurrentChapter((prev: any) => ({
      ...prev,
      content: [...prev.content, { text: "", ruby: "", meaning: "" }]
    }));
  };

  const removeChapterSegment = (index: number) => {
    setCurrentChapter((prev: any) => ({
      ...prev,
      content: prev.content.filter((_: any, i: number) => i !== index)
    }));
  };

  const saveChapter = async () => {
    if (!currentChapter.bookId || !currentChapter.chapterNumber || !currentChapter.title) {
      showMessage("Lỗi", "Vui lòng nhập đầy đủ thông tin bắt buộc");
      return;
    }

    try {
      const method = currentChapter._id ? "PATCH" : "POST";
      const url = currentChapter._id
        ? `${API_URL}/chapters/${currentChapter._id}`
        : `${API_URL}/chapters`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          bookId: currentChapter.bookId,
          chapterNumber: Number(currentChapter.chapterNumber),
          title: currentChapter.title,
          illustration: currentChapter.illustration,
          content: currentChapter.content.filter((c: any) => c.text.trim())
        }),
      });

      if (res.ok) {
        closeChapterModal();
        showMessage("Thành công", "Lưu chương thành công!");
        fetchData(); // reload chapters
      } else {
        const err = await res.json();
        showMessage("Lỗi", err.message || "Lưu thất bại");
      }
    } catch {
      showMessage("Lỗi", "Lỗi kết nối");
    }
  };

  const deleteChapter = (id: string) => {
    showConfirm({
      title: "Xóa chương",
      message: "Chắc chắn xóa chương này?",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/chapters/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            showMessage("Thành công", "Đã xóa chương");
            fetchData();
          }
        } catch {}
      }
    });
  };

  // === FLASHCARD ACTIONS ===
  const openFlashcardModal = (set?: any) => {
    setCurrentFlashcardSet(set ?? {
      _id: "",
      title: "",
      description: "",
      isPublic: false,
      level: "N5",
      publicFor: null,
    });
    setFlashcardModal(true);
  };

  const closeFlashcardModal = () => setFlashcardModal(false);

  const updateCurrentFlashcardSet = (updates: Partial<any>) => {
    setCurrentFlashcardSet((prev: any) => prev ? { ...prev, ...updates } : null);
  };

  const saveFlashcardSet = async () => {
    if (!currentFlashcardSet?.title.trim()) {
      showMessage("Lỗi", "Vui lòng nhập tiêu đề");
      return;
    }

    try {
      const method = currentFlashcardSet._id ? "PUT" : "POST";
      const url = currentFlashcardSet._id
        ? `${API_URL}/admin/flashcard-sets/admin/${currentFlashcardSet._id}`
        : `${API_URL}/admin/flashcard-sets`;

      const body = {
        title: currentFlashcardSet.title.trim(),
        description: currentFlashcardSet.description?.trim(),
        isPublic: currentFlashcardSet.isPublic,
        level: currentFlashcardSet.level,
        publicFor: currentFlashcardSet.publicFor,
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const responseData = await res.json();

      if (res.ok) {
        const saved = responseData;
        setFlashcardSets(prev =>
          currentFlashcardSet._id
            ? prev.map(s => s._id === saved._id ? saved : s)
            : [...prev, saved]
        );
        closeFlashcardModal();
        showMessage("Thành công", currentFlashcardSet._id ? "Đã cập nhật bộ thẻ!" : "Tạo bộ thẻ mới thành công!");
      } else {
        showMessage("Lỗi", responseData.message || "Lưu thất bại");
      }
    } catch (err) {
      console.error("Lỗi khi lưu flashcard set:", err);
      showMessage("Lỗi", "Lỗi kết nối hoặc server");
    }
  };

  const deleteFlashcardSet = (id: string) => {
    showConfirm({
      title: "Xóa bộ flashcard",
      message: "Tất cả flashcard bên trong cũng sẽ bị xóa!",
      confirmText: "Xóa vĩnh viễn",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/flashcard-sets/admin/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            setFlashcardSets(prev => prev.filter(s => s._id !== id));
            showMessage("Thành công", "Đã xóa bộ thẻ");
          }
        } catch {}
      }
    });
  };

  const openFlashcardPreview = async (set: any) => {
    setSelectedSetTitle(set.title);
    setFlashcardPreviewModal(true);
    try {
      const res = await fetch(`${API_URL}/flashcards/sets/${set._id}/flashcards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSelectedSetFlashcards(await res.json());
    } catch {}
  };

  const closeFlashcardPreview = () => setFlashcardPreviewModal(false);

  // === NOTIFICATION ACTIONS ===
  const openNotifModal = () => setNotifModal(true);
  const closeNotifModal = () => setNotifModal(false);

  const updateNewNotifTitle = (text: string) => setNewNotifTitle(text);
  const updateNewNotifMessage = (text: string) => setNewNotifMessage(text);

  const sendNotification = async () => {
    if (!newNotifTitle.trim() || !newNotifMessage.trim()) {
      showMessage("Lỗi", "Nhập đầy đủ tiêu đề & nội dung");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/admin/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newNotifTitle, message: newNotifMessage }),
      });

      if (res.ok) {
        showMessage("Thành công", "Đã gửi thông báo!");
        setNewNotifTitle("");
        setNewNotifMessage("");
        closeNotifModal();
        fetchNotifications();
      }
    } catch {}
  };

  // === LOGOUT ===
  const handleLogout = () => {
    showConfirm({
      title: "Đăng xuất",
      message: "Bạn có chắc chắn muốn đăng xuất?",
      confirmText: "Đăng xuất",
      onConfirm: async () => {
        await logout();
        router.replace("/AuthScreen");
      }
    });
  };

  // === RETURN ALL VALUES ===
  return {
    // Search & loading
    search, setSearch, loading, loadingChapters,

    // Data
    stats, notifications,
    books, filteredBooks,
    chapters, groupedChapters, filteredGroupedChapters,
    users, filteredUsers,
    flashcardSets, filteredFlashcards,
    shadowTopics, filteredShadowTopics,
    payments, filteredPayments,

    // Modals state
    bookModal, currentBook,
    chapterModal, currentChapter, selectedBookId,
    userModal, currentUser,
    flashcardModal, currentFlashcardSet,
    flashcardPreviewModal, selectedSetFlashcards, selectedSetTitle,
    notifModal, newNotifTitle, newNotifMessage,

    // Actions
    openBookModal, closeBookModal, updateCurrentBook, saveBook, deleteBook,
    openChapterModal, closeChapterModal, selectBookForChapter, updateCurrentChapter,
    addChapterSegment, removeChapterSegment, saveChapter, deleteChapter,
    openUserModal, closeUserModal, updateCurrentUser, saveUser, deleteUser,
    openFlashcardModal, closeFlashcardModal, updateCurrentFlashcardSet, saveFlashcardSet, deleteFlashcardSet,
    openFlashcardPreview, closeFlashcardPreview,
    openNotifModal, closeNotifModal, updateNewNotifTitle, updateNewNotifMessage, sendNotification,

    // Global modals
    messageModal, setMessageModal,
    confirmModal, setConfirmModal,

    // Logout
    handleLogout,
  };
}
