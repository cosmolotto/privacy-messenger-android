const express = require('express');
const { pool } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * POST /api/push/register
 * Register FCM token for push notifications
 */
router.post('/register', async (req, res) => {
  const { fcmToken } = req.body;
  if (!fcmToken) {
    return res.status(400).json({ error: { code: 'NO_TOKEN', message: 'FCM token required' } });
  }

  try {
    // Upsert FCM token
    await pool.query(
      `INSERT INTO push_tokens (user_id, fcm_token) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET fcm_token = $2, updated_at = NOW()`,
      [req.userId, fcmToken]
    );

    res.json({ success: true, message: 'Push token registered' });
  } catch (err) {
    console.error('[Push] Register error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to register token' } });
  }
});

/**
 * Send push notification to a user
 * Called internally when a message is sent
 */
async function sendPushToUser(userId, notification) {
  try {
    const result = await pool.query(
      'SELECT fcm_token FROM push_tokens WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) return;

    const fcmToken = result.rows[0].fcm_token;

    // Using Firebase Admin SDK (install: npm i firebase-admin)
    // Uncomment when firebase-admin is configured:
    /*
    const admin = require('firebase-admin');
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        conversationId: notification.conversationId || '',
        senderName: notification.senderName || '',
        type: 'message',
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'messages',
        },
      },
      webpush: {
        headers: { Urgency: 'high' },
        notification: {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
        },
      },
    });
    */

    console.log(`[Push] Would send notification to user ${userId}`);
  } catch (err) {
    console.error('[Push] Send error:', err);
  }
}

module.exports = { router, sendPushToUser };
