// src/controllers/ttsController.js
import { textToSpeech, VOICES } from '../services/openaiService.js';
import { uploadAudio } from '../services/cloudinaryService.js';
import { saveConversion } from '../models/queries.js';
import fs from 'fs';
import path from 'path';

/**
 * Get available voices
 */
export const getVoices = async (req, res, next) => {
  try {
    res.json({
      success: true,
      voices: VOICES,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Convert text to speech
 */
export const convertTextToSpeech = async (req, res, next) => {
  let tempFilePath = null;

  try {
    const { text, voice = 'alloy', speed = 1.0 } = req.body;
    const userId = req.user?.uid;

    // Auth check
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Validation
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }

    if (text.length > 4000) {
      return res.status(400).json({ success: false, message: 'Text must be less than 4000 characters' });
    }

    if (!VOICES.find(v => v.id === voice)) {
      return res.status(400).json({ success: false, message: 'Invalid voice selection' });
    }

    const parsedSpeed = Number.parseFloat(speed);
    if (Number.isNaN(parsedSpeed) || parsedSpeed < 0.25 || parsedSpeed > 4.0) {
      return res.status(400).json({ success: false, message: 'Speed must be between 0.25 and 4.0' });
    }

    // Generate speech
    console.log('Generating speech for user:', userId);
    const audioBuffer = await textToSpeech(text, voice, parsedSpeed);

    // Save to temporary file
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    tempFilePath = path.join(uploadsDir, `tts-${Date.now()}.mp3`);
    fs.writeFileSync(tempFilePath, audioBuffer);

    // Upload to Cloudinary
    console.log('Uploading to Cloudinary...');
    const uploadResult = await uploadAudio(
      tempFilePath,
      process.env.CLOUDINARY_FOLDER || 'speakify'
    );

    // Prepare conversion record
const conversionData = {
  userId,
  type: 'tts',
  inputText: text,
  audioUrl: uploadResult.secure_url,
  voice,
  speed: parsedSpeed,
  fileSize: uploadResult.bytes,
  duration: Math.round(uploadResult.duration || 0) // ✅ round to integer
};


    // Save to DB
    await saveConversion(conversionData);

    // Respond
    return res.json({
      success: true,
      audioUrl: uploadResult.secure_url || uploadResult.url,
      duration: uploadResult.duration ?? null,
      fileSize: uploadResult.bytes ?? audioBuffer.length,
    });

  } catch (error) {
    console.error('TTS Controller Error:', error);
    next(error);
  } finally {
    // Always clean up temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch { /* ignore */ }
    }
  }
};

export default { getVoices, convertTextToSpeech };
