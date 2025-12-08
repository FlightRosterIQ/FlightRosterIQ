const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// In production, serve built frontend if available
const DIST_DIR = path.join(process.cwd(), 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res, next) => {
    const indexFile = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
    return next();
  });
}

// In-memory storage for pilot data and family codes
// In production, this would be a database
const pilots = new Map();
const familyCodes = new Map(); // code -> { pilotUsername, memberName, airline }

// Crew portal authentication validation
async function validateCrewCredentials(username, password, airline = 'ABX Air') {
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    // Determine portal URL based on airline
    const airlineConfigs = {
      'ABX Air': {
        portalUrl: 'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp',
        loginSelectors: {
          username: 'input[name="username"], #username',
          password: 'input[name="password"], #password',
          submit: 'input[type="submit"], button[type="submit"], #kc-login'
        }
      },
      'ATI': {
        portalUrl: 'https://crew.airtransport.cc/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp',
        loginSelectors: {
          username: 'input[name="username"], #username',
          password: 'input[name="password"], #password',
          submit: 'input[type="submit"], button[type="submit"], #kc-login'
        }
      }
    };
    
    // Default to ABX Air if airline not specified or not found
    const airlineConfig = airlineConfigs[airline] || airlineConfigs['ABX Air'];
    
    await page.goto(airlineConfig.portalUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Fill in login credentials
    await page.waitForSelector(airlineConfig.loginSelectors.username, { timeout: 10000 });
    await page.type(airlineConfig.loginSelectors.username, username);
    await page.type(airlineConfig.loginSelectors.password, password);
    
    // Submit login form
    await page.click(airlineConfig.loginSelectors.submit);
    
    // Wait for navigation and check for success indicators
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    
    // Check for error messages
    const errorExists = await page.$('.kc-feedback-text, .alert-error, [class*="error"]');
    if (errorExists) {
      const errorText = await page.$eval('.kc-feedback-text, .alert-error, [class*="error"]', el => el.textContent);
      if (errorText.toLowerCase().includes('invalid') || errorText.toLowerCase().includes('password')) {
        return { success: false, error: 'Invalid username or password' };
      }
    }
    
    // Check for successful login indicators
    const currentUrl = page.url();
    const pageText = await page.evaluate(() => document.body.textContent);
    
    // Success indicators: URL change, presence of employee number, duty plan text
    if (currentUrl.includes('crm-workspace') && 
        (pageText.includes('Duty plan') || pageText.includes(username) || pageText.includes('DUTY PLAN'))) {
      return { success: true, employeeId: username };
    }
    
    return { success: false, error: 'Login validation failed' };
    
  } catch (error) {
    console.error('Crew portal validation error:', error.message);
    return { success: false, error: 'Unable to validate credentials with crew portal' };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Real crew portal authentication
app.post('/api/auth/login', async (req, res) => {
  const { username, password, accountType, airline } = req.body;
  
  console.log(`Login attempt: ${username || 'N/A'} (${airline || 'N/A'}) as ${accountType}`);
  
  if (accountType === 'family') {
    // For family login, username is the access code
    const code = username;
    const familyAccess = familyCodes.get(code);
    
    if (!familyAccess) {
      return res.json({
        success: false,
        error: 'Invalid family access code'
      });
    }
    
    // Return both pilot's name and family member's name
    res.json({
      success: true,
      token: 'family-token-' + Date.now(),
      pilotName: familyAccess.pilotName,
      memberName: familyAccess.memberName,
      airline: familyAccess.airline,
      message: 'Family access granted'
    });
  } else {
    // Pilot login - validate against crew portal
    if (!username || !password) {
      return res.json({
        success: false,
        error: 'Username and password are required'
      });
    }
    
    try {
      console.log(`🔐 Validating credentials with ${airline || 'ABX Air'} crew portal...`);
      const validationResult = await validateCrewCredentials(username, password, airline);
      
      if (validationResult.success) {
        // Store pilot info for family code generation later
        if (!pilots.has(username)) {
          pilots.set(username, {
            username,
            airline,
            name: username,
            employeeId: validationResult.employeeId
          });
        }
        
        console.log('✅ Crew portal authentication successful');
        res.json({
          success: true,
          token: 'pilot-token-' + Date.now(),
          message: 'Login successful - credentials validated with crew portal',
          employeeId: validationResult.employeeId
        });
      } else {
        console.log('❌ Crew portal authentication failed:', validationResult.error);
        res.json({
          success: false,
          error: validationResult.error
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      res.json({
        success: false,
        error: 'Authentication service unavailable'
      });
    }
  }
});

// Endpoint to generate family access codes
app.post('/api/family/generate-code', async (req, res) => {
  const { pilotUsername, memberName, airline } = req.body;
  
  // Generate a unique 8-character code
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  // Ensure code is unique
  while (familyCodes.has(code)) {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
  }
  
  // Store the family code
  familyCodes.set(code, {
    pilotUsername,
    pilotName: pilotUsername, // In production, would lookup actual name
    memberName,
    airline,
    createdAt: new Date().toISOString()
  });
  
  res.json({
    success: true,
    code,
    message: 'Family access code generated'
  });
});

// Endpoint to revoke family access codes
app.delete('/api/family/revoke-code/:code', async (req, res) => {
  const { code } = req.params;
  
  if (familyCodes.has(code)) {
    familyCodes.delete(code);
    res.json({
      success: true,
      message: 'Family access code revoked'
    });
  } else {
    res.json({
      success: false,
      error: 'Code not found'
    });
  }
});

// Mock schedule endpoint
app.get('/api/schedule', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'No auth token' });
  }

  // Return mock schedule
  const mockSchedule = [
    {
      pairingId: 'GB1234',
      flights: [
        {
          date: '2025-12-08',
          flightNumber: 'GB123',
          origin: 'CVG',
          destination: 'LAX',
          departure: '08:00',
          arrival: '10:30',
          aircraft: 'B767-300',
          tail: 'N123AB',
          actualDeparture: '08:15',
          actualArrival: '10:45',
          crew: [
            { name: 'John Smith', role: 'Captain', employeeId: 'GB001', phone: '(555) 123-4567' },
            { name: 'Sarah Johnson', role: 'First Officer', employeeId: 'GB002', phone: '(555) 234-5678' },
            { name: 'Mike Wilson', role: 'Flight Engineer', employeeId: 'GB003' }
          ],
          aircraftLocation: 'Gate A12, Terminal 3, CVG',
          aircraftStatus: 'On Time',
          gate: 'A12',
          terminal: '3',
          layover: {
            hotel: {
              name: 'DoubleTree by Hilton LAX',
              address: '5400 W Century Blvd, Los Angeles, CA 90045',
              phone: '(310) 216-5858'
            },
            shuttle: {
              pickup: 'Terminal 3, Upper Level - Purple Zone',
              phone: '(310) 216-5858'
            }
          }
        },
        {
          date: '2025-12-08',
          flightNumber: 'GB124',
          origin: 'LAX',
          destination: 'CVG',
          departure: '14:00',
          arrival: '21:30',
          aircraft: 'B767-200',
          tail: 'N456CD',
          crew: [
            { name: 'John Smith', role: 'Captain', employeeId: 'GB001', phone: '(555) 123-4567' },
            { name: 'Sarah Johnson', role: 'First Officer', employeeId: 'GB002', phone: '(555) 234-5678' },
            { name: 'Mike Wilson', role: 'Flight Engineer', employeeId: 'GB003' }
          ],
          aircraftLocation: 'Gate B5, Terminal 1, LAX',
          aircraftStatus: 'On Time',
          gate: 'B5',
          terminal: '1',
          layover: {
            hotel: {
              name: 'Hilton Los Angeles Airport',
              address: '5711 W Century Blvd, Los Angeles, CA 90045',
              phone: '(310) 410-4000'
            },
            shuttle: {
              pickup: 'Terminal 1, Lower Level',
              phone: '(310) 410-4000'
            }
          }
        }
      ]
    }
  ];

  res.json({
    success: true,
    schedule: scrapedSchedule.length > 0 ? scrapedSchedule : mockSchedule,
    timestamp: new Date().toISOString(),
    source: scrapedSchedule.length > 0 ? 'scraped' : 'mock'
  });
});

// Store scraped schedule data per user
let scrapedSchedule = [];
let scrapedNotifications = [];
const userSchedules = new Map(); // username -> { schedule, notifications, timestamp }

// Endpoint to receive scraped data from crew-scraper.js
app.post('/api/schedule/import', async (req, res) => {
  try {
    const { schedule, notifications, timestamp, username } = req.body;
    
    if (!schedule || !Array.isArray(schedule)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid schedule data format'
      });
    }
    
    // Store the scraped schedule (legacy - for backward compatibility)
    scrapedSchedule = schedule;
    
    // Store notifications if provided (legacy)
    if (notifications && Array.isArray(notifications)) {
      scrapedNotifications = notifications;
      console.log(`✅ Received ${notifications.length} notifications`);
    }
    
    // Store per-user data if username provided
    if (username) {
      userSchedules.set(username, {
        schedule,
        notifications: notifications || [],
        timestamp,
        lastUpdated: new Date().toISOString()
      });
      console.log(`✅ Stored schedule for user: ${username}`);
    }
    
    console.log(`✅ Received scraped schedule data: ${schedule.length} pairings at ${timestamp}`);
    
    res.json({
      success: true,
      message: 'Schedule data imported successfully',
      pairings: schedule.length,
      notifications: notifications?.length || 0,
      username: username || 'global',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error importing schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import schedule data'
    });
  }
});

// Endpoint to check scraper status
app.get('/api/schedule/status', (req, res) => {
  res.json({
    success: true,
    hasScrapedData: scrapedSchedule.length > 0,
    pairings: scrapedSchedule.length,
    usingMockData: scrapedSchedule.length === 0
  });
});

// Endpoint to get notifications
app.get('/api/notifications', (req, res) => {
  res.json({
    success: true,
    notifications: scrapedNotifications,
    count: scrapedNotifications.length,
    source: scrapedNotifications.length > 0 ? 'scraped' : 'none'
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`);
  console.log('This is a simplified server for testing the frontend');
  console.log('\nEndpoints:');
  console.log('  POST /api/schedule/import - Import scraped schedule data');
  console.log('  GET  /api/schedule/status  - Check if scraped data is available');
});
