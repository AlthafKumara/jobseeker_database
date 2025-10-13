// middleware/upload.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// pastikan folder ada
const uploadDir = path.join(process.cwd(), 'uploads/profile_photos');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

// validasi file type & size
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) cb(null, true);
  else cb(new Error('Only images are allowed (jpeg, jpg, png)'));
};

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // max 2 MB
  fileFilter
});

export default upload;
