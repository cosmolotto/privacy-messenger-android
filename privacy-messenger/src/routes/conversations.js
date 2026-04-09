const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const MessageService = require('../services/messageService');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All message routes require auth
router.use(authMiddleware);

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: errors.array() } });
    return false;
  }
  return true;
}

/**
 * POST /api/conversations
 * Start a new conversation with a user by their unique ID
 */
router.post(
  '/',
  [body('targetUniqueId').matches(/^PRIV-[A-Z0-9]{8}$/).withMessage('Invalid unique ID')],
  async (req, res) => {
    if (!validate(req, res)) return;

    try {
      const result = await MessageService.createConversation(req.userId, req.body.targetUniqueId);
      res.status(result.existing ? 200 : 201).json({ success: true, data: result });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: { code: err.code, message: err.message } });
      console.error('[Messages] Create conversation error:', err);
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create conversation' } });
    }
  }
);

/**
 * GET /api/conversations
 * Get user's conversation list
 */
router.get('/', async (req, res) => {
  try {
    const conversations = await MessageService.getConversations(req.userId);
    res.json({ success: true, data: conversations });
  } catch (err) {
    console.error('[Messages] Get conversations error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch conversations' } });
  }
});

/**
 * POST /api/conversations/:id/messages
 * Send an encrypted message
 */
router.post(
  '/:id/messages',
  [
    param('id').isUUID().withMessage('Invalid conversation ID'),
    body('encryptedBody').notEmpty().withMessage('Message body is required'),
    body('messageType').optional().isIn(['text', 'image', 'file']),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;

    try {
      const message = await MessageService.sendMessage({
        conversationId: req.params.id,
        senderId: req.userId,
        encryptedBody: req.body.encryptedBody,
        messageType: req.body.messageType,
        replyToId: req.body.replyToId,
        expiresAt: req.body.expiresAt,
      });

      res.status(201).json({ success: true, data: message });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: { code: err.code, message: err.message } });
      console.error('[Messages] Send message error:', err);
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to send message' } });
    }
  }
);

/**
 * GET /api/conversations/:id/messages
 * Get messages (paginated)
 */
router.get(
  '/:id/messages',
  [param('id').isUUID().withMessage('Invalid conversation ID')],
  async (req, res) => {
    if (!validate(req, res)) return;

    try {
      const messages = await MessageService.getMessages(req.params.id, req.userId, {
        limit: parseInt(req.query.limit) || 50,
        before: req.query.before || null,
      });

      res.json({ success: true, data: messages });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: { code: err.code, message: err.message } });
      console.error('[Messages] Get messages error:', err);
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch messages' } });
    }
  }
);

/**
 * DELETE /api/conversations/:convId/messages/:msgId
 * Delete a message (sender only)
 */
router.delete(
  '/:convId/messages/:msgId',
  [
    param('convId').isUUID(),
    param('msgId').isUUID(),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;

    try {
      const result = await MessageService.deleteMessage(req.params.msgId, req.userId);
      res.json({ success: true, data: result });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: { code: err.code, message: err.message } });
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to delete message' } });
    }
  }
);

module.exports = router;
