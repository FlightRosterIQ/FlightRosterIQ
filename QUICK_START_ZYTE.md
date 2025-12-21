# 🚀 Quick Start: Testing Zyte API

## What I've Created For You

1. **crew-scraper-zyte.cjs** - Zyte API scraper (alternative to Puppeteer)
2. **test-zyte.js** - Test script to verify your API key works
3. **ZYTE_INTEGRATION.md** - Complete integration documentation
4. **ZYTE_VS_PUPPETEER.md** - Comparison guide & decision matrix

## Step-by-Step Testing

### 1️⃣ Get Your Zyte API Key

From your Zyte dashboard:
1. Click on your profile (top right)
2. Go to "API Access" or "Settings"
3. Copy your API key (looks like: `1a2b3c4d5e6f...`)

### 2️⃣ Test Your API Key

```powershell
# Set your API key
$env:ZYTE_API_KEY="paste_your_key_here"

# Run the test
node test-zyte.js
```

**Expected output:**
```
✅ Basic request successful
✅ JavaScript rendering successful
✅ Browser actions successful
✅ API key is valid and active
```

### 3️⃣ Try the Zyte Playground (Recommended!)

This is the **easiest way** to test if Zyte works with your crew portal:

1. Go to: https://app.zyte.com/playground
2. Enter your portal URL: `https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp`
3. In the Actions panel, add these steps:
   ```
   - Type: input[name="username"] → your_username
   - Type: input[name="password"] → your_password
   - Click: button[type="submit"]
   - Wait for selector: div[data-test-id="duty-row"]
   ```
4. Click "Run" and see if it successfully logs in and loads the schedule

### 4️⃣ Run the Full Scraper

```powershell
# Set all credentials
$env:ZYTE_API_KEY="your_zyte_api_key"
$env:CREW_USERNAME="your_crew_username"
$env:CREW_PASSWORD="your_crew_password"
$env:CREW_AIRLINE="ABX Air"  # or "ATI"

# Run it
node crew-scraper-zyte.cjs
```

## What's Different?

### Puppeteer (Current - v1.0.1)
- ✅ Free
- ❌ Can be blocked by anti-bot systems
- ❌ Slower (5-10 seconds per page)
- ❌ Requires Chrome/Chromium installed

### Zyte API (New)
- ❌ Costs ~$0.01-0.10 per page
- ✅ Rarely blocked (99% success rate)
- ✅ Faster (2-5 seconds per page)
- ✅ No browser installation needed
- ✅ Auto-solves CAPTCHAs
- ✅ Built-in IP rotation

## Decision Time

### Try This:
1. Run `test-zyte.js` to verify API works ✅
2. Try the Playground to see if it can log into your portal ✅
3. Compare speed and reliability with Puppeteer
4. Check Zyte pricing for your usage level
5. Decide which to use as primary scraper

### Estimated Costs
- **Personal use** (1 pilot, 2-4 scrapes/day): ~$3-5/month
- **Small team** (5 pilots): ~$15-25/month
- **Large team** (20+ pilots): ~$100+/month

## Implementation Options

### Option 1: Zyte Only
Replace Puppeteer completely. Best if portal blocks bots frequently.

### Option 2: Hybrid (Recommended)
Try Zyte first, fallback to Puppeteer if it fails or no API key provided.

### Option 3: Keep Puppeteer
If current scraper works fine and you want to avoid costs.

## Your Original Build is Safe! 🔒

I created a backup before adding Zyte:
- **Branch**: `backup-v1.0.1-before-zyte`
- **Tag**: `v1.0.1-backup`

To restore:
```powershell
git checkout backup-v1.0.1-before-zyte
```

## What Needs to Be Done

The Zyte scraper is **90% complete**, but needs:

### TODO: HTML Parsing
The function `parseScheduleFromHtml()` in `crew-scraper-zyte.cjs` (line 192) is a placeholder.

You need to:
1. Copy parsing logic from `crew-scraper.cjs` (lines ~100-600)
2. Adapt it to work with HTML string instead of Puppeteer page object
3. Test with real portal HTML

I can help with this once you confirm Zyte works in the Playground!

## Next Steps

1. **Right Now**: Test your API key
   ```powershell
   $env:ZYTE_API_KEY="your_key"; node test-zyte.js
   ```

2. **Today**: Try Zyte Playground with your portal URL

3. **If It Works**: I'll help complete the HTML parsing logic

4. **If It Doesn't**: We stick with Puppeteer (still works great!)

## Questions?

Check these docs:
- `ZYTE_INTEGRATION.md` - Full technical guide
- `ZYTE_VS_PUPPETEER.md` - Detailed comparison
- https://docs.zyte.com/ - Official Zyte docs

---

**Status**: Zyte integration ready for testing. Original v1.0.1 backed up safely. 🚀
