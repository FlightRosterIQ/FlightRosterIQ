#!/bin/bash
# SSL Certificate Setup for FlightRosterIQ Backend
# Run this on your DigitalOcean VPS (157.245.126.24)

echo "🔐 Setting up SSL certificates for FlightRosterIQ Backend"

# Update package list
echo "📦 Updating packages..."
apt-get update

# Install Certbot and OpenSSL
echo "📥 Installing Certbot..."
apt-get install -y certbot openssl

# Option 1: Self-signed certificate (for testing)
echo ""
echo "Choose SSL certificate type:"
echo "1) Self-signed certificate (for testing only)"
echo "2) Let's Encrypt certificate (requires domain name)"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo "🔧 Creating self-signed certificate..."
    
    # Create directory for certificates
    mkdir -p /etc/ssl/flightrosteriq
    
    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/flightrosteriq/privkey.pem \
        -out /etc/ssl/flightrosteriq/fullchain.pem \
        -subj "/C=US/ST=State/L=City/O=FlightRosterIQ/CN=157.245.126.24"
    
    # Set proper permissions
    chmod 600 /etc/ssl/flightrosteriq/privkey.pem
    chmod 644 /etc/ssl/flightrosteriq/fullchain.pem
    
    echo "✅ Self-signed certificate created!"
    echo "📁 Key: /etc/ssl/flightrosteriq/privkey.pem"
    echo "📁 Cert: /etc/ssl/flightrosteriq/fullchain.pem"
    echo ""
    echo "⚠️  Note: Browsers will show security warnings for self-signed certificates."
    echo "For production, use a domain name and Let's Encrypt certificate."
    
    # Export environment variables
    export SSL_KEY_PATH="/etc/ssl/flightrosteriq/privkey.pem"
    export SSL_CERT_PATH="/etc/ssl/flightrosteriq/fullchain.pem"
    
elif [ "$choice" = "2" ]; then
    read -p "Enter your domain name (e.g., api.flightrosteriq.com): " domain
    
    if [ -z "$domain" ]; then
        echo "❌ Domain name is required for Let's Encrypt"
        exit 1
    fi
    
    echo "🌐 Setting up Let's Encrypt certificate for $domain"
    echo "⚠️  Make sure DNS A record points to 157.245.126.24"
    read -p "Press Enter to continue..."
    
    # Get certificate using standalone mode
    certbot certonly --standalone -d "$domain" --non-interactive --agree-tos --register-unsafely-without-email
    
    if [ $? -eq 0 ]; then
        echo "✅ Let's Encrypt certificate created!"
        echo "📁 Key: /etc/letsencrypt/live/$domain/privkey.pem"
        echo "📁 Cert: /etc/letsencrypt/live/$domain/fullchain.pem"
        
        # Export environment variables
        export SSL_KEY_PATH="/etc/letsencrypt/live/$domain/privkey.pem"
        export SSL_CERT_PATH="/etc/letsencrypt/live/$domain/fullchain.pem"
        
        # Setup auto-renewal
        echo "⚡ Setting up auto-renewal..."
        (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'pm2 restart flightrosteriq'") | crontab -
    else
        echo "❌ Failed to create Let's Encrypt certificate"
        echo "Make sure:"
        echo "1. Port 80 is open and not in use"
        echo "2. DNS points to this server"
        echo "3. Domain is accessible from the internet"
        exit 1
    fi
else
    echo "❌ Invalid choice"
    exit 1
fi

echo ""
echo "🎉 SSL setup complete!"
echo ""
echo "Next steps:"
echo "1. Update your backend .env file with SSL paths"
echo "2. Restart your backend server: pm2 restart flightrosteriq"
echo "3. Update frontend config.js to use https://157.245.126.24:8080"
