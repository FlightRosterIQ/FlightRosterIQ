# Major UI/UX Overhaul Implementation Plan - v2.0.0

## Status: IN PROGRESS

### ✅ COMPLETED (Phase 1A)
1. Removed `isOnline` state variable
2. Removed `pullRefreshDistance` and `isPulling` states  
3. Removed online/offline event listeners
4. Simplified touch handlers (only horizontal swipe for month nav)
5. Added `scrapingStatus` state for status indicator

### 🔄 IN PROGRESS (Phase 1B - Remove Remaining References)
Need to remove/update these isOnline references:
- Line 327: `if (!isOnline || !token) return` → `if (!token) return`
- Line 373: `}, [isOnline, token])` → `}, [token])`
- Line 591: `if (!token || !isOnline) return` → `if (!token) return`
- Line 604: `}, [token, isOnline, settings.autoRefresh])` → `}, [token, settings.autoRefresh])`
- Line 3526: `disabled={loading || !isOnline}` → `disabled={loading}`
- Lines 5324-5328: Remove offline banner JSX
- Lines 5777-5778: Remove offline mode chip
- Lines 5847-5850: Remove online/offline status chip

### 📋 REMAINING TASKS

#### Phase 2: UI Design Updates
- [ ] Update border-radius globally (12px for cards, 24px for buttons)
- [ ] Add consistent box-shadows
- [ ] Update color palette to softer tones
- [ ] Fix mobile tab positioning (add padding-left)
- [ ] Fix month tab overflow on mobile

#### Phase 3: Bottom Tab Scroll Fix
- [ ] Prevent vertical scrolling on bottom tabs
- [ ] Ensure only horizontal scroll
- [ ] Add scroll snap if needed

#### Phase 4: Scraper Updates
- [ ] Modify scraper to fetch 3 months (previous, current, next)
- [ ] Add status indicator UI component
- [ ] Update scraping logic to show progress
- [ ] Implement caching for 3-month data

#### Phase 5: VPS Puppeteer Fix
- [ ] SSH to VPS: 157.245.126.24
- [ ] Update fixed-server-v2.js with proper Chromium path
- [ ] Add executablePath to Puppeteer launch
- [ ] Test scraping endpoint
- [ ] Restart server

#### Phase 6: Deployment
- [ ] Update version to 2.0.0
- [ ] Update version.json with changelog
- [ ] Deploy to Vercel
- [ ] Test all features
- [ ] Push to GitHub

## Commands for VPS Fix
```bash
ssh root@157.245.126.24
cd /root/FlightRosterIQ
# Edit fixed-server-v2.js and add to puppeteer.launch():
# executablePath: '/usr/bin/chromium-browser',
# args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
pkill -f 'node fixed-server-v2.js'
nohup node fixed-server-v2.js > server.log 2>&1 &
tail -f server.log
```

## Estimated Time Remaining
- Phase 1B: 5-10 minutes
- Phase 2: 15-20 minutes
- Phase 3: 5-10 minutes  
- Phase 4: 20-30 minutes
- Phase 5: 15-20 minutes
- Phase 6: 10-15 minutes

**Total: 70-105 minutes (1.2-1.75 hours)**
