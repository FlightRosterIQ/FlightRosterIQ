const puppeteer = require('puppeteer');

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];

// 🔥 Network-Response-Based Scraper (The Fix)

// 🧠 Duty Type Detection (from network JSON)
function detectDutyType(duty) {
  const id = duty.logicalId || '';
  const dutyType = duty.dutyType || '';

  // IADP detection
  if (/IADP/i.test(id) || dutyType === 'IDP') return 'IADP';
  
  // RESERVE detection (no legs, has keywords)
  if (!duty.legs || duty.legs.length === 0) {
    if (/RSV|RES|STBY/i.test(id)) return 'RESERVE';
  }
  
  // FLIGHT detection (has legs with airports)
  if (duty.legs && duty.legs.length > 0) {
    const hasAirports = duty.legs.some(l => l.depAirport && l.arrAirport);
    if (hasAirports) return 'FLIGHT';
  }

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
  
  const duties = [];
  
  // Attach page.on('response') to intercept NetLine API
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
  
  // Navigate to roster page to trigger XHR
  console.log('🗓️ Loading roster page...');
  await page.goto(
    'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html',
    { waitUntil: 'networkidle2', timeout: 30000 }
  );
  
  // Wait for NetLine API to respond
  console.log('⏳ Waiting for NetLine API to respond...');
  await page.waitForTimeout(5000);
  
  console.log(`📊 Total duties captured: ${duties.length}`);
  
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
