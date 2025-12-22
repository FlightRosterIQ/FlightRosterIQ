# VPS Puppeteer Fix - Manual Steps

## ✅ COMPLETED:
1. Updated fixed-server-v2.js with enhanced Puppeteer configuration
2. Uploaded file to VPS at /root/FlightRosterIQ/fixed-server-v2.js

## 📋 NEXT STEPS (Manual SSH Required):

### Connect to VPS:
```bash
ssh root@157.245.126.24
Password: AbxCrew152780!a
```

### Restart the Server:
```bash
cd /root/FlightRosterIQ

# Stop existing process
pkill -f 'node fixed-server-v2.js'

# Wait 2 seconds
sleep 2

# Start server with new configuration
nohup node fixed-server-v2.js > server.log 2>&1 &

# Check if it started successfully
ps aux | grep 'node fixed-server-v2.js' | grep -v grep

# Monitor the logs
tail -f server.log
```

### Verify Puppeteer is Working:
Watch the logs when the app tries to scrape. You should see:
- No "Timed out after 30000 ms" errors
- Successful browser launch messages
- Successful login to crew portal

## 🔧 Changes Made:
Added these Puppeteer launch arguments:
- `--disable-software-rasterizer`: Prevent software rendering issues
- `--disable-extensions`: Disable browser extensions
- `--disable-background-networking`: Reduce resource usage
- `--disable-sync`: Disable Chrome sync
- `--disable-translate`: Disable translation features
- `--metrics-recording-only`: Reduce logging overhead
- `--mute-audio`: Disable audio
- `--no-first-run`: Skip first run experience
- `--safebrowsing-disable-auto-update`: Disable safe browsing updates
- `--disable-web-security`: Allow cross-origin requests
- `timeout: 60000`: Increased timeout to 60 seconds

## 🧪 Testing:
1. Open the app at https://flight-roster-iq.vercel.app/
2. Log in with crew portal credentials
3. Click refresh button
4. Watch for the 3-month scraping status indicator
5. Verify all three months (previous, current, next) are scraped successfully
