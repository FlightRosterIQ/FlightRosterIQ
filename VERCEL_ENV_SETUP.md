# Vercel Environment Variables Setup

## Required for ALL environments (Production, Preview, Development)

Navigate to your Vercel project settings:
https://vercel.com/[your-team]/flightrosteriq/settings/environment-variables

### Add these environment variables:

| Variable Name | Value | Environments |
|--------------|-------|--------------|
| `VITE_API_URL` | `http://157.245.126.24:8080` | Production, Preview, Development |

### Steps:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Click "Add New"
3. Name: `VITE_API_URL`
4. Value: `http://157.245.126.24:8080`
5. **Check all three boxes:** Production, Preview, Development
6. Click "Save"
7. Redeploy your preview branch

### Why this is needed:
- Production uses `.env.production` (works fine)
- Preview deployments need the same vars configured in Vercel dashboard
- Without this, preview builds use default `localhost:8080` which breaks the app

### Verify after setup:
```bash
# In your preview deployment, check the API URL in console:
console.log(import.meta.env.VITE_API_URL)
# Should output: http://157.245.126.24:8080
```

## Current Environment Files:
- `.env.development` - Local development (localhost:8080)
- `.env.production` - Production builds (157.245.126.24:8080)  
- `.env.preview` - Preview builds (157.245.126.24:8080)

Note: Vercel reads `.env.production` for production, but Preview deployments need variables set in the dashboard.
