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

// 3️⃣ HARD WAIT for React Roster Render
async function waitForRosterToRender(page) {
  await page.waitForFunction(() => {
    const dutyEls =
      document.querySelectorAll('[class*="duty"], [class*="pairing"]');
    return dutyEls.length > 0;
  }, { timeout: 15000 });
}

// 4️⃣ Bulletproof Duty Extraction (FAIL-SAFE)
async function extractDuties(page) {
  return await page.evaluate(() => {
    const duties = [];

    document
      .querySelectorAll('[class*="duty"], [class*="pairing"]')
      .forEach(el => {
        try {
          const text = el.innerText || '';

          if (!text.trim()) return;

          duties.push({
            raw: text,
            pairing: text.match(/C\d{4,5}[A-Z]?\/\d{2}[A-Za-z]{3}/)?.[0] || null,
            legs: text.match(/[A-Z]{3}\s*(→|-)\s*[A-Z]{3}/g) || [],
            aircraft: text.match(/B\d{3}/)?.[0] || null,
            tail: text.match(/N\d+[A-Z]*/)?.[0] || null,
            hotel: text.match(/Hotel[^\n]+/)?.[0] || null,
            crew: text.match(/(CAPT|FO|FE)[^\n]+/g)?.map(c => ({
              role: c.match(/CAPT|FO|FE/)?.[0],
              name: c.replace(/CAPT|FO|FE/, '').trim()
            })) || []
          });
        } catch (_) {}
      });

    return duties;
  });
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
