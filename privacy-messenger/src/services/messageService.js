const { pool } = require('../config/database');

class MessageService {
  /**
   * Start a new 1-on-1 conversation
   * Checks: users aren't blocked, conversation doesn't already exist
   */
  static async createConversation(userId, targetUniqueId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Find target user
      const targetResult = await client.query(
        'SELECT id FROM users WHERE unique_id = $1 AND status = $2',
        [targetUniqueId.toUpperCase(), 'active']
      );

      if (targetResult.rows.length === 0) {
        throw { status: 404, code: 'USER_NOT_FOUND', message: 'User not found' };
      }

      const targetId = targetResult.rows[0].id;

      if (targetId === userId) {
        throw { status: 400, code: 'SELF_CONVERSATION', message: 'Cannot message yourself' };
      }

      // Check if blocked
      const blocked = await client.query(
        `SELECT id FROM blocked_users 
         WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
        [userId, targetId]
      );

      if (blocked.rows.length > 0) {
        throw { status: 403, code: 'USER_BLOCKED', message: 'Cannot start conversation' };
      }

      // Check if conversation already exists between these two users
      const existing = await client.query(
        `SELECT cp1.conversation_id FROM conversation_participants cp1
         INNER JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
         WHERE cp1.user_id = $1 AND cp2.user_id = $2`,
        [userId, targetId]
      );

      if (existing.rows.length > 0) {
        await client.query('COMMIT');
        return { conversationId: existing.rows[0].conversation_id, existing: true };
      }

      // Create new conversation
      const convResult = await client.query(
        'INSERT INTO conversations DEFAULT VALUES RETURNING id'
      );
      const conversationId = convResult.rows[0].id;

      // Add both participants
      await client.query(
        `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
        [conversationId, userId, targetId]
      );

      await client.query('COMMIT');

      return { conversationId, existing: false };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Send an encrypted message
   * Server only stores the encrypted blob — zero knowledge
   */
  static async sendMessage({ conversationId, senderId, encryptedBody, messageType = 'text', replyToId = null, expiresAt = null }) {
    // Verify sender is a participant
    const participant = await pool.query(
      'SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, senderId]
    );

    if (participant.rows.length === 0) {
      throw { status: 403, code: 'NOT_PARTICIPANT', message: 'You are not in this conversation' };
    }

    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, encrypted_body, message_type, reply_to_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, conversation_id, sender_id, message_type, status, reply_to_id, created_at, expires_at`,
      [conversationId, senderId, encryptedBody, messageType, replyToId, expiresAt]
    );

    // Update conversation timestamp
    await pool.query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [conversationId]
    );

    return result.rows[0];
  }

  /**
   * Get messages for a conversation (paginated)
   */
  static async getMessages(conversationId, userId, { limit = 50, before = null }) {
    // Verify participant
    const participant = await pool.query(
      'SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (participant.rows.length === 0) {
      throw { status: 403, code: 'NOT_PARTICIPANT', message: 'You are not in this conversation' };
    }

    let query = `
      SELECT m.id, m.sender_id, m.encrypted_body, m.message_type, m.status, 
             m.reply_to_id, m.created_at, m.expires_at,
             u.unique_id AS sender_unique_id, u.display_name AS sender_display_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
        AND (m.expires_at IS NULL OR m.expires_at > NOW())
    `;

    const params = [conversationId];

    if (before) {
      query += ` AND m.created_at < $${params.length + 1}`;
      params.push(before);
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows.reverse(); // Return in chronological order
  }

  /**
   * Get user's conversations list
   */
  static async getConversations(userId) {
    const result = await pool.query(
      `SELECT c.id, c.updated_at,
              u.unique_id AS other_user_unique_id,
              u.display_name AS other_user_display_name,
              u.last_seen AS other_user_last_seen,
              (SELECT COUNT(*) FROM messages m 
               WHERE m.conversation_id = c.id 
               AND m.sender_id != $1
               AND m.status = 'sent') AS unread_count,
              (SELECT m2.created_at FROM messages m2 
               WHERE m2.conversation_id = c.id 
               ORDER BY m2.created_at DESC LIMIT 1) AS last_message_at
       FROM conversations c
       JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
       JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id != $1
       JOIN users u ON cp2.user_id = u.id
       ORDER BY COALESCE(
         (SELECT m3.created_at FROM messages m3 WHERE m3.conversation_id = c.id ORDER BY m3.created_at DESC LIMIT 1),
         c.created_at
       ) DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Update message status (delivered, read)
   */
  static async updateMessageStatus(messageId, userId, status) {
    await pool.query(
      `INSERT INTO message_receipts (message_id, user_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id, status) DO NOTHING`,
      [messageId, userId, status]
    );

    // Update the message status itself
    if (status === 'read') {
      await pool.query(
        "UPDATE messages SET status = 'read' WHERE id = $1 AND sender_id != $2",
        [messageId, userId]
      );
    } else if (status === 'delivered') {
      await pool.query(
        "UPDATE messages SET status = CASE WHEN status = 'sent' THEN 'delivered' ELSE status END WHERE id = $1 AND sender_id != $2",
        [messageId, userId]
      );
    }
  }

  /**
   * Delete a message (for sender only)
   */
  static async deleteMessage(messageId, userId) {
    const result = await pool.query(
      'DELETE FROM messages WHERE id = $1 AND sender_id = $2 RETURNING id',
      [messageId, userId]
    );

    if (result.rows.length === 0) {
      throw { status: 404, code: 'MESSAGE_NOT_FOUND', message: 'Message not found or not yours' };
    }

    return { deleted: true };
  }
}

module.exports = MessageService;
