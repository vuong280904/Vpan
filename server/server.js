if (typeof globalThis.__extends === 'undefined') {
  globalThis.__extends = function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
}
// server.js – CHỈ SỬA 3 CHỖ, GIỮ NGUYÊN MỌI THỨ CỦA BẠN
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const Chat = require('./models/Chat');
const Message = require('./models/Message');

const app = express();
dotenv.config();

app.use(cors({
  origin: "*",
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== PHẦN TTS CỦA BẠN – GIỮ NGUYÊN 100% ====================
app.get('/api/jishoApi/audio', async (req, res) => {
  const text = req.query.text;
  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: 'Thiếu text để phát âm' });
  }

  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ja&client=tw-ob`;

  let fetchFn = global.fetch;
  if (!fetchFn) {
    try {
      fetchFn = require('node-fetch');
    } catch (e) {
      console.error('fetch không khả dụng và node-fetch không được tìm thấy');
      return res.status(500).json({ error: 'Server không hỗ trợ fetch' });
    }
  }

  try {
    const response = await fetchFn(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!response.ok) {
      console.error('TTS fetch failed:', response.status);
      return res.status(502).json({ error: 'Không thể lấy audio từ TTS' });
    }

    const contentType = response.headers.get ? response.headers.get('content-type') : response.headers['content-type'];
    if (contentType) res.setHeader('Content-Type', contentType);
    const contentLength = response.headers.get ? response.headers.get('content-length') : response.headers['content-length'];
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (response.body && typeof response.body.pipe === 'function') {
      response.body.pipe(res);
      return;
    }

    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
          }
        } catch (err) {
          console.error('Error streaming TTS:', err);
        } finally {
          res.end();
        }
      })();
      return;
    }

    res.status(500).json({ error: 'Không nhận được dữ liệu audio từ TTS' });
  } catch (err) {
    console.error('Lỗi khi proxy TTS:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy audio' });
  }
});

// ==================== ROUTES – GIỮ NGUYÊN ====================
const chapterRoutes = require('./routes/chapters');
const appRouter = require('./routes/appRouter');
const authRouter = require('./routes/auth');
const bookRoutes = require('./routes/books');
const flashcardSetRoutes = require('./routes/flashcardSets');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chat');

app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRouter);
app.use('/api', appRouter);
app.use('/api/chapters', chapterRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/flashcard-sets', flashcardSetRoutes);
app.use('/api/users', userRoutes);

// ==================== CHỈ SỬA 3 CHỖ DƯỚI ĐÂY ====================

// 1. XÓA DÒNG NÀY (bạn tạo 2 server)
// const server = http.createServer(app);   ← XÓA DÒNG NÀY

// 2. TẠO CHỈ 1 SERVER DUY NHẤT (cái sẽ gắn Socket.IO)
const httpServer = http.createServer(app);  // ← GIỮ LẠI DÒNG NÀY

// 3. GẮN SOCKET VÀO ĐÚNG SERVER + DÙNG httpServer ĐỂ LISTEN
const { initSocket } = require('./socket');
const io = initSocket(httpServer);     // ← Đúng server
app.set('io', io);

// ==================== KẾT NỐI MONGODB – GIỮ NGUYÊN ====================
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vpan')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB error:', err));

// ==================== LISTEN – CHỈ DÙNG httpServer VÀ CÓ '0.0.0.0' ====================
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {  // ← DÙNG httpServer, KHÔNG DÙNG server
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
  console.log(`Mobile dùng → http://192.168.2.6:${PORT}`);
  console.log(`Socket.IO sẵn sàng – KẾT NỐI TỪ ĐIỆN THOẠI 100% OK`);
});