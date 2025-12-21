# Zyte API Integration Guide

## Overview
This document explains how to use Zyte API as an alternative to Puppeteer for scraping the crew portal.

## Setup

### 1. Get Your Zyte API Key
1. Go to your Zyte dashboard: https://app.zyte.com/
2. Navigate to API Access → API Keys
3. Copy your API key

### 2. Set Environment Variable
Add your Zyte API key to your `.env` file:
```bash
ZYTE_API_KEY=your_zyte_api_key_here
```

## Usage

### Testing the Zyte Scraper
```bash
# Set your credentials
$env:CREW_USERNAME="your_username"
$env:CREW_PASSWORD="your_password"
$env:ZYTE_API_KEY="your_zyte_api_key"

# Run the Zyte scraper
node crew-scraper-zyte.cjs
```

### Using in Your App
```javascript
const { scrapeCrewPortalZyte } = require('./crew-scraper-zyte.cjs');

// Scrape with Zyte API
const result = await scrapeCrewPortalZyte({
  username: 'your_username',
  password: 'your_password',
  zyteApiKey: 'your_zyte_api_key',
  airline: 'ABX Air'
});

console.log(result);
```

## Zyte API Features

### 1. Browser Actions
Zyte can execute JavaScript actions like:
- `type` - Type text into input fields
- `click` - Click on elements
- `waitForSelector` - Wait for elements to appear
- `waitForNavigation` - Wait for page navigation

### 2. Anti-Bot Bypass
Zyte automatically handles:
- ✅ CAPTCHA solving
- ✅ Browser fingerprinting bypass
- ✅ IP rotation
- ✅ Headless browser detection bypass

### 3. JavaScript Rendering
- Full browser rendering with JavaScript execution
- Handles dynamic content loading
- Supports SPA (Single Page Applications)

## Cost Comparison

### Puppeteer (Current)
- ✅ **Pros**: Free, full control, no API costs
- ❌ **Cons**: Can be blocked, requires infrastructure, slower

### Zyte API
- ✅ **Pros**: Anti-bot bypass, no infrastructure needed, faster
- ❌ **Cons**: Costs per request (~$0.01-0.10 per page)

**Pricing**: Check https://www.zyte.com/pricing/

## API Endpoints

### 1. Extract API (Used in our implementation)
```
POST https://api.zyte.com/v1/extract
```
- Best for custom extraction
- Supports browser actions
- Flexible and powerful

### 2. Auto Extract API
```
POST https://autoextract.zyte.com/v1/extract
```
- Automatic data extraction
- Pre-built for e-commerce, articles, jobs
- May not work for custom crew portals

## Implementation Status

### ✅ Completed
- Basic Zyte API client implementation
- Login flow with browser actions
- Configuration management
- Error handling

### 🚧 TODO
1. **HTML Parsing**: Implement `parseScheduleFromHtml()` function
   - Port parsing logic from `crew-scraper.cjs`
   - Extract duty data, flight details, crew info
   
2. **Multi-Month Scraping**: Add month navigation
   - Implement date picker interactions
   - Handle month-to-month scraping

3. **Testing**: Verify with real credentials
   - Test login flow
   - Validate data extraction
   - Compare with Puppeteer results

4. **Integration**: Add to main app
   - Create UI toggle for Zyte vs Puppeteer
   - Add Zyte API key input in settings
   - Handle API key securely

## Zyte Playground Templates

Since crew portals are unique, you'll need to create a custom template:

1. Go to: https://app.zyte.com/playground
2. Choose "Add your own template"
3. Create a custom spider for your crew portal
4. Test selectors and actions
5. Export the configuration

## Next Steps

1. **Test Basic Connection**:
   ```bash
   node crew-scraper-zyte.cjs
   ```

2. **Implement HTML Parsing**:
   - Copy parsing logic from `crew-scraper.cjs` (lines 100-600)
   - Adapt for HTML string instead of Puppeteer page object

3. **Compare Results**:
   - Run both Puppeteer and Zyte scrapers
   - Compare data accuracy and speed
   - Decide which to use as primary

4. **Cost Analysis**:
   - Track number of API calls per month
   - Calculate monthly Zyte costs
   - Compare with infrastructure costs

## Troubleshooting

### Authentication Errors
- Verify API key is correct
- Check if API key has permissions
- Ensure credentials are valid

### Selector Not Found
- Use Zyte Playground to test selectors
- Airline portal may have changed structure
- Try alternative selectors

### Rate Limits
- Zyte has rate limits based on your plan
- Implement retry logic with backoff
- Consider upgrading plan if needed

## Support
- Zyte Documentation: https://docs.zyte.com/
- Zyte Support: support@zyte.com
- API Reference: https://docs.zyte.com/zyte-api/
