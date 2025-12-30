// app/(admin)/index.tsx
import { useAuth } from '@/context/AuthContext';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

// Components
import BooksTab from "../../../components/(admin)/BooksTab";
import ChaptersTab from "../../../components/(admin)/ChaptersTab";
import DashboardTab from "../../../components/(admin)/DashboardTab";
import FlashcardsTab from "../../../components/(admin)/FlashcardsTab";
import Header from "../../../components/(admin)/Header";
import PaymentsTab from "../../../components/(admin)/PaymentsTab";
import ShadowingTab from "../../../components/(admin)/ShadowingTab";
import Sidebar from "../../../components/(admin)/Sidabar";
import UsersTab from "../../../components/(admin)/UsersTab";

// Modals
import BookModal from "../../../components/(admin)/modals/BookModal";
import ChapterModal from "../../../components/(admin)/modals/ChapterModal";
import FlashcardPreviewModal from "../../../components/(admin)/modals/FlashcardPreviewModal";
import FlashcardSetModal from "../../../components/(admin)/modals/FlashcardSetModal";
import NotificationModal from "../../../components/(admin)/modals/NotificationModal";
import UserModal from "../../../components/(admin)/modals/UserModal";

// Named import vì không có default export
import { ConfirmModal } from "../../../components/(admin)/modals/ConfirmModal";
import { MessageModal } from "../../../components/(admin)/modals/MessageModal";

// Hook
import useAdminData from "../../../hooks/(admin)/useAdminData";

// Styles
import { styles } from "./index.styles";

export default function AdminDashboard() {
  const { token, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("dashboard");

  const {
    // Search & loading
    search,
    setSearch,
    loading,
    loadingChapters,

    // Data
    stats,
    notifications,
    books,
    filteredBooks,
    chapters,
    groupedChapters,
    filteredGroupedChapters,
    users,
    filteredUsers,
    flashcardSets,
    filteredFlashcards,
    shadowTopics,
    filteredShadowTopics,
    payments,
    filteredPayments,

    // Book modal
    bookModal,
    currentBook,
    openBookModal,
    closeBookModal,
    updateCurrentBook,
    saveBook,
    deleteBook,

    // Chapter modal
    chapterModal,
    currentChapter,
    selectedBookId,
    openChapterModal,
    closeChapterModal,
    selectBookForChapter,
    updateCurrentChapter,
    addChapterSegment,
    removeChapterSegment,
    saveChapter,
    deleteChapter,

    // User modal
    userModal,
    currentUser,
    openUserModal,
    closeUserModal,
    updateCurrentUser,
    saveUser,
    deleteUser,

    // Flashcard modal
    flashcardModal,
    currentFlashcardSet,
    openFlashcardModal,
    closeFlashcardModal,
    updateCurrentFlashcardSet,
    saveFlashcardSet,
    deleteFlashcardSet,

    // Preview
    flashcardPreviewModal,
    selectedSetFlashcards,
    selectedSetTitle,
    openFlashcardPreview,
    closeFlashcardPreview,

    // Notification modal
    notifModal,
    newNotifTitle,
    newNotifMessage,
    openNotifModal,
    closeNotifModal,
    updateNewNotifTitle,
    updateNewNotifMessage,
    sendNotification,

    // Global modals
    messageModal,
    setMessageModal,
    confirmModal,
    setConfirmModal,

    // Logout
    handleLogout,
  } = useAdminData(activeTab); // ← Sửa: chỉ truyền activeTab và token

  const renderTabContent = () => {
    if (loading && activeTab !== "dashboard") {
      return <ActivityIndicator size="large" color="#4a00e0" style={{ marginTop: 100 }} />;
    }

    switch (activeTab) {
      case "dashboard":
        return <DashboardTab stats={stats} />;

      case "books":
        return (
          <BooksTab
            data={search ? filteredBooks : books}
            onEdit={openBookModal}
            onDelete={deleteBook}
          />
        );

      case "chapters":
        return (
          <ChaptersTab
            groupedChapters={search ? filteredGroupedChapters : groupedChapters}
            loading={loadingChapters}
            onEdit={openChapterModal}
            onDelete={deleteChapter}
          />
        );

      case "users":
        return (
          <UsersTab
            data={search ? filteredUsers : users}
            onEdit={openUserModal}
            onDelete={deleteUser}
          />
        );

      case "flashcards":
        return (
          <FlashcardsTab
            data={search ? filteredFlashcards : flashcardSets}
            onEdit={openFlashcardModal}
            onDelete={deleteFlashcardSet}
            onPreview={openFlashcardPreview}
          />
        );

      case "shadowing":
        return <ShadowingTab data={search ? filteredShadowTopics : shadowTopics} />;

      case "payments":
        return <PaymentsTab data={search ? filteredPayments : payments} />;

      default:
        return null;
    }
  };

  const getAddButtonHandler = () => {
    switch (activeTab) {
      case "books":
        return () => openBookModal();
      case "flashcards":
        return () => openFlashcardModal();
      case "chapters":
        return () => openChapterModal();
      default:
        return undefined;
    }
  };

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />

      {/* Main Content */}
      <View style={styles.mainContent}>
        <Header
          activeTab={activeTab}
          search={search}
          onSearch={setSearch}
          notificationsCount={notifications.length}
          onAddPress={getAddButtonHandler()}
          onNotifPress={openNotifModal}
        />

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
          {renderTabContent()}
        </ScrollView>
      </View>

      {/* All Modals */}
      <BookModal
        visible={bookModal}
        currentBook={currentBook}
        onClose={closeBookModal}
        onSave={saveBook}
        onChange={updateCurrentBook}
      />

      <UserModal
        visible={userModal}
        currentUser={currentUser}
        onClose={closeUserModal}
        onSave={saveUser}
        onChange={updateCurrentUser}
      />

      <ChapterModal
        visible={chapterModal}
        currentChapter={currentChapter}
        books={books}
        selectedBookId={selectedBookId}
        onClose={closeChapterModal}
        onSave={saveChapter}
        onSelectBook={selectBookForChapter}
        onChange={updateCurrentChapter}
        onAddSegment={addChapterSegment}
        onRemoveSegment={removeChapterSegment}
      />

      <FlashcardSetModal
        visible={flashcardModal}
        currentSet={currentFlashcardSet}
        onClose={closeFlashcardModal}
        onSave={saveFlashcardSet}
        onUpdate={updateCurrentFlashcardSet}
      />

      <FlashcardPreviewModal
        visible={flashcardPreviewModal}
        title={selectedSetTitle}
        flashcards={selectedSetFlashcards}
        onClose={closeFlashcardPreview}
      />

      <NotificationModal
        visible={notifModal}
        notifications={notifications}
        newTitle={newNotifTitle}
        newMessage={newNotifMessage}
        onClose={closeNotifModal}
        onTitleChange={updateNewNotifTitle}
        onMessageChange={updateNewNotifMessage}
        onSend={sendNotification}
      />

      {/* Global Modals – dùng named import */}
      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onCancel={() => setConfirmModal({ visible: false })}
        onConfirm={confirmModal.onConfirm}
        confirmText={confirmModal.confirmText}
      />

      <MessageModal
        visible={messageModal.visible}
        title={messageModal.title}
        message={messageModal.message}
        onClose={() => setMessageModal({ visible: false })}
      />
    </View>
  );
}