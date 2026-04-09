#!/bin/bash
# ═══════════════════════════════════════════════════
# Privacy Messenger — Full Setup Script
# Run this on your Mac to get everything running
# ═══════════════════════════════════════════════════

set -e
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m"

echo -e "${GREEN}${BOLD}"
echo "╔═══════════════════════════════════════════════╗"
echo "║   🔒 Privacy Messenger — Setup Script         ║"
echo "╚═══════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── CHECK PREREQUISITES ─────────────────────────
echo -e "${BOLD}Checking prerequisites...${NC}"

command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js not found. Install from https://nodejs.org${NC}"; exit 1; }
command -v psql >/dev/null 2>&1 || { echo -e "${YELLOW}PostgreSQL not found. Install: brew install postgresql@15${NC}"; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}Node.js 18+ required. Current: $(node -v)${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# ─── SETUP BACKEND ───────────────────────────────
echo ""
echo -e "${BOLD}Setting up backend...${NC}"
cd privacy-messenger

if [ ! -f .env ]; then
  cp .env.example .env
  # Generate random secrets
  JWT_SECRET=$(openssl rand -hex 32)
  JWT_REFRESH_SECRET=$(openssl rand -hex 32)
  sed -i.bak "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/" .env
  sed -i.bak "s/your-refresh-secret-change-this-too/$JWT_REFRESH_SECRET/" .env
  rm -f .env.bak
  echo -e "${GREEN}✓ Generated .env with secure secrets${NC}"
fi

echo "Installing backend dependencies..."
npm install --silent 2>/dev/null
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Create database if it doesn't exist
if command -v createdb >/dev/null 2>&1; then
  createdb privacy_messenger 2>/dev/null && echo -e "${GREEN}✓ Database created${NC}" || echo -e "${YELLOW}Database already exists (OK)${NC}"
fi

# Run migrations
echo "Running database migrations..."
node migrations/run.js 2>/dev/null && echo -e "${GREEN}✓ Migration v1 complete${NC}" || echo -e "${YELLOW}Migration v1 skipped (already run)${NC}"
node migrations/v2_push_files.js 2>/dev/null && echo -e "${GREEN}✓ Migration v2 complete${NC}" || echo -e "${YELLOW}Migration v2 skipped (already run)${NC}"

cd ..

# ─── SETUP FRONTEND ──────────────────────────────
echo ""
echo -e "${BOLD}Setting up frontend...${NC}"
cd privacy-messenger-app

echo "Installing frontend dependencies..."
npm install --silent 2>/dev/null
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

cd ..

# ─── DONE ────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}"
echo "╔═══════════════════════════════════════════════╗"
echo "║   ✓ Setup Complete!                           ║"
echo "╠═══════════════════════════════════════════════╣"
echo "║                                               ║"
echo "║   To start the backend:                       ║"
echo "║   cd privacy-messenger && npm run dev         ║"
echo "║                                               ║"
echo "║   To start the frontend (new terminal):       ║"
echo "║   cd privacy-messenger-app && npm run dev     ║"
echo "║                                               ║"
echo "║   Backend:  http://localhost:8082              ║"
echo "║   Frontend: http://localhost:3000              ║"
echo "║                                               ║"
echo "║   To build Android APK:                       ║"
echo "║   cd privacy-messenger-app                    ║"
echo "║   npm run build                               ║"
echo "║   npx cap add android                         ║"
echo "║   npx cap sync                                ║"
echo "║   npx cap open android                        ║"
echo "║                                               ║"
echo "╚═══════════════════════════════════════════════╝"
echo -e "${NC}"
