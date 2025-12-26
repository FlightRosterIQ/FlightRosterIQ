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
    
    // 5️⃣ SCRAPE FLIGHTS
    console.log('📊 Extracting flight data...');
    const flights = await page.evaluate(() => {
      const results = [];
      
      document
        .querySelectorAll('[class*="duty"], [class*="pairing"], [class*="trip"]')
        .forEach(el => {
          const text = el.innerText;
          
          // Must contain airport codes
          if (!/[A-Z]{3}\s*(→|->|-|—)\s*[A-Z]{3}/.test(text)) return;
          
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
          
          if (legs.length > 0) {
            results.push({
              raw: text.substring(0, 500),
              pairing: text.match(/C\d{4,5}[A-Z]?\/\d{2}[A-Za-z]{3}/)?.[0],
              legs: legs,
              aircraft: text.match(/B\d{3}/)?.[0],
              tail: text.match(/N\d+[A-Z]*/)?.[0],
              hotel: text.match(/Hotel[^\n]+/)?.[0]
            });
          }
        });
      
      return results;
    });
    
    console.log(`✅ Extracted ${flights.length} duties with ${flights.reduce((sum, f) => sum + f.legs.length, 0)} legs`);
    
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
