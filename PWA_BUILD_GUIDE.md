# PWA Build Instructions for FlightRosterIQ

## Prerequisites
- Node.js and npm installed
- All dependencies installed (`npm install`)

## Building for Production

### 1. Build the PWA
```bash
npm run build
```

This will create an optimized production build in the `dist/` folder with:
- Service worker for offline support
- Manifest.json for PWA capabilities
- Optimized and minified assets
- Cached API responses

### 2. Preview Build Locally
```bash
npm run preview
```

Test the production build locally before deployment.

### 3. Deploy

#### Option A: Vercel (Recommended for Frontend)
```bash
npm install -g vercel
vercel --prod
```

#### Option B: Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

#### Option C: Manual Deployment
1. Upload the `dist/` folder contents to your web host
2. Ensure HTTPS is enabled
3. Configure proper routing (SPA fallback to index.html)

## Creating App Icons

You need to create icons in these sizes:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512

### Quick Icon Generation:
1. Create a 512x512 master icon
2. Use online tools:
   - https://realfavicongenerator.net/
   - https://www.pwabuilder.com/imageGenerator

3. Place generated icons in `public/icons/` folder

## Converting to Android App (Play Store)

### Using PWABuilder (Easiest Method)

1. Deploy your PWA to a live URL with HTTPS
2. Go to https://www.pwabuilder.com/
3. Enter your deployed URL
4. Click "Start" to analyze your PWA
5. Fix any issues highlighted
6. Click "Package" → "Android"
7. Choose "Trusted Web Activity"
8. Download the Android package
9. Sign the APK with your keystore:
   ```bash
   jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore my-release-key.keystore app-release-unsigned.apk alias_name
   ```
10. Submit to Google Play Console

### Requirements for Play Store:
- ✅ Valid manifest.json (included)
- ✅ Service worker (included)
- ✅ HTTPS deployment
- ✅ Icons (need to generate)
- ✅ Screenshots for Play Store listing
- Google Play Console account ($25 one-time fee)

## Testing PWA Features

### Test on Mobile:
1. Deploy to a test URL
2. Open in Chrome/Safari on mobile
3. Look for "Add to Home Screen" prompt
4. Install the app
5. Test offline functionality:
   - Turn off WiFi/data
   - App should still load
   - Cached data should be available

### Lighthouse Score:
```bash
npm install -g lighthouse
lighthouse https://your-deployed-url.com --view
```

Target scores:
- Performance: 90+
- PWA: 100
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

## Manifest Configuration

The manifest.json includes:
- ✅ App name and short name
- ✅ Description
- ✅ Icons (all required sizes)
- ✅ Theme colors
- ✅ Display mode (standalone)
- ✅ Start URL
- ✅ Orientation (portrait)
- ✅ Categories
- ✅ Shortcuts (Daily/Monthly views)

## Service Worker Features

Configured caching strategies:
- **NetworkFirst**: API calls (fresh data when online)
- **CacheFirst**: Images and fonts (fast loading)
- Offline fallback for all routes
- Automatic cache cleanup
- 24-hour API cache expiration

## Deployment Checklist

- [ ] Build production version (`npm run build`)
- [ ] Test locally (`npm run preview`)
- [ ] Generate all icon sizes
- [ ] Update backend URL in production
- [ ] Deploy to HTTPS hosting
- [ ] Test on multiple devices
- [ ] Verify offline functionality
- [ ] Run Lighthouse audit
- [ ] Test "Add to Home Screen"
- [ ] Create screenshots for app stores
- [ ] Submit to PWABuilder for Android package
- [ ] Create Play Store listing
- [ ] Submit for review

## Environment Variables for Production

Create `.env.production` in crew-schedule-app:
```
VITE_API_URL=https://your-backend.onrender.com
```

Update backend server URL in App.jsx or use environment variable.

## Support

For issues or questions:
- Email: FlightRosterIQ@Gmail.com
- Check PWA requirements: https://web.dev/pwa-checklist/
