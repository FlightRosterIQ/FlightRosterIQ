# VPS Deployment Guide for Crew Scheduler

## Quick Start (5 minutes)

### 1. Get a VPS
- **DigitalOcean**: Create droplet with Docker pre-installed
- **Linode**: Launch Ubuntu 22.04 instance
- **Vultr**: Deploy Ubuntu server

### 2. Upload Your Code
```bash
# Option A: Git (if you have a GitHub repo)
git clone https://github.com/your-username/crew-schedule-app.git
cd crew-schedule-app

# Option B: SCP upload
scp -r . root@your-server-ip:/root/crew-schedule-app/
```

### 3. Deploy
```bash
# SSH into your server
ssh root@your-server-ip

# Run deployment script
chmod +x deploy-vps.sh
./deploy-vps.sh
```

### 4. Access Your App
- **Direct Access**: `http://your-server-ip:3000`
- **With Domain**: Setup DNS to point to your server IP

## Server Requirements
- **Minimum**: 1GB RAM, 1 CPU core
- **Recommended**: 2GB RAM, 2 CPU cores
- **Storage**: 20GB+ SSD

## Monthly Costs
- **Budget**: $5-6/month (Linode, Vultr)
- **Standard**: $8-12/month (DigitalOcean, AWS)
- **Premium**: $20+/month (managed services)

## Security Setup
```bash
# Create firewall rules
ufw allow ssh
ufw allow 3000/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Setup automatic updates
apt install unattended-upgrades -y
```

## Monitoring
```bash
# Check if app is running
docker ps

# View logs
docker-compose logs -f

# Restart if needed
docker-compose restart
```

## Custom Domain Setup
1. **Buy domain** (Namecheap, GoDaddy, etc.)
2. **Point DNS** A record to your server IP
3. **Setup SSL** with Let's Encrypt (included in script)

Your crew scraper will then be accessible 24/7 at your custom domain!