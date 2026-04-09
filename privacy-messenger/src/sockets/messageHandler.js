const jwt = require('jsonwebtoken');
const MessageService = require('../services/messageService');
const { pool } = require('../config/database');
require('dotenv').config();

// In-memory presence tracking (Redis in production)
const onlineUsers = new Map(); // userId -> Set<socketId>

function setupSocketHandlers(io) {
  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`[WS] User connected: ${userId} (socket: ${socket.id})`);

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join user's conversation rooms
    await joinUserRooms(socket, userId);

    // Broadcast online status to contacts
    broadcastPresence(io, userId, true);

    // ─── EVENT HANDLERS ───────────────────────────

    /**
     * Send a message
     * Client sends encrypted body, server relays to recipient
     */
    socket.on('message:send', async (data, callback) => {
      try {
        const { conversationId, encryptedBody, messageType, replyToId, expiresAt } = data;

        const message = await MessageService.sendMessage({
          conversationId,
          senderId: userId,
          encryptedBody,
          messageType: messageType || 'text',
          replyToId,
          expiresAt,
        });

        // Emit to all participants in the conversation (including sender for multi-device)
        io.to(`conv:${conversationId}`).emit('message:new', {
          ...message,
          encryptedBody, // Include the encrypted body for the recipient
        });

        if (callback) callback({ success: true, data: message });
      } catch (err) {
        console.error('[WS] Message send error:', err.message || err);
        if (callback) callback({ success: false, error: err.message || 'Send failed' });
      }
    });

    /**
     * Message delivered acknowledgment
     */
    socket.on('message:delivered', async ({ messageId, conversationId }) => {
      try {
        await MessageService.updateMessageStatus(messageId, userId, 'delivered');
        socket.to(`conv:${conversationId}`).emit('message:status', {
          messageId,
          status: 'delivered',
          userId,
        });
      } catch (err) {
        console.error('[WS] Delivery receipt error:', err);
      }
    });

    /**
     * Message read acknowledgment
     */
    socket.on('message:read', async ({ messageId, conversationId }) => {
      try {
        await MessageService.updateMessageStatus(messageId, userId, 'read');
        socket.to(`conv:${conversationId}`).emit('message:status', {
          messageId,
          status: 'read',
          userId,
        });
      } catch (err) {
        console.error('[WS] Read receipt error:', err);
      }
    });

    /**
     * Typing indicator
     */
    socket.on('typing:start', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing:update', {
        userId,
        conversationId,
        isTyping: true,
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing:update', {
        userId,
        conversationId,
        isTyping: false,
      });
    });

    /**
     * Check if a user is online
     */
    socket.on('presence:check', ({ targetUserId }, callback) => {
      const isOnline = onlineUsers.has(targetUserId) && onlineUsers.get(targetUserId).size > 0;
      if (callback) callback({ userId: targetUserId, online: isOnline });
    });

    /**
     * Message deleted
     */
    socket.on('message:delete', async ({ messageId, conversationId }, callback) => {
      try {
        await MessageService.deleteMessage(messageId, userId);
        io.to(`conv:${conversationId}`).emit('message:deleted', { messageId, conversationId });
        if (callback) callback({ success: true });
      } catch (err) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // ─── DISCONNECT ───────────────────────────────

    socket.on('disconnect', () => {
      console.log(`[WS] User disconnected: ${userId} (socket: ${socket.id})`);

      if (onlineUsers.has(userId)) {
        onlineUsers.get(userId).delete(socket.id);
        if (onlineUsers.get(userId).size === 0) {
          onlineUsers.delete(userId);
          broadcastPresence(io, userId, false);

          // Update last_seen in DB
          pool.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [userId]).catch(() => {});
        }
      }
    });
  });
}

/**
 * Join socket to all conversation rooms the user belongs to
 */
async function joinUserRooms(socket, userId) {
  try {
    const result = await pool.query(
      'SELECT conversation_id FROM conversation_participants WHERE user_id = $1',
      [userId]
    );

    for (const row of result.rows) {
      socket.join(`conv:${row.conversation_id}`);
    }
  } catch (err) {
    console.error('[WS] Error joining rooms:', err);
  }
}

/**
 * Broadcast presence change to user's contacts
 */
async function broadcastPresence(io, userId, isOnline) {
  try {
    // Find all users who share a conversation with this user
    const result = await pool.query(
      `SELECT DISTINCT cp2.user_id FROM conversation_participants cp1
       JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
       WHERE cp1.user_id = $1 AND cp2.user_id != $1`,
      [userId]
    );

    for (const row of result.rows) {
      const contactSockets = onlineUsers.get(row.user_id);
      if (contactSockets) {
        for (const socketId of contactSockets) {
          io.to(socketId).emit('presence:update', { userId, online: isOnline });
        }
      }
    }
  } catch (err) {
    console.error('[WS] Presence broadcast error:', err);
  }
}

module.exports = { setupSocketHandlers };
