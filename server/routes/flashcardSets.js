const express = require('express');
const router = express.Router();
const {
  getPublicFlashcardSets,
  getAllFlashcardSets,
  getFlashcardSetById,
  createFlashcardSet,
  updateFlashcardSet,
  deleteFlashcardSet,
  getAllFlashcardSetsAdmin,
  adminUpdateFlashcardSet,
  adminDeleteFlashcardSet,
  getPublicFlashcardsForSet,
  getQuizFlashcards,
  importFlashcardsFromExcel
} = require('../controllers/flashcardSetController');

const {
  getFlashcardsForSet,
  addFlashcardToSet,
  removeFlashcardFromSet,
} = require('../controllers/flashcardController');

const { protect, admin } = require('../middleware/authMiddleware');

// === PUBLIC ROUTES (PHẢI ĐẶT TRƯỚC CÁC ROUTE CÓ PARAM) ===
router.get('/public', getPublicFlashcardSets);
router.get('/public/:setId/flashcards', getPublicFlashcardsForSet);

// === QUIZ ROUTE (cần protect vì private có thể cần token) ===
router.get('/:id/quiz-flashcards', protect, getQuizFlashcards);

// === PRIVATE ROUTES ===
router.get('/', protect, getAllFlashcardSets);
router.post('/', protect, createFlashcardSet);

router.get('/:id/flashcards', protect, getFlashcardsForSet);
router.post('/:id/flashcards', protect, addFlashcardToSet);
router.delete('/:id/flashcards/:flashcardId', protect, removeFlashcardFromSet);

router.get('/:id', protect, getFlashcardSetById);
router.put('/:id', protect, updateFlashcardSet);
router.delete('/:id', protect, deleteFlashcardSet);

// === ADMIN ROUTES ===
router.get('/admin/all', protect, admin, getAllFlashcardSetsAdmin);
router.put('/admin/:id', protect, admin, adminUpdateFlashcardSet);
router.delete('/admin/:id', protect, admin, adminDeleteFlashcardSet);

// routes/flashcardSets.js
router.post('/:setId/import-excel', protect, importFlashcardsFromExcel);
module.exports = router;