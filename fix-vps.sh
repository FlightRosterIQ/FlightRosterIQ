#!/bin/bash

# VPS Fix Script - Set up git repository and restart server

echo "🔧 Fixing VPS server configuration..."

cd /root

# Check if fixed-server-v2.js exists
if [ ! -f "fixed-server-v2.js" ]; then
    echo "❌ fixed-server-v2.js not found! Please upload your server files first."
    exit 1
fi

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git remote add origin https://github.com/FlightRosterIQ/FlightRosterIQ.git
    git fetch origin
    git checkout -b main origin/main
else
    echo "✅ Git repository already initialized"
    echo "📥 Pulling latest code..."
    git pull origin main
fi

# Verify axios is installed
echo "📦 Verifying dependencies..."
npm install axios

# Check if server is running
if pgrep -f "node fixed-server-v2.js" > /dev/null; then
    echo "🛑 Stopping old server..."
    pkill -f "node fixed-server-v2.js"
    sleep 2
fi

# Check port 8080
echo "🔍 Checking port 8080..."
if netstat -tulpn | grep ":8080 " > /dev/null; then
    echo "⚠️ Port 8080 is in use by another process"
    netstat -tulpn | grep ":8080"
fi

# Check firewall
echo "🔥 Checking firewall rules..."
if command -v ufw &> /dev/null; then
    ufw allow 8080/tcp
    ufw status | grep 8080
fi

# Start server
echo "▶️ Starting server with ZenRows integration..."
nohup node fixed-server-v2.js > server.log 2>&1 &

NEW_PID=$!
echo "✅ Server started with PID: $NEW_PID"

# Wait and show logs
sleep 3
echo ""
echo "📋 Server logs:"
tail -n 15 server.log

echo ""
echo "🌐 Testing server connection..."
sleep 2

# Test if server is responding
if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
    echo "✅ Server is responding on port 8080"
else
    echo "⚠️ Server may not be responding on port 8080"
    echo "📋 Recent logs:"
    tail -n 20 server.log
fi

echo ""
echo "✨ Setup complete!"
echo "🔍 Monitor logs: tail -f /root/server.log"
echo "📊 Check process: ps aux | grep node"
echo "🌐 Test externally: curl http://157.245.126.24:8080/api/health"
