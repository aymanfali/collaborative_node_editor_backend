import multer from 'multer';
import fs from 'fs';
import path from 'path';

const AVATARS_DIR = path.join(process.cwd(), 'uploads', 'avatars');

function ensureDirs() {
  try {
    fs.mkdirSync(AVATARS_DIR, { recursive: true });
  } catch (_) {}
}

ensureDirs();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, AVATARS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '');
    const stamp = Date.now();
    cb(null, `${base || 'avatar'}_${stamp}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'));
  }
  cb(null, true);
}

export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB limit
}).single('avatar');
