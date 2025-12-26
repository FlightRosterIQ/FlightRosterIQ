#!/bin/bash

# FlightRosterIQ Backend Deployment Script
# Run this on your VPS (157.245.126.24)

echo "🚀 FlightRosterIQ Backend Deployment"
echo "======================================"

# Navigate to home directory
cd ~

# Clone or update repository
if [ -d "crew-schedule-app" ]; then
    echo "📂 Repository exists, pulling latest changes..."
    cd crew-schedule-app
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone https://github.com/FlightRosterIQ/FlightRosterIQ.git crew-schedule-app
    cd crew-schedule-app
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --production

# Create data directory
mkdir -p data

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Stop existing process if running
echo "🛑 Stopping existing backend..."
pm2 stop flightroster-backend 2>/dev/null || true
pm2 delete flightroster-backend 2>/dev/null || true

# Start backend
echo "✅ Starting backend server..."
pm2 start server.js --name flightroster-backend

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup

echo ""
echo "✅ Deployment complete!"
echo "🌐 Backend running on port 8081"
echo "📊 Check status: pm2 status"
echo "📋 View logs: pm2 logs flightroster-backend"
