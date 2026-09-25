const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const createUploader = (subfolder) => {
  const dir = path.join(__dirname, `../../uploads/${subfolder}`);
  fs.mkdirSync(dir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXT.has(ext)) {
        cb(new Error('Only JPG, PNG, or WebP images are allowed'));
        return;
      }
      cb(null, true);
    },
  });
};

const upload = createUploader('customers');
const uploadLogo = createUploader('logos');
const uploadQrCode = createUploader('qrcodes');

module.exports = { upload, uploadLogo, uploadQrCode, createUploader };
