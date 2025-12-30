const mongoose = require('mongoose');

const flashcardSetSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPublic: { type: Boolean, default: false },
  tags: [String],
  level: { type: String },

  flashcards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Flashcard' }],

  // Trường mới: xác định flashcard set này được công khai cho những người dùng có gói plan nào
  // null: chỉ chủ sở hữu xem được (private)
  // "free": công khai cho tất cả người dùng (kể cả free)
  // "pro": công khai cho người dùng có gói pro trở lên
  // "premium": công khai cho premium trở lên
  // "master": công khai cho master trở lên
  // "lifetime": chỉ công khai cho lifetime (hoặc tùy logic bạn muốn)
  publicFor: {
    type: String,
    enum: [null, 'free', 'pro', 'premium', 'master', 'lifetime'],
    default: null
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Index để tối ưu truy vấn theo owner và tiêu đề
flashcardSetSchema.index({ owner: 1, title: 1 });

// Index hỗ trợ truy vấn các set công khai theo mức plan (nếu cần)
flashcardSetSchema.index({ publicFor: 1, isPublic: 1 });

module.exports = mongoose.model('FlashcardSet', flashcardSetSchema);