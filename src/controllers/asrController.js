// src/controllers/asrController.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { speechToText } from '../services/openaiService.js';
import { uploadAudio } from '../services/cloudinaryService.js';
import { saveConversion } from '../models/queries.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_MIME = new Set([
  'audio/mpeg', 'audio/mp3',
  'audio/wav', 'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/m4a', 'audio/x-m4a', 'audio/aac'
]);

export const convertSpeechToText = async (req, res, next) => {
  let tempPath = null;

  try {
    const userId = req.user?.uid;
    const file = req.file;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!file) {
      return res.status(400).json({ success: false, message: 'Audio file is required (field name: audio)' });
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return res.status(400).json({ success: false, message: `Unsupported audio type: ${file.mimetype}` });
    }

    // Normalize to temp file on disk
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const ext = path.extname(file.originalname || '') || '.mp3';
    tempPath = path.join(uploadsDir, `asr-${Date.now()}${ext}`);

    if (file.buffer) {
      fs.writeFileSync(tempPath, file.buffer);
    } else if (file.path) {
      fs.copyFileSync(file.path, tempPath);
    } else {
      return res.status(400).json({ success: false, message: 'Unable to read uploaded file' });
    }

    // 1) Transcribe
    const transcript = await speechToText(tempPath, {
      mimetype: file.mimetype,
      originalname: file.originalname
    });

    // 2) Upload original audio
    const up = await uploadAudio(tempPath, process.env.CLOUDINARY_FOLDER || 'speakify');

    // 3) Persist
    const conversionData = {
      userId,
      type: 'asr',
      inputText: null,
      outputText: transcript,                               // ✅ store in the expected field
      audioUrl: up.secure_url || up.url,
      voice: null,
      speed: null,
      fileSize: Number.isFinite(up?.bytes) ? Number(up.bytes)
               : (Number.isFinite(file?.size) ? Number(file.size) : null),
      duration: Number.isFinite(up?.duration) ? Number(up.duration) : null
    };

    await saveConversion(conversionData);

    // 4) Respond for frontend
    return res.json({
      success: true,
      transcript,                                           // UI uses this
      audioUrl: up.secure_url || up.url,                    // UI uses this
      duration: conversionData.duration ?? null,
      fileSize: conversionData.fileSize ?? null,
      words: typeof transcript === 'string'
        ? transcript.trim().split(/\s+/).filter(Boolean).length
        : null
    });
  } catch (err) {
    console.error('ASR Controller Error:', err);
    next(err);
  } finally {
    try { if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
    try { if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch {}
  }
};

export default { convertSpeechToText };
