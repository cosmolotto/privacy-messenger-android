const crypto = require('crypto');
const { pool } = require('../config/database');

// Character set: uppercase + digits, excluding confusable chars (0/O, 1/I/L)
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ID_LENGTH = 8;
const PREFIX = 'PRIV';

/**
 * Generate a cryptographically secure unique ID
 * Format: PRIV-XXXXXXXX (e.g., PRIV-7X9K2M4N)
 * 
 * Uses crypto.randomBytes for true randomness.
 * Collision probability: ~1 in 1.7 trillion per attempt
 */
function generateUniqueId() {
  const bytes = crypto.randomBytes(ID_LENGTH);
  let id = '';
  for (let i = 0; i < ID_LENGTH; i++) {
    id += CHARSET[bytes[i] % CHARSET.length];
  }
  return `${PREFIX}-${id}`;
}

/**
 * Generate device fingerprint from device info
 * This prevents one device from creating multiple accounts
 */
function generateDeviceFingerprint(deviceInfo) {
  const {
    platform = '',
    userAgent = '',
    screenResolution = '',
    timezone = '',
    language = '',
  } = deviceInfo;

  const raw = `${platform}|${userAgent}|${screenResolution}|${timezone}|${language}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Check if a device already has an account
 */
async function isDeviceRegistered(fingerprint) {
  const result = await pool.query(
    'SELECT id, unique_id FROM users WHERE device_fingerprint = $1 AND status = $2',
    [fingerprint, 'active']
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Ensure the generated unique ID doesn't collide
 * (astronomically unlikely but safety first)
 */
async function generateSafeUniqueId() {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const uniqueId = generateUniqueId();
    const exists = await pool.query(
      'SELECT id FROM users WHERE unique_id = $1',
      [uniqueId]
    );

    if (exists.rows.length === 0) return uniqueId;
    attempts++;
  }

  throw new Error('Failed to generate unique ID after max attempts');
}

module.exports = {
  generateUniqueId,
  generateDeviceFingerprint,
  isDeviceRegistered,
  generateSafeUniqueId,
};
