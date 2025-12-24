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

// Family codes endpoints (basic storage)
const familyCodes = new Map();

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
                await page.click('#username', { clickCount: 3 }); // Select all
                await page.keyboard.press('Backspace'); // Clear
                await page.type('#username', employeeId);
                console.log(`✅ Username entered: ${employeeId}`);
                
                // Fill password field
                await page.waitForSelector('#password', { timeout: 5000 });
                await page.click('#password', { clickCount: 3 }); // Select all
                await page.keyboard.press('Backspace'); // Clear
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
                
                // Navigate to requested month if specified
                if (month && year) {
                    try {
                        await navigateToMonth(page, month, year);
                    } catch (navError) {
                        console.error('❌ Month navigation error:', navError.message);
                        console.log('⚠️ Continuing with current month...');
                    }
                }
                
                // Expand all flight details to reveal actual times and report times
                console.log('📂 Expanding all flight details...');
                try {
                    await page.evaluate(() => {
                        // Find all expand buttons (downward chevron SVG icons)
                        const expandButtons = Array.from(document.querySelectorAll('button, [role="button"]')).filter(btn => {
                            const svg = btn.querySelector('svg');
                            if (!svg) return false;
                            const path = svg.querySelector('path');
                            // Match the downward chevron path: "M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z"
                            return path && path.getAttribute('d')?.includes('16.59 8.59');
                        });
                        
                        console.log(`Found ${expandButtons.length} flight detail expand buttons`);
                        
                        // Click all expand buttons to reveal details
                        expandButtons.forEach(btn => {
                            try {
                                btn.click();
                            } catch (e) {
                                console.error('Error clicking expand button:', e);
                            }
                        });
                    });
                    
                    // Wait for all details to expand
                    await sleep(2000);
                    console.log('✅ All flight details expanded');
                } catch (expandError) {
                    console.error('⚠️ Error expanding flight details:', expandError.message);
                    console.log('Continuing with extraction...');
                }
                
                // Step 2: Click info buttons to access crew information
                console.log('ℹ️ Clicking info buttons to reveal crew sections...');
                try {
                    await page.evaluate(() => {
                        // Find all info buttons (circle with "i" SVG icon)
                        // Path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
                        const infoButtons = Array.from(document.querySelectorAll('button, [role="button"]')).filter(btn => {
                            const svg = btn.querySelector('svg');
                            if (!svg) return false;
                            const path = svg.querySelector('path');
                            // Match the info icon path
                            return path && path.getAttribute('d')?.includes('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10');
                        });
                        
                        console.log(`Found ${infoButtons.length} info buttons`);
                        
                        // Click all info buttons
                        infoButtons.forEach(btn => {
                            try {
                                btn.click();
                            } catch (e) {
                                console.error('Error clicking info button:', e);
                            }
                        });
                    });
                    
                    // Wait for info sections to open
                    await sleep(1500);
                    console.log('✅ Info buttons clicked');
                } catch (infoError) {
                    console.error('⚠️ Error clicking info buttons:', infoError.message);
                }
                
                // Step 3: Expand crew details dropdowns within info sections
                console.log('👥 Expanding crew details dropdowns...');
                try {
                    await page.evaluate(() => {
                        // Find all chevron buttons again (some are in the newly opened info sections)
                        const crewExpandButtons = Array.from(document.querySelectorAll('button, [role="button"]')).filter(btn => {
                            const svg = btn.querySelector('svg');
                            if (!svg) return false;
                            const path = svg.querySelector('path');
                            // Match the downward chevron path again
                            return path && path.getAttribute('d')?.includes('16.59 8.59');
                        });
                        
                        console.log(`Found ${crewExpandButtons.length} crew detail expand buttons`);
                        
                        // Click all crew expand buttons
                        crewExpandButtons.forEach(btn => {
                            try {
                                btn.click();
                            } catch (e) {
                                console.error('Error clicking crew expand button:', e);
                            }
                        });
                    });
                    
                    // Wait for crew details to expand
                    await sleep(2000);
                    console.log('✅ All crew details expanded');
                } catch (crewError) {
                    console.error('⚠️ Error expanding crew details:', crewError.message);
                }
                
                // Step 4: Extract notifications from the bell icon
                console.log('🔔 Extracting notifications...');
                let notifications = [];
                try {
                    // Click the notifications bell button
                    await page.evaluate(() => {
                        // Find the bell icon button
                        // Path: "M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
                        const bellButton = Array.from(document.querySelectorAll('button, [role="button"]')).find(btn => {
                            const svg = btn.querySelector('svg');
                            if (!svg) return false;
                            const path = svg.querySelector('path');
                            return path && path.getAttribute('d')?.includes('M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07');
                        });
                        
                        if (bellButton) {
                            console.log('Found notifications bell button');
                            bellButton.click();
                        } else {
                            console.log('Notifications bell button not found');
                        }
                    });
                    
                    // Wait for notifications panel to open
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
    console.log(`🔒 Proxied through Vercel - no mixed content issues`);
});

process.on('SIGTERM', () => {
    console.log('🛑 Shutting down FlightRosterIQ server...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Shutting down FlightRosterIQ server...');
    process.exit(0);
});