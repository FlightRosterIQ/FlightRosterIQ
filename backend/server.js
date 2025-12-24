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

// NetLine session storage (cookies from authenticated Puppeteer session)
const netlineSessions = new Map(); // Map<employeeId, { cookies, timestamp }>

// Crew portal URLs
const PORTALS = {
  abx: 'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp',
  ati: 'https://crew.atitransport.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp'
};

// NetLine API base URLs
const NETLINE_API = {
  abx: 'https://crew.abxair.com/api/netline/crew/pems/rest/pems',
  ati: 'https://crew.atitransport.com/api/netline/crew/pems/rest/pems'
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
    
    // Intercept network requests to find API endpoints
    const apiCalls = [];
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('updates') || url.includes('events') || url.includes('log') || 
          url.includes('myInternalMessages') || url.includes('roster') || 
          url.includes('duties') || url.includes('schedule')) {
        console.log('📡 API Request:', request.method(), url);
        apiCalls.push({ method: request.method(), url });
      }
      request.continue();
    });
    
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('updates') || url.includes('events') || url.includes('log') || 
          url.includes('myInternalMessages') || url.includes('roster') || 
          url.includes('duties') || url.includes('schedule')) {
        try {
          const data = await response.json();
          console.log('📦 API Response from', url, ':', JSON.stringify(data).substring(0, 500));
        } catch (e) {
          console.log('📦 API Response from', url, '(not JSON)');
        }
      }
    });
    
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
    
    // 🔑 CAPTURE COOKIES after successful auth
    const cookies = await page.cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    netlineSessions.set(employeeId, {
      cookies: cookieString,
      airline: airline?.toLowerCase() || 'abx',
      timestamp: Date.now()
    });
    console.log('🍪 Stored NetLine session cookies for', employeeId);
    
    console.log('📅 Scraping crew schedule using NetLine adapter...');
    await sleep(3000);
    
    // Run the NetLine scraper in the browser context
    const scheduleData = await page.evaluate(async () => {
      // ========================================
      // FlightRosterIQ – NetLine Adapter (v2)
      // ========================================
      
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      
      async function retry(fn, tries = 5, delay = 600) {
        let lastErr;
        for (let i = 0; i < tries; i++) {
          try {
            return await fn();
          } catch (e) {
            lastErr = e;
            await sleep(delay);
          }
        }
        throw lastErr;
      }
      
      // ---------- NAVIGATION ----------
      function getMonthLabel() {
        const el = Array.from(document.querySelectorAll('button, div, span'))
          .find(e => /\(\d{2}\s[A-Za-z]{3}\s-\s\d{2}\s[A-Za-z]{3}\)/.test(e.textContent || ''));
        if (!el) throw new Error('Month label not found');
        return el.textContent.trim();
      }
      
      function clickMonth(direction) {
        const arrows = Array.from(document.querySelectorAll('button'))
          .filter(b => /chevron|arrow|‹|›|<|>/.test(b.innerText));
        const btn = direction === 'prev' ? arrows[0] : arrows[arrows.length - 1];
        btn?.click();
      }
      
      // ---------- DOM OBSERVER ----------
      function waitForMonthRender(previousLabel) {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            observer.disconnect();
            reject(new Error('Month render timeout'));
          }, 8000);
          
          const observer = new MutationObserver(() => {
            try {
              const label = getMonthLabel();
              
              // Month label changed
              if (label !== previousLabel) {
                const dutiesReady =
                  document.querySelectorAll('[class*="duty"], [class*="IADP"], button')
                    .length > 10;
                
                if (dutiesReady) {
                  clearTimeout(timeout);
                  observer.disconnect();
                  resolve(label);
                }
              }
            } catch {
              // ignore until DOM stabilizes
            }
          });
          
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        });
      }
      
      // ---------- DOM OBSERVER ----------
      function waitForMonthRender(previousLabel) {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            observer.disconnect();
            reject(new Error('Month render timeout'));
          }, 8000);
          
          const observer = new MutationObserver(() => {
            try {
              const label = getMonthLabel();
              
              // Month label changed
              if (label !== previousLabel) {
                const dutiesReady =
                  document.querySelectorAll('[class*="duty"], [class*="IADP"], button')
                    .length > 10;
                
                if (dutiesReady) {
                  clearTimeout(timeout);
                  observer.disconnect();
                  resolve(label);
                }
              }
            } catch {
              // ignore until DOM stabilizes
            }
          });
          
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        });
      }
      
      // ---------- DETECTION ----------
      function detectDutyType(text) {
        if (/IADP/i.test(text)) return 'IADP';
        if (/C\d{4,5}[A-Z]?\/\d{2}[A-Za-z]{3}/.test(text)) return 'FLIGHT';
        return 'OTHER';
      }
      
      function extractPairing(text) {
        return text.match(/C\d{4,5}[A-Z]?\/\d{2}[A-Za-z]{3}/)?.[0];
      }
      
      function extractRank(text) {
        return text.match(/Rank:\s*(\w+)/)?.[1];
      }
      
      // ---------- FINDERS ----------
      function findByText(regex) {
        return Array.from(document.querySelectorAll('*'))
          .filter(el => regex.test(el.innerText));
      }
      
      function getDutyBlocks() {
        return findByText(/Rank:|Premium|\d{2}:\d{2}\s*LT/i);
      }
      
      function expand(el) {
        el.querySelector('button')?.click();
      }
      
      // ---------- EXTRACTION ----------
      function extractCrew(el) {
        return findByText(/CAPT|FO|FE/).map(c => {
          const t = c.innerText;
          return {
            role: t.match(/CAPT|FO|FE/)?.[0],
            name: t.match(/[A-Z]{3,}/)?.[0],
            crewId: t.match(/\b\d{5,6}\b/)?.[0],
            phone: t.match(/\d{3}[-.\s]\d{3}[-.\s]\d{4}/)?.[0]
          };
        });
      }
      
      function extractLegs(el) {
        return findByText(/[A-Z]{3}\s*(→|-)\s*[A-Z]{3}/).map(l => {
          const t = l.innerText;
          return {
            from: t.match(/^[A-Z]{3}/)?.[0],
            to: t.match(/[A-Z]{3}$/)?.[0],
            aircraft: t.match(/B\d{3}/)?.[0],
            tail: t.match(/N\d+[A-Z]*/)?.[0]
          };
        });
      }
      
      function extractHotel(el) {
        return findByText(/Hotel/i)[0]?.innerText;
      }
      
      // ---------- CORE SCRAPE ----------
      async function scrapeMonth() {
        await sleep(1200);
        const month = getMonthLabel();
        const duties = [];
        
        for (const el of getDutyBlocks()) {
          expand(el);
          await sleep(250);
          const text = el.innerText;
          
          duties.push({
            month,
            pairing: extractPairing(text),
            rank: extractRank(text),
            type: detectDutyType(text),
            legs: extractLegs(el),
            crew: extractCrew(el),
            hotel: extractHotel(el)
          });
        }
        return duties;
      }
      
      // ---------- PUBLIC ENTRY ----------
      async function scrapeNetLineThreeMonths() {
        return retry(async () => {
          const originalMonth = getMonthLabel();
          const all = [];
          
          // Previous
          clickMonth('prev');
          await waitForMonthRender(originalMonth);
          all.push(...await scrapeMonth());
          
          // Current
          clickMonth('next');
          await waitForMonthRender(getMonthLabel());
          all.push(...await scrapeMonth());
          
          // Next
          clickMonth('next');
          await waitForMonthRender(getMonthLabel());
          all.push(...await scrapeMonth());
          
          // Restore original
          clickMonth('prev');
          await waitForMonthRender(getMonthLabel());
          clickMonth('prev');
          await waitForMonthRender(getMonthLabel());
          
          return all;
        });
      }
      
      // Execute the scraper
      try {
        const result = await scrapeNetLineThreeMonths();
        return { success: true, duties: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    console.log('📦 Scrape result:', JSON.stringify(scheduleData).substring(0, 300));
    
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
      schedule: scheduleData,
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

// ==================== SCRAPE ====================
app.post('/api/scrape', async (req, res) => {
  const { employeeId, password, airline } = req.body;
  console.log(`🔄 Scrape request: ${airline?.toUpperCase() || 'ABX'} pilot ${employeeId}`);
  
  // Reuse the authentication logic to scrape
  let browser;
  try {
    console.log('🌐 Launching browser for crew portal scraping...');
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
    
    // Intercept network requests to find API endpoints
    const apiCalls = [];
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('updates') || url.includes('events') || url.includes('log') || 
          url.includes('myInternalMessages') || url.includes('roster') || 
          url.includes('duties') || url.includes('schedule')) {
        console.log('📡 API Request:', request.method(), url);
        apiCalls.push({ method: request.method(), url });
      }
      request.continue();
    });
    
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('updates') || url.includes('events') || url.includes('log') || 
          url.includes('myInternalMessages') || url.includes('roster') || 
          url.includes('duties') || url.includes('schedule')) {
        try {
          const data = await response.json();
          console.log('📦 API Response from', url, ':', JSON.stringify(data).substring(0, 500));
        } catch (e) {
          console.log('📦 API Response from', url, '(not JSON)');
        }
      }
    });
    
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
    
    console.log('📅 Scraping crew schedule using NetLine adapter...');
    await sleep(3000);
    
    // Run the NetLine scraper in the browser context
    const scheduleData = await page.evaluate(async () => {
      // [Insert full NetLine adapter code here - same as in /api/authenticate]
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      
      async function retry(fn, tries = 5, delay = 600) {
        let lastErr;
        for (let i = 0; i < tries; i++) {
          try {
            return await fn();
          } catch (e) {
            lastErr = e;
            await sleep(delay);
          }
        }
        throw lastErr;
      }
      
      function getMonthLabel() {
        const el = Array.from(document.querySelectorAll('button, div, span'))
          .find(e => /\(\d{2}\s[A-Za-z]{3}\s-\s\d{2}\s[A-Za-z]{3}\)/.test(e.textContent || ''));
        if (!el) throw new Error('Month label not found');
        return el.textContent.trim();
      }
      
      function clickMonth(direction) {
        const arrows = Array.from(document.querySelectorAll('button'))
          .filter(b => /chevron|arrow|‹|›|<|>/.test(b.innerText));
        const btn = direction === 'prev' ? arrows[0] : arrows[arrows.length - 1];
        btn?.click();
      }
      
      function waitForMonthRender(previousLabel) {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            observer.disconnect();
            reject(new Error('Month render timeout'));
          }, 8000);
          
          const observer = new MutationObserver(() => {
            try {
              const label = getMonthLabel();
              if (label !== previousLabel) {
                const dutiesReady = document.querySelectorAll('[class*="duty"], [class*="IADP"], button').length > 10;
                if (dutiesReady) {
                  clearTimeout(timeout);
                  observer.disconnect();
                  resolve(label);
                }
              }
            } catch {}
          });
          
          observer.observe(document.body, { childList: true, subtree: true });
        });
      }
      
      function detectDutyType(text) {
        if (/IADP/i.test(text)) return 'IADP';
        if (/C\d{4,5}[A-Z]?\/\d{2}[A-Za-z]{3}/.test(text)) return 'FLIGHT';
        return 'OTHER';
      }
      
      function extractPairing(text) {
        return text.match(/C\d{4,5}[A-Z]?\/\d{2}[A-Za-z]{3}/)?.[0];
      }
      
      function extractRank(text) {
        return text.match(/Rank:\s*(\w+)/)?.[1];
      }
      
      function findByText(regex) {
        return Array.from(document.querySelectorAll('*')).filter(el => regex.test(el.innerText));
      }
      
      function getDutyBlocks() {
        return findByText(/Rank:|Premium|\d{2}:\d{2}\s*LT/i);
      }
      
      function expand(el) {
        el.querySelector('button')?.click();
      }
      
      function extractCrew(el) {
        return findByText(/CAPT|FO|FE/).map(c => {
          const t = c.innerText;
          return {
            role: t.match(/CAPT|FO|FE/)?.[0],
            name: t.match(/[A-Z]{3,}/)?.[0],
            crewId: t.match(/\b\d{5,6}\b/)?.[0],
            phone: t.match(/\d{3}[-.\s]\d{3}[-.\s]\d{4}/)?.[0]
          };
        });
      }
      
      function extractLegs(el) {
        return findByText(/[A-Z]{3}\s*(→|-)\s*[A-Z]{3}/).map(l => {
          const t = l.innerText;
          return {
            from: t.match(/^[A-Z]{3}/)?.[0],
            to: t.match(/[A-Z]{3}$/)?.[0],
            aircraft: t.match(/B\d{3}/)?.[0],
            tail: t.match(/N\d+[A-Z]*/)?.[0]
          };
        });
      }
      
      function extractHotel(el) {
        return findByText(/Hotel/i)[0]?.innerText;
      }
      
      async function scrapeMonth() {
        await sleep(1200);
        const month = getMonthLabel();
        const duties = [];
        
        for (const el of getDutyBlocks()) {
          expand(el);
          await sleep(250);
          const text = el.innerText;
          
          duties.push({
            month,
            pairing: extractPairing(text),
            rank: extractRank(text),
            type: detectDutyType(text),
            legs: extractLegs(el),
            crew: extractCrew(el),
            hotel: extractHotel(el)
          });
        }
        return duties;
      }
      
      async function scrapeNetLineThreeMonths() {
        return retry(async () => {
          const originalMonth = getMonthLabel();
          const all = [];
          
          clickMonth('prev');
          await waitForMonthRender(originalMonth);
          all.push(...await scrapeMonth());
          
          clickMonth('next');
          await waitForMonthRender(getMonthLabel());
          all.push(...await scrapeMonth());
          
          clickMonth('next');
          await waitForMonthRender(getMonthLabel());
          all.push(...await scrapeMonth());
          
          clickMonth('prev');
          await waitForMonthRender(getMonthLabel());
          clickMonth('prev');
          await waitForMonthRender(getMonthLabel());
          
          return all;
        });
      }
      
      try {
        const result = await scrapeNetLineThreeMonths();
        return { success: true, duties: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    console.log('📦 Scrape result:', JSON.stringify(scheduleData).substring(0, 300));
    
    await browser.close();
    
    res.json({
      success: true,
      authenticated: true,
      data: scheduleData,
      message: 'Schedule scraped successfully'
    });
    
  } catch (error) {
    console.error('❌ Scraping error:', error.message);
    if (browser) await browser.close();
    
    res.status(500).json({
      success: false,
      error: 'Unable to scrape crew portal',
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

// ========================================
// NETLINE API PROXY (for frontend scraper)
// ========================================
app.get('/api/netline/roster/events', async (req, res) => {
  try {
    const { crewCode } = req.query;
    
    if (!crewCode) {
      return res.status(400).json({ error: 'crewCode required' });
    }
    
    // Get stored session cookies for this crew member
    const session = netlineSessions.get(crewCode);
    
    if (!session) {
      return res.status(401).json({ 
        error: 'No authenticated session found. Please login first.',
        requiresAuth: true
      });
    }
    
    // Check if session is expired (24 hours)
    const SESSION_TTL = 24 * 60 * 60 * 1000;
    if (Date.now() - session.timestamp > SESSION_TTL) {
      netlineSessions.delete(crewCode);
      return res.status(401).json({ 
        error: 'Session expired. Please login again.',
        requiresAuth: true
      });
    }
    
    const airline = session.airline || 'abx';
    const apiBase = NETLINE_API[airline];
    const url = `${apiBase}/idp/user/roster/${crewCode}/events`;
    
    console.log(`🔄 Proxying NetLine API request: ${url}`);
    
    // Forward request to NetLine API with stored cookies
    const fetch = (await import('node-fetch')).default;
    const netlineRes = await fetch(url, {
      headers: {
        'cookie': session.cookies,
        'accept': 'application/json',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const contentType = netlineRes.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await netlineRes.json();
      console.log(`✅ NetLine API response: ${JSON.stringify(data).substring(0, 200)}...`);
      res.json(data);
    } else {
      const text = await netlineRes.text();
      console.log(`⚠️ NetLine API returned non-JSON:`, text.substring(0, 200));
      res.status(netlineRes.status).send(text);
    }
    
  } catch (err) {
    console.error('❌ NetLine proxy error:', err);
    res.status(500).json({ error: 'NetLine proxy failed', details: err.message });
  }
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