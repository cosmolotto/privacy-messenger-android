const { pool } = require('../src/config/database');
require('dotenv').config();

const migration = `
-- Push notification tokens
CREATE TABLE IF NOT EXISTS push_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fcm_token   TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- File metadata
CREATE TABLE IF NOT EXISTS files (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename    VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    mime_type   VARCHAR(100),
    size        BIGINT,
    url         TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_files_uploader ON files(uploader_id);
`;

async function run() {
  const client = await pool.connect();
  try {
    console.log('[Migration v2] Running...');
    await client.query(migration);
    console.log('[Migration v2] Push tokens + files tables created!');
  } catch (err) {
    console.error('[Migration v2] Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
