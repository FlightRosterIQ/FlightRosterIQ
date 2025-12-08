# FlightRosterIQ - ABX Air Pilot Guide

## ✈️ For Any ABX Air Pilot

Yes! **Any ABX Air pilot can use this app with their own crew portal login credentials.**

## 🚀 Quick Setup for ABX Air Pilots

### Step 1: Clone or Download the App

```powershell
git clone [repository-url]
cd crew-schedule-app
npm install
```

### Step 2: Start the Backend Server

```powershell
node server-simple.cjs
```

Keep this running in one terminal.

### Step 3: Start the Frontend

Open a new terminal:

```powershell
npm run dev
```

The app will be available at:
- **Computer:** http://localhost:5173/
- **Phone (same WiFi):** http://[YOUR_IP]:5173/
  - Find your IP: `ipconfig` (look for IPv4 Address)

### Step 4: Run the Scraper with YOUR Credentials

**Option A: Set Environment Variables (Recommended)**

```powershell
$env:CREW_USERNAME='YOUR_CREW_ID'
$env:CREW_PASSWORD='YOUR_PASSWORD'
node crew-scraper.cjs
```

**Option B: Edit Config File (Not Recommended - Never Commit!)**

Edit `crew-scraper.cjs`:
```javascript
const CONFIG = {
  username: 'YOUR_CREW_ID',  // Your crew portal ID
  password: 'YOUR_PASSWORD',  // Your crew portal password
  // ... rest of config
};
```

⚠️ **IMPORTANT:** If you edit the file, add `crew-scraper.cjs` to `.gitignore` to prevent accidentally committing your credentials!

## 📱 Using the App

### 1. Login to the App
- Open http://localhost:5173/
- Click **ABX Air**
- Login with any username/password (mock auth for testing)
- Or use Family Access with a generated code

### 2. View Your Schedule
- The scraper imports YOUR actual schedule from ABX crew portal
- Shows flights, hotels, crew members
- Updates automatically

### 3. Notifications
- Get alerts from Remarks tab
- Accept notifications to receive push alerts
- Works like text messages on your phone

### 4. Install on Phone
- Open the app URL on your phone
- Tap "Add to Home Screen"
- Get push notifications even when app is closed!

## 🔐 Security & Privacy

### Your Credentials Are Safe
- ✅ Stored only in environment variables or local config
- ✅ Never sent to any third party
- ✅ Never committed to git (if you follow instructions)
- ✅ Only used to login to official ABX crew portal
- ✅ Data stays on YOUR computer/network

### Multi-User Support
The system now supports multiple pilots:
- Each pilot runs the scraper with their own credentials
- Backend stores schedules per username
- No data sharing between users
- Each user sees only their own data

## 🔄 Running the Scraper Automatically

### Option 1: Manual Run
Run whenever you want updated data:
```powershell
$env:CREW_USERNAME='YOUR_CREW_ID'
$env:CREW_PASSWORD='YOUR_PASSWORD'
node crew-scraper.cjs
```

### Option 2: Scheduled Runs
The scraper has built-in scheduling (disabled by default):

Edit `crew-scraper.cjs` at the bottom:
```javascript
// Uncomment to run automatically
scheduleScraper(); // Runs daily at 6:00 AM
```

Or use Windows Task Scheduler:
1. Open Task Scheduler
2. Create new task
3. Trigger: Daily at 6:00 AM
4. Action: Run `node crew-scraper.cjs`
5. Set environment variables in task settings

## 📊 What Gets Scraped

✅ **Your Schedule:**
- Flight pairings
- Flight numbers, aircraft, routes
- Departure/arrival times
- Hotel information

✅ **Crew Information:**
- Crew member names
- Ranks (CA, FO)
- Seniority numbers
- Phone numbers
- Home bases

✅ **Notifications:**
- Remarks from scheduler
- Remarks to scheduler
- Schedule changes
- General crew portal messages

## 🤝 Sharing with Family

Generate family access codes in Settings:
1. Go to Settings → Family tab
2. Enter family member name
3. Generate code
4. Share code with family
5. They can login and see your schedule (read-only)

## 🐛 Troubleshooting

### "Invalid credentials" error
- Double-check your crew ID and password
- Make sure you can login at https://crew.abxair.com/
- Check for typos in environment variables

### Scraper finds 0 flights
- ABX portal HTML may have changed
- Check `portal-expanded.html` file created by scraper
- Selectors may need updating

### Can't connect to backend
- Make sure backend is running: `node server-simple.cjs`
- Backend should show "Mock server running on http://localhost:3001"
- Check firewall settings

### Phone can't access app
- Make sure phone is on same WiFi
- Use the Network URL shown when running `npm run dev`
- Check computer firewall (allow port 5173)

## 📞 Support

This is a self-hosted app running on YOUR computer with YOUR credentials. 

**Data Flow:**
1. Your computer → ABX crew portal (with your credentials)
2. ABX portal → Your computer (your schedule data)
3. Your computer → Your phone (on your local network)

**No external servers involved!**

## 🎯 Features for ABX Pilots

✈️ **Schedule Management:**
- View daily, weekly, monthly schedules
- See flight details, aircraft types
- Track hotels and layovers
- View crew assignments

👥 **Crew Coordination:**
- See who you're flying with
- Contact information available
- Add crew members as friends
- Chat functionality

🔔 **Smart Notifications:**
- Remarks from scheduler
- Schedule changes
- Aircraft changes
- Push notifications to phone

📱 **PWA (Progressive Web App):**
- Install on phone like native app
- Works offline
- Push notifications
- Fast and responsive

🌍 **Weather & Tracking:**
- Weather for airports
- Aircraft tracking
- Real-time updates

## 🔒 Best Practices

1. **Never commit credentials to git**
2. **Use environment variables**
3. **Keep app updated**
4. **Review `.gitignore` before committing**
5. **Don't share your access codes publicly**
6. **Run on secure network**
7. **Keep backend server private (localhost only)**

## ⚡ Quick Start Commands

```powershell
# Terminal 1 - Backend
node server-simple.cjs

# Terminal 2 - Frontend  
npm run dev

# Terminal 3 - Scraper (with YOUR credentials)
$env:CREW_USERNAME='YOUR_ID'
$env:CREW_PASSWORD='YOUR_PASSWORD'
node crew-scraper.cjs
```

Then open http://localhost:5173/ and start using the app!

## 📝 Current Example User

The repository includes example data from crew ID `152780`. This is just test data. When you run the scraper with YOUR credentials, it will:
- Fetch YOUR schedule
- Show YOUR flights
- Get YOUR crew information
- Display YOUR notifications

Your data completely replaces the example data.

## 🎉 Enjoy!

You now have a modern, mobile-first crew scheduling app with:
- ✅ Your real ABX schedule
- ✅ Push notifications
- ✅ Crew coordination
- ✅ Weather & tracking
- ✅ Family sharing
- ✅ Offline support
- ✅ Works on any device

**Fly safe!** ✈️
