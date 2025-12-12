const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = 8080;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.use(express.static('dist', {
  etag: false,
  maxAge: 0
}));

app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', service: 'FlightRosterIQ Real Auth' });
});

const authenticateUser = async (employeeId, password, airline) => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        const page = await browser.newPage();
        const portalUrl = 'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp';
        
        console.log(`🌐 Navigating to: ${portalUrl}`);
        await page.goto(portalUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        console.log(`📍 Current URL: ${page.url()}`);
        
        if (page.url().includes('auth/realms')) {
            console.log('🔐 Login page detected, entering credentials...');
            await sleep(3000);
            
            await page.waitForSelector('#username', { timeout: 10000 });
            console.log('✏️ Typing username...');
            await page.type('#username', employeeId);
            
            await page.waitForSelector('#password', { timeout: 5000 });
            console.log('✏️ Typing password...');
            await page.type('#password', password);
            
            console.log('🔑 Submitting login form...');
            await page.keyboard.press('Enter');
            
            try {
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 });
            } catch (navError) {
                console.log('⚠️ Navigation timeout, checking current page...');
            }
            
            await sleep(2000);
            const postLoginUrl = page.url();
            console.log(`📍 Post-login URL: ${postLoginUrl}`);
            
            // Check for error messages on the page
            const errorMsg = await page.evaluate(() => {
                const errorElement = document.querySelector('.error, .alert-error, #error-message, [class*="error"]');
                return errorElement ? errorElement.textContent : null;
            });
            
            if (errorMsg) {
                console.log(`❌ Error message on page: ${errorMsg}`);
            }
            
            if (postLoginUrl.includes('auth/realms')) {
                console.log('❌ Still on login page after submission - credentials rejected');
                throw new Error('Invalid credentials');
            }
            
            console.log('✅ REAL AUTH SUCCESS!');
            
            // Wait for the IADP schedule page to fully load
            console.log('⏳ Waiting for Netline/IADP schedule to load...');
            
            // Wait for schedule content to appear (try multiple selectors)
            try {
                await page.waitForSelector('table, [class*="schedule"], [class*="grid"], [role="grid"]', { timeout: 15000 });
                console.log('✅ Schedule content detected');
            } catch (e) {
                console.log('⚠️ Schedule content not found with selectors, waiting longer...');
            }
            
            await sleep(10000); // Give even more time for dynamic content
            
            // Scrape comprehensive schedule data from Netline/IADP
            console.log('📅 Scraping monthly schedule from Netline/IADP crew portal...');
            
            // Take screenshot for debugging
            try {
                await page.screenshot({ path: '/tmp/netline-schedule.png', fullPage: true });
                console.log('📸 Screenshot saved to /tmp/netline-schedule.png');
            } catch (e) {
                console.log('⚠️ Could not save screenshot');
            }
            
            // Save page HTML for debugging
            try {
                const html = await page.content();
                require('fs').writeFileSync('/tmp/netline-schedule.html', html);
                console.log('💾 HTML saved to /tmp/netline-schedule.html');
            } catch (e) {
                console.log('⚠️ Could not save HTML');
            }
            
            const scheduleData = await page.evaluate(() => {
                const flights = [];
                
                // Get the entire page content for analysis
                const pageText = document.body.innerText || document.body.textContent;
                
                // IADP-specific selectors for NetLine/Crew roster data
                // Look for duty plan, roster, flight assignments
                const dutyElements = document.querySelectorAll(
                    '[class*="duty"], [class*="roster"], [class*="flight"], [class*="pairing"], ' +
                    '[class*="assignment"], [class*="schedule"], [data-duty], [data-flight], ' +
                    'table tr, [role="row"], [role="gridcell"], div[class*="calendar"]'
                );
                
                // Also check for Angular/React component data attributes
                const angularElements = document.querySelectorAll('[ng-repeat], [ng-if], [data-ng-repeat]');
                const reactElements = document.querySelectorAll('[data-reactroot], [data-react]');
                
                console.log(`Found ${dutyElements.length} duty/roster elements, ${angularElements.length} Angular elements, ${reactElements.length} React elements`);
                
                // Process each duty/roster element
                dutyElements.forEach((elem, index) => {
                    const cells = elem.querySelectorAll('td, th, [role="cell"], div');
                    const elemText = elem.innerText || elem.textContent || '';
                    
                    if (!elemText || elemText.trim().length < 5) return;
                    
                    const cellTexts = Array.from(cells).map(c => (c.innerText || c.textContent || '').trim()).filter(t => t.length > 0);
                    
                    // Extract IADP-specific data elements
                    const flightData = {
                        rowIndex: index,
                        rawText: elemText.trim(),
                        cells: cellTexts,
                        // Flight numbers (ABX format: 8010, 1234, or ABX1234)
                        flightNumber: elemText.match(/\b(?:ABX|ATI)?[-\s]?\d{3,4}\b/i)?.[0],
                        // Dates in various formats
                        date: elemText.match(/\d{1,2}[-\/]\d{1,2}(?:[-\/]\d{2,4})?|\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{1,2}[-\/]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i)?.[0],
                        // Times (duty times, flight times - 24hr or 12hr format)
                        times: elemText.match(/\d{1,2}:\d{2}(?:\s*[AaPp][Mm])?|\d{4}Z?/g) || [],
                        // Airport codes (3 letters)
                        airports: elemText.match(/\b[A-Z]{3}\b/g) || [],
                        // Phone numbers (hotel, crew contacts)
                        phone: elemText.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s*\d{3}[-.\s]?\d{4}|1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0],
                        // Hotel names
                        hotel: elemText.match(/\b[\w\s&']+\s+(?:Hotel|Inn|Suites?|Resort|Lodge|Marriott|Hilton|Hyatt|Hampton|Holiday|Sheraton|Radisson|Courtyard)/i)?.[0],
                        // Duty types (FLY, STBY, OFF, etc)
                        dutyType: elemText.match(/\b(?:FLY|FLIGHT|STBY|STANDBY|OFF|LEAVE|TRAINING|SIM|RECURRENT)\b/i)?.[0],
                        // Check for data attributes
                        dataAttributes: {
                            duty: elem.getAttribute('data-duty'),
                            flight: elem.getAttribute('data-flight'),
                            date: elem.getAttribute('data-date')
                        }
                    };
                    
                    // Add if contains meaningful flight data
                    if (flightData.flightNumber || flightData.airports.length >= 2 || flightData.times.length >= 1) {
                        flights.push(flightData);
                    }
                });
                
                return {
                    flights: flights.slice(0, 100), // Limit to 100 entries
                    totalRows: allRows.length,
                    pageTitle: document.title,
                    url: window.location.href,
                    pagePreview: pageText.substring(0, 1000) // First 1000 chars for debugging
                };
            });
            
            console.log(`📊 Scraped ${scheduleData.flights.length} flight entries from ${scheduleData.totalRows} rows`);
            console.log(`📄 Page title: ${scheduleData.pageTitle}`);
        }
        
        await browser.close();
        
        return {
            success: true,
            authenticated: true,
            message: `Real authentication successful for ${employeeId}`,
            data: {
                employeeId,
                airline: airline || 'ABX',
                loginTime: new Date().toISOString(),
                scheduleData: scheduleData || { flights: [] },
                realAuth: true
            }
        };
        
    } catch (error) {
        if (browser) await browser.close();
        throw error;
    }
};

app.post('/api/authenticate', async (req, res) => {
    const { employeeId, password, airline } = req.body;
    console.log(`🔐 REAL AUTH: ${airline || 'ABX'} pilot ${employeeId}`);
    
    if (!employeeId || !password) {
        return res.status(400).json({
            success: false,
            error: 'Employee ID and password required'
        });
    }
    
    try {
        const result = await authenticateUser(employeeId, password, airline);
        res.json(result);
    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Authentication failed',
            details: error.message
        });
    }
});

app.post('/api/scrape', async (req, res) => {
    const { employeeId, password, airline } = req.body;
    console.log(`🔄 SCRAPE REQUEST: ${airline || 'ABX'} pilot ${employeeId}`);
    
    if (!employeeId || !password) {
        return res.status(400).json({
            success: false,
            error: 'Credentials required for scraping'
        });
    }
    
    try {
        const result = await authenticateUser(employeeId, password, airline);
        
        // Add scraping context to response
        result.message = `Automatic scraping successful for ${employeeId}`;
        result.autoScrape = true;
        
        res.json(result);
    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Scraping failed',
            details: error.message
        });
    }
});

app.get('/api/schedule', (req, res) => {
    // Return empty schedule - user needs to login/refresh to get data
    res.json({
        success: true,
        schedule: null,
        message: 'Please login to load your schedule'
    });
});

app.get('/api/notifications', (req, res) => {
    // Return empty notifications
    res.json({
        success: true,
        notifications: []
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 FlightRosterIQ - REAL AUTHENTICATION FIXED!');
    console.log(`🌐 Server: http://157.245.126.24:${PORT}`);
    console.log('🔐 Real crew portal auth enabled');
    console.log('🔄 Automatic scraping fixed');
});
