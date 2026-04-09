const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/users/me
 * Get current user profile
 */
router.get('/me', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, unique_id, display_name, public_key, last_seen, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch profile' } });
  }
});

/**
 * PATCH /api/users/me
 * Update display name (encrypted client-side)
 */
router.patch(
  '/me',
  [body('displayName').optional().isLength({ max: 50 })],
  async (req, res) => {
    try {
      const { displayName } = req.body;

      await pool.query(
        'UPDATE users SET display_name = $1 WHERE id = $2',
        [displayName, req.userId]
      );

      res.json({ success: true, message: 'Profile updated' });
    } catch (err) {
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update profile' } });
    }
  }
);

/**
 * GET /api/users/lookup/:uniqueId
 * Look up a user by their unique ID (for starting conversations)
 */
router.get('/lookup/:uniqueId', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT unique_id, display_name, public_key FROM users WHERE unique_id = $1 AND status = 'active'",
      [req.params.uniqueId.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Lookup failed' } });
  }
});

/**
 * POST /api/users/block/:uniqueId
 */
router.post('/block/:uniqueId', async (req, res) => {
  try {
    const target = await pool.query(
      'SELECT id FROM users WHERE unique_id = $1',
      [req.params.uniqueId.toUpperCase()]
    );

    if (target.rows.length === 0) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }

    await pool.query(
      'INSERT INTO blocked_users (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.userId, target.rows[0].id]
    );

    res.json({ success: true, message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Block failed' } });
  }
});

/**
 * DELETE /api/users/block/:uniqueId
 */
router.delete('/block/:uniqueId', async (req, res) => {
  try {
    const target = await pool.query(
      'SELECT id FROM users WHERE unique_id = $1',
      [req.params.uniqueId.toUpperCase()]
    );

    if (target.rows.length === 0) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }

    await pool.query(
      'DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2',
      [req.userId, target.rows[0].id]
    );

    res.json({ success: true, message: 'User unblocked' });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Unblock failed' } });
  }
});

module.exports = router;
