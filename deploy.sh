#!/bin/bash
# ================================================================
# UDAI WebApp - Linux Server Deploy Script
# Run this on your Linux server after git pull
# Usage: bash deploy.sh
# ================================================================

set -e  # Exit on any error

echo ""
echo "🚀 UDAI WebApp Deployment Starting..."
echo "========================================"

# ---- STEP 1: Check .env files ----
echo ""
echo "📋 Step 1: Checking .env files..."

if [ ! -f "./backend/.env" ]; then
  echo "❌ ERROR: ./backend/.env file is MISSING!"
  echo "   Create it with:"
  echo "   PORT=4000"
  echo "   MONGODB_URI=mongodb+srv://tripathishubh0099_db_user:d9jiY3MFftE5Luby@cluster0.uvehy1j.mongodb.net/?appName=Cluster0"
  echo "   MONGODB_DB_NAME=udai"
  exit 1
else
  echo "✅ ./backend/.env exists"
fi

if [ ! -f "./admin-main/backend/.env" ]; then
  echo "❌ ERROR: ./admin-main/backend/.env file is MISSING!"
  exit 1
else
  echo "✅ ./admin-main/backend/.env exists"
fi

# ---- STEP 2: Build main backend (TypeScript -> dist/) ----
echo ""
echo "📦 Step 2: Building main backend (TypeScript)..."
cd backend
npm install
npm run build
echo "✅ Backend built successfully (dist/server.js ready)"
cd ..

# ---- STEP 3: Build frontend ----
echo ""
echo "📦 Step 3: Building frontend..."
cd frontend
npm install
npm run build
echo "✅ Frontend built successfully (dist/ ready)"
cd ..

# ---- STEP 4: Install dependencies for admin-main backend ----
echo ""
echo "📦 Step 4: Installing admin-main backend dependencies..."
cd admin-main/backend
npm install
echo "✅ Admin backend dependencies installed"
cd ../..

# ---- STEP 5: Install dependencies for msg91-bridge-service ----
echo ""
echo "📦 Step 5: Installing msg91-bridge-service dependencies..."
cd msg91-bridge-service
npm install
echo "✅ MSG91 bridge dependencies installed"
cd ..

# ---- STEP 6: Restart PM2 processes ----
echo ""
echo "🔄 Step 6: Restarting PM2 processes..."

# Stop old processes if running
pm2 delete all 2>/dev/null || true

# Start fresh from ecosystem config
pm2 start ecosystem.config.cjs

# Save so auto-starts on reboot
pm2 save

echo ""
echo "📊 Current PM2 Status:"
pm2 status

# ---- STEP 7: Verify API is responding ----
echo ""
echo "🧪 Step 7: Verifying API (waiting 5 seconds for startup)..."
sleep 5

THERAPIST_RESPONSE=$(curl -s "http://localhost:4000/api/content/therapists")
echo "  /api/content/therapists response: $THERAPIST_RESPONSE"

if echo "$THERAPIST_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Backend API is responding correctly!"
else
  echo "❌ API not responding. Check logs with: pm2 logs main-backend"
fi

echo ""
echo "========================================"
echo "✅ Deployment complete!"
echo ""
echo "Quick commands:"
echo "  View all logs:          pm2 logs"
echo "  View backend logs:      pm2 logs main-backend --lines 50"
echo "  View admin logs:        pm2 logs admin-backend --lines 50"
echo "  Restart backend:        pm2 restart main-backend"
echo "  Check status:           pm2 status"
echo ""
