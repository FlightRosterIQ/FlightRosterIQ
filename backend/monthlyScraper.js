const puppeteer = require('puppeteer');

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ✅ STEP 1: Navigate Month SAFELY
async function goToMonth(page, year, month) {
  const label = `${year}-${String(month).padStart(2, '0')}`;

  console.log(`[SCRAPER] Navigating to ${label}`);

  await page.evaluate(label => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const target = buttons.find(b =>
      b.innerText.includes(label) ||
      b.getAttribute('aria-label')?.includes(label)
    );
    if (target) target.click();
  }, label);

  // 🔒 CRITICAL: Wait for data, not UI
  await page.waitForResponse(
    r => r.url().includes('/events') && r.status() === 200,
    { timeout: 15000 }
  );

  // Extra safety
  await page.waitForTimeout(500);
}

// ✅ STEP 2: WAIT until duties actually exist
async function waitForDuties(page) {
  await page.waitForFunction(() => {
    const text = document.body.innerText;
    return (
      /[A-Z]{3}\s*(→|-)\s*[A-Z]{3}/.test(text) || // flights
      /IADP|RESERVE|TRAINING/.test(text)
    );
  }, { timeout: 15000 });
}

// ✅ STEP 3: UNIVERSAL DUTY EXTRACTION (FAIL-SAFE)
async function extractDuties(page) {
  return await page.evaluate(() => {
    const duties = [];

    const nodes = Array.from(
      document.querySelectorAll('div, span, td')
    ).filter(el =>
      /[A-Z]{3}\s*(→|-)\s*[A-Z]{3}|IADP|RESERVE|TRAINING/.test(el.innerText)
    );

    nodes.forEach(el => {
      try {
        const text = el.innerText;

        const legs = [];
        text.match(/[A-Z]{3}\s*(→|-)\s*[A-Z]{3}/g)?.forEach(l => {
          legs.push({
            from: l.slice(0, 3),
            to: l.slice(-3)
          });
        });

        if (!legs.length && !/IADP|RESERVE|TRAINING/.test(text)) return;

        duties.push({
          raw: text,
          legs,
          aircraft: text.match(/B\d{3}/)?.[0],
          tail: text.match(/N\d+[A-Z]*/)?.[0],
          hotel: text.match(/Hotel[^\n]+/)?.[0],
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

// ✅ STEP 4: FULL MONTH SCRAPE (THIS IS THE FIX)
async function scrapeMonth(page, year, month) {
  await goToMonth(page, year, month);
  await waitForDuties(page);

  const duties = await extractDuties(page);

  console.log(
    `[SIMPLE SCRAPER] ${year}-${month}: Got ${duties.length} duties`
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
    
    // 3️⃣ SCRAPE THE MONTH USING BULLETPROOF LOGIC
    console.log(`📅 Scraping ${MONTH_NAMES[month - 1]} ${year}...`);
    const flights = await scrapeMonth(page, year, month);
    
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
