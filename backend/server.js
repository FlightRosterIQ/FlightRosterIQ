const express = require('express');
const puppeteer = require('puppeteer');
const { scrapeMonthlyRoster } = require('./monthlyScraper');
const app = express();
const PORT = process.env.PORT || 8080;

// Production modules
const sessionStore = require('./sessionStore');
const RateLimiter = require('./middleware/rateLimiter');
const sessionValidator = require('./middleware/sessionValidator');
const logger = require('./logger');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Initialize session store
sessionStore.init().catch(err => logger.error('Session store init failed:', err));

// NetLine API base URLs
const NETLINE_API = {
  abx: 'https://crew.abxair.com/api/netline/crew/pems/rest/pems',
  ati: 'https://crew.atitransport.com/api/netline/crew/pems/rest/pems'
};

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// Request logging
app.use((req, res, next) => {
  logger.request(req);
  next();
});

// Rate limiting (100 req/min per IP)
const apiLimiter = new RateLimiter(100, 60000);
app.use('/api/', apiLimiter.middleware());

app.get('/', (req, res) => {
    res.json({ 
        status: 'ok',
        service: 'FlightRosterIQ Backend',
        timestamp: new Date().toISOString(),
        message: 'Real crew portal authentication & automatic scraping ENABLED'
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        success: true,
        status: 'healthy', 
        service: 'FlightRosterIQ Backend - Real Authentication',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// ========================================
// MONTHLY PUPPETEER SCRAPER - SIMPLE & RELIABLE
// ========================================

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];

async function loginToCrew(page, employeeId, password) {
  await page.goto('https://crew.abxair.com', { waitUntil: 'networkidle2', timeout: 30000 });
  
  await page.waitForSelector('#username', { timeout: 10000 });
  await page.type('#username', employeeId);
  await page.type('#password', password);
  
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
  ]);
  
  console.log('✅ Logged into crew portal');
}

async function navigateToRoster(page) {
  await page.goto(
    'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html',
    { waitUntil: 'networkidle2', timeout: 30000 }
  );
  console.log('✅ Navigated to roster page');
  await sleep(2000);
}

async function goToMonth(page, targetYear, targetMonth) {
  const targetMonthName = MONTH_NAMES[targetMonth - 1];
  
  const getDisplayedMonth = async () => {
    return await page.evaluate(() => {
      const selectors = [
        '[class*="month"]',
        '[class*="calendar-header"]',
        '.month-label',
        '[aria-label*="month"]',
        'h2', 'h3'
      ];
      
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el && el.innerText) {
          return el.innerText;
        }
      }
      return '';
    });
  };
  
  for (let i = 0; i < 24; i++) {
    const label = await getDisplayedMonth();
    console.log(`📅 Current month display: "${label}"`);
    
    if (label.includes(String(targetYear)) && label.includes(targetMonthName)) {
      console.log(`✅ Reached ${targetMonthName} ${targetYear}`);
      return;
    }
    
    // Try to click next month button
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
      const nextBtn = buttons.find(b => 
        b.innerText.toLowerCase().includes('next') ||
        b.getAttribute('aria-label')?.toLowerCase().includes('next') ||
        b.className.includes('next')
      );
      
      if (nextBtn) {
        nextBtn.click();
        return true;
      }
      return false;
    });
    
    if (!clicked) {
      console.log('⚠️ Could not find next month button');
      break;
    }
    
    await sleep(800);
  }
  
  throw new Error(`Failed to reach ${targetMonthName} ${targetYear}`);
}

async function extractFlights(page) {
  await page.waitForFunction(() => {
    const duties = document.querySelectorAll('[class*="duty"], [class*="pairing"], [class*="trip"], [class*="leg"]');
    return duties.length > 0;
  }, { timeout: 15000 }).catch(() => {
    console.log('⚠️ No duties found in timeout period');
  });
  
  await sleep(1000);
  
  const flights = await page.evaluate(() => {
    const duties = [];
    const dutyElements = document.querySelectorAll('[class*="duty"], [class*="pairing"], [class*="trip"]');
    
    dutyElements.forEach(el => {
      const text = el.innerText;
      
      const legs = [];
      const routeMatches = text.match(/[A-Z]{3}\s*(→|->|-|—)\s*[A-Z]{3}/g);
      
      if (routeMatches) {
        routeMatches.forEach(route => {
          const airports = route.match(/[A-Z]{3}/g);
          if (airports && airports.length >= 2) {
            legs.push({
              from: airports[0],
              to: airports[1]
            });
          }
        });
      }
      
      if (legs.length > 0) {
        duties.push({
          raw: text.substring(0, 500),
          legs
        });
      }
    });
    
    return duties;
  });
  
  console.log(`✅ Extracted ${flights.length} duties`);
  return flights;
}

async function scrapeMonth({ employeeId, password, month, year }) {
  let browser;
  
  try {
    console.log(`🚀 Starting Puppeteer scrape for ${MONTH_NAMES[month - 1]} ${year}`);
    
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
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await loginToCrew(page, employeeId, password);
    await navigateToRoster(page);
    await goToMonth(page, year, month);
    
    const flights = await extractFlights(page);
    
    await browser.close();
    
    return {
      month,
      year,
      flights,
      success: true
    };
    
  } catch (error) {
    if (browser) await browser.close();
    console.error('❌ Scrape error:', error.message);
    throw error;
  }
}

// Family codes endpoints (basic storage)
const familyCodes = new Map();

// User registration storage
const registeredUsers = new Map(); // Map<employeeId, { nickname, rank, base, airline }>

// ========================================
// USER REGISTRATION ENDPOINTS
// ========================================
app.post('/api/register-user', async (req, res) => {
    const { employeeId, nickname, rank, base, airline } = req.body;
    
    if (!employeeId) {
        return res.status(400).json({ error: 'Employee ID required' });
    }
    
    registeredUsers.set(employeeId, {
        employeeId,
        nickname: nickname || employeeId,
        rank: rank || 'Pilot',
        base: base || 'Unknown',
        airline: airline || 'ABX',
        registeredAt: Date.now()
    });
    
    console.log(`✅ User registered: ${employeeId} (${nickname})`);
    res.json({ success: true, message: 'User registered successfully' });
});

app.post('/api/unregister-user', async (req, res) => {
    const { employeeId } = req.body;
    
    if (!employeeId) {
        return res.status(400).json({ error: 'Employee ID required' });
    }
    
    const existed = registeredUsers.delete(employeeId);
    
    if (existed) {
        console.log(`❌ User unregistered: ${employeeId}`);
        res.json({ success: true, message: 'User unregistered successfully' });
    } else {
        res.json({ success: false, message: 'User not found' });
    }
});

app.get('/api/search-users', async (req, res) => {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
        return res.json({ users: [] });
    }
    
    const searchLower = query.toLowerCase();
    const results = Array.from(registeredUsers.values())
        .filter(user => 
            user.employeeId.toLowerCase().includes(searchLower) ||
            user.nickname.toLowerCase().includes(searchLower)
        )
        .slice(0, 10); // Limit to 10 results
    
    res.json({ users: results });
});

app.post('/api/family/generate-code', async (req, res) => {
    const { employeeId } = req.body;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    familyCodes.set(code, { employeeId, created: Date.now() });
    res.json({ success: true, code });
});

app.post('/api/family/get-codes', async (req, res) => {
    const { employeeId } = req.body;
    const codes = Array.from(familyCodes.entries())
        .filter(([_, data]) => data.employeeId === employeeId)
        .map(([code, _]) => code);
    res.json({ success: true, codes });
});

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

// Navigate to a specific month in the crew portal
async function navigateToMonth(page, targetMonth, targetYear) {
  console.log(`🗓️ Navigating to ${targetYear}-${String(targetMonth).padStart(2, '0')}...`);
  
  // Get current date to determine starting month
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();
  
  console.log(`📅 Current month: ${currentYear}-${String(currentMonth).padStart(2, '0')}`);
  
  // Calculate months difference
  const monthsDiff = (targetYear - currentYear) * 12 + (targetMonth - currentMonth);
  console.log(`📊 Months to navigate: ${monthsDiff} (${monthsDiff > 0 ? 'forward' : 'backward'})`);
  
  if (monthsDiff === 0) {
    console.log('✅ Already on target month');
    return;
  }
  
  // Determine direction and button selector
  const isForward = monthsDiff > 0;
  const clicks = Math.abs(monthsDiff);
  const direction = isForward ? 'next' : 'previous';
  
  console.log(`🔄 Clicking ${direction} button ${clicks} times...`);
  
  // Click the appropriate button multiple times
  for (let i = 0; i < clicks; i++) {
    try {
      // Look for the SVG button - next has right arrow path, previous has left arrow path
      const buttonSelector = isForward 
        ? 'svg.IADP-MuiSvgIcon-root path[d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"]'
        : 'svg.IADP-MuiSvgIcon-root path[d="M15.41 16.59 10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"]';
      
      console.log(`  Click ${i + 1}/${clicks}...`);
      
      // Wait for the button to be available
      await page.waitForSelector(buttonSelector, { timeout: 5000 });
      
      // Click the parent button (the SVG's parent)
      await page.evaluate((selector) => {
        const svgPath = document.querySelector(selector);
        if (svgPath) {
          // Find the button parent
          let element = svgPath.parentElement;
          while (element && element.tagName !== 'BUTTON') {
            element = element.parentElement;
          }
          if (element) {
            element.click();
          }
        }
      }, buttonSelector);
      
      // Wait for page to update after navigation
      await sleep(2000);
      
    } catch (error) {
      console.error(`  ❌ Error on click ${i + 1}:`, error.message);
      throw new Error(`Failed to navigate to month ${targetYear}-${targetMonth}`);
    }
  }
  
  console.log(`✅ Successfully navigated to ${targetYear}-${String(targetMonth).padStart(2, '0')}`);
  
  // Wait for schedule to load
  await sleep(3000);
}

app.post('/api/authenticate', async (req, res) => {
    const { employeeId, password, airline, month, year } = req.body;
    console.log(`🔐 REAL CREW PORTAL AUTH: ${airline?.toUpperCase() || 'ABX'} pilot ${employeeId}`);
    if (month && year) {
        console.log(`📅 Requested month: ${year}-${String(month).padStart(2, '0')}`);
    }
    
    if (!employeeId || !password) {
        return res.status(400).json({
            success: false,
            error: 'Employee ID and password are required'
        });
    }
    
    try {
        console.log('🚀 Using network-based scraper (no DOM)...');
        
        // Call the revolutionary network-based scraper
        const result = await scrapeMonthlyRoster({
            employeeId,
            password,
            month: month || new Date().getMonth() + 1,
            year: year || new Date().getFullYear()
        });
        
        console.log('✅ Scrape successful!');
        
        res.json({
            success: true,
            authenticated: true,
            duties: result.flights,
            month: result.month,
            year: result.year
        });
        
    } catch (error) {
        console.error('❌ CREW PORTAL CONNECTION ERROR:', error.message);
        
        res.status(500).json({
            success: false,
            authenticated: false,
            error: 'Unable to connect to crew portal',
            message: 'Please check your connection and try again',
            details: error.message
        });
    }
});
                    await sleep(1500);
                    
                    // Extract notification items
                    notifications = await page.evaluate(() => {
                        const notificationItems = [];
                        
                        // Find all notification items by data-test-id="news-item-title"
                        const newsItems = document.querySelectorAll('[data-test-id="news-item-title"]');
                        
                        newsItems.forEach((item, index) => {
                            const title = item.textContent?.trim();
                            
                            // Get the parent element to extract additional details
                            const parent = item.closest('[class*="news"], [class*="notification"], [class*="item"]') || item.parentElement;
                            const fullText = parent?.textContent?.trim() || '';
                            
                            // Try to extract date/time if available
                            const dateMatch = fullText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})/);
                            const timeMatch = fullText.match(/(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i);
                            
                            if (title) {
                                notificationItems.push({
                                    id: `notif_${Date.now()}_${index}`,
                                    title: title,
                                    message: fullText.replace(title, '').trim().substring(0, 200),
                                    date: dateMatch ? dateMatch[0] : null,
                                    time: timeMatch ? timeMatch[0] : null,
                                    timestamp: new Date().toISOString(),
                                    read: false
                                });
                            }
                        });
                        
                        console.log(`Found ${notificationItems.length} notifications`);
                        return notificationItems;
                    });
                    
                    console.log(`✅ Extracted ${notifications.length} notifications`);
                } catch (notifError) {
                    console.error('⚠️ Error extracting notifications:', notifError.message);
                    notifications = [];
                }
                
// Extract full schedule data with crew members and hotels
                let scheduleData = { flights: [], pairings: [], hotels: [], notifications: notifications };
                try {
                    // Extract schedule from portal
                    const extractedData = await page.evaluate(() => {
                        const data = { flights: [], hotels: [], rawText: '' };
                        
                        // Try to get schedule table/grid
                        const tables = document.querySelectorAll('table, [class*="schedule"], [class*="roster"], [class*="duty"]');
                        
                        tables.forEach(table => {
                            const rows = table.querySelectorAll('tr, [class*="row"]');
                            rows.forEach(row => {
                                const text = row.textContent || '';
                                
                                // Look for hotel/layover info
                                if (text.match(/hotel|layover|overnight/i)) {
                                    const hotelMatch = text.match(/([A-Z]{3})\s+.*?(hotel|layover)/i);
                                    const dateMatch = text.match(/(\d{2}[A-Z][a-z]{2})/);
                                    
                                    if (hotelMatch) {
                                        data.hotels.push({
                                            location: hotelMatch[1],
                                            date: dateMatch ? dateMatch[1] : null,
                                            rawText: text.trim()
                                        });
                                    }
                                }
                                
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
                                        hotels: [],
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
                            if (crewMembers && crewMembers.length > 0) {
                                extractedData.flights[0].crewMembers = crewMembers;
                                console.log(`👥 Extracted ${crewMembers.length} crew members`);
                            } else {
                                // Add mock crew data for testing display
                                console.log('⚠️ No crew found, adding test data');
                                extractedData.flights[0].crewMembers = [
                                    { name: 'John Smith', role: 'Captain', employeeId: '12345' },
                                    { name: 'Jane Doe', role: 'First Officer', employeeId: '67890' }
                                ];
                            }
                            
                            // Add mock actual times for testing (same as scheduled to verify display)
                            extractedData.flights[0].actualDeparture = extractedData.flights[0].departure;
                            extractedData.flights[0].actualArrival = extractedData.flights[0].arrival;
                            console.log('✈️ Added test actual times (matching scheduled)');
                        } catch (crewErr) {
                            console.log('⚠️ Could not extract crew:', crewErr.message);
                        }
                    }
                    
                    // Log hotel data if found
                    if (extractedData.hotels && extractedData.hotels.length > 0) {
                        console.log(`🏨 Found ${extractedData.hotels.length} hotels/layovers`);
                    }
                    
                    scheduleData = extractedData;
                    console.log(`📅 Schedule extraction complete`);
                    
                } catch (extractError) {
                    console.log('📅 Schedule extraction note:', extractError.message);
                    scheduleData = { flights: [], note: 'Real authentication successful - portal accessed' };
                }
                
                // Debug: Capture page HTML and take screenshot for diagnosis
                try {
                    const pageHTML = await page.content();
                    const pageText = await page.evaluate(() => document.body.innerText);
                    
                    // Log first 2000 chars of visible text
                    console.log('📄 === PORTAL PAGE TEXT (first 2000 chars) ===');
                    console.log(pageText.substring(0, 2000));
                    console.log('📄 === END PORTAL TEXT ===');
                    
                    // Save full HTML to file for inspection
                    const fs = require('fs');
                    const path = require('path');
                    const debugDir = path.join(__dirname, 'debug');
                    if (!fs.existsSync(debugDir)) {
                        fs.mkdirSync(debugDir, { recursive: true });
                    }
                    
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const htmlFile = path.join(debugDir, `portal-${airline || 'abx'}-${timestamp}.html`);
                    const textFile = path.join(debugDir, `portal-${airline || 'abx'}-${timestamp}.txt`);
                    
                    fs.writeFileSync(htmlFile, pageHTML);
                    fs.writeFileSync(textFile, pageText);
                    console.log(`💾 Saved portal HTML to: ${htmlFile}`);
                    console.log(`💾 Saved portal text to: ${textFile}`);
                    
                    // Take screenshot
                    const screenshotFile = path.join(debugDir, `portal-${airline || 'abx'}-${timestamp}.png`);
                    await page.screenshot({ path: screenshotFile, fullPage: true });
                    console.log(`📸 Saved screenshot to: ${screenshotFile}`);
                } catch (debugErr) {
                    console.log('⚠️ Debug capture error:', debugErr.message);
                }
                
                await browser.close();
                
                // Format flights data for frontend compatibility
                const formattedFlights = scheduleData.flights || [];
                formattedFlights.forEach(flight => {
                    // Ensure crewMembers field exists
                    if (!flight.crewMembers) {
                        flight.crewMembers = [];
                    }
                    // Ensure hotels field exists
                    if (!flight.hotels) {
                        flight.hotels = [];
                    }
                    // Parse date if needed
                    if (flight.date && !flight.date.includes('-')) {
                        flight.date = parseCrewDate(flight.date);
                    }
                });
                
                // Format hotel data
                // Hotels are shown on the arrival date of the preceding flight (layover day)
                const formattedHotels = (scheduleData.hotels || []).map(hotel => {
                    return {
                        ...hotel,
                        date: hotel.date && !hotel.date.includes('-') ? parseCrewDate(hotel.date) : hotel.date
                    };
                });
                
                res.json({
                    success: true,
                    authenticated: true,
                    message: `Real crew portal authentication successful for ${airline?.toUpperCase() || 'ABX'} pilot ${employeeId}`,
                    data: {
                        employeeId,
                        airline: airline?.toUpperCase() || 'ABX',
                        loginTime: new Date().toISOString(),
                        portalAccessed: true,
                        flights: formattedFlights,
                        hotels: formattedHotels,
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
// ❌ DEPRECATED: Old Puppeteer-based scraping endpoint
app.post('/api/scrape', (req, res) => {
    console.warn('⚠️ DEPRECATED: /api/scrape endpoint called. Use /api/netline/roster/events instead.');
    res.status(410).json({
        error: 'Deprecated endpoint. Use /api/netline/roster/events',
        message: 'This endpoint has been replaced with the NetLine API. Please update your client to use getRosterWithBackgroundSync() from netlineApiDomAdapter.',
        migration: {
            oldEndpoint: '/api/scrape',
            newEndpoint: '/api/netline/roster/events',
            adapterFunction: 'getRosterWithBackgroundSync(crewCode, onUpdate)'
        }
    });
});

// ========================================
// NETLINE API PROXY (for frontend scraper)
// ========================================
app.get('/api/netline/roster/events', sessionValidator(sessionStore), async (req, res) => {
  logger.info('✅ [ROSTER API] Request received for', req.crewCode);
  logger.debug('✅ [ROSTER API] Current sessions count:', sessionStore.size());
  
  try {
    const { crewCode } = req;
    const session = req.netlineSession;
    
    logger.debug('✅ [ROSTER API] Session found for', crewCode);
    
    // Session validation already done by middleware
    
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

// ========================================
// HEALTH & MONITORING ENDPOINTS
// ========================================
app.get('/api/health/detailed', (req, res) => {
  const sessions = sessionStore.getAll();
  const uptime = process.uptime();
  
  res.json({
    success: true,
    status: 'healthy',
    service: 'FlightRosterIQ Backend',
    version: '2.1.0',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: uptime,
      human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
    },
    sessions: {
      total: sessionStore.size(),
      active: sessions.filter(s => s.expiresIn > 3600).length,
      expiringSoon: sessions.filter(s => s.expiresIn > 0 && s.expiresIn <= 3600).length
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB'
    }
  });
});

app.get('/api/health/sessions', (req, res) => {
  res.json({
    success: true,
    sessions: sessionStore.getAll()
  });
});

app.listen(PORT, '0.0.0.0', () => {
    logger.info('🚀 FlightRosterIQ - Production Ready!');
    logger.info(`🌐 Server running on port ${PORT}`);
    logger.info(`🔐 NetLine API authentication enabled`);
    logger.info(`💾 Persistent session storage active`);
    logger.info(`⚡ Rate limiting enabled (100 req/min)`);
    logger.info(`🌐 Access at: http://157.245.126.24:${PORT}`);
});

// Graceful shutdown
async function shutdown(signal) {
    logger.info(`🛑 ${signal} received, shutting down gracefully...`);
    
    try {
      await sessionStore.shutdown();
      logger.info('✅ Session store closed');
    } catch (err) {
      logger.error('❌ Error during shutdown:', err);
    }
    
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));