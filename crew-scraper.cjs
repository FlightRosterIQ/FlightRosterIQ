const puppeteer = require('puppeteer');
const fs = require('fs');
const fetch = require('node-fetch');

// Configuration - keep credentials out of source in production
const AIRLINE_CONFIGS = {
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

// Default configuration function for Next.js compatibility
function getConfig(options = {}) {
  return {
    airline: options.airline || process.env.CREW_AIRLINE || 'ABX Air',
    username: options.username || process.env.CREW_USERNAME || '',
    password: options.password || process.env.CREW_PASSWORD || '',
    backendUrl: options.backendUrl || 'http://localhost:3001/api/schedule/import',
    headless: options.headless !== false, // Default to true for Next.js/Vercel
    extractCrewDetails: options.extractCrewDetails !== false,
    get portalUrl() { return AIRLINE_CONFIGS[this.airline]?.portalUrl || AIRLINE_CONFIGS['ABX Air'].portalUrl; },
    get loginSelectors() { return AIRLINE_CONFIGS[this.airline]?.loginSelectors || AIRLINE_CONFIGS['ABX Air'].loginSelectors; }
  };
}

// Small helper - some Puppeteer versions don't implement page.waitForTimeout
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function scrapeCrewPortal() {
  console.log('🚀 Starting crew portal scraper...');
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: CONFIG.headless,
      defaultViewport: { width: 1280, height: 900 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    // Capture console and network failures for debugging
    try {
      await fs.writeFileSync('puppeteer-console.log', '');
    } catch (e) {}
    page.on('console', msg => {
      try { fs.appendFileSync('puppeteer-console.log', `[console] ${msg.text()}\n`); } catch (e) {}
    });
    page.on('requestfailed', req => {
      try { fs.appendFileSync('puppeteer-console.log', `[requestfailed] ${req.url()} ${req.failure()?.errorText}\n`); } catch (e) {}
    });

    // Navigate to portal
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    console.log('📍 Navigating to crew portal...');
    await page.goto(CONFIG.portalUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Attempt login if credentials provided and login form present
    try {
      const usernameSelector = 'input#username';
      const passwordSelector = 'input#password';
      const loginButtonSelector = 'input#kc-login';

      if (CONFIG.username && CONFIG.password) {
        await sleep(1000);
        if (await page.$(usernameSelector)) {
          await page.type(usernameSelector, CONFIG.username, { delay: 50 });
          await page.type(passwordSelector, CONFIG.password, { delay: 50 });
          await page.click(loginButtonSelector);
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
          console.log('🔐 Login attempted');
        }
      }
    } catch (loginErr) {
      console.warn('⚠️ Login step failed or not required:', loginErr.message);
    }

    // Wait for dashboard and save HTML for debugging
    await sleep(3000);
    fs.writeFileSync('portal-dashboard.html', await page.content());
    try { await page.screenshot({ path: 'portal-dashboard.png', fullPage: true }); } catch (e) {}

    // Wait for duty list or rows to render (some portals take longer)
    try {
      await page.waitForSelector('div[data-test-id="duty-row"], [data-test-id="duty-list"], .IADP-duty-list', { timeout: 15000 });
    } catch (e) {
      console.log('⏳ Duty rows not found within timeout, will continue and save expanded snapshot');
    }

    // Save a plain-text dump of the page body to help find rendered text
    try {
      const bodyText = await page.evaluate(() => document.body.innerText || '');
      fs.writeFileSync('portal-body-text.txt', bodyText.substring(0, 200000));
      console.log(`📝 Page body text length: ${bodyText.length} chars`);
      console.log(`📝 First 500 chars: ${bodyText.substring(0, 500)}`);
      
      // Extract username and employee number from body text (position #7)
      const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);
      console.log(`📋 Page text lines:`, lines.slice(0, 10));
      
      // Line index 1 should contain the employee number (152780)
      const employeeNumber = lines[1] || '';
      console.log(`👤 Employee number found: ${employeeNumber}`);
      
      // Look for username in nearby lines or elements
      const usernameInfo = await page.evaluate(() => {
        // Look for profile or user info sections
        const userElements = document.querySelectorAll('[class*="user"], [class*="profile"], [class*="name"]');
        for (const el of userElements) {
          const text = el.textContent?.trim();
          if (text && text.length > 2 && text.length < 100) {
            return text;
          }
        }
        return '';
      });
      console.log(`👤 Username info: ${usernameInfo}`);
      
    } catch (e) {}

    // Check current URL and page state
    try {
      const currentUrl = page.url();
      const pageTitle = await page.title();
      console.log(`🔗 Current URL: ${currentUrl}`);
      console.log(`📄 Page title: ${pageTitle}`);
      
      // Look for any error messages or loading states
      const pageState = await page.evaluate(() => {
        const errors = Array.from(document.querySelectorAll('[class*="error"], [class*="Error"]'))
          .map(el => el.textContent?.trim()).filter(Boolean);
        const loading = Array.from(document.querySelectorAll('[class*="loading"], [class*="Loading"], [class*="spinner"]'))
          .length > 0;
        const dutyRows = document.querySelectorAll('[data-test-id*="duty"]').length;
        const calendarVisible = document.querySelector('[data-test-id="calendar"]') !== null;
        
        return { errors, loading, dutyRows, calendarVisible };
      });
      
      console.log(`🔍 Page state:`, pageState);
    } catch (e) {}

    // Try to find and click an IADP / Duty Plan link if present (some portals require selecting the module)
    try {
      const iadpLink = await page.$('a[href*="iadp"], a[href*="#/iadp"], a:contains("Duty Plan")');
      if (iadpLink) {
        try { await iadpLink.click(); await sleep(2000); } catch (e) {}
      }
    } catch (e) {}

    // Try to accept cookie/banner dialogs which can block content
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        for (const b of buttons) {
          const t = (b.textContent || '').trim().toLowerCase();
          if (t === 'ok' || t === 'accept' || t === 'agree' || t === 'accept all') {
            b.click();
            break;
          }
        }
      });
      await sleep(800);
    } catch (e) {}

    // Try to click the "Duty plan" navigation item to ensure the module is active
    try {
      await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('a, button'));
        for (const el of items) {
          const txt = (el.textContent || '').trim().toLowerCase();
          if (txt === 'duty plan' || txt === 'dutyplan' || txt === 'iadp') {
            el.click();
            break;
          }
        }
      });
      await sleep(1200);
    } catch (e) {}

    // The portal may be showing calendar view instead of list view - try to switch to list view
    console.log('🔍 Looking for list/duty view toggle...');
    try {
      // Look for list view button, duties list button, or similar
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        for (const btn of buttons) {
          const text = (btn.textContent || '').trim().toLowerCase();
          const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
          const title = (btn.getAttribute('title') || '').toLowerCase();
          
          if (text.includes('list') || text.includes('duties') || 
              ariaLabel.includes('list') || ariaLabel.includes('duties') ||
              title.includes('list') || title.includes('duties') ||
              btn.getAttribute('data-test-id')?.includes('list')) {
            console.log('Clicking list view button:', text || ariaLabel || title);
            btn.click();
            return true;
          }
        }
        return false;
      });
      await sleep(2000);
    } catch (e) {
      console.log('Could not find list view button');
    }

    // Try clicking on a calendar day that has duties (the current day or nearby)
    console.log('🗓️ Trying to click on a calendar day with duties...');
    try {
      await page.evaluate(() => {
        // Look for calendar days that might have content (classes that suggest duties)
        const days = Array.from(document.querySelectorAll('[data-test-id="calendar-day"]'));
        for (const day of days) {
          // Click on days that might have duties (look for visual indicators)
          if (day.classList.contains('has-duties') || 
              day.querySelector('.duty') || 
              day.querySelector('[class*="duty"]') ||
              day.classList.length > 3) { // more classes might indicate content
            day.click();
            return true;
          }
        }
        // If no special days found, click the first available day
        if (days.length > 5) {
          days[5].click(); // Click around day 6 which might have duties
          return true;
        }
        return false;
      });
      await sleep(1500);
    } catch (e) {
      console.log('Could not interact with calendar days');
    }

    // Navigate to REMARKS section (item #5) for pilot notifications from scheduling
    console.log('📧 Navigating to REMARKS section for pilot notifications...');
    let pilotNotifications = [];
    try {
      // Click on REMARKS nav item
      await page.evaluate(() => {
        const navItems = Array.from(document.querySelectorAll('a, button, [role="button"]'));
        for (const item of navItems) {
          const text = (item.textContent || '').trim().toLowerCase();
          if (text === 'remarks' || text.includes('remark')) {
            item.click();
            return true;
          }
        }
        return false;
      });
      
      await sleep(3000); // Wait for remarks to load
      
      // Extract pilot notifications from remarks
      pilotNotifications = await page.evaluate(() => {
        const notifications = [];
        // Look for notification/message containers
        const messageElements = document.querySelectorAll('[class*="message"], [class*="notification"], [class*="remark"], .content, .item');
        
        messageElements.forEach(el => {
          const text = el.textContent?.trim();
          if (text && text.length > 10 && text.length < 1000) {
            // Check if it looks like a scheduling notification
            if (text.toLowerCase().includes('schedule') || 
                text.toLowerCase().includes('flight') || 
                text.toLowerCase().includes('duty') ||
                text.toLowerCase().includes('assignment') ||
                text.toLowerCase().includes('change') ||
                text.toLowerCase().includes('update')) {
              notifications.push({
                message: text,
                timestamp: new Date().toISOString(),
                type: 'scheduling_notification'
              });
            }
          }
        });
        
        return notifications;
      });
      
      console.log(`📬 Found ${pilotNotifications.length} pilot notifications in REMARKS`);
      if (pilotNotifications.length > 0) {
        fs.writeFileSync('pilot-notifications.json', JSON.stringify(pilotNotifications, null, 2));
      }
      
    } catch (remarksErr) {
      console.error('❌ Error extracting REMARKS:', remarksErr.message);
    }

    // Click and scrape items #3 and #4 for data (navigate back to main view first)
    console.log('🔍 Navigating to items #3 and #4 for data extraction...');
    try {
      // Navigate back to main duty plan view
      await page.evaluate(() => {
        const navItems = Array.from(document.querySelectorAll('a, button'));
        for (const item of navItems) {
          const text = (item.textContent || '').trim().toLowerCase();
          if (text === 'duty plan' || text === 'dutyplan' || text.includes('duty')) {
            item.click();
            return true;
          }
        }
        return false;
      });
      
      await sleep(2000);
      
      // Try to identify and click items #3 and #4 based on the portal text structure
      // From body text: 'Duty plan', 'DUTY PLAN', 'REMARKS', 'NEWS', 'PROFILE'
      // Item #3 = 'DUTY PLAN', Item #4 = 'REMARKS'
      
      console.log('📋 Clicking on DUTY PLAN (item #3)...');
      const item3Data = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('a, button, [role="button"]'));
        for (const item of items) {
          const text = (item.textContent || '').trim().toUpperCase();
          if (text === 'DUTY PLAN' || text === 'DUTYPLAN') {
            item.click();
            return {
              title: 'DUTY PLAN',
              clicked: true,
              text: item.textContent?.trim()
            };
          }
        }
        return { title: 'DUTY PLAN', clicked: false };
      });
      
      await sleep(2000);
      const item3Content = await page.evaluate(() => document.body.innerText?.substring(0, 5000));
      
      console.log('📋 Clicking on NEWS (item #4)...');
      const item4Data = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('a, button, [role="button"]'));
        for (const item of items) {
          const text = (item.textContent || '').trim().toUpperCase();
          if (text === 'NEWS') {
            item.click();
            return {
              title: 'NEWS',
              clicked: true,
              text: item.textContent?.trim()
            };
          }
        }
        return { title: 'NEWS', clicked: false };
      });
      
      await sleep(2000);
      const item4Content = await page.evaluate(() => document.body.innerText?.substring(0, 5000));
      
      const items34Data = {
        item3: { ...item3Data, content: item3Content },
        item4: { ...item4Data, content: item4Content }
      };
      
      await sleep(4000); // Wait for both items to be processed
      
      console.log('📄 Items #3 and #4 data extracted');
      fs.writeFileSync('items-3-4-data.json', JSON.stringify(items34Data, null, 2));
      
    } catch (itemsErr) {
      console.error('❌ Error extracting items #3 and #4:', itemsErr.message);
    }

    // Expand all pairings/buttons
    console.log('🔽 Expanding all pairings...');
    const expandButtons = await page.$$('[data-test-id="toggle-sublist-button"]');
    for (const btn of expandButtons) {
      try {
        await btn.click();
        await sleep(250);
      } catch (err) {
        // ignore individual failures
      }
    }
    fs.writeFileSync('portal-expanded.html', await page.content());
    try { await page.screenshot({ path: 'portal-expanded.png', fullPage: true }); } catch (e) {}

    // Optional: click into details and extract crew info (limited to avoid instability)
    const crewDataByFlight = {};
    if (CONFIG.extractCrewDetails) {
      console.log('👥 Extracting crew details (limited)...');
      try {
        const detailButtons = await page.$$('[data-event-type="LEG"] button[data-test-id="details-page-button"]');
        const max = Math.min(detailButtons.length, 10); // limit to 10 for stability
        for (let i = 0; i < max; i++) {
          const btn = detailButtons[i];
          try {
            const flightInfo = await btn.evaluate(b => {
              const duty = b.closest('[data-test-id="duty-row"]');
              return duty?.querySelector('[data-test-id="duty-row-details"]')?.textContent?.trim() || '';
            });
            await btn.click();
            await sleep(800);

            // extract crew text
            const crew = await page.evaluate(() => {
              const out = [];
              const els = document.querySelectorAll('[data-test-id*="crew"], .crew-member, .CrewMember');
              els.forEach(e => {
                const t = e.textContent?.trim();
                if (t && t.length > 5) out.push(t);
              });
              return out;
            });

            crewDataByFlight[flightInfo] = { crewList: crew };

            // try to close modal
            await page.keyboard.press('Escape');
            await sleep(400);
          } catch (err) {
            // continue
          }
        }
        fs.writeFileSync('crew-details.json', JSON.stringify(crewDataByFlight, null, 2));
      } catch (crewErr) {
        console.warn('⚠️ Crew extraction failed:', crewErr.message);
      }
    }

    // Dump a sample of elements that include data-event-type or data-test-id to inspect DOM structure
    try {
      const sample = await page.evaluate(() => {
        const sel = Array.from(document.querySelectorAll('[data-event-type], [data-test-id]'));
        return sel.slice(0, 2000).map(el => ({
          tag: el.tagName,
          attrs: Array.from(el.attributes).map(a => ({ name: a.name, value: a.value })),
          text: (el.textContent || '').trim().slice(0, 300)
        }));
      });
      fs.writeFileSync('dom-attributes-sample.json', JSON.stringify(sample, null, 2));
    } catch (e) {}

    // Extract schedule data - use broader selectors since we detected 1 duty row
    const scheduleData = await page.evaluate((crewMap) => {
      const pairings = [];
      
      // Try multiple selectors for duty rows
      const dutyRows = document.querySelectorAll('div[data-test-id="duty-row"], [data-test-id*="duty"], [class*="duty-row"], [class*="pairing"]');
      console.log(`Found ${dutyRows.length} potential duty/pairing elements`);
      
      dutyRows.forEach((row, index) => {
        try {
          console.log(`Processing row ${index + 1}:`, row.textContent?.substring(0, 200));
          
          // Try to extract any flight-like information from the row
          const text = row.textContent?.trim() || '';
          
          // Look for flight patterns (e.g., "GB3130", "C6208", etc.)
          const flightMatches = text.match(/[A-Z]{2}\d{3,4}/g) || [];
          
          // Look for airport codes (3-letter codes)
          const airportMatches = text.match(/\b[A-Z]{3}\b/g) || [];
          
          // Look for times (HH:MM format)
          const timeMatches = text.match(/\d{2}:\d{2}/g) || [];
          
          // Look for dates
          const dateMatches = text.match(/\d{1,2}[A-Za-z]{3}/g) || [];
          
          if (flightMatches.length > 0 || airportMatches.length > 1 || timeMatches.length > 0) {
            // This looks like it contains flight information
            const pairing = {
              pairingInfo: text.substring(0, 500),
              flights: flightMatches.map(flight => ({
                info: flight,
                airports: airportMatches,
                times: timeMatches,
                dates: dateMatches
              })),
              raw: text,
              elementType: row.tagName,
              elementClasses: Array.from(row.classList),
              dataAttributes: Array.from(row.attributes).filter(attr => attr.name.startsWith('data-'))
            };
            
            pairings.push(pairing);
          }
          
        } catch (err) {
          console.error('Error processing duty row:', err);
        }
      });
      
      return pairings;
    }, crewDataByFlight);

    fs.writeFileSync('scraped-raw.json', JSON.stringify(scheduleData, null, 2));
    console.log(`📋 Found ${scheduleData.length} pairings from duty rows`);

    // Parse the rich schedule data from items-3-4-data.json if scheduleData is empty
    let finalScheduleData = scheduleData;
    if (scheduleData.length === 0) {
      console.log('🔄 Parsing schedule from extracted DUTY PLAN content...');
      try {
        const items34 = JSON.parse(fs.readFileSync('items-3-4-data.json', 'utf8'));
        const dutyPlanContent = items34.item3?.content || '';
        
        // Parse pairings from the text content
        const parsedPairings = [];
        const lines = dutyPlanContent.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Look for pairing patterns like "C6208/06Dec    Rank: FO"
          const pairingMatch = line.match(/^(C\d+)\/(\d{2}[A-Za-z]+)\s+Rank:\s*([A-Z]+)/);
          if (pairingMatch) {
            const [, pairingNumber, date, rank] = pairingMatch;
            
            // Extract flight details from following lines
            const flights = [];
            let j = i + 1;
            while (j < lines.length && !lines[j].match(/^C\d+\/\d{2}[A-Za-z]+/) && !lines[j].match(/^OTHER/)) {
              const flightLine = lines[j].trim();
              
              // Look for flight numbers like "GB3130    763    N1489A"
              const flightMatch = flightLine.match(/^(GB\d+)\s+(\d+)\s+([A-Z0-9]+)/);
              if (flightMatch) {
                const [, flightNum, aircraftType, tailNumber] = flightMatch;
                
                // Get origin/destination from next lines
                let origin = '', destination = '', originTime = '', destTime = '';
                if (j + 1 < lines.length) {
                  const routeMatch = lines[j + 1].match(/([A-Z]{3})\s+(\d{2}[A-Za-z]+)\s+(\d{2}:\d{2})\s+LT/);
                  if (routeMatch) {
                    origin = routeMatch[1];
                    originTime = routeMatch[3];
                  }
                }
                if (j + 2 < lines.length) {
                  const destMatch = lines[j + 2].match(/([A-Z]{3})\s+(\d{2}[A-Za-z]+)\s+(\d{2}:\d{2})\s+LT/);
                  if (destMatch) {
                    destination = destMatch[1];
                    destTime = destMatch[3];
                  }
                }
                
                flights.push({
                  flightNumber: flightNum,
                  aircraftType,
                  tailNumber,
                  origin,
                  destination,
                  originTime,
                  destTime,
                  date: date
                });
              }
              j++;
            }
            
            if (flights.length > 0) {
              parsedPairings.push({
                pairingNumber,
                date,
                rank,
                flights,
                raw: line
              });
            }
            
            i = j - 1; // Skip processed lines
          }
        }
        
        finalScheduleData = parsedPairings;
        console.log(`✈️ Parsed ${finalScheduleData.length} pairings from DUTY PLAN content`);
        
      } catch (parseErr) {
        console.error('❌ Error parsing DUTY PLAN content:', parseErr.message);
      }
    }

    if (finalScheduleData.length === 0) {
      console.warn('⚠️ No flights found - selectors may need updating. Saved portal HTML for inspection.');
      fs.writeFileSync('portal-page.html', await page.content());
    }

    const formatted = transformScheduleData(finalScheduleData);
    fs.writeFileSync('scraped-schedule.json', JSON.stringify(formatted, null, 2));

    if (finalScheduleData.length > 0) {
      await sendToBackend(formatted, pilotNotifications || []);
    }

    console.log('✅ Scraping completed successfully!');
    return { schedule: formatted, notifications: [] };
  } catch (error) {
    console.error('❌ Scraping failed:', error && error.message ? error.message : error);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

function transformScheduleData(scrapedData) {
  const pairings = scrapedData.map((p, idx) => ({
    pairingId: `PAIR${idx}`,
    flights: p.flights.map((f, i) => ({
      id: `F${idx}-${i}`,
      info: f.info,
      origin: f.origin,
      dest: f.dest,
      crew: f.crew || []
    }))
  }));
  return { pairings };
}

async function sendToBackend(scheduleData, notifications = []) {
  try {
    console.log('📤 Sending data to backend...');
    // Extract pairings array from scheduleData object
    const pairings = scheduleData.pairings || [];
    const res = await fetch(CONFIG.backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        schedule: pairings, 
        notifications, 
        username: CONFIG.username,
        timestamp: new Date().toISOString()
      })
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Backend error', res.status, errorText);
    } else {
      console.log('✅ Data sent to backend');
    }
  } catch (err) {
    console.error('❌ Failed to send to backend:', err.message);
  }
}

async function scheduleScraper() {
  const cron = require('node-cron');
  cron.schedule('0 6 * * *', async () => {
    try {
      await scrapeCrewPortal();
    } catch (e) {}
  });
  await scrapeCrewPortal();
}

// Next.js API-compatible functions
async function scrapeCrewSchedule(options = {}) {
  const config = getConfig(options);
  
  // Override for serverless environment
  config.headless = true;
  
  console.log('🚀 Starting crew portal scraper for Next.js...');
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    console.log('📍 Navigating to crew portal...');
    await page.goto(config.portalUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Attempt login if credentials provided
    if (config.username && config.password) {
      try {
        const usernameSelector = 'input#username';
        const passwordSelector = 'input#password';
        const loginButtonSelector = 'input#kc-login';

        await page.waitForTimeout(1000);
        if (await page.$(usernameSelector)) {
          await page.type(usernameSelector, config.username, { delay: 50 });
          await page.type(passwordSelector, config.password, { delay: 50 });
          await page.click(loginButtonSelector);
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
          console.log('🔐 Login attempted');
        }
      } catch (loginErr) {
        console.warn('⚠️ Login step failed:', loginErr.message);
      }
    }

    // Wait for content to load
    await page.waitForTimeout(3000);
    
    // Extract basic schedule data
    const scheduleData = await page.evaluate(() => {
      const duties = [];
      const dutyElements = document.querySelectorAll('[data-test-id*="duty"], .duty-row, [class*="duty"]');
      
      dutyElements.forEach((element, index) => {
        const text = element.textContent?.trim();
        if (text && text.length > 5) {
          duties.push({
            id: `duty-${index}`,
            content: text,
            element: element.className
          });
        }
      });
      
      return {
        duties,
        pageTitle: document.title,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };
    });

    console.log(`✅ Extracted ${scheduleData.duties.length} duty items`);
    return scheduleData;

  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    throw new Error(`Scraping failed: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

async function getCrewNotifications(options = {}) {
  const config = getConfig(options);
  
  try {
    const result = await scrapeCrewSchedule(config);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Export functions for Next.js
module.exports = {
  scrapeCrewPortal,
  scrapeCrewSchedule,
  getCrewNotifications,
  transformScheduleData,
  sendToBackend,
  getConfig,
  AIRLINE_CONFIGS
};

// CLI execution (when run directly)
if (require.main === module) {
  const CONFIG = getConfig();
  
  if (!CONFIG.username || !CONFIG.password) {
    console.error('❌ ERROR: Credentials not provided!');
    console.log('Set CREW_USERNAME and CREW_PASSWORD environment variables.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  if (args.includes('--schedule')) scheduleScraper();
  else scrapeCrewPortal().catch(() => process.exit(1));
}

module.exports = { scrapeCrewPortal };
module.exports = { scrapeCrewPortal };
