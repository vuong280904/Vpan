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

// Helper function to add a flashcard to a set
const addFlashcardToSetHelper = async (setId, flashcardId, userId) => {
  if (!setId || !flashcardId || !userId) {
    throw new Error('Missing parameters for addFlashcardToSetHelper');
  }

  const flashcardSet = await FlashcardSet.findById(setId);

  if (!flashcardSet) {
    throw new Error(`FlashcardSet with ID ${setId} not found`);
  }

  if (flashcardSet.owner.toString() !== userId.toString()) {
    throw new Error('Not authorized to add flashcard to this set');
  }

  if (flashcardSet.flashcards.includes(flashcardId)) {
    // Flashcard already in set, no need to add again
    return { message: 'Flashcard already in set', flashcardSet };
  }

  flashcardSet.flashcards.push(flashcardId);
  flashcardSet.updatedAt = Date.now();
  await flashcardSet.save();
  await flashcardSet.populate('flashcards'); // Populate to return full flashcard objects if needed by the caller
  return { message: 'Flashcard added to set successfully', flashcardSet };
};

// @desc    Create a new flashcard
// @route   POST /api/flashcards
// @access  Private
const createFlashcard = async (req, res) => {
  try {
    const { vocabulary, phonetic, meaning, setId } = req.body;

    console.log('\n=== CREATE FLASHCARD ===');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Vocabulary:', vocabulary);
    console.log('Meaning:', meaning);
    console.log('Phonetic:', phonetic);
    console.log('SetId:', setId);
    console.log('File received:', req.file ? 'YES ✅' : 'NO ❌');
    
    if (req.file) {
      console.log('📁 File Details:');
      console.log('  - Fieldname:', req.file.fieldname);
      console.log('  - Filename:', req.file.filename);
      console.log('  - Mimetype:', req.file.mimetype);
      console.log('  - Size:', req.file.size, 'bytes');
      console.log('  - Path:', req.file.path);
      console.log('  - Encoding:', req.file.encoding);
      
      // Verify file exists on disk
      if (fs.existsSync(req.file.path)) {
        const stats = fs.statSync(req.file.path);
        console.log('✅ File verified on disk - Size on disk:', stats.size, 'bytes');
      } else {
        console.log('⚠️  WARNING - File path does not exist on disk:', req.file.path);
      }
    } else {
      console.log('FormData fields:', Object.keys(req.body));
    }

    if (!vocabulary || !meaning) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ message: 'Vocabulary and meaning are required' });
    }

    const imagePath = req.file ? `/uploads/flashcards/${req.file.filename}` : null;
    console.log('📝 Image path to save:', imagePath);

    const flashcard = new Flashcard({
      vocabulary,
      phonetic: phonetic || '',
      meaning,
      image: imagePath,
      createdBy: req.user.id,
    });

    console.log('💾 Flashcard object before save:', {
      vocabulary: flashcard.vocabulary,
      phonetic: flashcard.phonetic,
      meaning: flashcard.meaning,
      image: flashcard.image,
      createdBy: flashcard.createdBy,
    });

    const createdFlashcard = await flashcard.save();
    console.log('✅ Flashcard created successfully:', createdFlashcard._id);
    console.log('💾 Flashcard object after save:', {
      _id: createdFlashcard._id,
      vocabulary: createdFlashcard.vocabulary,
      phonetic: createdFlashcard.phonetic,
      meaning: createdFlashcard.meaning,
      image: createdFlashcard.image,
      createdBy: createdFlashcard.createdBy,
    });
    console.log('📤 About to send response with image:', createdFlashcard.image);
    console.log('=== CREATE FLASHCARD COMPLETE ===\n');

    // If setId is provided, add the flashcard to the set using the helper
    if (setId) {
      try {
        await addFlashcardToSetHelper(setId, createdFlashcard._id, req.user.id);
        console.log(`✅ Flashcard ${createdFlashcard._id} added to set ${setId}`);
      } catch (addSetError) {
        console.warn(`⚠️  Failed to add flashcard to set ${setId}: ${addSetError.message}`);
      }
    }

    res.status(201).json(createdFlashcard);
  } catch (err) {
    console.error('❌ Error creating flashcard:', err);
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

    const result = await addFlashcardToSetHelper(setId, flashcardId, req.user.id);
    console.log(result.message);
    res.json(result.flashcardSet);
  } catch (err) {
    console.error('Error in addFlashcardToSet:', err);
    // Determine appropriate status code based on error message from helper
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    if (err.message.includes('Not authorized')) {
      return res.status(401).json({ message: err.message });
    }
    if (err.message.includes('already in set')) {
      return res.status(400).json({ message: err.message });
    }
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

    console.log('\n=== UPDATE FLASHCARD ===');
    console.log('Flashcard ID:', req.params.id);
    console.log('Vocabulary:', vocabulary);
    console.log('Meaning:', meaning);
    console.log('Phonetic:', phonetic);
    console.log('File received:', req.file ? 'YES' : 'NO');
    
    if (req.file) {
      console.log('File details:', {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
      });
    }

    if (!flashcard) {
      console.log('❌ Flashcard not found');
      return res.status(404).json({ message: 'Flashcard not found' });
    }

    if (flashcard.createdBy.toString() !== req.user.id) {
      console.log('❌ Not authorized to update this flashcard');
      return res.status(401).json({ message: 'Not authorized' });
    }

    flashcard.vocabulary = vocabulary || flashcard.vocabulary;
    flashcard.phonetic = phonetic ?? flashcard.phonetic;
    flashcard.meaning = meaning || flashcard.meaning;

    if (req.file) {
      // Delete old image if exists
      if (flashcard.image) {
        const oldImagePath = path.join(__dirname, '..', flashcard.image);
        console.log('Deleting old image:', oldImagePath);
        fs.unlink(oldImagePath, (err) => {
          if (err) console.error('Error deleting old image:', err);
        });
      }
      flashcard.image = `/uploads/flashcards/${req.file.filename}`;
      console.log('✅ New image set:', flashcard.image);
    } else {
      console.log('ℹ️  No new image provided, keeping existing image:', flashcard.image);
    }

    flashcard.updatedAt = Date.now();
    const updatedFlashcard = await flashcard.save();

    console.log('✅ Flashcard updated successfully');
    console.log('📤 Updated flashcard data:', {
      _id: updatedFlashcard._id,
      vocabulary: updatedFlashcard.vocabulary,
      phonetic: updatedFlashcard.phonetic,
      meaning: updatedFlashcard.meaning,
      image: updatedFlashcard.image,
    });
    console.log('=== UPDATE FLASHCARD COMPLETE ===\n');

    res.json(updatedFlashcard);
  } catch (err) {
    console.error('❌ Error updating flashcard:', err.message);
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
    console.log('\n=== DELETE FLASHCARD ===' );
    console.log('Flashcard ID:', req.params.id);
    console.log('User ID:', req.user?.id);
    console.log('DB Connection State:', require('mongoose').connection.readyState); // 1 = connected
    
    if (require('mongoose').connection.readyState !== 1) {
      console.log('ERROR: Database not connected');
      return res.status(500).json({ error: 'Database connection failed' });
    }
    
    const flashcard = await Flashcard.findById(req.params.id);
    console.log('Flashcard found:', flashcard ? 'YES' : 'NO');

    if (!flashcard) {
      console.log('Error: Flashcard not found');
      return res.status(404).json({ message: 'Flashcard not found' });
    }

    console.log('Flashcard createdBy:', flashcard.createdBy);
    console.log('Comparing:', flashcard.createdBy.toString(), '===', req.user.id);
    
    if (flashcard.createdBy.toString() !== req.user.id) {
      console.log('Error: Not authorized');
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Delete image file if exists
    if (flashcard.image) {
      const imagePath = path.join(__dirname, '..', flashcard.image);
      console.log('Deleting image at:', imagePath);
      fs.unlink(imagePath, (err) => {
        if (err) console.error('Error deleting image:', err);
      });
    }

    // Remove flashcard from all sets
    console.log('Removing flashcard from all sets');
    const updateResult = await FlashcardSet.updateMany(
      {},
      { $pull: { flashcards: flashcard._id } }
    );
    console.log('Sets updated:', updateResult.modifiedCount);

    const deleteResult = await flashcard.deleteOne();
    console.log('Flashcard deleted, result:', deleteResult);
    console.log('Flashcard deleted successfully');
    console.log('=== DELETE FLASHCARD COMPLETE ===\n');
    res.json({ message: 'Flashcard removed' });
  } catch (err) {
    console.error('=== DELETE FLASHCARD ERROR ===');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    console.error('=== END ERROR ===\n');
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
