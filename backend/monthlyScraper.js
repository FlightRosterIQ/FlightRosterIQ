const puppeteer = require('puppeteer');

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 1️⃣ Network Listener (tracks roster API responses)
let lastRosterResponse = null;

function setupNetworkListener(page) {
  page.on('response', async response => {
    const url = response.url();

    if (
      url.includes('/roster') ||
      url.includes('/schedule') ||
      url.includes('/events')
    ) {
      try {
        lastRosterResponse = await response.json();
      } catch (_) {}
    }
  });
}

// 2️⃣ Month Navigation (React-Safe)
async function navigateToMonth(page, year, monthIndex) {
  await page.evaluate(
    (y, m) => {
      window.dispatchEvent(
        new CustomEvent('netline-change-month', {
          detail: { year: y, month: m }
        })
      );
    },
    year,
    monthIndex
  );

  // React render + API fetch
  await page.waitForTimeout(1500);
}

// 🔍 Step 1 — Wait for Roster to Render (Critical)
async function waitForRosterToRender(page) {
  console.log('[WAIT] Waiting for duties to render...');
  
  await page.waitForFunction(() => {
    return (
      document.querySelectorAll('[class*="duty"], [class*="pairing"], [class*="roster"]').length > 0
    );
  }, { timeout: 30000 });
  
  console.log('[WAIT] ✅ Duties rendered');
}

// 🧩 Step 3 — Fail-Safe Duty Detection Code (COPY–PASTE)
async function extractDuties(page) {
  const duties = await page.evaluate(() => {
    const results = [];

    const dutyNodes = document.querySelectorAll(
      '[class*="duty"], [class*="pairing"], [role="listitem"]'
    );

    dutyNodes.forEach(el => {
      try {
        const text = el.innerText.replace(/\s+/g, ' ').trim();

        if (!text || text.length < 10) return;

        let type = 'OTHER';

        // ✈️ FLIGHT detection
        if (/[A-Z]{3}\s*(→|-)\s*[A-Z]{3}/.test(text)) {
          type = 'FLIGHT';
        }

        // 🟡 RESERVE detection
        if (/RESERVE|STANDBY|RSV|SBY/i.test(text)) {
          type = 'RESERVE';
        }

        // 🧾 IADP / TRAINING detection
        if (/IADP|TRAIN|SIM|GROUND|ADMIN/i.test(text)) {
          type = 'IADP';
        }

        // 🏨 Step 5 — Enrichment (Hotel, Tail, Crew) — SAFE VERSION
        const hotel = text.match(/Hotel\s+[A-Za-z0-9 ]+/i)?.[0] || null;
        const tail = text.match(/\bN\d+[A-Z]*/)?.[0] || null;
        const aircraft = text.match(/\b(737|767|777|B7\d{2}|A320|A330)\b/)?.[0] || null;
        const pairing = text.match(/C\d{4,5}[A-Z]?\/\d{2}[A-Za-z]{3}/)?.[0] || null;
        
        // Extract legs for FLIGHT type
        const legs = type === 'FLIGHT' 
          ? (text.match(/[A-Z]{3}\s*(→|-)\s*[A-Z]{3}/g) || []).map(leg => {
              const airports = leg.match(/[A-Z]{3}/g);
              return airports ? { from: airports[0], to: airports[1] } : null;
            }).filter(Boolean)
          : [];
        
        // Extract crew info
        const crew = (text.match(/(CAPT|FO|FE|SO)[^\n]+/g) || []).map(c => ({
          role: c.match(/CAPT|FO|FE|SO/)?.[0],
          name: c.replace(/CAPT|FO|FE|SO/, '').trim()
        }));

        results.push({
          rawText: text,
          type,
          pairing,
          legs,
          aircraft,
          tail,
          hotel,
          crew
        });
      } catch (err) {
        // Fail-safe: skip problematic duties
      }
    });

    return results;
  });
  
  // 🧪 Step 4 — Debug Output (MANDATORY)
  console.log('[SCRAPER DEBUG] Duties found:', duties.length);
  console.log(
    '[SCRAPER DEBUG] Sample duties:',
    duties.slice(0, 3).map(d => ({ type: d.type, text: d.rawText.slice(0, 80) }))
  );
  
  return duties;
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
    
    // 🎧 Setup network listener BEFORE navigation
    setupNetworkListener(page);
    
    // 3️⃣ SCRAPE THE MONTH USING BULLETPROOF LOGIC
    console.log(`📅 Scraping ${MONTH_NAMES[month - 1]} ${year}...`);
    
    await navigateToMonth(page, year, month - 1); // monthIndex is 0-based
    await waitForRosterToRender(page);
    
    const flights = await extractDuties(page);
    
    console.log(`✅ Extracted ${flights.length} duties`);
    console.log(`✈️ ${flights.filter(f => f.type === 'FLIGHT').length} flights`);
    console.log(`🟡 ${flights.filter(f => f.type === 'RESERVE').length} reserve days`);
    console.log(`🧾 ${flights.filter(f => f.type === 'IADP').length} IADP/training`);
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
