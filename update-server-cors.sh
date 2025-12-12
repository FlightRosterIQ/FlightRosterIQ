#!/bin/bash
# Update FlightRosterIQ server with CORS support

echo "🔄 Updating FlightRosterIQ server with CORS support..."

# Kill existing server
pkill -f "node.*crew-server.js" || true

# Copy new server file
cp crew-server-cors.js crew-server.js

# Start new server
echo "🚀 Starting updated server..."
nohup node crew-server.js > server.log 2>&1 &

echo "✅ Server updated and restarted"
echo "📡 Test health: http://157.245.126.24:8080/api/health"