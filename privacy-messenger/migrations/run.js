const { pool } = require('../src/config/database');
require('dotenv').config();

const migration = `
-- ============================================
-- PRIVACY MESSENGER - DATABASE SCHEMA
-- Zero-knowledge architecture: server stores
-- only encrypted blobs, never plaintext
-- ============================================

-- Users table: minimal data, maximum privacy
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_id       VARCHAR(16) UNIQUE NOT NULL,      -- Public-facing ID like "PRIV-7X9K2M4N"
    passphrase_hash VARCHAR(255) NOT NULL,             -- Bcrypt hash of user's passphrase
    device_fingerprint VARCHAR(255),                   -- SHA-256 of device info (prevents multi-account)
    public_key      TEXT NOT NULL,                     -- User's public encryption key
    display_name    VARCHAR(50),                       -- Optional display name (encrypted client-side)
    avatar_blob     TEXT,                              -- Optional avatar (encrypted)
    status          VARCHAR(20) DEFAULT 'active',      -- active, suspended, deleted
    last_seen       TIMESTAMP DEFAULT NOW(),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Refresh tokens for JWT rotation
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    device_info VARCHAR(255),
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    revoked     BOOLEAN DEFAULT false
);

-- Conversations (1-on-1 for MVP)
CREATE TABLE IF NOT EXISTS conversations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- Conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at       TIMESTAMP DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- Messages: server only stores encrypted blobs
CREATE TABLE IF NOT EXISTS messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_body  TEXT NOT NULL,                     -- E2E encrypted message content
    message_type    VARCHAR(20) DEFAULT 'text',        -- text, image, file, system
    status          VARCHAR(20) DEFAULT 'sent',        -- sent, delivered, read
    reply_to_id     UUID REFERENCES messages(id),      -- For reply threads
    created_at      TIMESTAMP DEFAULT NOW(),
    expires_at      TIMESTAMP                          -- Optional disappearing messages
);

-- Message read receipts
CREATE TABLE IF NOT EXISTS message_receipts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL,                  -- delivered, read
    timestamp   TIMESTAMP DEFAULT NOW(),
    UNIQUE(message_id, user_id, status)
);

-- Key exchange: stores encrypted session keys
CREATE TABLE IF NOT EXISTS key_exchanges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_key   TEXT NOT NULL,                      -- Session key encrypted with receiver's public key
    status          VARCHAR(20) DEFAULT 'pending',      -- pending, accepted, expired
    created_at      TIMESTAMP DEFAULT NOW(),
    expires_at      TIMESTAMP
);

-- Blocked users
CREATE TABLE IF NOT EXISTS blocked_users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_unique_id ON users(unique_id);
CREATE INDEX IF NOT EXISTS idx_users_device_fp ON users(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_key_exchanges_receiver ON key_exchanges(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_blocked_users ON blocked_users(blocker_id);

-- ============================================
-- AUTO-UPDATE timestamp trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE OR REPLACE TRIGGER conversations_updated
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
`;

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('[Migration] Starting...');
    await client.query(migration);
    console.log('[Migration] All tables created successfully!');
  } catch (err) {
    console.error('[Migration] Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(() => process.exit(1));
