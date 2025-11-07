import express from 'express';
import { getStats, getHistory, deleteHistory } from '../controllers/statsController.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getStats);
router.get('/history', authenticate, getHistory);
router.delete('/history/:id', authenticate, deleteHistory);

export default router;