# 🔒 Privacy Messenger

A privacy-first encrypted messaging platform. Zero-knowledge architecture — the server never sees your messages.

## Core Concepts

- **Unique ID System**: Each user gets a `PRIV-XXXXXXXX` ID — no phone number, no email required
- **One Device, One Account**: Device fingerprinting prevents duplicate accounts
- **E2E Encryption**: Messages are encrypted client-side before sending; server only stores encrypted blobs
- **Zero Knowledge**: Server cannot read message content, ever

## Tech Stack

| Layer       | Technology                    |
|-------------|-------------------------------|
| API Server  | Node.js + Express             |
| Real-time   | Socket.io (WebSocket)         |
| Database    | PostgreSQL                    |
| Cache       | Redis (sessions, presence)    |
| Auth        | JWT (access + refresh tokens) |
| Encryption  | Signal Protocol (client-side) |

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+

### Setup

```bash
# Clone and install
cd privacy-messenger
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database URL and secrets

# Create database
createdb privacy_messenger

# Run migrations
npm run migrate

# Start development server
npm run dev
```

Server starts at `http://localhost:8082`

## API Endpoints

### Auth
| Method | Endpoint             | Description                    |
|--------|----------------------|--------------------------------|
| POST   | `/api/auth/register` | Create account → get unique ID |
| POST   | `/api/auth/login`    | Login with ID + passphrase     |
| POST   | `/api/auth/recover`  | Recover on new device          |
| POST   | `/api/auth/refresh`  | Refresh access token           |
| POST   | `/api/auth/logout`   | Logout                         |

### Users
| Method | Endpoint                     | Description         |
|--------|------------------------------|---------------------|
| GET    | `/api/users/me`              | Get your profile    |
| PATCH  | `/api/users/me`              | Update display name |
| GET    | `/api/users/lookup/:id`      | Look up a user      |
| POST   | `/api/users/block/:id`       | Block a user        |
| DELETE | `/api/users/block/:id`       | Unblock a user      |

### Conversations & Messages
| Method | Endpoint                              | Description        |
|--------|---------------------------------------|--------------------|
| POST   | `/api/conversations`                  | Start conversation |
| GET    | `/api/conversations`                  | List conversations |
| POST   | `/api/conversations/:id/messages`     | Send message       |
| GET    | `/api/conversations/:id/messages`     | Get messages       |
| DELETE | `/api/conversations/:cid/messages/:mid` | Delete message   |

### WebSocket Events

**Client → Server:**
- `message:send` — Send encrypted message
- `message:delivered` — Delivery receipt
- `message:read` — Read receipt
- `message:delete` — Delete message
- `typing:start` / `typing:stop` — Typing indicators
- `presence:check` — Check if user is online

**Server → Client:**
- `message:new` — New message received
- `message:status` — Status update (delivered/read)
- `message:deleted` — Message was deleted
- `typing:update` — Someone is typing
- `presence:update` — User came online/offline

## Project Structure

```
privacy-messenger/
├── src/
│   ├── server.js              # Entry point
│   ├── config/
│   │   ├── database.js        # PostgreSQL connection
│   │   └── redis.js           # Redis connection
│   ├── middleware/
│   │   └── auth.js            # JWT verification
│   ├── routes/
│   │   ├── auth.js            # Auth endpoints
│   │   ├── conversations.js   # Message endpoints
│   │   └── users.js           # User endpoints
│   ├── services/
│   │   ├── authService.js     # Auth logic
│   │   └── messageService.js  # Message logic
│   ├── sockets/
│   │   └── messageHandler.js  # WebSocket events
│   └── utils/
│       └── uniqueId.js        # ID generation
├── migrations/
│   └── run.js                 # Database schema
├── .env.example
├── package.json
└── README.md
```

## Security Notes

- All API keys / secrets go in `.env` — never commit this file
- Passphrase hashed with bcrypt (12 rounds)
- JWT access tokens expire in 15 minutes
- Refresh tokens stored hashed, revocable
- Rate limiting on auth endpoints (10 req/15min)
- CORS restricted to known origins in production
