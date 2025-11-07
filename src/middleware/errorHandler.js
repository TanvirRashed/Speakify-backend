// Centralized error handler for Express (ESM)
// Usage in server.js: app.use(errorHandler);

import multer from 'multer';

function normalizeStatus(err) {
  // Prefer explicit status on the error, else infer, else 500
  if (typeof err.status === 'number') return err.status;
  if (typeof err.statusCode === 'number') return err.statusCode;

  // Common mappings
  if (err instanceof multer.MulterError) return 400;
  if (err.name === 'UnauthorizedError') return 401;
  if (err.name === 'ValidationError') return 400;

  return 500;
}

function toPlainError(err, isProd = process.env.NODE_ENV === 'production') {
  const base = {
    success: false,
    message: err?.message || 'Internal Server Error',
  };

  // Only include stack/details in non-prod
  if (!isProd) {
    base.stack = err?.stack;
    if (err?.details) base.details = err.details;
  }

  // Optional: pass through known fields
  if (typeof err.code !== 'undefined') base.code = err.code;

  return base;
}

export default function errorHandler(err, req, res, next) {
  try {
    const status = normalizeStatus(err);

    // Log server-side (keep stack for debugging)
    if (status >= 500) {
      console.error('❌ Server Error:', err);
    } else {
      console.warn('⚠️  Client Error:', err?.message || err);
    }

    if (res.headersSent) {
      // If headers were already sent, delegate to Express
      return next(err);
    }

    res.status(status).json(toPlainError(err));
  } catch (handlerErr) {
    // Fallback if our handler itself throws
    console.error('Error in errorHandler:', handlerErr);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

// Optional: a tiny helper to create HTTP errors consistently
export function httpError(status, message, details) {
  const e = new Error(message || 'Error');
  e.status = status;
  if (details) e.details = details;
  return e;
}
