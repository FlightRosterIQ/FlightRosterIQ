#!/bin/bash

# Setup SSL/HTTPS for FlightRosterIQ Backend
# Run on VPS: 157.245.126.24

echo "🔒 Setting up HTTPS/SSL for backend..."

# Install Nginx and Certbot
apt update
apt install -y nginx certbot python3-certbot-nginx

# Create Nginx config for backend
cat > /etc/nginx/sites-available/flightroster <<EOF
server {
    listen 80;
    server_name 157.245.126.24;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/flightroster /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

echo "✅ Nginx configured as reverse proxy"
echo "🌐 Backend now accessible via http://157.245.126.24 (proxied to :8080)"
echo ""
echo "Note: For HTTPS with a domain, you'll need:"
echo "1. Point a domain to this IP"
echo "2. Run: certbot --nginx -d yourdomain.com"
