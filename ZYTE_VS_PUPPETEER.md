# Zyte API vs Puppeteer Comparison

## Quick Setup Guide

### Step 1: Test Your Zyte API Key
```powershell
# Set your Zyte API key
$env:ZYTE_API_KEY="your_zyte_api_key_from_dashboard"

# Test the connection
node test-zyte.js
```

### Step 2: Try Zyte Playground
1. Go to: https://app.zyte.com/playground
2. Enter your crew portal URL: `https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp`
3. Try these actions:
   - Type into username field
   - Type into password field
   - Click submit button
   - Wait for schedule to load
4. Export the working configuration

### Step 3: Run Your First Zyte Scrape
```powershell
# Set all credentials
$env:ZYTE_API_KEY="your_zyte_api_key"
$env:CREW_USERNAME="your_username"
$env:CREW_PASSWORD="your_password"
$env:CREW_AIRLINE="ABX Air"

# Run the Zyte scraper
node crew-scraper-zyte.cjs
```

## Feature Comparison

| Feature | Puppeteer (Current) | Zyte API (New) |
|---------|-------------------|----------------|
| **Cost** | Free | ~$0.01-0.10 per page |
| **Speed** | Slower (5-10 sec/page) | Faster (2-5 sec/page) |
| **Bot Detection** | Can be blocked | Rarely blocked |
| **CAPTCHA** | Manual solving needed | Auto-solved |
| **Infrastructure** | Requires Chrome/Chromium | Cloud-based |
| **Maintenance** | High (browser updates) | Low (managed) |
| **IP Rotation** | Manual setup | Built-in |
| **Success Rate** | 70-85% | 95-99% |
| **Setup Complexity** | Medium | Easy |
| **Debugging** | Full control | Limited |

## When to Use Each

### Use Puppeteer If:
- ✅ You want zero API costs
- ✅ You need full debugging control
- ✅ The portal doesn't block bots aggressively
- ✅ You have reliable infrastructure

### Use Zyte If:
- ✅ Portal blocks Puppeteer frequently
- ✅ You want higher success rates
- ✅ You need faster scraping
- ✅ Budget allows ~$5-50/month for API calls
- ✅ You want automatic CAPTCHA solving

## Cost Estimation

### Typical Usage Pattern
- Scrapes per pilot: 2-4 per day (check schedule)
- Pages per scrape: 3-12 (login + monthly views)
- Monthly scrapes: 60-120 per pilot

### Zyte Costs
- Basic plan: $29/month (5,000 requests)
- Growth plan: $99/month (25,000 requests)
- Per request: ~$0.01-0.10 depending on complexity

**For 1 pilot**: ~$3-10/month
**For 10 pilots**: ~$30-100/month
**For 100 pilots**: Custom pricing needed

## Implementation Strategy

### Phase 1: Testing (Current)
1. ✅ Backup current working build
2. ✅ Create Zyte scraper file
3. ⏳ Test Zyte API connection
4. ⏳ Implement HTML parsing
5. ⏳ Compare results with Puppeteer

### Phase 2: Integration
1. Add Zyte toggle in settings
2. Store API key securely
3. Fallback to Puppeteer if Zyte fails
4. Track success rates

### Phase 3: Optimization
1. Choose primary scraper based on data
2. Optimize for cost/reliability balance
3. Implement hybrid approach if needed

## Hybrid Approach (Recommended)

```javascript
async function scrapeSchedule(options) {
  // Try Zyte first (faster, more reliable)
  if (options.zyteApiKey) {
    try {
      console.log('🚀 Attempting with Zyte API...');
      return await scrapeCrewPortalZyte(options);
    } catch (error) {
      console.log('⚠️ Zyte failed, falling back to Puppeteer...');
    }
  }
  
  // Fallback to Puppeteer (free, more control)
  return await scrapeCrewPortal(options);
}
```

## Files Created

1. **crew-scraper-zyte.cjs** - Main Zyte scraper implementation
2. **test-zyte.js** - API connection test script
3. **ZYTE_INTEGRATION.md** - Full integration guide
4. **ZYTE_VS_PUPPETEER.md** - This comparison document

## Testing Checklist

- [ ] Test Zyte API key with `test-zyte.js`
- [ ] Try Zyte Playground with crew portal URL
- [ ] Run `crew-scraper-zyte.cjs` with test credentials
- [ ] Compare output with Puppeteer scraper
- [ ] Check data accuracy (duties, flights, crew)
- [ ] Measure speed difference
- [ ] Estimate monthly costs
- [ ] Decide on implementation strategy

## Restore Original Build

If you want to go back to the original build:

```powershell
# Option 1: Reset to backup tag
git reset --hard v1.0.1-backup

# Option 2: Checkout backup branch
git checkout backup-v1.0.1-before-zyte

# Option 3: Delete Zyte files and restore
git checkout main
Remove-Item crew-scraper-zyte.cjs, test-zyte.js, ZYTE_*.md
```

## Support

- **Zyte Docs**: https://docs.zyte.com/
- **Zyte Playground**: https://app.zyte.com/playground
- **Puppeteer Docs**: https://pptr.dev/

## Recommendations

Based on typical crew portal scraping:

1. **For Personal Use (1 pilot)**: Stick with Puppeteer (free)
2. **For Small Team (2-10 pilots)**: Try Zyte, evaluate costs
3. **For Large Team (10+ pilots)**: Zyte likely worth it for reliability
4. **For Commercial App**: Zyte recommended for consistent service

---

**Current Status**: Ready to test Zyte API integration. Original v1.0.1 build safely backed up.
