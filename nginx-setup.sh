#!/bin/bash
# Quick Nginx setup to fix mixed content error
# Run on VPS: bash nginx-setup.sh

echo "Installing Nginx..."
apt-get update
apt-get install -y nginx

echo "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/flightroster << 'EOF'
server {
    listen 80;
    server_name 157.245.126.24;

    location / {
        proxy_pass http://localhost:8080;
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

echo "Enabling site..."
ln -sf /etc/nginx/sites-available/flightroster /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo "Testing Nginx configuration..."
nginx -t

echo "Starting Nginx..."
systemctl restart nginx
systemctl enable nginx

echo "Done! Backend now accessible on port 80"
echo "Test with: curl http://157.245.126.24/api/authenticate"
