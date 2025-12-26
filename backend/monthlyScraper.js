const puppeteer = require('puppeteer');

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];

// 🔥 Network-Response-Based Scraper (The Fix)

// Step 3️⃣ Normalize Duties (Detect Type)
function detectDutyType(duty) {
  const id = duty.logicalId || '';

  if (/IADP/i.test(id)) return 'IADP';
  if (/RES|RSV|STBY/i.test(id)) return 'RESERVE';
  if (duty.legs && duty.legs.length > 0) return 'FLIGHT';

  return 'OTHER';
}

// Step 4️⃣ Parse Flights, Aircraft, Tail
function parseDuty(duty) {
  return {
    id: duty.logicalId,
    type: detectDutyType(duty),
    startUtc: duty.fromDt,
    endUtc: duty.toDt,

    legs: (duty.legs || []).map(l => ({
      from: l.depAirport,
      to: l.arrAirport,
      aircraft: l.aircraftType || null,
      tail: l.aircraftRegistration || null
    })),

    pairing: duty.pairingId || null
  };
}

// Step 5️⃣ Crew & Hotel Enrichment (Fail-Safe)
function enrichDuty(duty) {
  try {
    duty.crew = (duty.crewMembers || []).map(c => ({
      role: c.role,
      name: `${c.firstName} ${c.lastName}`,
      id: c.crewId,
      phone: c.phone || null
    }));
  } catch {
    duty.crew = [];
  }

  try {
    duty.hotel = duty.hotel?.name || null;
  } catch {
    duty.hotel = null;
  }

  return duty;
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
    
    // Step 1️⃣ Intercept NetLine API responses
    const duties = [];
    
    await page.setRequestInterception(true);
    
    page.on('request', request => {
      request.continue();
    });
    
    page.on('response', async response => {
      const url = response.url();

      // This is the key NetLine endpoint
      if (url.includes('/idp/user/roster') && url.includes('/events')) {
        try {
          const json = await response.json();

          if (json?.success && Array.isArray(json.result)) {
            duties.push(...json.result);
            console.log('[NETLINE] Captured duties:', json.result.length);
          }
        } catch (e) {
          // Ignore non-JSON
        }
      }
    });
    
    // 1️⃣ LOGIN
    console.log('🔐 Logging in to crew portal...');
    await page.goto('https://crew.abxair.com', { waitUntil: 'networkidle2', timeout: 30000 });
    
    await page.waitForSelector('#username', { timeout: 10000 });
    await page.type('#username', employeeId);
    await page.type('#password', password);
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✅ Logged in successfully');
    
    // Step 2️⃣ Trigger data load (no month clicking)
    console.log('🗓️ Loading roster page...');
    await page.goto(
      'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html',
      { waitUntil: 'networkidle2', timeout: 30000 }
    );
    
    // Give React time to fetch roster
    console.log('⏳ Waiting for NetLine API to respond...');
    await page.waitForTimeout(5000);
    
    console.log(`📊 Total duties captured: ${duties.length}`);
    
    // Step 6️⃣ Return Final Payload
    const finalDuties = duties.map(d =>
      enrichDuty(parseDuty(d))
    );
    
    // Filter by requested month if needed
    const requestedDate = new Date(year, month - 1);
    const filteredDuties = finalDuties.filter(d => {
      if (!d.startUtc) return false;
      const dutyDate = new Date(d.startUtc);
      return dutyDate.getMonth() === requestedDate.getMonth() && 
             dutyDate.getFullYear() === requestedDate.getFullYear();
    });
    
    console.log(`✅ Extracted ${filteredDuties.length} duties for ${MONTH_NAMES[month - 1]} ${year}`);
    console.log(`✈️ ${filteredDuties.filter(f => f.type === 'FLIGHT').length} flights`);
    console.log(`🟡 ${filteredDuties.filter(f => f.type === 'RESERVE').length} reserve days`);
    console.log(`🧾 ${filteredDuties.filter(f => f.type === 'IADP').length} IADP/training`);
    console.log(`👥 ${filteredDuties.filter(f => f.crew && f.crew.length > 0).length} duties have crew info`);
    console.log(`🏨 ${filteredDuties.filter(f => f.hotel).length} duties have hotel info`);
    console.log(`✈️ ${filteredDuties.filter(f => f.legs && f.legs.some(l => l.aircraft)).length} duties have aircraft info`);
    
    await browser.close();
    
    return {
      month,
      year,
      flights: filteredDuties
    };
    
  } catch (error) {
    if (browser) await browser.close();
    console.error('❌ Scrape error:', error.message);
    throw error;
  }
}

module.exports = { scrapeMonthlyRoster };
