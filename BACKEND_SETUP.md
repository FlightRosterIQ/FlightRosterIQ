# FlightRosterIQ Backend API - Complete Setup ✅

## Backend Architecture

### Technology Stack
- **Express.js** - Fast, minimalist web framework
- **JWT** - JSON Web Token authentication
- **Puppeteer** - Real crew portal authentication & scraping
- **CORS** - Cross-origin resource sharing
- **In-memory storage** - User data, friends, messages (replace with database in production)

### Server Details
- **Port**: 8080
- **Host**: 0.0.0.0 (accessible from network)
- **Authentication**: JWT with 7-day expiration
- **CORS**: Enabled for all origins

## API Endpoints

### 🔐 Authentication
```
POST /api/authenticate
Body: { employeeId, password, airline }
Response: { success, authenticated, token, user }
```
- Real crew portal authentication via Puppeteer
- Supports ABX Air and ATI portals
- Returns JWT token for subsequent requests

### 📅 Schedule Management
```
GET /api/schedule
Headers: Authorization: Bearer <token>
Response: { employeeId, airline, month, flights, lastUpdated }
```
- Returns pilot's flight schedule
- Includes crew, aircraft, hotel info
- Cached and updated automatically

### 👥 Friends System
```
GET /api/friends
Headers: Authorization: Bearer <token>
Response: Array of friend objects

POST /api/friends/request
Body: { targetEmployeeId }
Response: { success, message }

POST /api/friends/accept
Body: { friendEmployeeId }
Response: { success, message }
```

### 💬 Messaging
```
GET /api/messages/:friendId
Headers: Authorization: Bearer <token>
Response: Array of message objects

POST /api/messages/send
Body: { to, message }
Response: { success, message }
```

### ❤️ Family Sharing
```
POST /api/family/generate-code
Body: { memberName }
Response: { success, code, memberName }

GET /api/family/get-codes
Response: Array of family access codes

DELETE /api/family/revoke-code/:code
Response: { success, message }
```

### 🔔 Notifications
```
GET /api/notifications
Response: Array of notification objects

POST /api/notifications/dismiss
Body: { notificationId }
Response: { success }
```

### 🔍 Search
```
POST /api/search-users
Body: { query }
Response: Array of user objects
```

### 📊 Additional Endpoints
```
GET /api/health
GET /api/roster-updates
POST /api/weather
GET /api/subscription/status
```

## Installation

### 1. Install Dependencies
```bash
cd backend
npm install
```

**Required packages:**
- express@^4.18.2
- cors@^2.8.5
- jsonwebtoken@^9.0.2
- puppeteer@^21.0.0
- nodemon@^3.0.1 (dev)

### 2. Environment Variables (Optional)
```bash
# backend/.env
PORT=8080
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

### 3. Start Server

**Development:**
```bash
npm run dev
# Uses nodemon for auto-restart
```

**Production:**
```bash
npm start
# Runs node server.js
```

**Windows Quick Start:**
```bash
# From project root
start-backend.bat
```

## Frontend Connection

### Environment Files
**.env.development**
```
VITE_API_URL=http://localhost:8080
```

**.env.production**
```
VITE_API_URL=http://157.245.126.24:8080
```

### API Helper (src/App.jsx)
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`
  const defaultOptions = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  }
  const response = await fetch(url, defaultOptions)
  return response
}
```

## Authentication Flow

### 1. User Login (Frontend)
```javascript
const handleLogin = async (e) => {
  const response = await apiCall('/api/authenticate', {
    method: 'POST',
    body: JSON.stringify({
      employeeId: credentials.username,
      password: credentials.password,
      airline: airline
    })
  })
  
  const data = await response.json()
  if (data.success) {
    setToken(data.token)
    // Store token in localforage
  }
}
```

### 2. Backend Authentication
- Launches Puppeteer browser
- Navigates to crew portal (ABX/ATI)
- Fills credentials and submits
- Validates successful login
- Generates JWT token
- Returns user data + token

### 3. Subsequent Requests
```javascript
const fetchSchedule = async () => {
  const response = await apiCall('/api/schedule', {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${token}`
    }
  })
}
```

### 4. JWT Verification (Backend)
```javascript
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' })
    req.user = user
    next()
  })
}
```

## Data Storage

### Current: In-Memory Maps
```javascript
const users = new Map()        // User profiles
const friends = new Map()      // Friend relationships
const messages = new Map()     // Chat messages
const familyCodes = new Map()  // Family access codes
const notifications = new Map() // User notifications
```

**⚠️ Warning**: Data is lost on server restart!

### Production: Database Integration
Replace with:
- **PostgreSQL** - User data, friends, messages
- **Redis** - Session management, caching
- **MongoDB** - Schedule data, logs

Example:
```javascript
// Replace
users.set(employeeId, userData)

// With
await db.users.create(userData)
```

## Puppeteer Configuration

### Browser Launch Options
```javascript
browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
  ]
})
```

### Portal URLs
```javascript
const PORTALS = {
  abx: 'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp',
  ati: 'https://crew.atitransport.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp'
}
```

## Error Handling

### Authentication Errors
- **400**: Missing credentials
- **401**: Invalid credentials
- **500**: Server/connection error

### Protected Route Errors
- **401**: No token provided
- **403**: Invalid/expired token

### Example Error Response
```json
{
  "success": false,
  "error": "Invalid crew portal credentials",
  "message": "Please check your employee ID and password"
}
```

## Testing

### 1. Health Check
```bash
curl http://localhost:8080/api/health
```

### 2. Authentication Test
```bash
curl -X POST http://localhost:8080/api/authenticate \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"12345","password":"yourpass","airline":"abx"}'
```

### 3. Protected Route Test
```bash
curl http://localhost:8080/api/schedule \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Security Considerations

### Current Implementation (Development)
- ✅ JWT authentication
- ✅ CORS enabled
- ✅ Password not stored
- ✅ Token expiration (7 days)
- ⚠️ Wildcard CORS (allow all origins)
- ⚠️ Default JWT secret
- ⚠️ No rate limiting
- ⚠️ No HTTPS

### Production Recommendations
1. **Use strong JWT secret** (environment variable)
2. **Restrict CORS** to specific domains
3. **Add rate limiting** (express-rate-limit)
4. **Enable HTTPS** (Let's Encrypt)
5. **Add request validation** (joi, express-validator)
6. **Implement logging** (winston, morgan)
7. **Add error monitoring** (Sentry)
8. **Use real database** (PostgreSQL + Redis)
9. **Add input sanitization**
10. **Implement refresh tokens**

## Deployment

### VPS Deployment (Current: 157.245.126.24)
```bash
# 1. SSH to VPS
ssh root@157.245.126.24

# 2. Navigate to project
cd /root/crew-schedule-app

# 3. Pull latest code
git pull origin dev

# 4. Install backend dependencies
cd backend
npm install

# 5. Start with PM2
pm2 start server.js --name flightroster-backend
pm2 save
pm2 startup
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .
EXPOSE 8080
CMD ["node", "server.js"]
```

```bash
docker build -t flightroster-backend .
docker run -p 8080:8080 -d flightroster-backend
```

## Logs & Monitoring

### Console Logs
```
🚀 FlightRosterIQ Backend API
🌐 Server running on port 8080
🔐 Authentication attempt: ABX pilot 12345
✅ Authentication successful!
📅 Fetching schedule for: 12345
```

### Add Production Logging
```javascript
const winston = require('winston')

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
})
```

## Status

✅ **Ready for Development**
- All endpoints implemented
- JWT authentication working
- Puppeteer integration configured
- CORS enabled
- Frontend connected

🔄 **Needs for Production**
- Database integration
- Rate limiting
- Enhanced security
- Error monitoring
- Performance optimization
- Load testing

## Quick Start Commands

```bash
# Start backend only
cd backend && npm start

# Start backend with auto-reload
cd backend && npm run dev

# Start everything (from root)
npm run dev & cd backend && npm start

# Windows batch script
start-backend.bat
```

## Support

For backend issues:
1. Check server logs in terminal
2. Verify port 8080 is not in use
3. Ensure dependencies installed
4. Check firewall settings
5. Test health endpoint first

**Backend is ready to receive requests from the frontend! 🚀**
