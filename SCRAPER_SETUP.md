# Crew Portal Scraper Setup Guide

⚠️ **IMPORTANT DISCLAIMER**: This scraper is for personal use only. Automated access to crew portals may violate Terms of Service. Use at your own risk.

## Prerequisites

1. Node.js installed (v16+)
2. Backend server running (`node server-simple.cjs`)
3. Airline crew portal credentials

## Installation

1. Install required dependencies:
```bash
npm install puppeteer node-cron
```

## Configuration

### Option 1: Environment Variables (Recommended - More Secure)

**Windows (PowerShell):**
```powershell
$env:CREW_USERNAME="your_username"
$env:CREW_PASSWORD="your_password"
node crew-scraper.js
```

**Windows (Command Prompt):**
```cmd
set CREW_USERNAME=your_username
set CREW_PASSWORD=your_password
node crew-scraper.js
```

### Option 2: Edit Configuration File (Less Secure)

Edit `crew-scraper.js` and update the CONFIG section:
```javascript
const CONFIG = {
  username: 'your_username',  // Your crew portal username
  password: 'your_password',  // Your crew portal password
  // ... rest of config
};
```

⚠️ **NEVER commit this file to git if you hardcode credentials!**

## Setup Steps

### Step 1: Find the Correct Selectors

The scraper needs to know the HTML structure of your crew portal. Here's how to find it:

1. Open Chrome/Edge browser
2. Go to your crew portal: https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp
3. Right-click on the **username field** → Click "Inspect"
4. Find the `<input>` tag and note its attributes (name, id, class)
5. Repeat for **password field** and **login button**
6. Update these lines in `crew-scraper.js`:

```javascript
const usernameSelector = 'input[name="username"]'; // Update with actual selector
const passwordSelector = 'input[name="password"]'; // Update with actual selector
const loginButtonSelector = 'button[type="submit"]'; // Update with actual selector
```

**Common selector patterns:**
- By name: `input[name="username"]`
- By ID: `#username`
- By class: `.username-input`
- By placeholder: `input[placeholder="Username"]`

### Step 2: Find Schedule Table Selectors

After login, inspect the schedule table:

1. Right-click on a flight row → Inspect
2. Find the table structure
3. Update these selectors in the `page.evaluate()` section:

```javascript
const flightRows = document.querySelectorAll('.flight-row, tr.pairing-row, .schedule-item');
```

### Step 3: Test the Scraper

Run with browser visible (for debugging):

```bash
node crew-scraper.js
```

This will:
- Open Chrome browser (you'll see it)
- Attempt to login
- Extract schedule data
- Save to `scraped-schedule.json`
- Send data to backend

**If login fails:**
- Check `login-error.png` screenshot
- Check `portal-page.html` for HTML structure
- Update selectors accordingly

### Step 4: Run in Headless Mode

Once selectors are correct, edit `crew-scraper.js`:

```javascript
const CONFIG = {
  // ...
  headless: true, // Change to true
};
```

## Usage

### One-Time Scrape

```bash
node crew-scraper.js
```

### Scheduled Scraping (Daily at 6:00 AM)

```bash
node crew-scraper.js --schedule
```

Keep this terminal running to maintain the schedule.

### Run as Background Service (Windows)

Create `run-scraper.bat`:
```batch
@echo off
set CREW_USERNAME=your_username
set CREW_PASSWORD=your_password
node crew-scraper.js --schedule
```

Run as Windows scheduled task or use a process manager like PM2.

## Output Files

- `scraped-schedule.json` - Extracted schedule data
- `login-error.png` - Screenshot if login fails (debugging)
- `portal-page.html` - Page HTML for inspection (debugging)

## Troubleshooting

### Problem: "Login failed" error

**Solution:**
1. Open `login-error.png` to see what the page looks like
2. Check if there's a CAPTCHA or 2FA
3. Update selectors in the script
4. Try running with `headless: false` to watch what happens

### Problem: No flights found

**Solution:**
1. Check `portal-page.html` to see the actual HTML
2. Right-click on flight rows in real portal → Inspect
3. Update the `.flight-row` selector and data extraction code
4. The portal might load data via JavaScript - add longer waits

### Problem: "Cannot find module 'puppeteer'"

**Solution:**
```bash
npm install puppeteer node-cron
```

### Problem: Data not showing in app

**Solution:**
1. Check backend is running: http://localhost:3001/api/schedule/status
2. Should show `"hasScrapedData": true`
3. Refresh the FlightRosterIQ app

## Security Best Practices

1. ✅ Use environment variables for credentials
2. ✅ Add `crew-scraper.js` to `.gitignore` if you hardcode credentials
3. ✅ Don't share your `scraped-schedule.json` file (contains your data)
4. ✅ Run scraper on your local machine only
5. ✅ Don't run too frequently (respect portal server)
6. ⚠️ Understand this may violate Terms of Service

## Advanced: Handling 2FA

If your crew portal has Two-Factor Authentication:

1. Use SMS/Email code:
   - Script pauses and prompts for code
   - You enter it manually
   
2. Use Authenticator app:
   - Install `speakeasy` package
   - Add TOTP token generation

3. Stay logged in:
   - Save session cookies
   - Reuse them on subsequent runs

## Next Steps

Once scraper is working:
1. Set up daily scheduled runs
2. Monitor for portal changes (will break scraper)
3. Consider building a browser extension instead (more reliable)

## Support

If you need help configuring the selectors, run the scraper with `headless: false` and provide:
- Screenshot of the login page
- Screenshot of the schedule page
- Contents of `portal-page.html`
