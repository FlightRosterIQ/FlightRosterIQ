# FlightRosterIQ HTTPS Deployment Guide

## 🔐 Setting Up HTTPS for Backend

### Step 1: Upload Files to VPS

```powershell
# From your local machine (Windows PowerShell)
cd "c:\Users\Pierre Coppersnake\crew-schedule-app"

# Copy backend files
scp -r backend/* root@157.245.126.24:/root/flightrosteriq-backend/

# Copy SSL setup script
scp setup-ssl-cert.sh root@157.245.126.24:/root/
```

### Step 2: SSH into VPS

```powershell
ssh root@157.245.126.24
```

### Step 3: Run SSL Setup Script

```bash
# On the VPS
chmod +x /root/setup-ssl-cert.sh
/root/setup-ssl-cert.sh

# When prompted:
# - Choose option 1 for self-signed certificate (quick test)
# - Choose option 2 for Let's Encrypt (production, requires domain)
```

### Step 4: Install Dependencies

```bash
# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2 process manager
npm install -g pm2
```

### Step 5: Configure Backend

```bash
# Navigate to backend directory
cd /root/flightrosteriq-backend

# Install Node modules
npm install

# Create environment configuration
cat > .env << 'EOF'
PORT=8080
NODE_ENV=production
SSL_KEY_PATH=/etc/ssl/flightrosteriq/privkey.pem
SSL_CERT_PATH=/etc/ssl/flightrosteriq/fullchain.pem
EOF
```

### Step 6: Start Backend with PM2

```bash
# Stop any existing backend process
pm2 delete flightrosteriq 2>/dev/null || true

# Start the backend
pm2 start server.js --name flightrosteriq

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root

# Check status
pm2 status
pm2 logs flightrosteriq
```

## ✅ Verification

### Test Backend

```bash
# From VPS
curl https://localhost:8080/api/health -k

# From your local machine
curl https://157.245.126.24:8080/api/health -k
```

The `-k` flag ignores certificate warnings (needed for self-signed certs).

### PM2 Commands

```bash
# View logs
pm2 logs flightrosteriq

# Restart backend
pm2 restart flightrosteriq

# Stop backend
pm2 stop flightrosteriq

# View status
pm2 status
```

## 🌐 Frontend Configuration

Your frontend already points to `https://157.245.126.24:8080` in:
- [src/config.js](src/config.js) - line 17
- [src/App.jsx](src/App.jsx) - line 111

## ⚠️ Important Notes

### Self-Signed Certificates
- Browsers will show security warnings
- You'll need to accept the certificate manually
- Good for testing, not for production

### Production Setup (Recommended)
1. Get a domain name (e.g., api.flightrosteriq.com)
2. Point DNS A record to 157.245.126.24
3. Run SSL setup script and choose option 2 (Let's Encrypt)
4. Let's Encrypt certificates are free and auto-renew

### Firewall Settings
Make sure port 8080 is open:
```bash
ufw allow 8080/tcp
ufw status
```

## 📊 Monitoring

```bash
# Real-time logs
pm2 logs flightrosteriq --lines 100

# Backend status
pm2 status

# System resources
pm2 monit
```

## 🔄 Updates

To update the backend:
```bash
# Upload new files
scp -r backend/* root@157.245.126.24:/root/flightrosteriq-backend/

# SSH and restart
ssh root@157.245.126.24
cd /root/flightrosteriq-backend
npm install  # if package.json changed
pm2 restart flightrosteriq
```

## 🎉 Success!

Your backend now supports HTTPS at: **https://157.245.126.24:8080**
