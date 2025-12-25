# Production Deployment Script for FlightRosterIQ Backend (Windows)

Write-Host "🚀 FlightRosterIQ Backend - Production Deployment" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# VPS Configuration
$VPS_HOST = "157.245.126.24"
$VPS_USER = "root"
$DEPLOY_PATH = "/root/crew-schedule-backend"
$SERVICE_NAME = "flightrosteriq"

Write-Host "`n📦 Step 1: Preparing backend files..." -ForegroundColor Cyan
Set-Location backend

Write-Host "`n📤 Step 2: Uploading to VPS..." -ForegroundColor Cyan

# Create deployment directory
Write-Host "Creating remote directory..."
ssh "$VPS_USER@$VPS_HOST" "mkdir -p $DEPLOY_PATH"

# Upload backend files
Write-Host "Uploading files..."
scp server.js "$VPS_USER@$VPS_HOST`:$DEPLOY_PATH/"
scp sessionStore.js "$VPS_USER@$VPS_HOST`:$DEPLOY_PATH/"
scp logger.js "$VPS_USER@$VPS_HOST`:$DEPLOY_PATH/"
scp package.json "$VPS_USER@$VPS_HOST`:$DEPLOY_PATH/"
scp -r middleware "$VPS_USER@$VPS_HOST`:$DEPLOY_PATH/"

Write-Host "`n🔧 Step 3: Installing dependencies on VPS..." -ForegroundColor Cyan
ssh "$VPS_USER@$VPS_HOST" "cd $DEPLOY_PATH ; npm install --production"

Write-Host "`n📝 Step 4: Creating systemd service..." -ForegroundColor Cyan
$serviceContent = @"
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
"@

$serviceContent | ssh "$VPS_USER@$VPS_HOST" "cat > /etc/systemd/system/$SERVICE_NAME.service"

Write-Host "`n🔄 Step 5: Starting service..." -ForegroundColor Cyan
ssh "$VPS_USER@$VPS_HOST" @"
systemctl daemon-reload
systemctl enable $SERVICE_NAME
systemctl restart $SERVICE_NAME
systemctl status $SERVICE_NAME --no-pager
"@

Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Service Management Commands:" -ForegroundColor Yellow
Write-Host "  - View logs: ssh $VPS_USER@$VPS_HOST 'journalctl -u $SERVICE_NAME -f'"
Write-Host "  - Restart: ssh $VPS_USER@$VPS_HOST 'systemctl restart $SERVICE_NAME'"
Write-Host "  - Status: ssh $VPS_USER@$VPS_HOST 'systemctl status $SERVICE_NAME'"
Write-Host ""
Write-Host "🌐 Backend running at: http://$VPS_HOST`:8080" -ForegroundColor Cyan
Write-Host "📊 Health check: http://$VPS_HOST`:8080/api/health/detailed" -ForegroundColor Cyan
