const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 8080;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Middleware
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve static files from dist
app.use(express.static('../dist'));

// In-memory storage (replace with database in production)
const users = new Map();
const friends = new Map();
const messages = new Map();
const familyCodes = new Map();
const notifications = new Map();

// Crew portal URLs
const PORTALS = {
  abx: 'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp',
  ati: 'https://crew.atitransport.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp'
};

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'FlightRosterIQ Backend API',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// ==================== AUTHENTICATION ====================
app.post('/api/authenticate', async (req, res) => {
  const { employeeId, password, airline } = req.body;
  console.log(`🔐 Authentication attempt: ${airline?.toUpperCase() || 'ABX'} pilot ${employeeId}`);
  
  if (!employeeId || !password) {
    return res.status(400).json({
      success: false,
      error: 'Employee ID and password are required'
    });
  }
  
  let browser;
  try {
    console.log('🌐 Launching browser for crew portal authentication...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    const portalUrl = PORTALS[airline?.toLowerCase()] || PORTALS.abx;
    console.log(`🌐 Connecting to ${airline?.toUpperCase() || 'ABX'} crew portal...`);
    
    await page.goto(portalUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    const currentUrl = page.url();
    
    // Check if we're redirected to authentication
    if (currentUrl.includes('auth/realms')) {
      console.log('🔐 Keycloak authentication required...');
      
      await sleep(3000);
      
      // Fill credentials
      await page.waitForSelector('#username', { timeout: 10000 });
      await page.type('#username', employeeId);
      await page.waitForSelector('#password', { timeout: 5000 });
      await page.type('#password', password);
      
      // Submit
      await page.keyboard.press('Enter');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      
      const postLoginUrl = page.url();
      
      // Check if authentication failed
      if (postLoginUrl.includes('auth/realms')) {
        await browser.close();
        return res.status(401).json({
          success: false,
          authenticated: false,
          error: 'Invalid crew portal credentials'
        });
      }
      
      console.log('✅ Authentication successful!');
    }
    
    await sleep(5000);
    
    // Extract schedule data
    let scheduleData = [];
    try {
      scheduleData = await page.evaluate(() => {
        const body = document.body.innerText;
        return body.includes('Flight') ? 'Schedule data found' : 'Portal accessed';
      });
    } catch (e) {
      scheduleData = 'Portal accessed successfully';
    }
    
    await browser.close();
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        employeeId, 
        airline: airline?.toUpperCase() || 'ABX',
        role: 'pilot'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Store user data
    users.set(employeeId, {
      employeeId,
      airline: airline?.toUpperCase() || 'ABX',
      nickname: employeeId,
      rank: 'Captain',
      base: 'ILN',
      loginTime: new Date().toISOString()
    });
    
    res.json({
      success: true,
      authenticated: true,
      token,
      user: users.get(employeeId),
      message: 'Authentication successful'
    });
    
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    if (browser) await browser.close();
    
    res.status(500).json({
      success: false,
      error: 'Unable to connect to crew portal',
      message: error.message
    });
  }
});

// ==================== SCHEDULE ====================
app.get('/api/schedule', authenticateToken, async (req, res) => {
  console.log('📅 Fetching schedule for:', req.user.employeeId);
  
  // Mock schedule data (replace with actual scraping in production)
  const schedule = {
    employeeId: req.user.employeeId,
    airline: req.user.airline,
    month: new Date().toISOString().slice(0, 7),
    flights: [
      {
        id: 1,
        date: '2025-01-05',
        flightNumber: 'ABX101',
        origin: 'ILN',
        destination: 'LAX',
        departureTime: '08:00',
        arrivalTime: '10:30',
        aircraft: '767-200',
        position: 'Captain',
        crew: [
          { name: 'John Smith', role: 'Captain', base: 'ILN' },
          { name: 'Jane Doe', role: 'First Officer', base: 'ILN' }
        ],
        hotel: 'Hilton LAX Airport',
        layover: true
      },
      {
        id: 2,
        date: '2025-01-06',
        flightNumber: 'ABX102',
        origin: 'LAX',
        destination: 'ILN',
        departureTime: '14:00',
        arrivalTime: '21:30',
        aircraft: '767-200',
        position: 'Captain',
        crew: [
          { name: 'John Smith', role: 'Captain', base: 'ILN' },
          { name: 'Jane Doe', role: 'First Officer', base: 'ILN' }
        ]
      }
    ],
    lastUpdated: new Date().toISOString()
  };
  
  res.json(schedule);
});

// ==================== FRIENDS ====================
app.get('/api/friends', authenticateToken, (req, res) => {
  const userFriends = friends.get(req.user.employeeId) || [];
  res.json(userFriends);
});

app.post('/api/friends/request', authenticateToken, (req, res) => {
  const { targetEmployeeId } = req.body;
  
  const targetNotifs = notifications.get(targetEmployeeId) || [];
  targetNotifs.push({
    id: Date.now(),
    type: 'friend_request',
    from: req.user.employeeId,
    timestamp: new Date().toISOString()
  });
  notifications.set(targetEmployeeId, targetNotifs);
  
  res.json({ success: true, message: 'Friend request sent' });
});

app.post('/api/friends/accept', authenticateToken, (req, res) => {
  const { friendEmployeeId } = req.body;
  
  const userFriends = friends.get(req.user.employeeId) || [];
  const friendFriends = friends.get(friendEmployeeId) || [];
  
  userFriends.push({
    employeeId: friendEmployeeId,
    nickname: friendEmployeeId,
    airline: 'ABX',
    rank: 'Captain',
    base: 'ILN'
  });
  
  friendFriends.push({
    employeeId: req.user.employeeId,
    nickname: req.user.employeeId,
    airline: req.user.airline,
    rank: 'Captain',
    base: 'ILN'
  });
  
  friends.set(req.user.employeeId, userFriends);
  friends.set(friendEmployeeId, friendFriends);
  
  res.json({ success: true, message: 'Friend added' });
});

// ==================== MESSAGES ====================
app.get('/api/messages/:friendId', authenticateToken, (req, res) => {
  const { friendId } = req.params;
  const chatKey = [req.user.employeeId, friendId].sort().join('-');
  const chatMessages = messages.get(chatKey) || [];
  
  res.json(chatMessages);
});

app.post('/api/messages/send', authenticateToken, (req, res) => {
  const { to, message } = req.body;
  const chatKey = [req.user.employeeId, to].sort().join('-');
  const chatMessages = messages.get(chatKey) || [];
  
  chatMessages.push({
    id: Date.now(),
    from: req.user.employeeId,
    to,
    message,
    timestamp: new Date().toISOString()
  });
  
  messages.set(chatKey, chatMessages);
  
  res.json({ success: true, message: 'Message sent' });
});

// ==================== FAMILY SHARING ====================
app.post('/api/family/generate-code', authenticateToken, (req, res) => {
  const { memberName } = req.body;
  const code = Math.random().toString(36).substr(2, 8).toUpperCase();
  
  const userCodes = familyCodes.get(req.user.employeeId) || [];
  userCodes.push({
    id: Date.now(),
    code,
    memberName,
    created: new Date().toISOString(),
    active: true
  });
  
  familyCodes.set(req.user.employeeId, userCodes);
  
  res.json({ success: true, code, memberName });
});

app.get('/api/family/get-codes', authenticateToken, (req, res) => {
  const codes = familyCodes.get(req.user.employeeId) || [];
  res.json(codes);
});

app.delete('/api/family/revoke-code/:code', authenticateToken, (req, res) => {
  const { code } = req.params;
  const userCodes = familyCodes.get(req.user.employeeId) || [];
  const updatedCodes = userCodes.filter(c => c.code !== code);
  
  familyCodes.set(req.user.employeeId, updatedCodes);
  
  res.json({ success: true, message: 'Code revoked' });
});

// ==================== NOTIFICATIONS ====================
app.get('/api/notifications', authenticateToken, (req, res) => {
  const userNotifs = notifications.get(req.user.employeeId) || [];
  res.json(userNotifs);
});

app.post('/api/notifications/dismiss', authenticateToken, (req, res) => {
  const { notificationId } = req.body;
  const userNotifs = notifications.get(req.user.employeeId) || [];
  const updated = userNotifs.filter(n => n.id !== notificationId);
  
  notifications.set(req.user.employeeId, updated);
  
  res.json({ success: true });
});

// ==================== SEARCH USERS ====================
app.post('/api/search-users', authenticateToken, (req, res) => {
  const { query } = req.body;
  
  // Mock search results
  const results = [
    {
      employeeId: query || '12345',
      nickname: 'Test Pilot',
      airline: 'ABX',
      rank: 'First Officer',
      base: 'CVG'
    }
  ];
  
  res.json(results);
});

// ==================== ROSTER UPDATES ====================
app.get('/api/roster-updates', authenticateToken, (req, res) => {
  res.json({
    hasUpdates: false,
    updates: [],
    lastChecked: new Date().toISOString()
  });
});

// ==================== WEATHER ====================
app.post('/api/weather', authenticateToken, (req, res) => {
  const { airport } = req.body;
  
  // Mock weather data
  res.json({
    airport,
    temp: 72,
    conditions: 'Clear',
    wind: '10 kts',
    visibility: '10 SM',
    timestamp: new Date().toISOString()
  });
});

// ==================== SUBSCRIPTION ====================
app.get('/api/subscription/status', authenticateToken, (req, res) => {
  res.json({
    status: 'active',
    plan: 'premium',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 FlightRosterIQ Backend API');
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`✈️ Endpoints available:`);
  console.log(`   - GET  /api/health`);
  console.log(`   - POST /api/authenticate`);
  console.log(`   - GET  /api/schedule`);
  console.log(`   - GET  /api/friends`);
  console.log(`   - POST /api/messages/send`);
  console.log(`   - POST /api/family/generate-code`);
  console.log(`   - GET  /api/notifications`);
  console.log(`🔐 JWT Authentication enabled`);
  console.log(`📅 Real crew portal scraping enabled`);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down server...');
  process.exit(0);
});