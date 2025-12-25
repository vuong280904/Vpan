// routes/chapters.js
const express = require('express');
const router = express.Router();
const Chapter = require('../models/Chapter');
const Book = require('../models/Book');

// POST: Thêm chapter mới
router.post('/', async (req, res) => {
  try {
    const { bookId, chapterNumber, title, illustration, content } = req.body;

    if (!bookId || !chapterNumber || !title || !illustration || content?.length === 0) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc!' });
    }

    const bookExists = await Book.findById(bookId);
    if (!bookExists) {
      return res.status(404).json({ message: 'Không tìm thấy sách (Book ID sai)' });
    }

    const existingChapter = await Chapter.findOne({ book: bookId, chapterNumber });
    if (existingChapter) {
      return res.status(400).json({ message: `Chương ${chapterNumber} đã tồn tại trong sách này!` });
    }

    const newChapter = new Chapter({
      book: bookId,
      chapterNumber,
      title,
      illustration,
      content,
    });

    await newChapter.save();

    // 👇 Cập nhật mảng chapters trong Book (thêm ID chapter mới)
    await Book.findByIdAndUpdate(
      bookId,
      { $push: { chapters: newChapter._id } },
      { new: true }
    );

    const populatedChapter = await Chapter.findById(newChapter._id).populate('book', 'title');
    res.status(201).json({
      message: 'Thêm chapter thành công!',
      chapter: populatedChapter
    });
  } catch (error) {
    console.error('Lỗi khi thêm chapter:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// GET: Lấy tất cả chapters (cho admin panel)
router.get('/', async (req, res) => {
  try {
    const chapters = await Chapter.find()
      .populate('book', 'title author level coverImage')
      .sort({ 'book.title': 1, chapterNumber: 1 });

    res.json(chapters);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách chapters:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// PATCH: Sửa chapter theo ID
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { bookId, chapterNumber, title, illustration, content } = req.body;

    if (!bookId && !chapterNumber && !title && illustration === undefined && !content) {
      return res.status(400).json({ message: 'Vui lòng cung cấp ít nhất một trường để cập nhật' });
    }

    const oldChapter = await Chapter.findById(id);
    if (!oldChapter) {
      return res.status(404).json({ message: 'Không tìm thấy chương để sửa' });
    }

    // Kiểm tra trùng chapterNumber nếu thay đổi
    if (chapterNumber && chapterNumber !== oldChapter.chapterNumber) {
      const targetBookId = bookId || oldChapter.book;
      const existing = await Chapter.findOne({
        book: targetBookId,
        chapterNumber,
        _id: { $ne: id }
      });
      if (existing) {
        return res.status(400).json({ message: `Chương ${chapterNumber} đã tồn tại trong sách này!` });
      }
    }

    // Nếu đổi sách → cập nhật mảng chapters ở cả sách cũ và sách mới
    if (bookId && bookId !== oldChapter.book.toString()) {
      // Xóa khỏi sách cũ
      await Book.findByIdAndUpdate(oldChapter.book, { $pull: { chapters: id } });
      // Thêm vào sách mới
      await Book.findByIdAndUpdate(bookId, { $push: { chapters: id } });
    }

    // Cập nhật chapter
    const updatedChapter = await Chapter.findByIdAndUpdate(
      id,
      {
        ...(bookId && { book: bookId }),
        ...(chapterNumber && { chapterNumber }),
        ...(title && { title }),
        ...(illustration !== undefined && { illustration }),
        ...(content && { content })
      },
      { new: true, runValidators: true }
    ).populate('book', 'title');

    if (!updatedChapter) {
      return res.status(404).json({ message: 'Không tìm thấy chương để cập nhật' });
    }

    res.json({
      message: 'Cập nhật chương thành công!',
      chapter: updatedChapter
    });
  } catch (error) {
    console.error('Lỗi khi sửa chapter:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// DELETE: Xóa chapter theo ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const chapter = await Chapter.findById(id);
    if (!chapter) {
      return res.status(404).json({ message: 'Không tìm thấy chương để xóa' });
    }

    const bookId = chapter.book;

    // Xóa chapter khỏi DB
    await Chapter.findByIdAndDelete(id);

    // 👇 Xóa ID chapter khỏi mảng chapters trong Book
    await Book.findByIdAndUpdate(
      bookId,
      { $pull: { chapters: id } },
      { new: true }
    );

    res.json({
      message: 'Xóa chương thành công!',
      deletedChapterId: id
    });
  } catch (error) {
    console.error('Lỗi khi xóa chapter:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

module.exports = router;