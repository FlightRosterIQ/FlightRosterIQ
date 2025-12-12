#!/bin/bash

# FlightRosterIQ Server Configuration Update Script
# Run this script after recreating your DigitalOcean droplet

echo "🚀 FlightRosterIQ Server IP Configuration Update"
echo "=============================================="

# Get new server IP from user
read -p "Enter your new DigitalOcean server IP address: " NEW_SERVER_IP

if [[ -z "$NEW_SERVER_IP" ]]; then
    echo "❌ Error: No IP address provided"
    exit 1
fi

# Validate IP format (basic check)
if [[ ! $NEW_SERVER_IP =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "❌ Error: Invalid IP address format"
    exit 1
fi

echo "📝 Updating configuration files..."

# Update src/config.js
sed -i "s/YOUR_NEW_SERVER_IP/$NEW_SERVER_IP/g" src/config.js

# Update any other files that might have the old IP
find . -name "*.js" -o -name "*.jsx" -o -name "*.cjs" -o -name "*.json" | \
    xargs grep -l "138.197.110.225" | \
    xargs sed -i "s/138.197.110.225/$NEW_SERVER_IP/g"

echo "✅ Configuration updated successfully!"
echo ""
echo "🔧 Updated files:"
echo "  - src/config.js"
echo "  - All files containing old IP address"
echo ""
echo "🌐 New API Base URL: http://$NEW_SERVER_IP:8080"
echo ""
echo "📋 Next steps:"
echo "1. Build your React app: npm run build"
echo "2. Test the connection: http://$NEW_SERVER_IP:8080"
echo "3. Deploy to your server if needed"
echo ""
echo "🚀 Your FlightRosterIQ crew scraper is ready for 400+ ABX Air/ATI pilots!"