const { createClient } = require('redis');
require('dotenv').config();

let redisClient = null;

async function getRedisClient() {
  if (redisClient && redisClient.isOpen) return redisClient;

  redisClient = createClient({ url: process.env.REDIS_URL });

  redisClient.on('error', (err) => {
    console.error('[Redis] Error:', err.message);
  });

  redisClient.on('connect', () => {
    console.log('[Redis] Connected');
  });

  await redisClient.connect();
  return redisClient;
}

module.exports = { getRedisClient };
