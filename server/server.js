// const express = require('express');
// const cors = require('cors');
// const path = require('path');
// const mongoose = require('mongoose');
// const dotenv = require('dotenv');

// dotenv.config();
// const app = express();
// app.use(cors());
// app.use(express.json());

// // Static folder
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// // Add direct audio proxy route to ensure the endpoint exists and works reliably
// app.get('/api/jishoApi/audio', async (req, res) => {
//   const text = req.query.text;
//   if (!text || !String(text).trim()) {
//     return res.status(400).json({ error: 'Thiếu text để phát âm' });
//   }

//   const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ja&client=tw-ob`;

//   // Use global fetch if available, otherwise try node-fetch
//   let fetchFn = global.fetch;
//   if (!fetchFn) {
//     try {
//       fetchFn = require('node-fetch');
//     } catch (e) {
//       console.error('fetch không khả dụng và node-fetch không được tìm thấy');
//       return res.status(500).json({ error: 'Server không hỗ trợ fetch' });
//     }
//   }

//   try {
//     const response = await fetchFn(ttsUrl, {
//       headers: {
//         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
//       },
//     });

//     if (!response.ok) {
//       console.error('TTS fetch failed:', response.status);
//       return res.status(502).json({ error: 'Không thể lấy audio từ TTS' });
//     }

//     // Forward content-type and allow cross-origin for web audio
//     const contentType = response.headers.get ? response.headers.get('content-type') : response.headers['content-type'];
//     if (contentType) res.setHeader('Content-Type', contentType);
//     const contentLength = response.headers.get ? response.headers.get('content-length') : response.headers['content-length'];
//     if (contentLength) res.setHeader('Content-Length', contentLength);
//     res.setHeader('Access-Control-Allow-Origin', '*');

//     // response.body for node-fetch is a Node readable stream -> pipe to res
//     if (response.body && typeof response.body.pipe === 'function') {
//       response.body.pipe(res);
//       return;
//     }

//     // Fallback for web ReadableStream (attempt to read and write)
//     if (response.body && typeof response.body.getReader === 'function') {
//       const reader = response.body.getReader();
//       (async () => {
//         try {
//           while (true) {
//             const { done, value } = await reader.read();
//             if (done) break;
//             res.write(Buffer.from(value));
//           }
//         } catch (err) {
//           console.error('Error streaming TTS:', err);
//         } finally {
//           res.end();
//         }
//       })();
//       return;
//     }

//     // If no body -> error
//     res.status(500).json({ error: 'Không nhận được dữ liệu audio từ TTS' });
//   } catch (err) {
//     console.error('Lỗi khi proxy TTS:', err);
//     res.status(500).json({ error: 'Lỗi server khi lấy audio' });
//   }
// });

// // Import appRouter
// const chapterRoutes = require('./routes/chapters');
// const appRouter = require('./routes/appRouter');
// const authRouter = require('./routes/auth');
// const bookRoutes = require('./routes/books');
// const flashcardSetRoutes = require('./routes/flashcardSets');
// const shadowRouter = require('./routes/shadowRouter');
// app.use('/api/auth', authRouter);   // ← Đúng đường dẫn: /api/auth/register
// app.use('/api', appRouter);
// app.use('/api/chapters', chapterRoutes);
// app.use('/api/books', bookRoutes);
// app.use('/api/flashcard-sets', flashcardSetRoutes);
// app.use('/api/shadow', shadowRouter);
// // MongoDB connection
// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log('✅ MongoDB connected'))
//   .catch(err => console.log('❌ MongoDB error:', err));

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));


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

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// ======================
// FFmpeg path
// ======================
const FFMPEG_PATH = 'C:\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffmpeg.exe';
if (!fs.existsSync(FFMPEG_PATH)) {
  console.error('❌ Không tìm thấy ffmpeg.exe tại đường dẫn:', FFMPEG_PATH);
} else {
  console.log('✅ Đã tìm thấy ffmpeg.exe:', FFMPEG_PATH);
}

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

// ======================
// Static folder
// ======================
app.use('/uploads', express.static(uploadFolder));

// ======================
// TTS proxy
// ======================
app.get('/api/jishoApi/audio', async (req, res) => {
  const text = req.query.text;
  if (!text || !String(text).trim()) return res.status(400).json({ error: 'Thiếu text để phát âm' });

  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ja&client=tw-ob`;
  let fetchFn = global.fetch || require('node-fetch');

  try {
    const response = await fetchFn(ttsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) return res.status(502).json({ error: 'Không thể lấy audio từ TTS' });

    res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/mpeg');
    res.setHeader('Content-Length', response.headers.get('content-length') || 0);
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (response.body && typeof response.body.pipe === 'function') {
      response.body.pipe(res);
    } else {
      res.status(500).json({ error: 'Không nhận được dữ liệu audio từ TTS' });
    }
  } catch (err) {
    console.error('Lỗi khi proxy TTS:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy audio' });
  }
});

// ======================
// Spawn Python FastAPI server
// ======================
const PYTHON_SERVER_PORT = 8000;
const pythonProcess = spawn('python', [path.join(__dirname, 'modelAI', 'shadowAI_server.py')]);

pythonProcess.stdout.on('data', (data) => console.log('>>> PYTHON:', data.toString()));
pythonProcess.stderr.on('data', (data) => console.error('>>> PYTHON ERR:', data.toString()));
pythonProcess.on('close', (code) => console.log('>>> PYTHON EXIT CODE:', code));

// ======================
// Helper: chờ Python server sẵn sàng
// ======================
async function waitPythonServerReady(timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await axios.get(`http://127.0.0.1:${PYTHON_SERVER_PORT}/health`);
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error('Python server không phản hồi trong thời gian chờ');
}

// ======================
// Shadow AI: nhận file audio và câu
// POST /api/shadow/predict
// ======================
app.post('/api/shadow/predict', upload.single('audio'), async (req, res) => {
  const text = req.body.text;
  if (!req.file || !text) return res.status(400).json({ error: 'Thiếu audio hoặc text' });

  const audioPath = req.file.path;
  const wavPath = audioPath + '.wav';
  console.log('>>> FFMPEG CONVERT:', audioPath, '→', wavPath);

  const ffmpeg = spawn(FFMPEG_PATH, ['-y', '-i', audioPath, '-ac', '1', '-ar', '16000', wavPath]);

  let ffmpegError = '';
  ffmpeg.stderr.on('data', (d) => (ffmpegError += d.toString()));

  ffmpeg.on('close', async (code) => {
    fs.unlink(audioPath, () => {}); // xóa file gốc

    if (code !== 0) {
      console.error('FFMPEG EXIT CODE:', code, ffmpegError);
      return res.status(500).json({ error: 'Convert audio failed', detail: ffmpegError });
    }

    try {
      await waitPythonServerReady();

      const formData = new FormData();
      // ⚠️ Tên field phải trùng với FastAPI: file
      formData.append('file', fs.createReadStream(wavPath));
      formData.append('text', text);

      const response = await axios.post(`http://127.0.0.1:${PYTHON_SERVER_PORT}/predict`, formData, {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      res.json(response.data);
    } catch (err) {
      console.error('Lỗi khi gửi AI:', err);
      res.status(500).json({ error: 'Gửi file tới AI thất bại', detail: err.toString() });
    } finally {
      fs.unlink(wavPath, () => {}); // xóa file WAV sau khi xong
    }
  });
});

// ======================
// Import router
// ======================
const chapterRoutes = require('./routes/chapters');
const appRouter = require('./routes/appRouter');
const authRouter = require('./routes/auth');
const bookRoutes = require('./routes/books');
const flashcardSetRoutes = require('./routes/flashcardSets');
const shadowRouter = require('./routes/shadowRouter');

app.use('/api/auth', authRouter);
app.use('/api', appRouter);
app.use('/api/chapters', chapterRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/flashcard-sets', flashcardSetRoutes);
app.use('/api/shadow', shadowRouter);

// ======================
// MongoDB connection
// ======================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.log('❌ MongoDB error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
