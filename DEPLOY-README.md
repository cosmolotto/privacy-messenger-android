# 🔒 Privacy Messenger — Complete App

A privacy-first encrypted messaging platform. Ready to deploy.

## What's Inside

```
privacy-messenger/          ← Backend (Node.js + Express + Socket.io)
privacy-messenger-app/      ← Frontend (React + Vite PWA)
docker-compose.yml           ← One-command local setup
```

## Quick Start (Local Development)

### Option 1: Docker (Recommended)
```bash
docker-compose up --build
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:8082
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Option 2: Manual Setup

**Backend:**
```bash
cd privacy-messenger
npm install
cp .env.example .env          # Edit with your DB credentials
createdb privacy_messenger
npm run migrate
npm run dev                   # Starts on port 8082
```

**Frontend:**
```bash
cd privacy-messenger-app
npm install
npm run dev                   # Starts on port 3000
```

## Deploy to Railway

### Backend Service
1. Push `privacy-messenger/` to a GitHub repo
2. Create new Railway project → Deploy from GitHub
3. Add PostgreSQL plugin
4. Add Redis plugin
5. Set environment variables:
   - `PORT=8082`
   - `JWT_SECRET=<generate-a-strong-secret>`
   - `JWT_REFRESH_SECRET=<generate-another-secret>`
   - `DATABASE_URL` (auto-set by Railway PostgreSQL)
   - `REDIS_URL` (auto-set by Railway Redis)
6. Deploy!

### Frontend Service
1. Push `privacy-messenger-app/` to GitHub
2. Add another service in Railway → Deploy from GitHub
3. Set build command: `npm run build`
4. Set start command: `npx serve dist -s -p $PORT`
5. Set `VITE_API_URL` to your backend URL
6. Deploy!

### Alternative: Deploy Frontend to Vercel/Netlify
```bash
cd privacy-messenger-app
npm run build
# Upload dist/ folder to Vercel or Netlify
```

## Features

- **Unique ID System** — No phone, no email. Just PRIV-XXXXXXXX
- **One Account Per Device** — Device fingerprinting prevents spam
- **E2E Encryption Ready** — Architecture built for Signal Protocol
- **Real-time Messaging** — WebSocket-powered instant delivery
- **Read Receipts** — Sent → Delivered → Read indicators
- **Typing Indicators** — See when someone is typing
- **Online Presence** — Know who's available
- **Disappearing Messages** — Optional message expiry
- **Block Users** — Full blocking support
- **PWA** — Install on any device from the browser
- **Dark Theme** — Beautiful, privacy-focused dark UI

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 18 + Vite |
| Mobile | PWA (installable) + React Native ready |
| Backend | Node.js + Express |
| Real-time | Socket.io |
| Database | PostgreSQL |
| Cache | Redis |
| Auth | JWT + bcrypt |
| Encryption | Signal Protocol (client-side) |
| Deploy | Docker / Railway / Vercel |

## App Screens

1. **Welcome** — Create account or log in
2. **Registration** — 3-step flow → get your unique ID
3. **Login** — Unique ID + passphrase
4. **Chat List** — All conversations with unread badges
5. **Chat View** — Real-time messaging with E2E badge
6. **New Chat** — Start conversation with any unique ID
7. **Settings** — Profile, security, about
8. **Account Recovery** — Recover on a new device
