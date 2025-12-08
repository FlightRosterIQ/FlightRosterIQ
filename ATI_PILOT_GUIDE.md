# ✈️ ATI (Air Transport International) Pilot Guide

## YES - Ready for ATI Pilots!

**Air Transport International pilots can use this app RIGHT NOW** - no code changes needed!

## Why It Works

ATI and ABX Air use the **exact same NetLine crew portal system**:
- Same login page layout
- Same schedule interface
- Same Remarks tab
- Same crew information structure
- Same notification system

The scraper works identically for both airlines!

## 🚀 Quick Setup for ATI Pilots

### Step 1: Start the Servers

```powershell
# Terminal 1 - Backend
node server-simple.cjs

# Terminal 2 - Frontend  
npm run dev
```

### Step 2: Run Scraper with YOUR ATI Credentials

```powershell
$env:CREW_USERNAME='YOUR_ATI_CREW_ID'
$env:CREW_PASSWORD='YOUR_ATI_PASSWORD'
node crew-scraper.cjs
```

**That's it!** The scraper will:
- Login to ATI crew portal (crew.atiair.com)
- Extract your ATI schedule
- Get your ATI crew assignments
- Fetch ATI Remarks/notifications
- Import everything to the app

### Step 3: Access the App

- **Computer:** http://localhost:5173/
- **Phone:** http://[YOUR_IP]:5173/

Select **"ATI"** when logging into the app!

## 📱 Login to the App

1. Open http://localhost:5173/
2. Click **"Air Transport International (ATI)"** button
3. Enter any username/password (mock auth)
4. Your scraped ATI schedule will appear!

## 🔐 Portal URLs (Both Work the Same)

- **ABX Air:** https://crew.abxair.com/nlcrew/...
- **ATI:** https://crew.atiair.com/nlcrew/...

Both use identical NetLine portal - same HTML structure, same selectors, same functionality!

## 👥 Multiple Airlines in One Backend

The app supports both ABX and ATI pilots simultaneously:

```powershell
# ABX Pilot
$env:CREW_USERNAME='152780'
$env:CREW_PASSWORD='abx_password'
node crew-scraper.cjs

# ATI Pilot  
$env:CREW_USERNAME='187654'
$env:CREW_PASSWORD='ati_password'
node crew-scraper.cjs
```

Both schedules stored separately in the backend!

## ✅ What Works for ATI Pilots

✈️ **Your ATI Schedule:**
- All flight pairings
- Aircraft assignments
- Routes and times
- Hotel information

👥 **Your ATI Crew:**
- Crew member names
- Contact information
- Ranks and seniority
- Home bases

📬 **ATI Notifications:**
- Remarks from ATI scheduler
- Schedule changes
- Aircraft changes
- All portal updates

📱 **Push Notifications:**
- Install on phone
- Receive push alerts
- Works when app is closed
- Just like text messages

## 🤝 Mixed Crews (ABX + ATI)

Since both airlines sometimes fly together:
- App shows crew from both airlines
- Contact information available
- Can add cross-airline friends
- Chat functionality works

## 🔧 ATI-Specific Settings

When you login to the app:
1. Select **"Air Transport International (ATI)"**
2. Your airline badge shows "ATI"
3. Schedule shows ATI-specific data
4. Notifications from ATI portal

## 📊 Example: ATI Pilot Workflow

```powershell
# 1. Run scraper with ATI credentials
$env:CREW_USERNAME='YOUR_ATI_ID'
$env:CREW_PASSWORD='YOUR_ATI_PASS'
node crew-scraper.cjs

# Output:
# 🚀 Starting crew portal scraper...
# 📍 Navigating to crew portal...
# 🔐 Attempting login...
# ✅ Login successful!
# 📊 Extracting schedule data...
# 📬 Found X notifications in Remarks tab
# ✅ Data sent to backend successfully
```

```
# 2. Open app and login
Open: http://localhost:5173/
Click: "Air Transport International (ATI)"
Login with any credentials (mock)
See: Your complete ATI schedule!
```

## 🌐 ATI Portal Access

The scraper automatically detects and uses:
- **Portal:** crew.atiair.com
- **Login page:** Same as ABX
- **Schedule page:** Same interface
- **Remarks tab:** Same location
- **Crew details:** Same format

## 🔄 Switching Airlines

If you fly for both airlines (unlikely but possible):

```powershell
# Morning: Check ATI schedule
$env:CREW_USERNAME='ATI_ID'
$env:CREW_PASSWORD='ATI_PASS'
node crew-scraper.cjs

# Later: Check ABX schedule
$env:CREW_USERNAME='ABX_ID'
$env:CREW_PASSWORD='ABX_PASS'
node crew-scraper.cjs
```

Both schedules available in the app!

## 📝 Important Notes

1. **Same scraper works for both**
   - NetLine portal is identical
   - No code changes needed
   - All features work the same

2. **Your ATI credentials stay secure**
   - Only in environment variables
   - Never stored permanently
   - Never committed to git

3. **Multi-airline backend**
   - Stores ATI and ABX separately
   - Username = your crew ID
   - No data mixing

## 🎯 Features for ATI Pilots

Everything that works for ABX works for ATI:

✅ Schedule management
✅ Crew coordination  
✅ Push notifications
✅ Weather & tracking
✅ Family sharing
✅ Offline support
✅ PWA installation
✅ Chat with crew
✅ Friend requests

## 🚀 Quick Start Commands (ATI)

```powershell
# Terminal 1
node server-simple.cjs

# Terminal 2  
npm run dev

# Terminal 3 - YOUR ATI credentials
$env:CREW_USERNAME='YOUR_ATI_CREW_ID'
$env:CREW_PASSWORD='YOUR_ATI_PASSWORD'
node crew-scraper.cjs
```

Then:
1. Open http://localhost:5173/
2. Click "Air Transport International (ATI)"
3. Login and enjoy!

## 📱 Share with ATI Colleagues

Send them:
1. This repository
2. These 3 commands above
3. Tell them to use THEIR ATI credentials

## ✈️ Summary

- ✅ **ATI pilots can use it NOW**
- ✅ **No setup required - works out of the box**
- ✅ **Same features as ABX version**
- ✅ **Both airlines supported simultaneously**
- ✅ **Secure - your ATI credentials stay private**
- ✅ **Push notifications work**
- ✅ **Install on phone**

**Your ATI crew ID + This app = Your personal ATI flight scheduling system!** 🎉

---

*The scraper auto-detects the airline and uses the appropriate portal. Both ABX Air and Air Transport International use identical NetLine crew portals, so everything works seamlessly!*
