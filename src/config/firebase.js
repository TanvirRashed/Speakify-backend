// src/config/firebase.js
import admin from 'firebase-admin';
import fs from 'fs';

function loadServiceAccount() {
  // 1) File path
  const pathVar = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (pathVar && fs.existsSync(pathVar)) {
    const raw = fs.readFileSync(pathVar, 'utf8');
    return JSON.parse(raw);
  }

  // 2) Base64-encoded JSON
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    const raw = Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(raw);
  }

  // 3) Raw JSON (must be ONE line, valid JSON)
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    // Trim to avoid BOM/whitespace issues
    const trimmed = json.trim();
    return JSON.parse(trimmed);
  }

  throw new Error(
    'No Firebase service account provided. Set one of FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_SERVICE_ACCOUNT_BASE64, or FIREBASE_SERVICE_ACCOUNT_JSON.'
  );
}

let serviceAccount;
try {
  serviceAccount = loadServiceAccount();
} catch (e) {
  console.error('❌ Failed to load Firebase service account:', e.message);
  throw e;
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('✅ Firebase Admin initialized');
}

export const firebaseAuth = admin.auth();
export default admin;
