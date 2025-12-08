# ✈️ YES - Any ABX Air Pilot Can Use This App!

## Quick Answer

**YES!** Any ABX Air pilot can use this app with their own crew portal credentials. The app is designed to work for all ABX pilots.

## How It Works

1. **Each pilot uses their own credentials**
   - Your crew ID (e.g., 152780, 154321, etc.)
   - Your crew portal password

2. **Your data stays private**
   - Runs on YOUR computer
   - Uses YOUR network
   - No data sharing between pilots

3. **Multi-user support built-in**
   - Backend stores data per username
   - Multiple pilots can use same backend (different data)
   - Family can access your schedule with access codes

## 🚀 For New ABX Pilots - 3 Steps

### 1️⃣ Start the Servers
```powershell
# Terminal 1
node server-simple.cjs

# Terminal 2  
npm run dev
```

### 2️⃣ Run Scraper with YOUR Credentials
```powershell
$env:CREW_USERNAME='YOUR_CREW_ID'
$env:CREW_PASSWORD='YOUR_PASSWORD'
node crew-scraper.cjs
```

### 3️⃣ Open the App
- Computer: http://localhost:5173/
- Phone: http://[YOUR_IP]:5173/

**That's it!** Your schedule is now in the app.

## 🔐 Your Data Security

✅ **What's secure:**
- Credentials only in environment variables (not saved)
- Direct connection to official ABX portal
- Data stored locally on your computer
- No third-party servers
- No data transmission outside your network

✅ **What you control:**
- When to run the scraper
- Who gets family access codes
- What devices can access (on your WiFi)

## 📱 Share with Your Family

1. Open app → Settings → Family
2. Generate access code
3. Share code with family member
4. They login with the code
5. They see your schedule (read-only)

## 🔄 How Often to Scrape

**Manual (Recommended):**
```powershell
# Run whenever you want latest schedule
$env:CREW_USERNAME='YOUR_ID'
$env:CREW_PASSWORD='YOUR_PASS'
node crew-scraper.cjs
```

**Automatic (Optional):**
- Uncomment `scheduleScraper()` in crew-scraper.cjs
- Runs daily at 6:00 AM
- Or set up Windows Task Scheduler

## 📊 What Each Pilot Gets

✅ **Your Schedule:**
- All your pairings
- Flight details
- Aircraft assignments
- Hotel information

✅ **Your Crew:**
- Who you're flying with
- Contact information
- Seniority numbers
- Home bases

✅ **Your Notifications:**
- Remarks from scheduler
- Schedule changes
- Portal updates

## 🤝 Multiple Pilots Using Same Backend

**Scenario:** You and another ABX pilot want to use the app

**Solution:**
1. One person hosts the backend server
2. Each pilot runs scraper with their own credentials
3. Backend stores separate data for each username
4. Each pilot accesses on their own device
5. No data overlap or sharing

**Example:**
```powershell
# Pilot 1
$env:CREW_USERNAME='152780'
$env:CREW_PASSWORD='their_password'
node crew-scraper.cjs

# Pilot 2  
$env:CREW_USERNAME='154321'
$env:CREW_PASSWORD='their_password'
node crew-scraper.cjs
```

Backend now has both pilots' data, stored separately.

## 🌐 Deployment Options

### Option 1: Local Only (Current)
- Runs on your computer
- Access on your WiFi only
- Most secure
- Free

### Option 2: Cloud Deployment
- Host on Heroku, AWS, Azure, etc.
- Access from anywhere
- Requires HTTPS
- Need VAPID keys for push notifications
- Small monthly cost

### Option 3: Home Server
- Run on Raspberry Pi or home server
- Always available on your network
- Set up port forwarding for remote access
- One-time hardware cost

## 🎯 Key Features

✈️ **Schedule Management** - Your complete flight schedule
📬 **Push Notifications** - Like text messages on phone
👥 **Crew Coordination** - See who you're flying with
👨‍👩‍👧‍👦 **Family Sharing** - Let family track your schedule
🌍 **Weather & Tracking** - Airport weather, aircraft tracking
📱 **PWA** - Install like a native app
💾 **Offline** - Works without internet

## 🔧 Technical Details

**Frontend:** React 18 + Vite
**Backend:** Express.js (Node.js)
**Scraper:** Puppeteer (headless Chrome)
**Storage:** LocalForage (browser) + In-memory (server)
**PWA:** Service Worker + Web Push API
**Data Source:** Official ABX crew portal

## ⚠️ Important Notes

1. **Credentials are never stored permanently**
   - Only in environment variables during execution
   - Never in files (unless you manually edit)
   - Never committed to git

2. **This is not an official ABX app**
   - Personal project for crew convenience
   - No affiliation with ABX Air
   - Use at your own discretion

3. **Portal changes may break scraper**
   - ABX updates their portal occasionally
   - Selectors may need updating
   - Check for updates if scraper fails

## 📞 Help Another Pilot Set Up

Send them this link: `ABX_PILOT_GUIDE.md`

Or share these 3 commands:
```powershell
# 1. Start backend
node server-simple.cjs

# 2. Start frontend
npm run dev

# 3. Scrape with THEIR credentials
$env:CREW_USERNAME='THEIR_ID'
$env:CREW_PASSWORD='THEIR_PASSWORD'
node crew-scraper.cjs
```

## ✅ Summary

- ✅ Any ABX pilot can use it
- ✅ Each pilot uses their own login
- ✅ Data stays private and secure
- ✅ Backend supports multiple users
- ✅ Family sharing with access codes
- ✅ Push notifications work for everyone
- ✅ Install on phone like native app
- ✅ Free and self-hosted

**Your credentials + This app = Your personal flight scheduling system!** 🎉

Need help? Check `ABX_PILOT_GUIDE.md` for detailed setup instructions.
