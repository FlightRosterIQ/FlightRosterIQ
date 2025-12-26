/* ============================
   NETWORK ROSTER SCRAPER (Final Correct Pattern)
   - Listener attached EARLY
   - No DOM scraping for duties
   - Correct duty type detection
============================ */

/* ============================
   DUTY PARSER (Correct Priority Order)
============================ */
function parseDuty(d) {
  let type = 'FLIGHT';

  if (d.reserve || /RES/i.test(d.code)) type = 'RESERVE';
  else if (/IADP/i.test(d.code || d.logicalId)) type = 'IADP';
  else if (d.deadhead || d.positioning) type = 'DEADHEAD';

  return {
    id: d.id || d.logicalId,
    type,
    start: d.startTime || d.fromDt || d.startDate,
    end: d.endTime || d.toDt || d.endDate,
    date: d.date || d.startDate || d.fromDt,
    pairing: d.pairing || d.pairingId,
    aircraft: d.aircraft?.type || d.aircraftType || null,
    tail: d.aircraft?.registration || d.tailNumber || d.tail || null,
    hotel: d.hotel?.name || d.layoverHotel || null,
    crew: d.crew || [],
    legs: (d.legs || []).map(l => ({
      from: l.departure || l.depAirport || l.origin,
      to: l.arrival || l.arrAirport || l.destination,
      flight: l.flightNumber || l.flightNo,
      deadhead: !!l.deadhead
    })),
    raw: d
  };
}

/* ============================
   MAIN SCRAPER - LISTENER ATTACHED EARLY
============================ */
export async function scrapeRosterFromNetwork(page) {
  const duties = [];
  const seenIds = new Set();

  // ATTACH LISTENER IMMEDIATELY (before any waiting)
  page.on('response', async response => {
    try {
      const req = response.request();
      const type = req.resourceType();
      const url = response.url();

      if (!['xhr', 'fetch'].includes(type)) return;

      // Log all XHR for debugging
      console.log('[NET]', url.split('?')[0]);

      if (!/roster|schedule|pair|duty|event|iadp/i.test(url)) return;

      console.log('[NET] ✅ Roster endpoint:', url.split('?')[0].split('/').pop());

      const json = await response.json().catch(() => null);
      if (!json) return;

      const items =
        json?.result ||
        json?.data ||
        json?.duties ||
        json?.events ||
        json?.pairings ||
        [];

      if (Array.isArray(items)) {
        items.forEach(item => {
          const id = item.id || item.logicalId || JSON.stringify(item);
          if (seenIds.has(id)) return;
          seenIds.add(id);
          
          duties.push(parseDuty(item));
        });
        console.log(`[NET] Total duties: ${duties.length}`);
      }
    } catch {}
  });

  // Wait long enough for all network calls
  console.log('⏳ Waiting for network requests...');
  await page.waitForTimeout(8000);

  console.log(`📊 Final duty count: ${duties.length}`);
  return duties;
}
