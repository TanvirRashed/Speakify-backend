// src/models/queries.js
import { pool } from '../config/database.js';

/**
 * Save conversion record to database
 */
export const saveConversion = async (conversionData) => {
  const {
    userId,
    type,
    inputText,
    outputText,
    audioUrl,
    voice,
    speed,
    fileSize,
    duration,
  } = conversionData;

  // ✅ Normalize numeric values safely for Postgres
  const speedNum =
    speed === null || speed === undefined || isNaN(Number(speed))
      ? null
      : Number(speed);

  const fileSizeNum =
    fileSize === null || fileSize === undefined || isNaN(Number(fileSize))
      ? null
      : Number(fileSize);

  const durationNum =
    duration === null || duration === undefined || isNaN(Number(duration))
      ? null
      : Number(duration);

  const query = `
    INSERT INTO conversions 
      (user_id, type, input_text, output_text, audio_url, voice, speed, file_size, duration)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const values = [
    userId,
    type,
    inputText || null,
    outputText || null,
    audioUrl || null,
    voice || null,
    speedNum,
    fileSizeNum,
    durationNum,
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Database insert error in saveConversion:', error);
    throw error;
  }
};

/**
 * Get user conversion history
 */
export const getUserConversions = async (userId, limit = 50, offset = 0) => {
  const query = `
    SELECT * FROM conversions
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `;

  try {
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  } catch (error) {
    console.error('❌ Database query error in getUserConversions:', error);
    throw error;
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async (userId) => {
  const queries = {
    total: `SELECT COUNT(*) AS count FROM conversions WHERE user_id = $1`,
    today: `
      SELECT COUNT(*) AS count FROM conversions 
      WHERE user_id = $1 
      AND DATE(created_at) = CURRENT_DATE
    `,
    storage: `
      SELECT COALESCE(SUM(file_size), 0) AS total_bytes 
      FROM conversions 
      WHERE user_id = $1 
      AND file_size IS NOT NULL
    `,
    byType: `
      SELECT type, COUNT(*) AS count 
      FROM conversions 
      WHERE user_id = $1 
      GROUP BY type
    `,
  };

  try {
    const [totalResult, todayResult, storageResult, typeResult] = await Promise.all([
      pool.query(queries.total, [userId]),
      pool.query(queries.today, [userId]),
      pool.query(queries.storage, [userId]),
      pool.query(queries.byType, [userId]),
    ]);

    const totalBytes = parseInt(storageResult.rows[0].total_bytes) || 0;
    const storageMB = (totalBytes / (1024 * 1024)).toFixed(2);

    const typeBreakdown = typeResult.rows.reduce(
      (acc, row) => {
        acc[row.type] = parseInt(row.count);
        return acc;
      },
      { tts: 0, asr: 0 }
    );

    return {
      totalConversions: parseInt(totalResult.rows[0].count),
      todayCount: parseInt(todayResult.rows[0].count),
      storageUsedMB: parseFloat(storageMB),
      ttsCount: typeBreakdown.tts,
      asrCount: typeBreakdown.asr,
    };
  } catch (error) {
    console.error('❌ Database stats error in getUserStats:', error);
    throw error;
  }
};

/**
 * Delete conversion by ID
 */
export const deleteConversion = async (id, userId) => {
  const query = `
    DELETE FROM conversions 
    WHERE id = $1 AND user_id = $2
    RETURNING *
  `;

  try {
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Database delete error in deleteConversion:', error);
    throw error;
  }
};

export default {
  saveConversion,
  getUserConversions,
  getUserStats,
  deleteConversion,
};
