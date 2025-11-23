const express = require('express');
const router = express.Router();
const {
  getAllFlashcardSets,
  getFlashcardSetById,
  createFlashcardSet,
  updateFlashcardSet,
  deleteFlashcardSet,
} = require('../controllers/flashcardSetController');
const { protect } = require('../middleware/authMiddleware');

// All of these routes are protected
router.route('/').get(protect, getAllFlashcardSets).post(protect, createFlashcardSet);
router
  .route('/:id')
  .get(protect, getFlashcardSetById)
  .put(protect, updateFlashcardSet)
  .delete(protect, deleteFlashcardSet);

module.exports = router;
