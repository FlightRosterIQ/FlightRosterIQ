const puppeteer = require('puppeteer');

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];

// 🔥 Network-Response-Based Scraper (The Fix)

// 🧠 Duty Type Detection (from network JSON payload)
function detectDutyType(duty) {
  // RESERVE detection (check payload fields first)
  if (duty.reserve || duty.code === 'RSV') return 'RESERVE';
  
  // IADP detection (check payload fields)
  if (duty.iadp || duty.code === 'IADP') return 'IADP';
  
  // FLIGHT detection (has legs array)
  if (duty.legs?.length) return 'FLIGHT';
  
  // Fallback: check logicalId string patterns
  const id = duty.logicalId || '';
  const dutyType = duty.dutyType || '';
  
  if (/IADP/i.test(id) || dutyType === 'IDP') return 'IADP';
  if (/RSV|RES|STBY/i.test(id)) return 'RESERVE';
  
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

// Scrape monthly roster from already-logged-in page
async function scrapeMonthlyRoster(page, month, year) {
  console.log(`📅 Scraping ${MONTH_NAMES[month - 1]} ${year} via network interception...`);
  
  const collectedResponses = [];
  
  // ✅ 1. Intercept ALL XHR / fetch responses
  page.on('response', async (response) => {
    const req = response.request();
    const url = response.url();

    // Only intercept XHR and fetch requests
    if (!req.resourceType().includes('xhr') && !req.resourceType().includes('fetch')) return;

    // Capture roster-related endpoints
    if (
      url.includes('roster') ||
      url.includes('schedule') ||
      url.includes('pairing') ||
      url.includes('duty') ||
      url.includes('bid') ||
      url.includes('events')
    ) {
      try {
        const json = await response.json();
        collectedResponses.push(json);
        console.log('[NETLINE XHR] Captured response from:', url.split('/').pop());
      } catch (e) {
        // Ignore non-JSON responses
      }
    }
  });
  
  // ✅ 2. Trigger the SAME action a human does
  console.log('🗓️ Loading roster page...');
  await page.goto(
    'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html',
    { waitUntil: 'networkidle2', timeout: 30000 }
  );
  
  // Wait for initial load, then trigger schedule data fetch
  await page.waitForTimeout(2000);
  
  // Try to click schedule/roster tab if it exists
  console.log('📊 Triggering roster data load...');
  try {
    await page.evaluate(() => {
      // Look for schedule/roster tabs or buttons
      const scheduleBtn = Array.from(document.querySelectorAll('button, [role="tab"], a')).find(el =>
        /schedule|roster|calendar/i.test(el.innerText || el.getAttribute('aria-label') || '')
      );
      if (scheduleBtn) {
        console.log('Clicking schedule tab...');
        scheduleBtn.click();
      }
    });
  } catch (e) {
    console.log('⚠️ No schedule tab found, continuing...');
  }
  
  // Wait for XHR requests to complete
  console.log('⏳ Waiting for NetLine API responses...');
  await page.waitForTimeout(5000);
  
  console.log(`📊 Total responses captured: ${collectedResponses.length}`);
  
  // ✅ 3. Extract duties from collected responses
  const duties = [];
  collectedResponses.forEach(json => {
    // NetLine typically wraps data in json.result or json.data
    const data = json.result || json.data || json;
    
    if (Array.isArray(data)) {
      duties.push(...data);
    } else if (data.duties || data.events || data.pairings) {
      // Handle nested structure
      const nested = data.duties || data.events || data.pairings;
      if (Array.isArray(nested)) {
        duties.push(...nested);
      }
    }
  });
  
  console.log(`📊 Total duties extracted: ${duties.length}`);
  
  // Parse and enrich duties
  const finalDuties = duties.map(d =>
    enrichDuty(parseDuty(d))
  );
  
  // Filter by requested month
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
  
  return {
    month,
    year,
    flights: filteredDuties
  };
}

module.exports = { scrapeMonthlyRoster };
