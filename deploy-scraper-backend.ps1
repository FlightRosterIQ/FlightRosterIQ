# Deploy Scraper-Enabled Backend to VPS
Write-Host "🚀 Deploying Scraper-Enabled Backend to VPS..." -ForegroundColor Cyan
Write-Host ""

$VPS_IP = "157.245.126.24"
$VPS_USER = "root"
$BACKEND_DIR = "/root/crew-schedule-backend"

Write-Host "📦 Step 1: Uploading backend files..." -ForegroundColor Yellow
Write-Host "Note: You'll need to enter your VPS password" -ForegroundColor Gray
Write-Host ""

scp backend/package.json "${VPS_USER}@${VPS_IP}:${BACKEND_DIR}/package.json"
scp backend/server.js "${VPS_USER}@${VPS_IP}:${BACKEND_DIR}/server.js"

Write-Host ""
Write-Host "📦 Step 2: Installing Puppeteer on VPS..." -ForegroundColor Yellow
Write-Host "Note: This may take 2-5 minutes" -ForegroundColor Gray
Write-Host ""

ssh "${VPS_USER}@${VPS_IP}" "cd ${BACKEND_DIR} && npm install"

Write-Host ""
Write-Host "🔄 Step 3: Restarting backend service..." -ForegroundColor Yellow
Write-Host ""

ssh "${VPS_USER}@${VPS_IP}" "pm2 restart crew-backend"

Write-Host ""
Write-Host "✅ Step 4: Checking backend status..." -ForegroundColor Yellow
Write-Host ""

ssh "${VPS_USER}@${VPS_IP}" "pm2 status crew-backend"

Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host ""

Start-Sleep -Seconds 3

$response = Invoke-WebRequest -Uri "http://${VPS_IP}:8080/api/health" -UseBasicParsing
Write-Host "Health Check:" -ForegroundColor Green
Write-Host $response.Content
Write-Host ""

Write-Host "✨ Backend Features Enabled:" -ForegroundColor Cyan
Write-Host "   ✅ Real crew portal authentication" -ForegroundColor Green
Write-Host "   ✅ Automatic schedule scraping" -ForegroundColor Green
Write-Host "   ✅ Live schedule sync" -ForegroundColor Green
