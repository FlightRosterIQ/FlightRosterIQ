# Crew Schedule Scraper - Next.js Integration

This project integrates a web scraper for airline crew portals with a Next.js application, allowing you to retrieve and manage crew scheduling data through a modern web interface.

## 🚀 Features

- **Next.js API Routes**: Serverless functions for crew portal scraping
- **Multiple Airlines**: Support for ABX Air and ATI portals
- **Real-time Scraping**: On-demand schedule data extraction
- **REST API**: Full CRUD operations for schedule management
- **Vercel Ready**: Optimized for deployment on Vercel
- **400+ Users Ready**: Scalable architecture for production use

## 📁 File Structure

```
crew-schedule-app/
├── pages/
│   ├── api/
│   │   ├── scrape.js          # Main scraping endpoint
│   │   └── schedule.js        # Schedule management API
│   └── scraper.js             # Test interface page
├── crew-scraper.cjs           # Core scraper logic
├── next.config.js             # Next.js configuration
├── .env.example               # Environment variables template
└── package.json               # Dependencies
```

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
npm install next react react-dom puppeteer
```

### 2. Environment Configuration

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
CREW_USERNAME=your_portal_username
CREW_PASSWORD=your_portal_password
CREW_AIRLINE=ABX Air
```

### 3. Development Server

```bash
npm run dev
```

Visit `http://localhost:3000/scraper` to test the interface.

## 🔌 API Endpoints

### Scraping Endpoint
```http
POST /api/scrape
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password",
  "airline": "ABX Air"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "duties": [...],
    "pageTitle": "Crew Portal",
    "url": "https://...",
    "timestamp": "2025-12-08T..."
  },
  "timestamp": "2025-12-08T...",
  "message": "Schedule data retrieved successfully"
}
```

### Schedule Management
```http
GET /api/schedule?action=airlines
GET /api/schedule?action=status

POST /api/schedule
{
  "action": "import",
  "data": {
    "schedule": [...],
    "notifications": [...],
    "username": "pilot123"
  }
}
```

## 🚀 Deployment to Vercel

### 1. Connect Repository
- Push your code to GitHub/GitLab
- Import project in Vercel Dashboard

### 2. Environment Variables
Add these in Vercel Dashboard → Settings → Environment Variables:
- `CREW_USERNAME`
- `CREW_PASSWORD`  
- `CREW_AIRLINE`

### 3. Deploy
Vercel will automatically deploy on git push.

**Live API Example:**
```
https://your-app.vercel.app/api/scrape
```

## 🧪 Testing the Integration

### Frontend Usage
```javascript
// pages/your-app.js
import { useState } from 'react';

export default function YourApp() {
  const [scheduleData, setScheduleData] = useState(null);

  const fetchSchedule = async () => {
    const response = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'your_username',
        password: 'your_password',
        airline: 'ABX Air'
      })
    });
    
    const result = await response.json();
    if (result.success) {
      setScheduleData(result.data);
    }
  };

  return (
    <div>
      <button onClick={fetchSchedule}>Get My Schedule</button>
      {scheduleData && (
        <div>
          <h3>Schedule Data:</h3>
          <pre>{JSON.stringify(scheduleData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

### Direct API Usage
```javascript
// External applications
const response = await fetch('https://your-app.vercel.app/api/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: process.env.CREW_USERNAME,
    password: process.env.CREW_PASSWORD,
    airline: 'ABX Air'
  })
});

const scheduleData = await response.json();
```

## ⚡ Performance & Scaling

### Vercel Limits
- **Free Plan**: 10-second execution limit
- **Pro Plan**: 60-second execution limit
- **Enterprise**: Up to 900 seconds

### For 400+ Users
1. **Caching**: Implement Redis caching for frequent requests
2. **Database**: Add PostgreSQL/MongoDB for persistent storage  
3. **Queue System**: Use Vercel Cron Jobs or external task queues
4. **Rate Limiting**: Implement API rate limiting

### Optimization Tips
```javascript
// Enable caching in API routes
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  // ... scraping logic
}
```

## 🔐 Security Best Practices

1. **Environment Variables**: Never commit credentials
2. **API Keys**: Use JWT tokens for API access
3. **Rate Limiting**: Prevent abuse with request limits
4. **HTTPS Only**: Force secure connections

## 📊 Monitoring & Logging

```javascript
// Add to your API routes
console.log('🚀 Scraper started for user:', username);
console.log('📊 Extracted duties:', data.duties.length);
console.log('⏱️ Execution time:', Date.now() - startTime, 'ms');
```

## 🐛 Troubleshooting

### Common Issues

1. **Puppeteer in Serverless**
   ```javascript
   // Add to puppeteer.launch()
   args: [
     '--no-sandbox',
     '--disable-setuid-sandbox',
     '--disable-dev-shm-usage'
   ]
   ```

2. **Timeout Errors**
   - Increase Vercel timeout (Pro plan)
   - Optimize scraper selectors
   - Add retry logic

3. **Memory Issues**
   - Use `--disable-dev-shm-usage`
   - Close browser instances properly
   - Limit concurrent scraping

## 📈 Next Steps

1. **Database Integration**: Add PostgreSQL for data persistence
2. **Authentication**: Implement user accounts and JWT tokens
3. **Real-time Updates**: Add WebSocket connections
4. **Mobile App**: Use existing React Native/Capacitor setup
5. **Analytics**: Track usage and performance metrics

## 🤝 Support

For issues with the scraper integration:
1. Check Vercel function logs
2. Verify environment variables
3. Test locally with `npm run dev`
4. Monitor API response times

---

**Ready for Production** ✅  
Your crew schedule scraper is now integrated with Next.js and ready to serve 400+ users on Vercel!