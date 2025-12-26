import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';

const app = express();
const PORT = 8081;

/* ============================
   BASIC APP SETUP
============================ */
app.use(cors());
app.use(express.json());

/* ============================
   CREW PORTAL MAP
============================ */
const CREW_PORTALS = {
  ABX: 'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp',
  ATI: 'https://crew.airtransport.cc/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp'
};

/* ============================
   RESOLVE PORTAL URL (Normalize airline)
============================ */
function resolvePortalUrl(airline) {
  if (!airline) return null;

  const key = airline.toUpperCase();

  if (key.includes('ABX')) {
    return CREW_PORTALS.ABX;
  }

  if (key.includes('ATI')) {
    return CREW_PORTALS.ATI;
  }

  return null;
}

/* ============================
   SIMPLE IN-MEMORY CACHE
   (Swap with Redis later)
============================ */
const rosterCache = new Map();

/* ============================
   UTIL: SAFE EVAL
============================ */
const safe = async (fn, fallback = null) => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};

/* ============================
   CORE SCRAPER
============================ */
async function scrapeMonthlyRoster({ employeeId, password, airline, month, year }) {
  const cacheKey = `${employeeId}-${year}-${month}`;
  if (rosterCache.has(cacheKey)) {
    return rosterCache.get(cacheKey);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const dutiesFromNetwork = [];

  /* ============================
     NETWORK-BASED CAPTURE
  ============================ */
  page.on('response', async (response) => {
    try {
      const type = response.request().resourceType();
      if (!['xhr', 'fetch'].includes(type)) return;

      const url = response.url();
      if (!/roster|schedule|duty|event|pairing/i.test(url)) return;

      const json = await response.json();
      const data =
        json?.data ||
        json?.result ||
        json?.events ||
        json?.duties ||
        [];

      if (Array.isArray(data)) {
        dutiesFromNetwork.push(...data);
      }
    } catch {}
  });

  /* ============================
     LOGIN (with airline guard)
  ============================ */
  const portalUrl = resolvePortalUrl(airline);

  if (!portalUrl) {
    await browser.close();
    throw new Error(`Invalid airline provided: "${airline}"`);
  }

  console.log(`🌐 Navigating to: ${portalUrl}`);
  await page.goto(portalUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // Wait for React to boot
  await page.waitForTimeout(3000);

  // Wait for login form
  await page.waitForSelector('#username', { timeout: 15000 });
  console.log('✅ Login form found');

  await page.type('#username', employeeId);
  await page.type('#password', password);
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
  console.log('✅ Logged in successfully');

  /* ============================
     MONTH NAVIGATION
============================ */
  await page.evaluate(
    (targetMonth, targetYear) => {
      window.dispatchEvent(
        new CustomEvent('netline:setMonth', {
          detail: { month: targetMonth, year: targetYear }
        })
      );
    },
    month,
    year
  );

  await page.waitForTimeout(5000);

  /* ============================
     DOM ENRICHMENT
============================ */
  const domDuties = await page.evaluate(() => {
    const rows = document.querySelectorAll('[data-duty-id]');
    return Array.from(rows).map(row => {
      const text = row.innerText || '';

      return {
        type:
          /reserve/i.test(text) ? 'RESERVE' :
          /iadp|training/i.test(text) ? 'IADP' :
          'FLIGHT',

        aircraft: text.match(/\b(7[4-8][0-9])\b/)?.[1] || null,
        tail: text.match(/\bN\d{3,5}[A-Z]{0,2}\b/)?.[0] || null,

        hotel: text.match(/Hotel:\s*(.*)/i)?.[1] || null,

        crew: Array.from(row.querySelectorAll('.crew-member')).map(c => ({
          name: c.innerText || null,
          role: c.dataset.role || null
        }))
      };
    });
  });

  /* ============================
     MERGE NETWORK + DOM
============================ */
  const finalDuties = dutiesFromNetwork.map(d => {
    const domMatch = domDuties.find(x => x.tail && x.tail === d.tail) || {};
    return {
      ...d,
      type: d.reserve ? 'RESERVE' : d.iadp ? 'IADP' : 'FLIGHT',
      aircraft: d.aircraft || domMatch.aircraft || null,
      tail: d.tail || domMatch.tail || null,
      hotel: domMatch.hotel || null,
      crew: domMatch.crew || []
    };
  });

  await browser.close();

  const result = {
    success: true,
    month,
    year,
    duties: finalDuties
  };

  rosterCache.set(cacheKey, result);
  return result;
}

/* ============================
   API ENDPOINT
============================ */
app.post('/api/authenticate', async (req, res) => {
  try {
    const result = await scrapeMonthlyRoster(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/* ============================
   HEALTH CHECK
============================ */
app.get('/health', (_, res) => {
  res.json({ status: 'ok', port: PORT });
});

/* ============================
   START SERVER
============================ */
app.listen(PORT, () => {
  console.log(`🚀 Crew scraper running on port ${PORT}`);
});
