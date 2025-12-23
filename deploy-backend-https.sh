#!/bin/bash
# Deploy FlightRosterIQ Backend with HTTPS Support
# Run this script from your local machine

VPS_HOST="root@157.245.126.24"
VPS_DIR="/root/flightrosteriq-backend"
LOCAL_BACKEND="./backend"

echo "🚀 Deploying FlightRosterIQ Backend with HTTPS..."

# Step 1: Copy backend files to VPS
echo "📤 Uploading backend files..."
ssh $VPS_HOST "mkdir -p $VPS_DIR"
scp -r $LOCAL_BACKEND/* $VPS_HOST:$VPS_DIR/

# Step 2: Setup SSL certificates on VPS
echo "🔐 Setting up SSL certificates..."
scp setup-ssl-cert.sh $VPS_HOST:/root/
ssh $VPS_HOST "chmod +x /root/setup-ssl-cert.sh && /root/setup-ssl-cert.sh"

# Step 3: Install dependencies and setup backend
echo "📦 Installing dependencies on VPS..."
ssh $VPS_HOST << 'EOF'
cd /root/flightrosteriq-backend

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📥 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    echo "📥 Installing PM2..."
    npm install -g pm2
fi

# Install dependencies
echo "📦 Installing Node modules..."
npm install

# Create .env file with SSL paths
echo "⚙️ Creating environment configuration..."
cat > .env << 'ENVEOF'
PORT=8080
NODE_ENV=production
SSL_KEY_PATH=/etc/ssl/flightrosteriq/privkey.pem
SSL_CERT_PATH=/etc/ssl/flightrosteriq/fullchain.pem
ENVEOF

# Stop existing process
echo "🛑 Stopping existing backend..."
pm2 delete flightrosteriq 2>/dev/null || true

# Start backend with PM2
echo "🚀 Starting backend with PM2..."
pm2 start server.js --name flightrosteriq --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root

echo "✅ Backend deployment complete!"
echo ""
pm2 status
echo ""
echo "📊 Check logs: pm2 logs flightrosteriq"
echo "🔄 Restart: pm2 restart flightrosteriq"
echo "🛑 Stop: pm2 stop flightrosteriq"
EOF

echo ""
echo "🎉 Deployment complete!"
echo "🔐 Backend now supports HTTPS"
echo "🌐 Access at: https://157.245.126.24:8080"
echo ""
echo "⚠️  Note: If using self-signed certificate, browsers will show security warnings."
echo "For production, configure a domain and use Let's Encrypt."
