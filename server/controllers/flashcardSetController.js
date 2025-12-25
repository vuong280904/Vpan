const FlashcardSet = require('../models/FlashcardSet');

// @desc    Get all flashcard sets
// @route   GET /api/flashcard-sets
// @access  Private
const getAllFlashcardSets = async (req, res) => {
  try {
    const flashcardSets = await FlashcardSet.find({ owner: req.user.id }).populate('flashcards');
    res.json(flashcardSets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Get a single flashcard set by ID
// @route   GET /api/flashcard-sets/:id
// @access  Private
const getFlashcardSetById = async (req, res) => {
  try {
    const flashcardSet = await FlashcardSet.findById(req.params.id).populate('flashcards');

    if (!flashcardSet) {
      return res.status(404).json({ message: 'Flashcard set not found' });
    }

    if (flashcardSet.owner.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.json(flashcardSet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Create a new flashcard set
// @route   POST /api/flashcard-sets
// @access  Private
const createFlashcardSet = async (req, res) => {
  let { name, title, description = '', tags = [], level = 'N5', isPublic = false } = req.body;

  // Ưu tiên name nếu có, không thì title
  title = name?.trim() || title?.trim();

  if (!title) {
    return res.status(400).json({ message: 'Tên bộ flashcard không được để trống' });
  }

  try {
    const flashcardSet = new FlashcardSet({
      title,
      description,
      tags,
      level,
      isPublic,
      owner: req.user.id,
    });

    const created = await flashcardSet.save();
    res.status(201).json({
      id: created._id,
      name: created.title,  // trả về name để frontend dùng
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// @desc    Update a flashcard set
// @route   PUT /api/flashcard-sets/:id
// @access  Private
const updateFlashcardSet = async (req, res) => {
  const { title, description, tags, level, isPublic } = req.body;

  try {
    const flashcardSet = await FlashcardSet.findById(req.params.id);

    if (!flashcardSet) {
      return res.status(404).json({ message: 'Flashcard set not found' });
    }

    if (flashcardSet.owner.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    flashcardSet.title = title ?? flashcardSet.title;
    flashcardSet.description = description ?? flashcardSet.description;
    flashcardSet.tags = tags ?? flashcardSet.tags;
    flashcardSet.level = level ?? flashcardSet.level;
    flashcardSet.isPublic = isPublic ?? flashcardSet.isPublic;
    flashcardSet.updatedAt = Date.now();

    const updatedFlashcardSet = await flashcardSet.save();
    res.json(updatedFlashcardSet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Delete a flashcard set
// @route   DELETE /api/flashcard-sets/:id
// @access  Private
const deleteFlashcardSet = async (req, res) => {
  try {
    const flashcardSet = await FlashcardSet.findById(req.params.id);

    if (!flashcardSet) {
      return res.status(404).json({ message: 'Flashcard set not found' });
    }

    if (flashcardSet.owner.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await flashcardSet.deleteOne();
    res.json({ message: 'Flashcard set removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// @desc    [ADMIN] Get ALL flashcard sets (không giới hạn owner)
// @route   GET /api/flashcard-sets/admin/all
// @access  Private + Admin only
const getAllFlashcardSetsAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới có quyền truy cập' });
    }

    const flashcardSets = await FlashcardSet.find({})
      .populate('owner', 'name email avatarURL')
      .populate({
        path: 'flashcards',
        match: { _id: { $exists: true } },
        select: 'vocabulary meaning',
      })
      .sort({ createdAt: -1 });

    const result = flashcardSets.map(set => ({
      ...set.toObject(),
      flashcardsCount: set.flashcards?.length || 0,
    }));

    res.json(result);
  } catch (err) {
    console.error('Error in getAllFlashcardSetsAdmin:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};
// @desc    [ADMIN] Update any flashcard set
// @route   PUT /api/flashcard-sets/admin/:id
// @access  Private + Admin only
const adminUpdateFlashcardSet = async (req, res) => {
  const { title, description, tags, level, isPublic } = req.body;

  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới được phép' });
    }

    const flashcardSet = await FlashcardSet.findById(req.params.id);
    if (!flashcardSet) {
      return res.status(404).json({ message: 'Không tìm thấy bộ flashcard' });
    }

    // Cập nhật các trường
    flashcardSet.title = title ?? flashcardSet.title;
    flashcardSet.description = description ?? flashcardSet.description;
    flashcardSet.tags = tags ?? flashcardSet.tags;
    flashcardSet.level = level ?? flashcardSet.level;
    flashcardSet.isPublic = isPublic ?? flashcardSet.isPublic;
    flashcardSet.updatedAt = Date.now();

    await flashcardSet.save(); // ← Chỉ save

    // FIX ĐÚNG: Dùng findById để lấy lại + populate an toàn
    const populated = await FlashcardSet.findById(flashcardSet._id)
      .populate('owner', 'name email avatarURL')
      .populate({
        path: 'flashcards',
        match: { _id: { $exists: true } }, // Chỉ lấy flashcard còn tồn tại
        select: 'vocabulary phonetic meaning image createdAt',
      });

    res.json({
      ...populated.toObject(),
      flashcardsCount: populated.flashcards?.length || 0,
    });
  } catch (err) {
      console.error('Lỗi khi admin cập nhật flashcard set:', err);
      res.status(500).json({ message: 'Lỗi server khi cập nhật bộ thẻ' });
  }
};

// @desc    [ADMIN] Delete any flashcard set
// @route   DELETE /api/flashcard-sets/admin/:id
// @access  Private + Admin only
const adminDeleteFlashcardSet = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới được phép' });
    }

    const flashcardSet = await FlashcardSet.findById(req.params.id);
    if (!flashcardSet) {
      return res.status(404).json({ message: 'Không tìm thấy bộ flashcard' });
    }

    // Xóa luôn (admin không cần hỏi owner)
    await flashcardSet.deleteOne();
    res.json({ message: 'Đã xóa bộ flashcard (admin)' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// @desc    Get my flashcard sets (của user hiện tại)
// @route   GET /api/flashcard-sets/my
// @access  Private
const getMyFlashcardSets = async (req, res) => {
  try {
    const sets = await FlashcardSet.find({ owner: req.user.id })
      .select('title description tags level isPublic createdAt')
      .sort({ createdAt: -1 });

    res.json(sets);
  } catch (err) {
    console.error('Error getMyFlashcardSets:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// @desc    Get all public flashcard sets with flashcards count
// @route   GET /api/flashcard-sets/public
// @access  Public
const getPublicFlashcardSets = async (req, res) => {
  try {
    const sets = await FlashcardSet.find({ isPublic: true })
      .populate('owner', 'name')
      .populate('flashcards') // ← THÊM DÒNG NÀY ĐỂ POPULATE FLASHCARDS
      .sort({ createdAt: -1 });

    const result = sets.map(set => ({
      _id: set._id,
      title: set.title,
      description: set.description || '',
      level: set.level || 'N5',
      createdAt: set.createdAt,
      owner: set.owner,
      isPublic: set.isPublic,
      cardCount: set.flashcards?.length || 0, // ← THÊM CARD COUNT
      flashcards: set.flashcards || [] // ← TRẢ VỀ DANH SÁCH FLASHCARD (cho trang detail)
    }));

    res.json(result);
  } catch (err) {
    console.error('Error getPublicFlashcardSets:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};
// @desc    Get flashcards for a PUBLIC flashcard set (no auth required)
// @route   GET /api/flashcard-sets/public/:setId/flashcards
// @access  Public
const getPublicFlashcardsForSet = async (req, res) => {
  try {
    const { setId } = req.params;

    const flashcardSet = await FlashcardSet.findOne({
      _id: setId,
      isPublic: true
    }).populate({
      path: 'flashcards',
      select: 'vocabulary phonetic meaning image createdAt' // chỉ lấy những gì cần cho quiz
    });

    if (!flashcardSet) {
      return res.status(404).json({ message: 'Bộ flashcard không tồn tại hoặc không công khai' });
    }

    res.json(flashcardSet.flashcards || []);
  } catch (err) {
    console.error('Error in getPublicFlashcardsForSet:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};
module.exports = {
  getAllFlashcardSets,
  getFlashcardSetById,
  createFlashcardSet,
  updateFlashcardSet,
  deleteFlashcardSet,
  getAllFlashcardSetsAdmin,
  adminUpdateFlashcardSet,
  adminDeleteFlashcardSet,

  // THÊM MỚI
  getMyFlashcardSets,
  getPublicFlashcardSets,
  getPublicFlashcardsForSet,
};
