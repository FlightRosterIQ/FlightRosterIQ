// Vercel serverless function for crew scheduling scraper
module.exports = async function handler(req, res) {
  // Set CORS headers for frontend access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST or GET.' 
    });
  }

  try {
    console.log('🚀 Crew scraper API called');
    
    // Prioritize frontend credentials over environment variables
    const options = {
      airline: req.body?.airline || req.query.airline || 'abx', // Default to ABX Air
      username: req.body?.username || req.query.username,
      password: req.body?.password || req.query.password,
      headless: true // Always headless in serverless environment
    };

    // Validate credentials - require user to provide them
    if (!options.username || !options.password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide your crew portal username and password.',
        message: 'For security, each pilot must enter their own credentials to access their personal schedule.',
        required: ['username', 'password']
      });
    }

    console.log(`📋 Connecting to ABX Air crew portal API for: ${options.username}`);
    
    // Use Puppeteer for reliable crew portal access
    console.log('🤖 Using Puppeteer for crew portal scraping...');
    
    try {
      const puppeteer = require('puppeteer-core');
      
      // Use chrome-aws-lambda for Vercel deployment
      const chrome = require('chrome-aws-lambda');
      
      const browser = await puppeteer.launch({
        args: chrome.args,
        defaultViewport: chrome.defaultViewport,
        executablePath: await chrome.executablePath,
        headless: chrome.headless,
        ignoreHTTPSErrors: true,
      });
      
      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Determine crew portal URL based on airline
      const portalUrl = options.airline === 'ati' 
        ? 'https://crew.airtransport.cc/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp'
        : 'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp';
      
      console.log(`🌐 Navigating to ${options.airline.toUpperCase()} crew portal...`);
      await page.goto(portalUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for page to fully load
      await page.waitForTimeout(3000);
      
      // Check if we're already logged in or if there's a different login interface
      const pageContent = await page.content();
      console.log('📄 Page loaded, checking authentication state...');
      
      // Look for various login form patterns
      let loginFound = false;
      
      // Try different login selectors
      const loginSelectors = [
        'input[name="username"]',
        '#username',
        'input[placeholder*="username" i]',
        'input[placeholder*="user" i]',
        'input[id*="user"]',
        'input[type="text"]:first-of-type'
      ];
      
      for (const selector of loginSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          console.log(`🔑 Found login field: ${selector}`);
          
          // Clear and fill username
          await page.click(selector);
          await page.keyboard.down('Control');
          await page.keyboard.press('KeyA');
          await page.keyboard.up('Control');
          await page.type(selector, options.username);
          loginFound = true;
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (!loginFound) {
        throw new Error('Could not find username field on login page');
      }
      
      // Find and fill password field
      const passwordSelectors = [
        'input[name="password"]',
        '#password',
        'input[type="password"]',
        'input[placeholder*="password" i]'
      ];
      
      let passwordFound = false;
      for (const selector of passwordSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          await page.click(selector);
          await page.keyboard.down('Control');
          await page.keyboard.press('KeyA');
          await page.keyboard.up('Control');
          await page.type(selector, options.password);
          passwordFound = true;
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (!passwordFound) {
        throw new Error('Could not find password field on login page');
      }
      
      // Submit the form
      console.log('🚀 Submitting login credentials...');
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:contains("Login")',
        'button:contains("Sign In")',
        '.login-btn',
        '#loginBtn',
        'form button'
      ];
      
      let submitted = false;
      for (const selector of submitSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            await Promise.race([
              page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
              button.click()
            ]);
            submitted = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!submitted) {
        // Try pressing Enter as fallback
        await page.keyboard.press('Enter');
      }
      
      // Wait for login to process
      await page.waitForTimeout(5000);
      
      // Check if login was successful
      const currentUrl = page.url();
      const pageTitle = await page.title();
      console.log(`📄 Current page: ${pageTitle} (${currentUrl})`);
      
      // Check for login failure indicators
      if (currentUrl.includes('login') || pageTitle.toLowerCase().includes('login')) {
        const errorElement = await page.$('.error, .alert, .message, [class*="error"]');
        const errorMessage = errorElement ? await page.evaluate(el => el.textContent, errorElement) : 'Unknown login error';
        throw new Error(`Login failed: ${errorMessage}`);
      }
      
      // Look for schedule/dashboard content
      console.log('📋 Searching for schedule data...');
      await page.waitForTimeout(3000);
      
      // Try to navigate to schedule page if not already there
      const scheduleLinks = [
        'a[href*="schedule"]',
        'a[href*="roster"]',
        'a[href*="trips"]',
        '.schedule-link',
        '.roster-link'
      ];
      
      for (const selector of scheduleLinks) {
        try {
          const link = await page.$(selector);
          if (link) {
            console.log(`🔗 Found schedule link: ${selector}`);
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }),
              link.click()
            ]);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      // Extract schedule data from the page
      const scheduleData = await page.evaluate(() => {
        const flights = [];
        const duties = [];
        
        // Look for various table and list structures
        const selectors = [
          'table tr',
          '.flight-row',
          '.trip-row', 
          '.schedule-row',
          '.roster-item',
          '[class*="flight"]',
          '[class*="trip"]',
          '[class*="duty"]'
        ];
        
        selectors.forEach(selector => {
          const rows = document.querySelectorAll(selector);
          rows.forEach((row, index) => {
            const text = row.textContent?.trim() || '';
            const cells = row.querySelectorAll('td, th, .cell, span, div');
            
            // Look for flight numbers, dates, times
            if (text && (
              /\b\d{1,4}[A-Z]?\b/.test(text) || // Flight numbers
              /\d{1,2}\/\d{1,2}/.test(text) ||  // Dates
              /\d{1,2}:\d{2}/.test(text) ||     // Times
              /[A-Z]{3}\b/.test(text)           // Airport codes
            )) {
              const flight = {
                id: flights.length + 1,
                rawText: text,
                cells: Array.from(cells).map(cell => cell.textContent?.trim() || ''),
                source: selector
              };
              flights.push(flight);
            }
          });
        });
        
        // Also capture any text that looks like schedule info
        const bodyText = document.body.textContent || '';
        const scheduleMatches = bodyText.match(/\b\d{1,2}\/\d{1,2}\/?\d{0,4}\b.*?\b[A-Z]{3}\b.*?\b[A-Z]{3}\b/g) || [];
        
        scheduleMatches.forEach((match, index) => {
          duties.push({
            id: index + 1,
            text: match.trim(),
            source: 'text_pattern'
          });
        });
        
        return {
          flights: flights.slice(0, 20), // Limit to first 20 entries
          duties: duties.slice(0, 10),   // Limit to first 10 entries
          timestamp: new Date().toISOString(),
          source: 'puppeteer_scrape',
          pageTitle: document.title,
          url: window.location.href,
          bodyLength: document.body.textContent?.length || 0
        };
      });
      
      await browser.close();
      
      // Transform the scraped data to match our app's expected format
      const transformedData = {
        airline: options.airline === 'ati' ? 'ATI' : 'ABX Air',
        username: options.username,
        flights: scheduleData.flights || [],
        duties: scheduleData.duties || [],
        timestamp: new Date().toISOString(),
        source: 'puppeteer_scrape',
        pageInfo: {
          title: scheduleData.pageTitle,
          url: scheduleData.url
        }
      };
      
      console.log('✅ Crew portal scraping completed successfully');
      return res.status(200).json({
        success: true,
        data: transformedData,
        timestamp: new Date().toISOString(),
        message: `Schedule data scraped from ${transformedData.airline} crew portal`
      });
      
    } catch (scrapeError) {
      console.log('❌ Scraping failed:', scrapeError.message);
      
      // Handle different types of scraping errors
      if (scrapeError.message.includes('timeout') || scrapeError.message.includes('Navigation')) {
        return res.status(503).json({
          success: false,
          error: 'Crew portal login timeout. The site may be slow or temporarily unavailable.',
          details: scrapeError.message,
          fallback: {
            message: 'Manual portal access available',
            portalUrls: {
              'abx': 'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp',
              'ati': 'https://crew.airtransport.cc/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp'
            },
            selectedPortal: options.airline === 'ati' ? 'ati' : 'abx',
            portalName: options.airline === 'ati' ? 'ATI' : 'ABX Air'
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // Handle authentication errors
      if (scrapeError.message.includes('login') || scrapeError.message.includes('credential')) {
        return res.status(401).json({
          success: false,
          error: 'Login failed. Please check your crew portal credentials.',
          details: scrapeError.message,
          timestamp: new Date().toISOString()
        });
      }
      
      // Generic scraping error
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve schedule data from crew portal.',
        details: scrapeError.message,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ API Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Vercel serverless function configuration is handled in vercel.json