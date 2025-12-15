#!/bin/bash

# Quick VPS Update Script
echo "🔄 Updating VPS server..."

cd /root

# Check if git repo exists
if [ ! -d ".git" ]; then
    echo "📦 Setting up git repository..."
    git init
    git remote add origin https://github.com/FlightRosterIQ/FlightRosterIQ.git
    git fetch origin
    git checkout -b main origin/main
else
    echo "📥 Pulling latest code..."
    git pull origin main
fi

# Install/verify dependencies
echo "📦 Checking dependencies..."
npm install

# Stop old server
echo "🛑 Stopping old server..."
pkill -f "node fixed-server-v2.js"
sleep 2

# Check port 8080
echo "🔍 Checking port 8080..."
if netstat -tulpn 2>/dev/null | grep ":8080 "; then
    echo "⚠️ Port 8080 still in use, killing process..."
    fuser -k 8080/tcp 2>/dev/null || true
    sleep 2
fi

# Start new server
echo "▶️ Starting server..."
nohup node fixed-server-v2.js > server.log 2>&1 &
NEW_PID=$!

sleep 3

# Show status
echo ""
echo "✅ Server started with PID: $NEW_PID"
echo ""
echo "📋 Last 10 log lines:"
tail -n 10 server.log

echo ""
echo "🌐 Testing server..."
if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
    echo "✅ Server is responding!"
    curl -s http://localhost:8080/api/health | head -n 5
else
    echo "⚠️ Server not responding yet, check logs:"
    echo "   tail -f /root/server.log"
fi

echo ""
echo "✨ Update complete!"
