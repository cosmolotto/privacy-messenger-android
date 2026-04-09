const express = require('express');
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/authService');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Validation helper
function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: errors.array() } });
    return false;
  }
  return true;
}

/**
 * POST /api/auth/register
 * Create a new account — returns unique ID + tokens
 */
router.post(
  '/register',
  [
    body('passphrase').isLength({ min: 8 }).withMessage('Passphrase must be at least 8 characters'),
    body('publicKey').notEmpty().withMessage('Public key is required'),
    body('deviceInfo').isObject().withMessage('Device info is required'),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;

    try {
      const result = await AuthService.register(req.body);

      res.status(201).json({
        success: true,
        message: 'Account created! Save your Unique ID — you will need it to recover your account.',
        data: result,
      });
    } catch (err) {
      if (err.code === 'DEVICE_ALREADY_REGISTERED') {
        return res.status(err.status).json({
          error: {
            code: err.code,
            message: err.message,
            existingId: err.uniqueId,
          },
        });
      }
      console.error('[Auth] Registration error:', err.message || err);
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Registration failed' } });
    }
  }
);

/**
 * POST /api/auth/login
 * Login with unique ID + passphrase
 */
router.post(
  '/login',
  [
    body('uniqueId').matches(/^PRIV-[A-Z0-9]{8}$/).withMessage('Invalid unique ID format'),
    body('passphrase').notEmpty().withMessage('Passphrase is required'),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;

    try {
      const result = await AuthService.login(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: { code: err.code, message: err.message } });
      }
      console.error('[Auth] Login error:', err.message || err);
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Login failed' } });
    }
  }
);

/**
 * POST /api/auth/recover
 * Recover account on a new device
 */
router.post(
  '/recover',
  [
    body('uniqueId').matches(/^PRIV-[A-Z0-9]{8}$/).withMessage('Invalid unique ID format'),
    body('passphrase').notEmpty().withMessage('Passphrase is required'),
    body('newPublicKey').notEmpty().withMessage('New public key is required'),
    body('newDeviceInfo').isObject().withMessage('New device info is required'),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;

    try {
      const result = await AuthService.recoverAccount(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: { code: err.code, message: err.message } });
      }
      console.error('[Auth] Recovery error:', err.message || err);
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Account recovery failed' } });
    }
  }
);

/**
 * POST /api/auth/refresh
 * Get new access token using refresh token
 */
router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  async (req, res) => {
    if (!validate(req, res)) return;

    try {
      const result = await AuthService.refreshAccessToken(req.body.refreshToken);
      res.json({ success: true, data: result });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: { code: err.code, message: err.message } });
      }
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Token refresh failed' } });
    }
  }
);

/**
 * POST /api/auth/logout
 */
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Logout failed' } });
  }
});

module.exports = router;
