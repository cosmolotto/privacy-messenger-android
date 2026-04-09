const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { generateSafeUniqueId, generateDeviceFingerprint, isDeviceRegistered } = require('../utils/uniqueId');
require('dotenv').config();

class AuthService {
  /**
   * Register a new user
   * - One account per device (enforced by fingerprint)
   * - Passphrase is hashed, never stored in plain text
   * - Public key stored for E2E encryption key exchange
   */
  static async register({ passphrase, publicKey, deviceInfo, displayName }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Generate device fingerprint
      const fingerprint = generateDeviceFingerprint(deviceInfo);

      // Check if device already has an account
      const existingAccount = await isDeviceRegistered(fingerprint);
      if (existingAccount) {
        throw {
          status: 409,
          code: 'DEVICE_ALREADY_REGISTERED',
          message: 'This device already has an account',
          uniqueId: existingAccount.unique_id,
        };
      }

      // Generate unique ID
      const uniqueId = await generateSafeUniqueId();

      // Hash passphrase
      const salt = await bcrypt.genSalt(parseInt(process.env.ENCRYPTION_SALT_ROUNDS) || 12);
      const passphraseHash = await bcrypt.hash(passphrase, salt);

      // Create user
      const result = await client.query(
        `INSERT INTO users (unique_id, passphrase_hash, device_fingerprint, public_key, display_name)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, unique_id, display_name, created_at`,
        [uniqueId, passphraseHash, fingerprint, publicKey, displayName || null]
      );

      const user = result.rows[0];

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokenPair(user.id, deviceInfo, client);

      await client.query('COMMIT');

      return {
        user: {
          id: user.id,
          uniqueId: user.unique_id,
          displayName: user.display_name,
          createdAt: user.created_at,
        },
        accessToken,
        refreshToken,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Login with unique ID + passphrase
   */
  static async login({ uniqueId, passphrase, deviceInfo }) {
    // Find user
    const result = await pool.query(
      'SELECT id, unique_id, passphrase_hash, display_name, status FROM users WHERE unique_id = $1',
      [uniqueId.toUpperCase()]
    );

    if (result.rows.length === 0) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid ID or passphrase' };
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      throw { status: 403, code: 'ACCOUNT_SUSPENDED', message: 'Account is suspended' };
    }

    // Verify passphrase
    const isValid = await bcrypt.compare(passphrase, user.passphrase_hash);
    if (!isValid) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid ID or passphrase' };
    }

    // Update last seen
    await pool.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [user.id]);

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokenPair(user.id, deviceInfo);

    return {
      user: {
        id: user.id,
        uniqueId: user.unique_id,
        displayName: user.display_name,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Recover account on new device using unique ID + passphrase
   */
  static async recoverAccount({ uniqueId, passphrase, newDeviceInfo, newPublicKey }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verify credentials
      const result = await client.query(
        'SELECT id, passphrase_hash, status FROM users WHERE unique_id = $1',
        [uniqueId.toUpperCase()]
      );

      if (result.rows.length === 0) {
        throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid ID or passphrase' };
      }

      const user = result.rows[0];
      const isValid = await bcrypt.compare(passphrase, user.passphrase_hash);
      if (!isValid) {
        throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid ID or passphrase' };
      }

      // Update device fingerprint and public key for new device
      const newFingerprint = generateDeviceFingerprint(newDeviceInfo);
      await client.query(
        'UPDATE users SET device_fingerprint = $1, public_key = $2, last_seen = NOW() WHERE id = $3',
        [newFingerprint, newPublicKey, user.id]
      );

      // Revoke all old refresh tokens
      await client.query(
        'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
        [user.id]
      );

      // Generate new tokens
      const { accessToken, refreshToken } = await this.generateTokenPair(user.id, newDeviceInfo, client);

      await client.query('COMMIT');

      return { accessToken, refreshToken, message: 'Account recovered successfully' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Generate access + refresh token pair
   */
  static async generateTokenPair(userId, deviceInfo, existingClient) {
    const client = existingClient || await pool.connect();

    try {
      const accessToken = jwt.sign(
        { userId, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || '15m' }
      );

      const refreshToken = jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
      );

      // Store hashed refresh token
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await client.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, device_info, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [userId, tokenHash, JSON.stringify(deviceInfo || {}), expiresAt]
      );

      return { accessToken, refreshToken };
    } finally {
      if (!existingClient) client.release();
    }
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      const result = await pool.query(
        'SELECT id FROM refresh_tokens WHERE token_hash = $1 AND revoked = false AND expires_at > NOW()',
        [tokenHash]
      );

      if (result.rows.length === 0) {
        throw { status: 401, code: 'INVALID_TOKEN', message: 'Refresh token is invalid or expired' };
      }

      const accessToken = jwt.sign(
        { userId: decoded.userId, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || '15m' }
      );

      return { accessToken };
    } catch (err) {
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        throw { status: 401, code: 'INVALID_TOKEN', message: 'Refresh token is invalid' };
      }
      throw err;
    }
  }

  /**
   * Logout - revoke refresh token
   */
  static async logout(refreshToken) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await pool.query(
      'UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1',
      [tokenHash]
    );
  }
}

module.exports = AuthService;
