/* ============================
   NETWORK ROSTER SCRAPER (Final Clean Version)
   100% Network-Based - No DOM parsing for duties
============================ */

/* ============================
   DUTY TYPE DETECTION (Network-Based)
============================ */
function detectDutyType(duty) {
  if (duty.reserve === true) return 'RESERVE';
  if (duty.iadp === true) return 'IADP';
  if (duty.code?.includes('DH')) return 'DEADHEAD';
  if (duty.legs?.length) return 'FLIGHT';
  return 'OTHER';
}

/* ============================
   PARSE CREW (Fail-Safe)
============================ */
function parseCrew(duty) {
  try {
    return duty.crew?.map(c => ({
      role: c.role || null,
      name: c.name || null,
      employeeId: c.employeeId || null
    })) || [];
  } catch {
    return [];
  }
}

/* ============================
   PARSE HOTEL (Fail-Safe)
============================ */
function parseHotel(duty) {
  try {
    if (!duty.hotel) return null;
    return {
      name: duty.hotel.name || null,
      city: duty.hotel.city || null,
      checkIn: duty.hotel.checkIn || null,
      checkOut: duty.hotel.checkOut || null
    };
  } catch {
    return null;
  }
}

/* ============================
   PARSE AIRCRAFT (Fail-Safe)
============================ */
function parseAircraft(duty) {
  try {
    return {
      type: duty.aircraftType || duty.aircraft || duty.legs?.[0]?.aircraftType || null,
      tail: duty.tailNumber || duty.tail || duty.legs?.[0]?.tailNumber || null
    };
  } catch {
    return { type: null, tail: null };
  }
}

/* ============================
   PARSE LEGS (Fail-Safe)
============================ */
function parseLegs(duty) {
  try {
    return (duty.legs || []).map(l => ({
      from: l.departure || l.depAirport || l.origin || null,
      to: l.arrival || l.arrAirport || l.destination || null,
      flight: l.flightNumber || l.flightNo || null,
      deadhead: !!l.deadhead
    }));
  } catch {
    return [];
  }
}

/* ============================
   NORMALIZE DUTY (Full)
============================ */
function normalizeDuty(duty) {
  return {
    id: duty.id || duty.logicalId || null,
    type: detectDutyType(duty),
    date: duty.date || duty.startDate || duty.fromDt || null,
    pairing: duty.pairing || duty.pairingId || null,
    
    aircraft: parseAircraft(duty),
    hotel: parseHotel(duty),
    crew: parseCrew(duty),
    legs: parseLegs(duty),
    
    // Keep raw for debugging
    raw: duty
  };
}

/* ============================
   MAIN SCRAPER FUNCTION
============================ */
export async function scrapeRosterFromNetwork(page) {
  const duties = [];
  const seenIds = new Set();

  // Set up network listener BEFORE navigation
  page.on('response', async (response) => {
    try {
      const req = response.request();
      const url = response.url();

      // Only XHR/fetch
      if (!['xhr', 'fetch'].includes(req.resourceType())) return;

      // Log ALL XHR for debugging
      console.log('[NET]', url.split('?')[0]);

      // Filter for roster-related endpoints
      if (!/roster|schedule|pairing|duty|events|iadp/i.test(url)) return;

      console.log('[NET] ✅ Captured roster endpoint:', url.split('?')[0].split('/').pop());

      const json = await response.json().catch(() => null);
      if (!json) return;

      // Handle all possible JSON shapes
      const records =
        json?.result ||
        json?.data ||
        json?.duties ||
        json?.events ||
        json?.pairings ||
        [];

      if (!Array.isArray(records)) return;

      for (const d of records) {
        const id = d.id || d.logicalId || JSON.stringify(d);
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        duties.push(normalizeDuty(d));
      }

      console.log(`[NET] Total duties so far: ${duties.length}`);
    } catch (_) {}
  });

  // Give React/Angular time to fire XHR requests
  console.log('⏳ Waiting for network requests...');
  await page.waitForTimeout(6000);

  console.log(`📊 Final duty count: ${duties.length}`);
  return duties;
}
