#!/bin/bash
# Quick VPS Deployment Script for Crew Scheduler

echo "🚀 Deploying Crew Scheduler to VPS..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Clone your repository (replace with your actual repo)
git clone https://github.com/FlightRosterIQ/crew-schedule-app.git
cd crew-schedule-app

# Build and start the application
docker compose up -d

# Setup nginx proxy (optional - for custom domain)
sudo apt install nginx -y

# Create nginx config
sudo tee /etc/nginx/sites-available/crew-scheduler << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable nginx site
sudo ln -s /etc/nginx/sites-available/crew-scheduler /etc/nginx/sites-enabled/
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt (optional)
sudo apt install certbot python3-certbot-nginx -y
# sudo certbot --nginx -d your-domain.com

echo "✅ Deployment complete!"
echo "🌐 Access your app at: http://your-server-ip:3000"
echo "📊 Health check: http://your-server-ip:3000/health"