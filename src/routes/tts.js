import express from 'express';
import { getVoices, convertTextToSpeech } from '../controllers/ttsController.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

router.get('/voices', getVoices);
router.post('/convert', authenticate, convertTextToSpeech);

export default router;