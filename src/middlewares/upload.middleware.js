import multer from 'multer';
import fs from 'fs';
import path from 'path';

const UPLOADS_ROOT = process.env.UPLOADS_ROOT || path.join(process.cwd(), 'uploads');
const AVATARS_SUBDIR = process.env.AVATARS_SUBDIR || 'avatars';
const AVATARS_DIR = path.join(UPLOADS_ROOT, AVATARS_SUBDIR);

function ensureDirs() {
  try {
    fs.mkdirSync(AVATARS_DIR, { recursive: true });
  } catch (_) { }
}
ensureDirs();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATARS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '');
    cb(null, `${base || 'avatar'}_${Date.now()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
  cb(null, true);
}

export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 },
}).single('avatar');
