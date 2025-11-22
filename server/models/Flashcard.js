const flashcardSchema = new mongoose.Schema({
  question: { type: String, required: true },     // Mặt trước (VD: 食べる)
  answer: { type: String, required: true },       // Mặt sau (ăn, to eat)

  parentSet: { type: mongoose.Schema.Types.ObjectId, ref: 'FlashcardSet', required: true },

  // SRS Fields (SuperMemo 2+ algorithm)
  nextReviewDate: { type: Date, default: Date.now },
  interval: { type: Number, default: 1 },         // ngày
  easeFactor: { type: Number, default: 2.5 },
  timesReviewed: { type: Number, default: 0 },
  isLearned: { type: Boolean, default: false },   // Nếu user đánh "thuộc lòng"

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

flashcardSchema.index({ parentSet: 1 });
flashcardSchema.index({ nextReviewDate: 1 }); // Quan trọng cho query "thẻ cần ôn hôm nay"
export default mongoose.model('Flashcard', flashcardSchema);