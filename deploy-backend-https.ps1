# Deploy FlightRosterIQ Backend with HTTPS Support
# Run this PowerShell script from your local machine

$VPS_HOST = "root@157.245.126.24"
$VPS_DIR = "/root/flightrosteriq-backend"
$LOCAL_BACKEND = "./backend"

Write-Host "Deploying FlightRosterIQ Backend with HTTPS..." -ForegroundColor Cyan

# Step 1: Copy backend files to VPS
Write-Host "`nUploading backend files..." -ForegroundColor Yellow
ssh $VPS_HOST "mkdir -p $VPS_DIR"
scp -r $LOCAL_BACKEND/* "${VPS_HOST}:${VPS_DIR}/"

# Step 2: Copy SSL setup script
Write-Host "`nUploading SSL setup script..." -ForegroundColor Yellow
scp setup-ssl-cert.sh "${VPS_HOST}:/root/"

# Step 3: Execute deployment commands on VPS
Write-Host "`nConfiguring backend on VPS..." -ForegroundColor Yellow

$deployment_commands = @'
chmod +x /root/setup-ssl-cert.sh
/root/setup-ssl-cert.sh
cd /root/flightrosteriq-backend
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
npm install
cat > .env << 'ENVEOF'
PORT=8080
NODE_ENV=production
SSL_KEY_PATH=/etc/ssl/flightrosteriq/privkey.pem
SSL_CERT_PATH=/etc/ssl/flightrosteriq/fullchain.pem
ENVEOF
pm2 delete flightrosteriq 2>/dev/null || true
pm2 start server.js --name flightrosteriq
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true
pm2 status
'@

ssh $VPS_HOST $deployment_commands

Write-Host "`nDeployment complete!" -ForegroundColor Green
Write-Host "Backend now supports HTTPS" -ForegroundColor Green
Write-Host "Access at: https://157.245.126.24:8080" -ForegroundColor Cyan
