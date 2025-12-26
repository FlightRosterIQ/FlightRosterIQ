const puppeteer = require('puppeteer');

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function navigateToMonth(page, month, year) {
  const target = `${MONTH_NAMES[month - 1]} ${year}`;
  console.log(`🎯 Navigating to: ${target}`);
  
  for (let i = 0; i < 24; i++) {
    const visible = await page.evaluate(() => {
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
    
    console.log(`📅 Current display: "${visible}"`);
    
    if (visible.includes(target) || (visible.includes(MONTH_NAMES[month - 1]) && visible.includes(String(year)))) {
      console.log(`✅ Reached ${target}`);
      return true;
    }
    
    // Click next month button
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], a, [class*="next"]'));
      const nextBtn = buttons.find(b => 
        b.innerText?.toLowerCase().includes('next') ||
        b.getAttribute('aria-label')?.toLowerCase().includes('next') ||
        b.className?.includes('next') ||
        b.title?.toLowerCase().includes('next')
      );
      
      if (nextBtn) {
        nextBtn.click();
        return true;
      }
      return false;
    });
    
    if (!clicked) {
      console.log('⚠️ Could not find next month button');
      return false;
    }
    
    await sleep(800);
  }
  
  console.log(`❌ Failed to reach ${target}`);
  return false;
}

async function scrapeMonthlyRoster({ employeeId, password, month, year }) {
  let browser;
  
  try {
    console.log(`🚀 Starting scrape for ${MONTH_NAMES[month - 1]} ${year}`);
    
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
    await page.setViewport({ width: 1400, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // 1️⃣ LOGIN
    console.log('🔐 Logging in to crew portal...');
    await page.goto('https://crew.abxair.com', { waitUntil: 'networkidle2', timeout: 30000 });
    
    await page.waitForSelector('#username', { timeout: 10000 });
    await page.type('#username', employeeId);
    await page.type('#password', password);
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✅ Logged in successfully');
    
    // 2️⃣ NAVIGATE TO ROSTER
    console.log('🗓️ Navigating to roster page...');
    await page.goto(
      'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html',
      { waitUntil: 'networkidle2', timeout: 30000 }
    );
    console.log('✅ Roster page loaded');
    await sleep(2000);
    
    // 3️⃣ NAVIGATE TO CORRECT MONTH
    console.log(`📅 Navigating to ${MONTH_NAMES[month - 1]} ${year}...`);
    const monthReached = await navigateToMonth(page, month, year);
    
    if (!monthReached) {
      await browser.close();
      throw new Error(`Could not navigate to ${MONTH_NAMES[month - 1]} ${year}`);
    }
    
    // 4️⃣ WAIT FOR DUTIES TO RENDER
    console.log('⏳ Waiting for duties to render...');
    await page.waitForSelector('[class*="duty"], [class*="pairing"]', {
      timeout: 15000
    }).catch(() => {
      console.log('⚠️ No duties selector found, continuing anyway...');
    });
    
    await sleep(1000);
    
    // 5️⃣ SCRAPE FLIGHTS WITH ENRICHMENT
    console.log('📊 Extracting flight data...');
    
    // Get all duty elements
    const dutyElements = await page.$$('[class*="duty"], [class*="pairing"], [class*="trip"]');
    console.log(`Found ${dutyElements.length} duty elements`);
    
    const flights = [];
    
    for (const dutyEl of dutyElements) {
      try {
        const text = await dutyEl.evaluate(el => el.innerText);
        
        // Must contain airport codes
        if (!/[A-Z]{3}\s*(→|->|-|—)\s*[A-Z]{3}/.test(text)) continue;
        
        // Extract basic flight info
        const legs = [];
        const routes = text.match(/[A-Z]{3}\s*(→|->|-|—)\s*[A-Z]{3}/g) || [];
        
        routes.forEach(route => {
          const airports = route.match(/[A-Z]{3}/g);
          if (airports && airports.length >= 2) {
            legs.push({
              from: airports[0],
              to: airports[1]
            });
          }
        });
        
        if (legs.length === 0) continue;
        
        // Extract pairing
        const pairing = text.match(/C\d{4,5}[A-Z]?\/\d{2}[A-Za-z]{3}/)?.[0] || null;
        
        // ENRICHMENT: Extract crew info (fail-safe)
        let crew = [];
        try {
          crew = await dutyEl.evaluate(el => {
            const results = [];
            const text = el.innerText;
            const crewLines = text.match(/(CAPT|FO|FE|SO)[^\n]+/gi) || [];
            
            crewLines.forEach(line => {
              const role = line.match(/CAPT|FO|FE|SO/)?.[0] || null;
              const name = line.replace(role, '').trim() || null;
              const id = line.match(/\b\d{5,7}\b/)?.[0] || null;
              const phone = line.match(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/)?.[0] || null;
              
              results.push({ role, name, id, phone });
            });
            
            return results;
          });
        } catch (err) {
          console.warn('[ENRICHMENT] Crew extraction failed for duty');
        }
        
        // ENRICHMENT: Extract hotel info (fail-safe)
        let hotel = null;
        try {
          hotel = await dutyEl.evaluate(el => {
            const text = el.innerText;
            return text.match(/Hotel[:\s]+([A-Za-z0-9\s\-]+)/i)?.[1] ||
                   text.match(/Layover[:\s]+([A-Za-z0-9\s\-]+)/i)?.[1] ||
                   null;
          });
        } catch (err) {
          console.warn('[ENRICHMENT] Hotel extraction failed for duty');
        }
        
        // ENRICHMENT: Extract aircraft and tail (fail-safe)
        let aircraft = null;
        let tail = null;
        try {
          const aircraftInfo = await dutyEl.evaluate(el => {
            const text = el.innerText;
            return {
              aircraft: text.match(/\b(B7\d{2}|B7\d{2}F|A\d{3})\b/)?.[0] || null,
              tail: text.match(/\bN\d{3,5}[A-Z]{0,2}\b/)?.[0] || null
            };
          });
          aircraft = aircraftInfo.aircraft;
          tail = aircraftInfo.tail;
        } catch (err) {
          console.warn('[ENRICHMENT] Aircraft extraction failed for duty');
        }
        
        flights.push({
          raw: text.substring(0, 500),
          pairing,
          legs,
          crew,
          hotel,
          aircraft,
          tail
        });
        
      } catch (err) {
        console.warn('[ENRICHMENT] Failed for one duty, continuing:', err.message);
      }
    }
    
    console.log(`✅ Extracted ${flights.length} duties with ${flights.reduce((sum, f) => sum + f.legs.length, 0)} legs`);
    console.log(`👥 ${flights.filter(f => f.crew && f.crew.length > 0).length} duties have crew info`);
    console.log(`🏨 ${flights.filter(f => f.hotel).length} duties have hotel info`);
    console.log(`✈️ ${flights.filter(f => f.aircraft).length} duties have aircraft info`);
    
    await browser.close();
    
    return {
      month,
      year,
      flights
    };
    
  } catch (error) {
    if (browser) await browser.close();
    console.error('❌ Scrape error:', error.message);
    throw error;
  }
}

module.exports = { scrapeMonthlyRoster };
