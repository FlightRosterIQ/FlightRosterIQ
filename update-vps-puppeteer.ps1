# PowerShell script to update VPS Puppeteer configuration
# Updates fixed-server-v2.js with enhanced Puppeteer args and restarts the server

$VPS_HOST = "root@157.245.126.24"
$VPS_PASSWORD = "AbxCrew152780!a"
$SERVER_PATH = "/root/FlightRosterIQ"
$LOCAL_FILE = "fixed-server-v2.js"

Write-Host "🚀 Updating VPS Puppeteer Configuration..." -ForegroundColor Cyan

# Use SCP to copy the updated server file to VPS
Write-Host "📤 Uploading $LOCAL_FILE to VPS..." -ForegroundColor Yellow
scp "$LOCAL_FILE" "${VPS_HOST}:${SERVER_PATH}/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to upload file to VPS" -ForegroundColor Red
    exit 1
}

Write-Host "✅ File uploaded successfully" -ForegroundColor Green

# SSH into VPS and restart the server
Write-Host "🔄 Restarting server on VPS..." -ForegroundColor Yellow

$commands = @"
cd $SERVER_PATH
echo '🛑 Stopping existing server process...'
pkill -f 'node fixed-server-v2.js'
sleep 2
echo '🚀 Starting server with new configuration...'
nohup node fixed-server-v2.js > server.log 2>&1 &
sleep 3
echo '📊 Checking server status...'
ps aux | grep 'node fixed-server-v2.js' | grep -v grep
echo '📝 Last 20 lines of server log:'
tail -n 20 server.log
echo '✅ Server restart complete!'
"@

ssh $VPS_HOST $commands

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ VPS Puppeteer configuration updated and server restarted successfully!" -ForegroundColor Green
    Write-Host "📝 Check server logs with: ssh $VPS_HOST 'tail -f $SERVER_PATH/server.log'" -ForegroundColor Cyan
} else {
    Write-Host "⚠️ There may have been issues. Check the VPS manually." -ForegroundColor Yellow
}
