// src/middleware/auth.js
import { firebaseAuth } from '../config/firebase.js';

export default async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = await firebaseAuth.verifyIdToken(token);

    // Attach to request for controllers
    req.user = { uid: decoded.uid, email: decoded.email, ...decoded };
    next();
  } catch (err) {
    console.error('Auth error:', err?.message || err);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}
