const express = require('express');
const router = express.Router();

const {
  createFlashcard,
  getFlashcardsForSet,
  addFlashcardToSet,
  updateFlashcard,
  deleteFlashcard,
  removeFlashcardFromSet,
} = require('../controllers/flashcardController');

const { protect } = require('../middleware/authMiddleware');
const conditionalUpload = require('../middleware/fileUpload');

/* ======================================================
   FLASHCARD SET ↔ FLASHCARD (DEFINE CỤ THỂ TRƯỚC)
====================================================== */

// Lấy flashcards trong 1 set
router.get(
  '/sets/:setId/flashcards',
  protect,
  getFlashcardsForSet
);

// Thêm flashcard vào set
router.post(
  '/sets/:setId/flashcards',
  protect,
  addFlashcardToSet
);

// Gỡ flashcard khỏi set
router.delete(
  '/sets/:setId/flashcards/:flashcardId',
  protect,
  removeFlashcardFromSet
);

/* ======================================================
   FLASHCARD CRUD
====================================================== */

// Tạo flashcard (CÓ ẢNH)
router.post(
  '/',
  protect,
  conditionalUpload('image'), // ⭐ QUAN TRỌNG
  createFlashcard
);

// Cập nhật flashcard (CÓ / KHÔNG ẢNH)
router.put(
  '/:id',
  protect,
  conditionalUpload('image'), // ⭐ QUAN TRỌNG
  updateFlashcard
);

// Xóa flashcard
router.delete(
  '/:id',
  protect,
  deleteFlashcard
);

/* ======================================================
   ALIAS ROUTES (CHO TIỆN FRONTEND)
====================================================== */

router.get(
  '/:setId/flashcards',
  protect,
  getFlashcardsForSet
);

router.post(
  '/:setId/flashcards',
  protect,
  addFlashcardToSet
);

router.delete(
  '/:setId/flashcards/:flashcardId',
  protect,
  removeFlashcardFromSet
);

module.exports = router;
