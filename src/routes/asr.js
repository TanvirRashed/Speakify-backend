import express from 'express';
import { convertSpeechToText } from '../controllers/asrController.js';
import authenticate from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.post('/convert', authenticate, upload.single('audio'), convertSpeechToText);

export default router;