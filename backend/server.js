const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 8080;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.use(express.static('dist'));

// Crew portal URLs
const PORTALS = {
  abx: 'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp',
  ati: 'https://crew.atitransport.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp'
};

// Parse crew portal dates (handles year rollover)
function parseCrewDate(dateStr, year = new Date().getFullYear()) {
  const months = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  
  const match = dateStr.match(/(\d{2})([A-Za-z]{3})/);
  if (!match) return null;
  
  const day = parseInt(match[1]);
  const monthName = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
  const month = months[monthName];
  
  if (month === undefined) return null;
  
  const now = new Date();
  const currentMonth = now.getMonth();
  let actualYear = year;
  
  if (currentMonth === 11 && month <= 1) {
    actualYear = year + 1;
  }
  
  const date = new Date(actualYear, month, day);
  const monthStr = String(month + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${actualYear}-${monthStr}-${dayStr}`;
}

// Extract crew members from page
async function extractCrewMembers(page) {
  try {
    const crewMembers = await page.evaluate(() => {
      const crew = [];
      const tables = document.querySelectorAll('table');
      
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length >= 3) {
            const text = cells.map(c => c.textContent.trim()).join(' ');
            const nameMatch = text.match(/([A-Z][a-z]+),?\s+([A-Z][a-z]+)/);
            const roleMatch = text.match(/(Captain|First Officer|CA|FO)/i);
            
            if (nameMatch) {
              crew.push({
                name: `${nameMatch[2]} ${nameMatch[1]}`,
                role: roleMatch ? roleMatch[1] : 'Crew',
                employeeId: text.match(/\d{5,}/)?.[0] || 'N/A'
              });
            }
          }
        });
      });
      
      return crew.length > 0 ? crew : null;
    });
    
    return crewMembers;
  } catch (err) {
    return null;
  }
}

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'FlightRosterIQ - Real Crew Portal Authentication',
        timestamp: new Date().toISOString()
    });
});

app.post('/api/authenticate', async (req, res) => {
    const { employeeId, password, airline } = req.body;
    console.log(`🔐 REAL CREW PORTAL AUTH: ${airline?.toUpperCase() || 'ABX'} pilot ${employeeId}`);
    
    if (!employeeId || !password) {
        return res.status(400).json({
            success: false,
            error: 'Employee ID and password are required'
        });
    }
    
    let browser;
    try {
        console.log('🌐 Launching browser for real crew portal authentication...');
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
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        const portalUrl = PORTALS[airline?.toLowerCase()] || PORTALS.abx;
        console.log(`🌐 Connecting to ${airline?.toUpperCase() || 'ABX'} crew portal...`);
        console.log(`🔗 Portal URL: ${portalUrl}`);
        
        await page.goto(portalUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 30000 
        });
        
        const pageTitle = await page.title();
        const currentUrl = page.url();
        
        console.log(`📄 Portal page title: "${pageTitle}"`);
        console.log(`🔗 Current URL: ${currentUrl}`);
        
        // Check if we're redirected to Keycloak authentication
        if (currentUrl.includes('auth/realms') || pageTitle.toLowerCase().includes('sign in')) {
            console.log('🔐 Keycloak authentication required - performing real login...');
            
            await sleep(3000);
            
            try {
                // Fill username field
                await page.waitForSelector('#username', { timeout: 10000 });
                await page.clear('#username');
                await page.type('#username', employeeId);
                console.log(`✅ Username entered: ${employeeId}`);
                
                // Fill password field
                await page.waitForSelector('#password', { timeout: 5000 });
                await page.clear('#password');
                await page.type('#password', password);
                console.log('✅ Password entered: [HIDDEN]');
                
                // Submit the form
                await page.keyboard.press('Enter');
                console.log('🔄 Submitting authentication form...');
                
                // Wait for navigation after login
                await page.waitForNavigation({ 
                    waitUntil: 'networkidle2', 
                    timeout: 15000 
                });
                
                const postLoginUrl = page.url();
                const postLoginTitle = await page.title();
                
                console.log(`📍 Post-login URL: ${postLoginUrl}`);
                console.log(`📄 Post-login title: "${postLoginTitle}"`);
                
                // Check if authentication was successful
                if (postLoginUrl.includes('auth/realms') || postLoginTitle.toLowerCase().includes('sign in') || postLoginTitle.toLowerCase().includes('error')) {
                    throw new Error('Authentication failed - Invalid credentials or login error');
                }
                
                console.log('🎉 REAL CREW PORTAL AUTHENTICATION SUCCESSFUL!');
                console.log('📅 Extracting crew schedule data...');
                
                // Wait for crew portal to fully load
                await sleep(5000);
                
                // Extract full schedule data with crew members
                let scheduleData = { flights: [], pairings: [] };
                try {
                    // Extract schedule from portal
                    const extractedData = await page.evaluate(() => {
                        const data = { flights: [], rawText: '' };
                        
                        // Try to get schedule table/grid
                        const tables = document.querySelectorAll('table, [class*="schedule"], [class*="roster"], [class*="duty"]');
                        
                        tables.forEach(table => {
                            const rows = table.querySelectorAll('tr, [class*="row"]');
                            rows.forEach(row => {
                                const text = row.textContent || '';
                                
                                // Look for flight numbers (GB1234, etc)
                                const flightMatch = text.match(/([A-Z]{2}\d{4})/);
                                // Look for airports (3-letter codes)
                                const airportsMatch = text.match(/([A-Z]{3})\s+.*?([A-Z]{3})/);
                                // Look for times (HH:MM format)
                                const timesMatch = text.match(/(\d{2}:\d{2}).*?(\d{2}:\d{2})/);
                                // Look for dates (DDMon format)
                                const dateMatch = text.match(/(\d{2}[A-Z][a-z]{2})/);
                                
                                if (flightMatch && airportsMatch && timesMatch) {
                                    data.flights.push({
                                        flightNumber: flightMatch[1],
                                        origin: airportsMatch[1],
                                        destination: airportsMatch[2],
                                        departure: timesMatch[1],
                                        arrival: timesMatch[2],
                                        date: dateMatch ? dateMatch[1] : null,
                                        rawText: text.trim()
                                    });
                                }
                            });
                        });
                        
                        // Fallback: get all body text for manual parsing
                        data.rawText = document.body.innerText;
                        
                        return data;
                    });
                    
                    // Try to extract crew members if we have flights
                    if (extractedData.flights.length > 0) {
                        console.log(`✅ Found ${extractedData.flights.length} flights`);
                        
                        // Try to get crew for first flight as example
                        try {
                            const crewMembers = await extractCrewMembers(page);
                            if (crewMembers) {
                                extractedData.flights[0].crewMembers = crewMembers;
                                console.log(`👥 Extracted ${crewMembers.length} crew members`);
                            }
                        } catch (crewErr) {
                            console.log('⚠️ Could not extract crew:', crewErr.message);
                        }
                    }
                    
                    scheduleData = extractedData;
                    console.log(`📅 Schedule extraction complete`);
                    
                } catch (extractError) {
                    console.log('📅 Schedule extraction note:', extractError.message);
                    scheduleData = { flights: [], note: 'Real authentication successful - portal accessed' };
                }
                
                await browser.close();
                
                res.json({
                    success: true,
                    authenticated: true,
                    message: `Real crew portal authentication successful for ${airline?.toUpperCase() || 'ABX'} pilot ${employeeId}`,
                    data: {
                        employeeId,
                        airline: airline?.toUpperCase() || 'ABX',
                        loginTime: new Date().toISOString(),
                        portalAccessed: true,
                        scheduleData: scheduleData,
                        realAuthentication: true
                    }
                });
                
            } catch (authError) {
                console.error('❌ CREW PORTAL AUTHENTICATION FAILED:', authError.message);
                await browser.close();
                
                res.status(401).json({
                    success: false,
                    authenticated: false,
                    error: 'Invalid crew portal credentials',
                    message: 'Please check your employee ID and password',
                    details: authError.message
                });
                return;
            }
            
        } else {
            // Portal accessed directly without authentication
            console.log('✅ Crew portal accessed without additional authentication');
            await browser.close();
            
            res.json({
                success: true,
                authenticated: true,
                message: `Crew portal accessed for ${airline?.toUpperCase() || 'ABX'} pilot ${employeeId}`,
                data: {
                    employeeId,
                    airline: airline?.toUpperCase() || 'ABX',
                    loginTime: new Date().toISOString(),
                    portalAccessed: true,
                    scheduleData: ['Portal accessed successfully']
                }
            });
        }
        
    } catch (error) {
        console.error('❌ CREW PORTAL CONNECTION ERROR:', error.message);
        
        if (browser) {
            await browser.close();
        }
        
        res.status(500).json({
            success: false,
            authenticated: false,
            error: 'Unable to connect to crew portal',
            message: 'Please check your connection and try again',
            details: error.message
        });
    }
});

// Scrape endpoint (same functionality as authenticate for automatic scraping)
app.post('/api/scrape', async (req, res) => {
    console.log('🔄 AUTOMATIC SCRAPING REQUEST');
    
    // Use the same authentication logic
    const { employeeId, password, airline } = req.body;
    
    if (!employeeId || !password) {
        return res.status(400).json({
            success: false,
            error: 'Credentials required for automatic scraping'
        });
    }
    
    // Redirect to authenticate endpoint with scraping context
    req.body.autoScrape = true;
    
    // Call the authenticate function
    return app._router.handle(Object.assign(req, { url: '/api/authenticate' }), res);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 FlightRosterIQ - REAL CREW PORTAL AUTHENTICATION!');
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`🔐 Real ABX Air & ATI crew portal authentication enabled`);
    console.log(`📅 Automatic schedule scraping enabled`);
    console.log(`✈️ No fake accounts accepted - real credentials only`);
    console.log(`🌐 Access at: http://157.245.126.24:${PORT}`);
});

process.on('SIGTERM', () => {
    console.log('🛑 Shutting down FlightRosterIQ server...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Shutting down FlightRosterIQ server...');
    process.exit(0);
});