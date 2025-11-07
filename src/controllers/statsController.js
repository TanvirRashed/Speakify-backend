// src/controllers/statsController.js
import {
  getUserStats as dbGetUserStats,
  getUserConversions,
  deleteConversion
} from '../models/queries.js';

/**
 * GET /stats
 * Returns summary usage stats for the authenticated user
 */
export const getStats = async (req, res, next) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // queries.js already returns the shaped object:
    // { totalConversions, todayCount, storageUsedMB, ttsCount, asrCount }
    const stats = await dbGetUserStats(userId);

    res.json({ success: true, stats });
  } catch (err) {
    console.error('Stats Controller Error:', err);
    next(err);
  }
};

/**
 * GET /stats/history?page=&limit=
 * Returns paginated conversion history
 */
export const getHistory = async (req, res, next) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const page = Math.max(parseInt(req.query.page ?? '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? '10', 10), 1), 100);
    const offset = (page - 1) * limit;

    const items = await getUserConversions(userId, limit, offset);

    // We don't have a total count function exposed; you can add one later if needed.
    res.json({
      success: true,
      page,
      limit,
      history: items ?? []
    });
  } catch (err) {
    console.error('History Controller Error:', err);
    next(err);
  }
};

/**
 * DELETE /stats/history/:id
 * Deletes a single history record belonging to the user
 */
export const deleteHistory = async (req, res, next) => {
  try {
    const userId = req.user?.uid;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!id) {
      return res.status(400).json({ success: false, message: 'History id is required' });
    }

    const deletedRow = await deleteConversion(id, userId);

    if (!deletedRow) {
      return res.status(404).json({ success: false, message: 'History item not found' });
    }

    res.json({ success: true, message: 'History item deleted' });
  } catch (err) {
    console.error('Delete History Controller Error:', err);
    next(err);
  }
};

export default { getStats, getHistory, deleteHistory };
