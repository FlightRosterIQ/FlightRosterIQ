# ZenRows Scraper API Setup Guide

ZenRows is integrated into your backend to make crew portal scraping more reliable with automatic proxy rotation and anti-bot detection bypass.

## Step 1: Get ZenRows API Key

1. Go to https://www.zenrows.com/
2. Sign up for a free account (1,000 requests/month free)
3. Go to Dashboard → API Key
4. Copy your API key

## Step 2: Add API Key to VPS

SSH into your VPS and set the environment variable:

```bash
ssh root@157.245.126.24

# Add to environment
export ZENROWS_API_KEY="your_api_key_here"

# Or add to .bashrc for persistence
echo 'export ZENROWS_API_KEY="your_api_key_here"' >> ~/.bashrc
source ~/.bashrc
```

## Step 3: Install axios (if not already installed)

```bash
cd /root
npm install axios
```

## Step 4: Restart Server

```bash
# Kill old process
ps aux | grep node
kill [process_id]

# Start new process
nohup node fixed-server-v2.js > server.log 2>&1 &
```

## Step 5: Test

The server will automatically use ZenRows when:
- ZENROWS_API_KEY environment variable is set
- The API key is valid

Check logs to see if it's working:
```bash
tail -f server.log
```

You should see: `🔄 Using ZenRows API for scraping...`

## How It Works

1. **Automatic Fallback**: If ZenRows is not configured or fails, it falls back to Puppeteer
2. **Premium Proxy**: Uses US residential proxies for better success rates
3. **JavaScript Rendering**: Fully renders JavaScript-heavy pages like crew portals
4. **Anti-Bot Bypass**: Handles CAPTCHA and bot detection automatically

## ZenRows Benefits

✅ **Better Success Rate**: Residential proxies avoid IP blocks
✅ **Faster**: No need to launch browser, direct API call
✅ **More Reliable**: Handles CAPTCHA and anti-bot measures
✅ **Cost Effective**: 1,000 free requests/month, then $49/mo for 250k

## Current Implementation

The ZenRows integration is added to `fixed-server-v2.js`:
- Line 7: Import axios
- Line 13-14: ZenRows configuration
- Line 1323: `scrapeWithZenRows()` helper function

## Next Steps

If ZenRows works well, we can:
1. Replace more Puppeteer calls with ZenRows
2. Add retry logic for failed requests
3. Implement request caching to save API calls
4. Add webhook support for async scraping

## Monitoring Usage

Check your ZenRows dashboard for:
- API requests used
- Success/failure rates
- Response times
- Remaining credits

## Alternative: If ZenRows Doesn't Work

If crew portal blocks ZenRows, alternatives:
1. **ScraperAPI** - Similar to ZenRows
2. **Bright Data** - More expensive but very reliable
3. **Oxylabs** - Enterprise-grade proxies
4. **Reverse-engineer mobile app API** - More reliable but harder to set up
