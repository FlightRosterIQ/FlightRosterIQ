const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('dist'));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'crew-scraper'
  });
});

// Crew scraper API endpoint
app.post('/api/scrape', async (req, res) => {
  console.log('🚀 Crew scraper API called');
  
  try {
    const { airline = 'abx', username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide your crew portal username and password.',
        required: ['username', 'password']
      });
    }

    console.log(`📋 Scraping for ${airline.toUpperCase()} pilot: ${username}`);
    
    // Launch browser with Docker-optimized settings
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });

    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to crew portal
    const portalUrl = airline === 'ati' 
      ? 'https://crew.airtransport.cc/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp'
      : 'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp';
    
    console.log(`🌐 Navigating to ${airline.toUpperCase()} crew portal...`);
    await page.goto(portalUrl, { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });
    
    // Wait for page to load
    await page.waitForTimeout(5000);
    
    // Look for login form
    console.log('🔑 Looking for login form...');
    
    // Try multiple username field selectors
    const usernameSelectors = [
      'input[name="username"]',
      '#username',
      'input[type="text"]',
      'input[placeholder*="user" i]'
    ];
    
    let usernameField = null;
    for (const selector of usernameSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        usernameField = await page.$(selector);
        if (usernameField) {
          console.log(`✅ Found username field: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!usernameField) {
      throw new Error('Could not find username field');
    }
    
    // Fill username
    await page.focus('input[name="username"], #username, input[type="text"], input[placeholder*="user" i]');
    await page.keyboard.selectAll();
    await page.type('input[name="username"], #username, input[type="text"], input[placeholder*="user" i]', username);
    
    // Fill password
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });
    await page.focus('input[type="password"]');
    await page.keyboard.selectAll();
    await page.type('input[type="password"]', password);
    
    // Submit form
    console.log('🚀 Submitting login...');
    await page.keyboard.press('Enter');
    
    // Wait for navigation or error
    try {
      await page.waitForNavigation({ 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
    } catch (e) {
      // Continue even if navigation times out
      console.log('⚠️ Navigation timeout, continuing...');
    }
    
    await page.waitForTimeout(5000);
    
    // Check current page
    const currentUrl = page.url();
    const pageTitle = await page.title();
    console.log(`📄 Current page: ${pageTitle} (${currentUrl})`);
    
    // Extract any available data
    const scheduleData = await page.evaluate(() => {
      const flights = [];
      const info = {
        title: document.title,
        url: location.href,
        bodyText: document.body.textContent.substring(0, 1000)
      };
      
      // Look for table data
      const rows = document.querySelectorAll('tr, .row, .item');
      rows.forEach((row, index) => {
        const text = row.textContent?.trim();
        if (text && text.length > 10 && (
          /\d{1,2}\/\d{1,2}/.test(text) || 
          /[A-Z]{3}/.test(text) ||
          /\d{1,4}[A-Z]?/.test(text)
        )) {
          flights.push({
            id: index,
            text: text.substring(0, 200),
            source: 'table_extraction'
          });
        }
      });
      
      return { flights: flights.slice(0, 10), info };
    });
    
    await browser.close();
    
    const result = {
      success: true,
      data: {
        airline: airline.toUpperCase(),
        username: username,
        flights: scheduleData.flights,
        pageInfo: scheduleData.info,
        timestamp: new Date().toISOString(),
        source: 'docker_puppeteer'
      },
      message: `Successfully connected to ${airline.toUpperCase()} crew portal`
    };
    
    console.log('✅ Scraping completed successfully');
    res.json(result);
    
  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve schedule data',
      details: error.message,
      fallback: {
        message: 'Manual portal access available',
        portalUrl: req.body.airline === 'ati' 
          ? 'https://crew.airtransport.cc/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp'
          : 'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Crew Scheduler running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Web interface: http://localhost:${PORT}`);
});