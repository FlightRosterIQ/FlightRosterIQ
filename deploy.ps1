# FlightRosterIQ Deployment Script for Windows
# Run this script to build and deploy your app

Write-Host "🚀 FlightRosterIQ Deployment Script" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$SCRIPT_DIR = "c:\Users\Pierre Coppersnake\crew-schedule-app"
$VPS_IP = "157.245.126.24"
$VPS_USER = "root"

# Step 1: Build the React app
Write-Host "📦 Step 1: Building React app..." -ForegroundColor Yellow
Write-Host ""

Set-Location $SCRIPT_DIR
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Build failed! Please fix errors and try again." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Build completed successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Upload server file
Write-Host "📤 Step 2: Uploading server file..." -ForegroundColor Yellow
Write-Host ""

scp "$SCRIPT_DIR\fixed-server-v2.js" "${VPS_USER}@${VPS_IP}:/root/"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Server file upload failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Server file uploaded!" -ForegroundColor Green
Write-Host ""

# Step 3: Upload dist folder
Write-Host "📤 Step 3: Uploading frontend files..." -ForegroundColor Yellow
Write-Host ""

# Upload index.html
scp "$SCRIPT_DIR\dist\index.html" "${VPS_USER}@${VPS_IP}:/root/dist/"

# Upload assets folder
scp -r "$SCRIPT_DIR\dist\assets\*" "${VPS_USER}@${VPS_IP}:/root/dist/assets/"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Frontend files upload failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Frontend files uploaded!" -ForegroundColor Green
Write-Host ""

# Step 4: Restart server
Write-Host "🔄 Step 4: Restarting server..." -ForegroundColor Yellow
Write-Host ""

ssh "${VPS_USER}@${VPS_IP}" "pm2 restart flightrosteriq || pm2 start /root/fixed-server-v2.js --name flightrosteriq"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "⚠️ Server restart had issues. Check manually." -ForegroundColor Yellow
} else {
    Write-Host "✅ Server restarted successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "✨ Deployment Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Your app is now live at:" -ForegroundColor White
Write-Host "   http://157.245.126.24:8080" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 What was deployed:" -ForegroundColor White
Write-Host "   ✅ Hotel checkout: 1.5hrs before next flight report" -ForegroundColor Green
Write-Host "   ✅ DH (deadhead) flights now showing" -ForegroundColor Green
Write-Host "   ✅ Reserve duty codes (FLX, R1-R5, SICK) display" -ForegroundColor Green
Write-Host "   ✅ Previous month caching enabled" -ForegroundColor Green
Write-Host "   ✅ Crew member details included" -ForegroundColor Green
Write-Host "   ✅ FlightAware shows 'not live' message" -ForegroundColor Green
Write-Host "   ✅ Month-specific schedule caching" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  HTTPS Still Required For:" -ForegroundColor Yellow
Write-Host "   • Geolocation (Nearby Crewmates)" -ForegroundColor Yellow
Write-Host "   • PWA Auto-Install" -ForegroundColor Yellow
Write-Host "   • Real FlightAware API" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔐 To Enable HTTPS:" -ForegroundColor White
Write-Host "   1. Upload setup-https.sh to your VPS" -ForegroundColor Cyan
Write-Host "   2. Run: sudo bash setup-https.sh" -ForegroundColor Cyan
Write-Host "   3. Follow the prompts" -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 See HTTPS_SETUP.md for detailed instructions" -ForegroundColor White
Write-Host ""
