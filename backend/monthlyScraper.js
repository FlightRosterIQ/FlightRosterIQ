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

    // Capture roster-related endpoints (expanded list)
    if (
      url.includes('roster') ||
      url.includes('schedule') ||
      url.includes('pairing') ||
      url.includes('duty') ||
      url.includes('bid') ||
      url.includes('events') ||
      url.includes('pems') ||
      url.includes('crew') ||
      url.includes('iadp') ||
      url.includes('calendar') ||
      url.includes('assignment')
    ) {
      try {
        const json = await response.json();
        collectedResponses.push(json);
        console.log('[NETLINE XHR] Captured response from:', url.split('?')[0].split('/').pop());
      } catch (e) {
        // Ignore non-JSON responses
      }
    }
  });
  
  // ✅ 2. Navigate to the IADP roster page (triggers roster API calls)
  console.log('🗓️ Loading roster page...');
  
  // Navigate to roster/IADP page - this triggers the schedule API calls
  await page.goto(
    'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp',
    { waitUntil: 'networkidle2', timeout: 30000 }
  );
  
  // Wait for initial load
  await page.waitForTimeout(3000);
  
  // Try to click on schedule/roster elements to trigger data load
  console.log('📊 Triggering roster data load...');
  try {
    await page.evaluate(() => {
      // Look for any clickable schedule elements
      const scheduleElements = Array.from(document.querySelectorAll('button, [role="tab"], a, [class*="schedule"], [class*="roster"], [class*="calendar"]'));
      const clicked = [];
      
      scheduleElements.forEach(el => {
        const text = (el.innerText || el.getAttribute('aria-label') || el.className || '').toLowerCase();
        if (/schedule|roster|calendar|month|view/i.test(text)) {
          el.click();
          clicked.push(text.substring(0, 20));
        }
      });
      
      console.log('Clicked elements:', clicked);
    });
  } catch (e) {
    console.log('⚠️ Could not click schedule elements:', e.message);
  }
  
  // Wait longer for XHR requests to complete
  console.log('⏳ Waiting for NetLine API responses...');
  await page.waitForTimeout(8000);
  
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
