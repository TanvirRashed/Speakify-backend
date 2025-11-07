// src/services/openaiService.js
import 'dotenv/config';
import OpenAI from 'openai';
import fs from 'fs';

// --- Fail fast if key missing (clear error early) ---
const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('❌ OPENAI_API_KEY is missing. Ensure .env is loaded before importing openaiService.js');
  // Throwing here prevents mysterious crashes deeper in the stack
  throw new Error('OPENAI_API_KEY not set');
}

// --- Singleton client ---
export const openai = new OpenAI({ apiKey: API_KEY });

// Available voices for TTS (keep in sync with your frontend)
export const VOICES = [
  { id: 'alloy', name: 'Alloy' },
  { id: 'echo', name: 'Echo' },
  { id: 'fable', name: 'Fable' },
  { id: 'onyx', name: 'Onyx' },
  { id: 'nova', name: 'Nova' },
  { id: 'shimmer', name: 'Shimmer' },
];

/**
 * Text → Speech (MP3 buffer)
 * @param {string} text
 * @param {string} voice
 * @param {number} speed 0.25–4.0
 * @returns {Promise<Buffer>}
 */
export async function textToSpeech(text, voice = 'alloy', speed = 1.0) {
  try {
    const resp = await openai.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text,
      speed,
      format: 'mp3',
    });

    // SDK returns a web Response-like object; convert to Buffer
    const buffer = Buffer.from(await resp.arrayBuffer());
    return buffer;
  } catch (err) {
    console.error('OpenAI TTS Error:', err);
    // Normalize message
    const msg = err?.message || 'TTS conversion failed';
    throw new Error(`TTS conversion failed: ${msg}`);
  }
}

/**
 * Speech → Text (Whisper)
 * @param {string} filePath absolute or relative path to audio file
 * @returns {Promise<string>} transcript plain text
 */
export async function speechToText(filePath) {
  try {
    const resp = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      // Some SDK versions return {text}, others return the text when response_format='text'
      response_format: 'text',
    });

    // Handle both shapes safely
    const text = typeof resp === 'string' ? resp : (resp?.text ?? '');
    return text;
  } catch (err) {
    console.error('OpenAI Whisper Error:', err);
    const msg = err?.message || 'ASR conversion failed';
    throw new Error(`ASR conversion failed: ${msg}`);
  }
}

export default { textToSpeech, speechToText, VOICES };
