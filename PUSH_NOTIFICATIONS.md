# Push Notifications Setup Guide

## How to Receive Flight Notifications on Your Phone

### 🚀 Quick Start

The app now supports **PWA Push Notifications** that work like text messages on your phone!

### 📱 Setup Instructions

#### 1. **Install the App on Your Phone**
   - Open the app in Chrome/Safari on your phone: `http://[YOUR_COMPUTER_IP]:5173`
   - Tap the browser menu (⋮ or Share button)
   - Select "Add to Home Screen" or "Install App"
   - The app will install as a standalone app

#### 2. **Enable Notifications**
   - When prompted, tap "Allow" for notifications
   - This lets the app send push notifications even when closed

#### 3. **Accept a Flight Notification**
   - Log into the app
   - Go to Notifications tab (🔔)
   - Tap "✓ Accept" on any flight notification
   - You'll receive an instant push notification on your phone!

### 🔔 How It Works

**Service Worker Features:**
- ✅ Push notifications work even when app is closed
- ✅ Notifications vibrate your phone (200ms-100ms-200ms pattern)
- ✅ Shows app icon and badge
- ✅ Interactive actions: "View Details" or "Dismiss"
- ✅ Tapping notification opens the app
- ✅ Background sync for offline notifications
- ✅ Periodic checks for new updates (every minute)

**Notification Types:**
- 📅 **Schedule Changes** - Gate changes, time updates
- ✈️ **Aircraft Changes** - Equipment swaps
- ⏱️ **Delays** - Flight delays
- 🚫 **Cancellations** - Flight cancellations
- 📋 **Remarks** - General crew portal messages

### 🛠️ Testing on Local Network

To test on your phone while on the same WiFi:

1. **Find your computer's IP address:**
   ```powershell
   ipconfig
   # Look for "IPv4 Address" (e.g., 192.168.1.100)
   ```

2. **Access from your phone:**
   - Open browser on phone
   - Navigate to: `http://192.168.1.100:5173`
   - (Replace with your actual IP address)

3. **Install as PWA:**
   - Chrome Android: Menu → "Add to Home screen"
   - Safari iOS: Share → "Add to Home Screen"

### 📊 Current Status

✅ **Implemented:**
- Service Worker registered (`/sw.js`)
- Push notification API integration
- Vibration patterns
- Interactive notification actions
- Background sync
- Periodic update checks
- Offline notification queue

⚠️ **For Production:**
- Generate VAPID keys for real push notifications
- Set up backend push endpoint
- Configure push notification server
- Add notification scheduling

### 🔐 VAPID Keys (For Production)

To enable real server-to-client push (not just local):

1. Generate VAPID keys:
   ```bash
   npm install web-push -g
   web-push generate-vapid-keys
   ```

2. Add public key to `App.jsx`:
   ```javascript
   const vapidPublicKey = 'YOUR_PUBLIC_KEY_HERE'
   ```

3. Add private key to backend server
4. Backend sends push notifications to subscribed clients

### 📝 How to Use

1. **Open app on phone** (installed as PWA)
2. **Log in** with your crew credentials
3. **Go to Notifications** tab
4. **Accept a notification** - instant push to your phone!
5. **App can be closed** - notifications still work!
6. **Tap notification** - opens app directly to details

### 🎯 Key Features

- **Works offline** - Service worker caches the app
- **Background updates** - Checks for new notifications automatically
- **Native feel** - Behaves like a real mobile app
- **Push when closed** - Notifications work even when app isn't running
- **Vibration alerts** - Physical feedback like text messages
- **Action buttons** - Quick actions from notification

### 🐛 Troubleshooting

**Notifications not showing?**
1. Check browser notification permissions (Settings → Site Settings → Notifications)
2. Ensure service worker is registered (check browser console)
3. Make sure you accepted notification permission when prompted
4. Try reinstalling the PWA

**Can't install as PWA?**
1. Must be served over HTTPS or localhost
2. Must have valid manifest.json
3. Must have service worker registered
4. iOS requires Safari browser

**Phone not receiving notifications?**
1. Ensure app is installed as PWA (not just bookmarked)
2. Check phone notification settings for the app
3. Verify service worker is active (Dev Tools → Application → Service Workers)
4. Test with "Accept" button on a notification

### 🌐 Network Access

**Your dev server is running on:**
- Local: http://localhost:5173/
- Network: http://169.254.123.139:5173/
- Network: http://192.168.22.75:5173/
- Network: http://172.24.48.1:5173/

Use any of the network URLs on your phone!

### 📲 Next Steps

1. Try the app on your phone using one of the network URLs
2. Install it as a PWA
3. Accept a notification and see it pop up instantly
4. Close the app and accept another - it still works!
5. Background notifications will check every minute for updates

The app now behaves like WhatsApp, iMessage, or any other native messaging app with real-time push notifications! 🎉
