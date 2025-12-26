import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';
import { scrapeRosterFromNetwork } from './networkRosterScraper.js';

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
   AUTHENTICATE & SCRAPE
============================ */
app.post('/api/authenticate', async (req, res) => {
  const { employeeId, password, airline } = req.body;

  console.log(`🔐 Auth request: ${airline} pilot ${employeeId}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const portal =
    airline?.toUpperCase()?.includes('ATI')
      ? CREW_PORTALS.ATI
      : CREW_PORTALS.ABX;

  console.log(`🌐 Portal: ${portal}`);

  try {
    await page.goto(portal, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for login form
    await page.waitForSelector('#username', { timeout: 15000 });
    console.log('✅ Login form found');

    await page.type('#username', employeeId);
    await page.type('#password', password);
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✅ Logged in successfully');

    // Scrape duties from network responses
    const duties = await scrapeRosterFromNetwork(page);

    console.log(`📊 Scraped ${duties.length} duties`);

    res.json({
      success: true,
      duties,
      summary: {
        flights: duties.filter(d => d.type === 'FLIGHT').length,
        reserve: duties.filter(d => d.type === 'RESERVE').length,
        iadp: duties.filter(d => d.type === 'IADP').length
      }
    });

  } catch (err) {
    console.error('❌ Scrape error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    await browser.close();
  }
});

/* ============================
   HEALTH CHECK
============================ */
app.get('/health', (_, res) => {
  res.json({ status: 'ok', port: PORT });
});

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', port: PORT });
});

/* ============================
   START SERVER
============================ */
app.listen(PORT, () => {
  console.log(`🚀 Crew scraper running on port ${PORT}`);
});
