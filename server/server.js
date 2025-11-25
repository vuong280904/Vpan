const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Static folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbConnected = dbState === 1;
  
  res.json({
    status: 'OK',
    server: 'running',
    database: dbConnected ? 'connected' : 'disconnected',
    dbState: dbState, // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    timestamp: new Date().toISOString()
  });
});

// Add direct audio proxy route to ensure the endpoint exists and works reliably
app.get('/api/jishoApi/audio', async (req, res) => {
  const text = req.query.text;
  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: 'Thiếu text để phát âm' });
  }

  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ja&client=tw-ob`;

  // Use global fetch if available, otherwise try node-fetch
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

    // Forward content-type and allow cross-origin for web audio
    const contentType = response.headers.get ? response.headers.get('content-type') : response.headers['content-type'];
    if (contentType) res.setHeader('Content-Type', contentType);
    const contentLength = response.headers.get ? response.headers.get('content-length') : response.headers['content-length'];
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Access-Control-Allow-Origin', '*');

    // response.body for node-fetch is a Node readable stream -> pipe to res
    if (response.body && typeof response.body.pipe === 'function') {
      response.body.pipe(res);
      return;
    }

    // Fallback for web ReadableStream (attempt to read and write)
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

    // If no body -> error
    res.status(500).json({ error: 'Không nhận được dữ liệu audio từ TTS' });
  } catch (err) {
    console.error('Lỗi khi proxy TTS:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy audio' });
  }
});

// Import appRouter
const chapterRoutes = require('./routes/chapters');
const appRouter = require('./routes/appRouter');
const authRouter = require('./routes/auth');
const bookRoutes = require('./routes/books');
const flashcardSetRoutes = require('./routes/flashcardSets');
const flashcardRoutes = require('./routes/flashcards');
app.use('/api/auth', authRouter);   // ← Đúng đường dẫn: /api/auth/register
app.use('/api', appRouter);
app.use('/api/chapters', chapterRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/flashcard-sets', flashcardSetRoutes);
app.use('/api/flashcards', flashcardRoutes);
// MongoDB connection
console.log('\n=== MONGODB CONNECTION ===');
console.log('MONGO_URI:', process.env.MONGO_URI ? 'CONFIGURED' : 'NOT CONFIGURED');

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log('Database name: vpan_app_db');
    console.log('Connection state:', mongoose.connection.readyState);
    console.log('=== CONNECTION READY ===\n');
  })
  .catch(err => {
    console.log('❌ MongoDB connection error:', err.message);
    console.log('Error code:', err.code);
    console.log('=== CONNECTION FAILED ===\n');
  });

// Log connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  Mongoose disconnected from MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.log('❌ Mongoose connection error:', err.message);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
