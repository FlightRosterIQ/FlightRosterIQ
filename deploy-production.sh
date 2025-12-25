#!/bin/bash
# Production Deployment Script for FlightRosterIQ Backend

set -e  # Exit on error

echo "🚀 FlightRosterIQ Backend - Production Deployment"
echo "=================================================="

# VPS Configuration
VPS_HOST="157.245.126.24"
VPS_USER="root"
DEPLOY_PATH="/root/crew-schedule-backend"
SERVICE_NAME="flightrosteriq"

echo "📦 Step 1: Building backend..."
cd backend

echo "📤 Step 2: Uploading to VPS..."
ssh ${VPS_USER}@${VPS_HOST} "mkdir -p ${DEPLOY_PATH}"

# Upload backend files
scp -r *.js ${VPS_USER}@${VPS_HOST}:${DEPLOY_PATH}/
scp -r middleware ${VPS_USER}@${VPS_HOST}:${DEPLOY_PATH}/
scp package.json ${VPS_USER}@${VPS_HOST}:${DEPLOY_PATH}/

echo "🔧 Step 3: Installing dependencies on VPS..."
ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
cd /root/crew-schedule-backend
npm install --production
ENDSSH

echo "📝 Step 4: Creating systemd service..."
ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
cat > /etc/systemd/system/flightrosteriq.service << 'EOF'
[Unit]
Description=FlightRosterIQ Backend Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/crew-schedule-backend
Environment="NODE_ENV=production"
Environment="PORT=8080"
Environment="LOG_LEVEL=INFO"
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/flightrosteriq.log
StandardError=append:/var/log/flightrosteriq-error.log

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

# Enable service to start on boot
systemctl enable flightrosteriq

# Restart service
systemctl restart flightrosteriq

echo "✅ Service started!"
systemctl status flightrosteriq --no-pager
ENDSSH

echo "✅ Deployment complete!"
echo ""
echo "📊 Service Management Commands:"
echo "  - View logs: ssh ${VPS_USER}@${VPS_HOST} 'journalctl -u ${SERVICE_NAME} -f'"
echo "  - Restart: ssh ${VPS_USER}@${VPS_HOST} 'systemctl restart ${SERVICE_NAME}'"
echo "  - Status: ssh ${VPS_USER}@${VPS_HOST} 'systemctl status ${SERVICE_NAME}'"
echo ""
echo "🌐 Backend running at: http://${VPS_HOST}:8080"
echo "📊 Health check: http://${VPS_HOST}:8080/api/health/detailed"
