#!/bin/bash

# FlightRosterIQ HTTPS Setup Script
# This script sets up HTTPS using Caddy (easiest option)

echo "🔐 FlightRosterIQ HTTPS Setup"
echo "=============================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ Please run as root (use: sudo bash setup-https.sh)"
  exit 1
fi

# Ask for domain name
echo "📝 Enter your domain name (e.g., flightrosteriq.com or app.yourdomain.com):"
read -r DOMAIN_NAME

if [ -z "$DOMAIN_NAME" ]; then
  echo "❌ Domain name is required!"
  exit 1
fi

echo ""
echo "⚙️  Installing Caddy web server..."
echo ""

# Install Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install -y caddy

echo ""
echo "📝 Configuring Caddy..."
echo ""

# Create Caddyfile
cat > /etc/caddy/Caddyfile << EOF
$DOMAIN_NAME {
    reverse_proxy localhost:8080
    
    # Enable compression
    encode gzip
    
    # Add security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "no-referrer-when-downgrade"
    }
    
    # Log access
    log {
        output file /var/log/caddy/access.log
        format console
    }
}
EOF

# Create log directory
mkdir -p /var/log/caddy
chown caddy:caddy /var/log/caddy

echo ""
echo "🚀 Starting Caddy..."
echo ""

# Reload Caddy
systemctl enable caddy
systemctl restart caddy

# Check status
sleep 2
if systemctl is-active --quiet caddy; then
    echo ""
    echo "✅ HTTPS Setup Complete!"
    echo ""
    echo "=============================="
    echo "📋 Setup Summary:"
    echo "=============================="
    echo ""
    echo "✅ Caddy web server installed"
    echo "✅ HTTPS configured for: $DOMAIN_NAME"
    echo "✅ Auto-renewing SSL certificate"
    echo "✅ Reverse proxy to localhost:8080"
    echo ""
    echo "=============================="
    echo "🔧 DNS Configuration Required:"
    echo "=============================="
    echo ""
    echo "Add this A record to your domain DNS:"
    echo ""
    echo "  Type:  A"
    echo "  Name:  @ (or subdomain name)"
    echo "  Value: 157.245.126.24"
    echo "  TTL:   3600"
    echo ""
    echo "=============================="
    echo "⏱️  Next Steps:"
    echo "=============================="
    echo ""
    echo "1. Configure DNS (see above)"
    echo "2. Wait 5-10 minutes for DNS propagation"
    echo "3. Visit: https://$DOMAIN_NAME"
    echo "4. Verify the padlock 🔒 icon appears"
    echo ""
    echo "=============================="
    echo "✨ Features Now Available:"
    echo "=============================="
    echo ""
    echo "✅ Geolocation (Nearby Crewmates)"
    echo "✅ PWA Installation (Add to Home Screen)"
    echo "✅ External APIs (FlightAware, Google Places)"
    echo "✅ Enhanced Security"
    echo ""
    echo "=============================="
    echo "🔍 Troubleshooting:"
    echo "=============================="
    echo ""
    echo "Check Caddy status:"
    echo "  systemctl status caddy"
    echo ""
    echo "View Caddy logs:"
    echo "  journalctl -u caddy -f"
    echo ""
    echo "Test configuration:"
    echo "  caddy validate --config /etc/caddy/Caddyfile"
    echo ""
    echo "Restart Caddy:"
    echo "  systemctl restart caddy"
    echo ""
else
    echo ""
    echo "❌ Caddy failed to start. Check logs:"
    echo "  journalctl -u caddy -n 50"
    echo ""
    exit 1
fi
