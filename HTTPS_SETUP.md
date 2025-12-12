# Setting Up HTTPS for PWA Installation

Your app currently runs on HTTP, which prevents automatic "Add to Home Screen" prompts. Here's how to add HTTPS:

## Option 1: Cloudflare (Easiest - FREE)

1. **Get a domain** (if you don't have one)
   - Use Namecheap, Google Domains, or any registrar
   - Or use a free subdomain service

2. **Add domain to Cloudflare**
   - Sign up at cloudflare.com
   - Add your domain
   - Update nameservers at your registrar

3. **Configure DNS**
   ```
   Type: A
   Name: @
   Content: 157.245.126.24
   Proxy: Enabled (orange cloud)
   ```

4. **SSL Settings**
   - SSL/TLS → Overview → Set to "Flexible" or "Full"
   - Done! Cloudflare provides free SSL

## Option 2: Nginx Reverse Proxy with Let's Encrypt

SSH into your VPS and run:

```bash
# Install Nginx
apt update
apt install nginx certbot python3-certbot-nginx -y

# Create Nginx config
nano /etc/nginx/sites-available/flightrosteriq

# Add this config:
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
ln -s /etc/nginx/sites-available/flightrosteriq /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Get SSL certificate
certbot --nginx -d your-domain.com
```

## Option 3: Direct Node.js HTTPS

Add to your server:

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('/path/to/private-key.pem'),
  cert: fs.readFileSync('/path/to/certificate.pem')
};

https.createServer(options, app).listen(443);
```

## Current Workaround (No HTTPS needed)

Users can manually install:

**Android:**
1. Open Chrome
2. Tap menu (⋮)
3. Select "Add to Home screen"

**iPhone:**
1. Open Safari
2. Tap Share button (📤)
3. Select "Add to Home Screen"

**Desktop:**
- Look for install icon in browser address bar (Chrome/Edge)

Once you have HTTPS, the app will automatically show the install prompt!
