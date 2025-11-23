const Flashcard = require('../models/Flashcard');
const FlashcardSet = require('../models/FlashcardSet');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/flashcards');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// @desc    Create a new flashcard
// @route   POST /api/flashcards
// @access  Private
const createFlashcard = async (req, res) => {
  try {
    const { vocabulary, phonetic, meaning } = req.body;

    console.log('createFlashcard - vocabulary:', vocabulary, 'meaning:', meaning);
    console.log('createFlashcard - file:', req.file ? req.file.filename : 'NO FILE');

    if (!vocabulary || !meaning) {
      console.error('Missing required fields');
      return res.status(400).json({ message: 'Vocabulary and meaning are required' });
    }

    const flashcard = new Flashcard({
      vocabulary,
      phonetic: phonetic || '',
      meaning,
      image: req.file ? `/uploads/flashcards/${req.file.filename}` : null,
      createdBy: req.user.id,
    });

    const createdFlashcard = await flashcard.save();
    console.log('Flashcard created successfully:', createdFlashcard._id);
    res.status(201).json(createdFlashcard);
  } catch (err) {
    console.error('Error creating flashcard:', err);
    // Clean up uploaded file if error occurs
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    res.status(500).json({ error: err.message });
  }
};

// @desc    Get all flashcards for a set
// @route   GET /api/flashcard-sets/:id/flashcards or /api/flashcards/sets/:setId/flashcards
// @access  Private
const getFlashcardsForSet = async (req, res) => {
  try {
    const setId = req.params.setId || req.params.id;

    const flashcardSet = await FlashcardSet.findById(setId).populate('flashcards');

    if (!flashcardSet) {
      return res.status(404).json({ message: 'Flashcard set not found' });
    }

    if (flashcardSet.owner.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.json(flashcardSet.flashcards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Add flashcard to set
// @route   POST /api/flashcard-sets/:id/flashcards or /api/flashcards/sets/:setId/flashcards
// @access  Private
const addFlashcardToSet = async (req, res) => {
  try {
    const setId = req.params.setId || req.params.id;
    const { flashcardId } = req.body;

    console.log('addFlashcardToSet - setId:', setId, 'flashcardId:', flashcardId);

    if (!flashcardId) {
      console.error('Missing flashcardId in request body');
      return res.status(400).json({ message: 'Flashcard ID is required' });
    }

    const flashcardSet = await FlashcardSet.findById(setId);
    console.log('Found flashcard set:', flashcardSet ? 'YES' : 'NO');

    if (!flashcardSet) {
      console.error('Flashcard set not found:', setId);
      return res.status(404).json({ message: 'Flashcard set not found' });
    }

    console.log('User ID:', req.user.id, 'Set owner:', flashcardSet.owner.toString());
    if (flashcardSet.owner.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Check if flashcard already exists in set
    if (flashcardSet.flashcards.includes(flashcardId)) {
      return res.status(400).json({ message: 'Flashcard already in set' });
    }

    flashcardSet.flashcards.push(flashcardId);
    flashcardSet.updatedAt = Date.now();

    const updatedSet = await flashcardSet.save();
    console.log('Flashcard set updated, now populating flashcards...');
    await updatedSet.populate('flashcards');

    console.log('Successfully added flashcard to set');
    res.json(updatedSet);
  } catch (err) {
    console.error('Error in addFlashcardToSet:', err);
    res.status(500).json({ error: err.message });
  }
};

// @desc    Update a flashcard
// @route   PUT /api/flashcards/:id
// @access  Private
const updateFlashcard = async (req, res) => {
  try {
    const { vocabulary, phonetic, meaning } = req.body;
    const flashcard = await Flashcard.findById(req.params.id);

    if (!flashcard) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }

    if (flashcard.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    flashcard.vocabulary = vocabulary || flashcard.vocabulary;
    flashcard.phonetic = phonetic ?? flashcard.phonetic;
    flashcard.meaning = meaning || flashcard.meaning;

    if (req.file) {
      // Delete old image if exists
      if (flashcard.image) {
        const oldImagePath = path.join(__dirname, '..', flashcard.image);
        fs.unlink(oldImagePath, (err) => {
          if (err) console.error('Error deleting old image:', err);
        });
      }
      flashcard.image = `/uploads/flashcards/${req.file.filename}`;
    }

    flashcard.updatedAt = Date.now();
    const updatedFlashcard = await flashcard.save();

    res.json(updatedFlashcard);
  } catch (err) {
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    res.status(500).json({ error: err.message });
  }
};

// @desc    Delete a flashcard
// @route   DELETE /api/flashcards/:id
// @access  Private
const deleteFlashcard = async (req, res) => {
  try {
    const flashcard = await Flashcard.findById(req.params.id);

    if (!flashcard) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }

    if (flashcard.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Delete image file if exists
    if (flashcard.image) {
      const imagePath = path.join(__dirname, '..', flashcard.image);
      fs.unlink(imagePath, (err) => {
        if (err) console.error('Error deleting image:', err);
      });
    }

    // Remove flashcard from all sets
    await FlashcardSet.updateMany(
      {},
      { $pull: { flashcards: flashcard._id } }
    );

    await flashcard.deleteOne();
    res.json({ message: 'Flashcard removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Remove flashcard from set
// @route   DELETE /api/flashcard-sets/:id/flashcards/:flashcardId or /api/flashcards/sets/:setId/flashcards/:flashcardId
// @access  Private
const removeFlashcardFromSet = async (req, res) => {
  try {
    const setId = req.params.setId || req.params.id;
    const { flashcardId } = req.params;

    const flashcardSet = await FlashcardSet.findById(setId);

    if (!flashcardSet) {
      return res.status(404).json({ message: 'Flashcard set not found' });
    }

    if (flashcardSet.owner.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    flashcardSet.flashcards = flashcardSet.flashcards.filter(
      (id) => id.toString() !== flashcardId
    );
    flashcardSet.updatedAt = Date.now();

    const updatedSet = await flashcardSet.save();
    await updatedSet.populate('flashcards');

    res.json(updatedSet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  upload,
  createFlashcard,
  getFlashcardsForSet,
  addFlashcardToSet,
  updateFlashcard,
  deleteFlashcard,
  removeFlashcardFromSet,
};
