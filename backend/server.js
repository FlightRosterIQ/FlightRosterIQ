import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';
import { scrapeMonthlyRoster } from './monthlyScraper.js';

const app = express();
const PORT = 8081;

app.use(cors());
app.use(express.json());

const CREW_PORTALS = {
  ABX: 'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp',
  ATI: 'https://crew.airtransport.cc/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp'
};

app.post('/api/authenticate', async (req, res) => {
  const { employeeId, password, airline, month, year } = req.body;

  const portal = airline?.toUpperCase()?.includes('ATI')
    ? CREW_PORTALS.ATI
    : CREW_PORTALS.ABX;

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    console.log(`🔐 Logging in ${employeeId}`);
    await page.goto(portal, { waitUntil: 'networkidle2', timeout: 60000 });

    await page.waitForSelector('#username', { timeout: 20000 });
    await page.type('#username', employeeId);
    await page.type('#password', password);

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
      page.evaluate(() => document.querySelector('form')?.submit())
    ]);

    console.log('✅ Logged in');

    // scrapeMonthlyRoster now returns { duties, news }
    const result = await scrapeMonthlyRoster(page, month, year);

    // Handle both old format (array) and new format (object)
    const duties = Array.isArray(result) ? result : (result.duties || []);
    const news = Array.isArray(result) ? [] : (result.news || []);

    res.json({
      success: true,
      duties,
      news,
      count: duties.length
    });

  } catch (err) {
    console.error('❌ Scraper error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok', port: PORT });
});

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', port: PORT });
});

app.listen(PORT, () => {
  console.log(`🚀 Puppeteer scraper running on port ${PORT}`);
});
