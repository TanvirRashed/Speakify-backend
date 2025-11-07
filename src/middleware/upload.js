import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

// Optional file filter (you can skip this if you want to allow all files)
const fileFilter = (req, file, cb) => {
  const allowed = [
    'audio/mpeg', 'audio/mp3', 'audio/wav',
    'audio/x-wav', 'audio/webm', 'audio/ogg',
    'audio/m4a', 'audio/x-m4a', 'audio/aac'
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Unsupported audio format'), false);
};

// Initialize Multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB limit
  }
});

export default upload;
