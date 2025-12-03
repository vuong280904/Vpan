const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const { spawn } = require('child_process');
const axios = require('axios');
const FormData = require('form-data');
const http = require('http');

const app = express();
dotenv.config();

// app.use(cors({
//   origin: "*",
//   credentials: true
// }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ======================
// FFmpeg path
// ======================
const ffmpegPath = require('ffmpeg-static');
if (!ffmpegPath) console.warn('⚠️ FFmpeg không khả dụng từ ffmpeg-static');
else console.log('✅ FFmpeg path từ npm:', ffmpegPath);

const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const FFMPEG_PATH = require('ffmpeg-static');

// ======================
// Upload folder
// ======================
const uploadFolder = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });
app.use('/uploads', express.static(uploadFolder));

// ======================
// Health check
// ======================
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbConnected = dbState === 1;
  
  res.json({
    status: 'OK',
    server: 'running',
    database: dbConnected ? 'connected' : 'disconnected',
    dbState,
    timestamp: new Date().toISOString()
  });
});

// ======================
// TTS proxy
// ======================
// app.get('/api/jishoApi/audio', async (req, res) => {
//   const text = req.query.text;
//   if (!text || !String(text).trim()) return res.status(400).json({ error: 'Thiếu text để phát âm' });

//   const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ja&client=tw-ob`;
//   const fetch = global.fetch || require('node-fetch');

//   try {
//     const response = await fetch(ttsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
//     if (!response.ok) return res.status(502).json({ error: 'Không thể lấy audio từ TTS' });

//     res.set('Content-Type', 'audio/mpeg');
//     res.set('Access-Control-Allow-Origin', '*');
//     response.body.pipe(res);
//   } catch (err) {
//     console.error('Lỗi khi proxy TTS:', err);
//     res.status(500).json({ error: 'Lỗi server khi lấy audio' });
//   }
// });

// ======================
// Robust TTS proxy (replace previous /api/jishoApi/audio)
// ======================
const axiosLib = require('axios');
let googleTTSpkg = null;
try {
  googleTTSpkg = require('google-tts-api'); // optional, may help generate better URL
} catch (e) {
  // not installed, we'll build URL manually
}

app.get('/api/jishoApi/audio', async (req, res) => {
  const text = req.query.text;
  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: 'Thiếu text để phát âm' });
  }

  // Build upstream TTS URL (try google-tts-api if available for better compatibility)
  let ttsUrl;
  try {
    if (googleTTSpkg) {
      ttsUrl = googleTTSpkg.getAudioUrl(String(text), {
        lang: 'ja',
        slow: false,
        host: 'https://translate.google.com',
      });
    } else {
      ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(String(text))}&tl=ja&client=tw-ob`;
    }
  } catch (e) {
    console.error('[TTS proxy] build ttsUrl failed:', e);
    return res.status(500).json({ error: 'Không thể tạo URL TTS' });
  }

  try {
    const upstream = await axiosLib.get(ttsUrl, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        Accept: '*/*'
      },
      timeout: 15000,
      validateStatus: null,
    });

    if (upstream.status !== 200) {
      // read small preview from upstream (if possible) for debugging
      let bodyPreview = '';
      try {
        const stream = upstream.data;
        const chunks = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
          const len = chunks.reduce((s, c) => s + (c.length || c.byteLength || 0), 0);
          if (len > 4096) break;
        }
        bodyPreview = Buffer.concat(chunks).toString('utf8', 0, 1024);
      } catch (e) {
        bodyPreview = `<unable to read upstream body: ${e.message}>`;
      }

      console.error(`[TTS proxy] Upstream returned ${upstream.status} for text="${text}". preview:`, bodyPreview.slice(0,1000));
      return res.status(502).json({ error: 'Không thể lấy audio từ TTS', upstreamStatus: upstream.status });
    }

    // success: pipe audio stream to client
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (upstream.headers['content-length']) res.setHeader('Content-Length', upstream.headers['content-length']);

    upstream.data.pipe(res);

    upstream.data.on('error', (err) => {
      console.error('[TTS proxy] Stream error while piping upstream:', err);
      try { res.destroy(err); } catch (e) {}
    });
  } catch (err) {
    console.error('[TTS proxy] Unexpected error when fetching TTS:', err && err.message ? err.message : err);
    if (err.response) {
      try {
        const preview = await streamToString(err.response.data, 2000).catch(() => '<no body>');
        console.error('[TTS proxy] err.response.preview:', preview.slice(0,1000));
      } catch (e) {}
    }
    return res.status(500).json({ error: 'Lỗi server khi lấy audio', detail: err.message });
  }
});

// helper to read small portion of stream (for debugging)
async function streamToString(stream, maxBytes = 2048) {
  if (!stream) return '';
  const chunks = [];
  let read = 0;
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
    read += chunk.length || chunk.byteLength || 0;
    if (read >= maxBytes) break;
  }
  return Buffer.concat(chunks).toString('utf8');
}


// ======================
// Spawn Python FastAPI server
// ======================
const PYTHON_SERVER_PORT = 8000;
const pythonProcess = spawn('python', [path.join(__dirname, 'modelAI', 'shadowAI_server.py')]);

pythonProcess.stdout.on('data', (data) => console.log('>>> PYTHON:', data.toString().trim()));
pythonProcess.stderr.on('data', (data) => console.error('>>> PYTHON ERR:', data.toString().trim()));
pythonProcess.on('close', (code) => console.log(`>>> PYTHON EXIT CODE: ${code}`));

// ======================
// Helper: chờ Python server
// ======================
async function waitPythonServerReady(timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await axios.get(`http://127.0.0.1:${PYTHON_SERVER_PORT}/health`);
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  console.warn('Python server chưa sẵn sàng – vẫn tiếp tục chạy');
}

// ======================
// Shadow AI route
// ======================
app.post('/api/shadow/predict', upload.single('audio'), async (req, res) => {
  if (!req.file || !req.body.text) return res.status(400).json({ error: 'Thiếu audio hoặc text' });

  const audioPath = req.file.path;
  const wavPath = audioPath + '.wav';

  if (!fs.existsSync(FFMPEG_PATH)) {
    fs.unlinkSync(audioPath);
    return res.status(500).json({ error: 'FFmpeg không khả dụng trên server' });
  }

  const ffmpeg = spawn(FFMPEG_PATH, ['-y', '-i', audioPath, '-ac', '1', '-ar', '16000', '-f', 'wav', wavPath]);
  let ffmpegError = '';
  ffmpeg.stderr.on('data', (d) => ffmpegError += d.toString());

  ffmpeg.on('close', async (code) => {
    fs.unlinkSync(audioPath);
    if (code !== 0) {
      console.error('FFMPEG lỗi:', ffmpegError);
      if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
      return res.status(500).json({ error: 'Convert audio thất bại' });
    }

    try {
      await waitPythonServerReady();
      const formData = new FormData();
      formData.append('file', fs.createReadStream(wavPath));
      formData.append('text', req.body.text);

      const aiResponse = await axios.post(
        `http://127.0.0.1:${PYTHON_SERVER_PORT}/predict`,
        formData,
        { headers: formData.getHeaders(), timeout: 60000 }
      );

      res.json(aiResponse.data);
    } catch (err) {
      console.error('Lỗi gọi Python AI:', err.message);
      res.status(500).json({ error: 'AI server lỗi', detail: err.message });
    } finally {
      if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
    }
  });
});

// ======================
// Import routers
// ======================
const shadowRouter       = require('./routes/shadowRouter');
const chapterRoutes      = require('./routes/chapters');
const appRouter          = require('./routes/appRouter');
const authRouter         = require('./routes/auth');
const bookRoutes         = require('./routes/books');
const flashcardSetRoutes = require('./routes/flashcardSets');
const flashcardRoutes    = require('./routes/flashcards');
const userRoutes         = require('./routes/userRoutes');
const chatRoutes         = require('./routes/chat');
const adminRoutes = require('./routes/admin');

app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRouter);
app.use('/api', appRouter);
app.use('/api/chapters', chapterRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/flashcard-sets', flashcardSetRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/shadow', shadowRouter);
app.use('/api/users', userRoutes);

// ======================
// Admin debug
// ======================
const { protect, admin } = require('./middleware/authMiddleware');
const frontendPath = path.join(__dirname, 'public');

app.use('/admin', (req, res, next) => {
  console.log('\n===== ADMIN ROUTE DEBUG =====');
  console.log('Request URL:', req.originalUrl);
  console.log('Authorization:', req.headers.authorization || 'No token');
  next();
});

app.get('/admin', protect, admin, (req, res) => {
  console.log('>>> ADMIN PAGE ACCESS');
  console.log('User email:', req.user?.email);
  console.log('User role:', req.user?.role);
  res.sendFile(path.join(frontendPath, 'admin.html'));
});

app.get('/', (req, res) => {
  console.log('\n>>> INDEX PAGE ACCESS');
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ======================
// Socket.IO server
// ======================
const httpServer = http.createServer(app);
const { initSocket } = require('./socket');
const io = initSocket(httpServer);
app.set('io', io);

// ======================
// MongoDB connection
// ======================
console.log('\n=== MONGODB CONNECTION ===');
console.log('MONGO_URI:', process.env.MONGO_URI ? 'CONFIGURED' : 'NOT CONFIGURED');

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vpan')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err.message));

mongoose.connection.on('connected', () => console.log('🔗 Mongoose connected'));
mongoose.connection.on('disconnected', () => console.log('⚠️ Mongoose disconnected'));
mongoose.connection.on('error', (err) => console.log('❌ Mongoose error:', err.message));

// ======================
// Start server
// ======================
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\nServer running at http://localhost:${PORT}`);
});
