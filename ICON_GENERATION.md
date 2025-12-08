# Icon Generation Instructions

Your logo has been added to the app! Now you need to generate all PWA icon sizes.

## Current Status:
✅ Logo added to public/logo.png
✅ Logo displayed in app header
✅ Logo displayed on login screen
✅ Base 512x512 icon created

## Generate All Icon Sizes

### Option 1: Online Tool (Easiest)
1. Go to https://realfavicongenerator.net/
2. Upload `public\logo.png`
3. Download the generated icon pack
4. Extract all files to `public\icons\` folder
5. You'll get all sizes: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

### Option 2: PWABuilder (Alternative)
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload your logo
3. Select "Android" and "iOS" options
4. Download and extract to `public\icons\`

### Option 3: Manual with Image Editor
If you have Photoshop/GIMP/Photopea:
- Resize your logo to these sizes and save as PNG:
  - icon-72x72.png
  - icon-96x96.png
  - icon-128x128.png
  - icon-144x144.png
  - icon-152x152.png
  - icon-192x192.png
  - icon-384x384.png
  - icon-512x512.png

## Icon Requirements:
- Format: PNG
- Background: Can be transparent OR use #007bff (app blue)
- Dimensions: Square (same width and height)
- Quality: High resolution, no compression

## After Generating Icons:
All icons should be placed in: `crew-schedule-app\public\icons\`

Your manifest.json is already configured to use these icons!

## Test Your Icons:
1. Run `npm run dev`
2. Open DevTools (F12)
3. Go to Application tab > Manifest
4. Check all icons are loaded correctly
