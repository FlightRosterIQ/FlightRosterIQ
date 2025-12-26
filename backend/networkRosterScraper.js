/* ============================
   NETWORK ROSTER SCRAPER (Fail-Safe)
   Captures duties from XHR/fetch responses
============================ */

function normalizeDuty(duty) {
  const legs = duty.legs || [];

  let type = 'UNKNOWN';

  if (duty.reserve || /RS|RAP|RES/.test(duty.code)) {
    type = 'RESERVE';
  } else if (duty.iadp || duty.activityType === 'IADP') {
    type = 'IADP';
  } else if (legs.length > 0) {
    type = 'FLIGHT';
  }

  return {
    id: duty.id || duty.logicalId || null,
    type,
    date: duty.date || duty.startDate,
    pairing: duty.pairing || null,

    aircraft: duty.aircraft || legs[0]?.aircraft || null,
    tail: duty.tail || legs[0]?.tail || null,

    hotel: duty.hotel?.name || duty.layoverHotel || null,

    legs: legs.map(l => ({
      from: l.departure,
      to: l.arrival,
      flight: l.flightNumber,
      deadhead: !!l.deadhead
    })),

    raw: duty
  };
}

export async function scrapeRosterFromNetwork(page) {
  const duties = [];
  const seenIds = new Set();

  page.on('response', async (response) => {
    try {
      const req = response.request();
      const url = response.url();

      if (!['xhr', 'fetch'].includes(req.resourceType())) return;
      if (!/roster|schedule|duty|pairing|event|iadp/i.test(url)) return;

      console.log(`[NETWORK] Captured: ${url.split('?')[0].split('/').pop()}`);

      const json = await response.json().catch(() => null);
      if (!json) return;

      const records =
        json?.result ||
        json?.data ||
        json?.duties ||
        json?.events ||
        [];

      if (!Array.isArray(records)) return;

      for (const d of records) {
        const id = d.id || d.logicalId || JSON.stringify(d);
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        duties.push(normalizeDuty(d));
      }

      console.log(`[NETWORK] Total duties so far: ${duties.length}`);
    } catch (_) {}
  });

  // Give React time to fire requests
  await page.waitForTimeout(4000);

  return duties;
}
