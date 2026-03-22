const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { runInference } = require('../lib/inference');

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file JPG/PNG yang diizinkan.'));
    }
  },
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: '✅ Server berjalan!',
    message: 'Potato Disease Detection API (Node.js + ONNX)',
  });
});

app.post('/predict', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ detail: 'Tidak ada gambar yang diunggah.' });
  }
  try {
    const result = await runInference(req.file.buffer);
    res.json(result);
  } catch (err) {
    console.error('Inference error:', err);
    res.status(500).json({ detail: `Gagal memproses gambar: ${err.message}` });
  }
});

app.use((err, req, res, next) => {
  if (err.message?.includes('JPG/PNG')) {
    return res.status(400).json({ detail: err.message });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ detail: 'Ukuran file melebihi batas 5MB.' });
  }
  res.status(500).json({ detail: err.message });
});

module.exports = app;
