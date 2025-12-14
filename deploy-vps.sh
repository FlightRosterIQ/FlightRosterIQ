#!/bin/bash
# VPS Deployment Script for ZenRows Integration
# Run this on your VPS at 157.245.126.24

echo "🚀 Deploying ZenRows Scraper Integration..."

# Navigate to project directory
cd /root || exit

# Pull latest code
echo "📥 Pulling latest code from GitHub..."
git pull origin main

# Install axios if not already installed
echo "📦 Installing dependencies..."
npm install axios

# Set ZenRows API Key (already embedded in code, but can override via env)
export ZENROWS_API_KEY="65928336a6006dd32a2bdf37c19e9ae0e81d4ce5"

# Kill old server process
echo "🛑 Stopping old server..."
pkill -f "node fixed-server-v2.js"

# Wait a moment
sleep 2

# Start new server in background
echo "▶️ Starting server with ZenRows integration..."
nohup node fixed-server-v2.js > server.log 2>&1 &

# Get new process ID
NEW_PID=$(pgrep -f "node fixed-server-v2.js")
echo "✅ Server started with PID: $NEW_PID"

# Show last few log lines
sleep 2
echo ""
echo "📋 Last log entries:"
tail -n 10 server.log

echo ""
echo "✨ Deployment complete!"
echo "🔍 Monitor logs with: tail -f /root/server.log"
echo "🔄 Check status with: ps aux | grep node"
echo "🌐 Server running on port 8080"

# Setup SSL with Let's Encrypt (optional)
sudo apt install certbot python3-certbot-nginx -y
# sudo certbot --nginx -d your-domain.com

echo "✅ Deployment complete!"
echo "🌐 Access your app at: http://your-server-ip:3000"
echo "📊 Health check: http://your-server-ip:3000/health"