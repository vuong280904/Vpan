// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  avatarURL: { type: String },

  // Gamification
  studyStreak: { type: Number, default: 0 },
  lastStudyDate: { type: Date },
  badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],

  // Relations
  flashcardSets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FlashcardSet' }],

  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    default: 'student'
  },

  // === THÊM 2 TRƯỜNG MỚI ===
  // Mức độ tiếng Nhật hiện tại (N5 -> N1)
  level: {
    type: String,
    enum: ['N5', 'N4', 'N3', 'N2', 'N1', null], // cho phép null nếu chưa chọn
    default: null
  },

  // Người dùng biết đến app qua kênh nào
  sponsoredBy: {
    type: String,
    trim: true,
    default: null
    // Có thể thêm enum nếu bạn muốn giới hạn các giá trị cố định, ví dụ:
    // enum: ['Facebook', 'TikTok', 'Instagram', 'YouTube', 'Google', 'Friend', 'Other'],
  },
plan: {
    type: String,
    enum: ['free', 'pro', 'premium', 'master', 'lifetime'], // các giá trị có thể
    default: 'free'
  },

  // Nếu bạn muốn lưu thêm thời gian mua gói (đặc biệt hữu ích cho gói tháng/năm)
  planPurchasedAt: {
    type: Date,
    default: null
  },

  // Nếu gói có thời hạn (tháng/năm), có thể thêm expire date
  planExpiresAt: {
    type: Date,
    default: null
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userSchema.index({ email: 1 });

// ĐÚNG CÚ PHÁP COMMONJS — DÙNG module.exports
module.exports = mongoose.model('User', userSchema);