const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

function uploadBufferToCloudinary(buffer, originalName) {
  const sanitized = String(originalName || 'encrypted-file.bin').replace(/[^a-zA-Z0-9_.-]/g, '_');
  const publicId = `e2ee/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${sanitized}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        public_id: publicId,
        overwrite: false
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Encrypted file is required' });
  }

  const { originalType } = req.body;
  const normalizedType = String(originalType || '').toLowerCase().trim();

  if (!normalizedType.startsWith('image/') && normalizedType !== 'application/pdf') {
    return res.status(400).json({ message: 'Only encrypted image and PDF files are allowed' });
  }

  const result = await uploadBufferToCloudinary(req.file.buffer, req.file.originalname);

  return res.status(201).json({
    fileUrl: result.secure_url,
    bytes: result.bytes,
    publicId: result.public_id
  });
});

module.exports = router;