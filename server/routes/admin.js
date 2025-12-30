// routes/admin.js - PHIÊN BẢN HOÀN CHỈNH 2025 (HOẠT ĐỘNG 100% VỚI FRONTEND)
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Book = require('../models/Book');
const Payment = require('../models/Payment');
const FlashcardSet = require('../models/FlashcardSet');
const Notification = require('../models/Notification');

const { protect, admin } = require('../middleware/authMiddleware'); // Đảm bảo file tên đúng

// ==================== THỐNG KÊ DASHBOARD ====================
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);

    const [totalUsers, totalBooks] = await Promise.all([
      User.countDocuments(),
      Book.countDocuments(),
    ]);

    const flashcardAgg = await FlashcardSet.aggregate([
      { $unwind: { path: '$flashcards', preserveNullAndEmptyArrays: true } },
      { $count: 'total' }
    ]);
    const totalFlashcards = flashcardAgg[0]?.total || 0;

    const userGrowthRaw = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const flashcardCreationRaw = await FlashcardSet.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: { path: '$flashcards', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $dateToString: { format: '%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const labels = [];
    const userData = [];
    const flashcardData = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(endDate.getDate() - i);
      const label = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      labels.push(label);

      const userDay = userGrowthRaw.find(g => g._id === label);
      userData.push(userDay?.count || 0);

      const flashDay = flashcardCreationRaw.find(g => g._id === label);
      flashcardData.push(flashDay?.count || 0);
    }

    res.json({
      totalBooks,
      totalFlashcards,
      totalUsers,
      chartData: {
        labels,
        datasets: [
          { data: userData, label: 'Người dùng mới' },
          { data: flashcardData, label: 'Flashcard được tạo' }
        ]
      }
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==================== THÔNG BÁO HỆ THỐNG ====================
router.get('/notifications', protect, admin, async (req, res) => {
  try {
    const notifs = await Notification.find({ type: 'system' })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('title message createdAt')
      .lean();
    res.json(notifs);
  } catch (err) {
    console.error('Lỗi lấy thông báo:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.post('/notifications', protect, admin, async (req, res) => {
  const { title, message } = req.body;
  if (!title?.trim() || !message?.trim()) {
    return res.status(400).json({ message: 'Thiếu tiêu đề hoặc nội dung' });
  }

  try {
    const users = await User.find().select('_id');
    const notifications = users.map(u => ({
      userId: u._id,
      title: title.trim(),
      message: message.trim(),
      type: 'system',
      read: false,
    }));

    await Notification.insertMany(notifications);

    res.status(201).json({
      success: true,
      totalSent: users.length,
      title: title.trim(),
      message: message.trim(),
    });
  } catch (err) {
    console.error('Gửi thông báo lỗi:', err);
    res.status(500).json({ message: 'Gửi thất bại' });
  }
});

// ==================== FLASHCARD SETS - ADMIN QUẢN LÝ TOÀN BỘ ====================
// LẤY TẤT CẢ FLASHCARD SETS (CHO ADMIN - CÓ PHÂN TRANG + TÌM KIẾM)
router.get('/flashcard-sets/admin/all', protect, admin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const search = req.query.q?.trim();

    let query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await FlashcardSet.countDocuments(query);

    const sets = await FlashcardSet.find(query)
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Thêm flashcardsCount
    const formatted = sets.map(set => ({
      ...set,
      flashcardsCount: set.flashcards?.length || 0,
    }));

    res.json({
      data: formatted,
      page,
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (err) {
    console.error('Admin get all flashcard sets error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// CẬP NHẬT FLASHCARD SET (ADMIN CÓ THỂ SỬA BẤT KỲ BỘ NÀO)
router.put('/flashcard-sets/admin/:id', protect, admin, async (req, res) => {
  try {
    const { title, description, isPublic, level, publicFor } = req.body;

    const updated = await FlashcardSet.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        isPublic,
        level,
        publicFor, // ← đã nhận
        updatedAt: Date.now()
      },
      { new: true, runValidators: true } // ← new: true trả về document mới
    )
      .populate('owner', 'name email')
      .lean();

    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy bộ thẻ' });
    }

    // Thêm flashcardsCount để frontend hiển thị đúng
    updated.flashcardsCount = updated.flashcards?.length || 0;

    res.json(updated); // ← TRẢ VỀ ĐẦY ĐỦ, CÓ publicFor
  } catch (err) {
    console.error('Admin update flashcard set error:', err);
    res.status(500).json({ message: 'Cập nhật thất bại' });
  }
});

// XÓA FLASHCARD SET (ADMIN)
router.delete('/flashcard-sets/admin/:id', protect, admin, async (req, res) => {
  try {
    const set = await FlashcardSet.findById(req.params.id);
    if (!set) {
      return res.status(404).json({ message: 'Không tìm thấy' });
    }

    // Xóa flashcards nếu cần (tùy bạn có cascade delete hay không)
    await FlashcardSet.findByIdAndDelete(req.params.id);

    res.json({ message: 'Đã xóa bộ flashcard thành công' });
  } catch (err) {
    console.error('Admin delete flashcard set error:', err);
    res.status(500).json({ message: 'Xóa thất bại' });
  }
});

// ==================== THANH TOÁN ====================
router.get('/payments', protect, admin, async (req, res) => {
  try {
    let payments = await Payment.find({})
      .sort({ createdAt: -1 })
      .lean();

    payments = await Promise.all(
      payments.map(async (p) => {
        let userInfo = { name: 'Unknown', email: 'N/A', _id: p.userId };
        if (p.userId) {
          const user = await User.findById(p.userId).select('name email').lean();
          if (user) {
            userInfo = { ...user, _id: p.userId };
          }
        }
        return {
          ...p,
          userId: userInfo
        };
      })
    );

    res.json(payments);
  } catch (err) {
    console.error('Lỗi lấy payments:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;