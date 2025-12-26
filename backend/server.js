 iadmport express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';
import { scrapeMonthlyRoster } from './monthlyScraper.js';
import {
  generateCode,
  getCodesForPilot,
  validateCode,
  revokeCode
} from './familyCodesStorage.js';

const app = express();
const PORT = 8081;

app.use(cors());
app.use(express.json());

const CREW_PORTALS = {
  ABX: 'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp',
  ATI: 'https://crew.airtransport.cc/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp'
};

app.post('/api/authenticate', async (req, res) => {
  const { employeeId, password, airline, month, year, scrapeNews } = req.body;

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
    // Only scrape news if requested (typically on last month only)
    const result = await scrapeMonthlyRoster(page, month, year, { scrapeNewsSection: !!scrapeNews });

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

/* ============================
   FAMILY CODE API ENDPOINTS
============================ */

// Generate a new family access code
app.post('/api/family/generate-code', (req, res) => {
  const { pilotId, familyMemberName, airline, password } = req.body;

  if (!pilotId || !familyMemberName || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'pilotId, familyMemberName, and password are required' 
    });
  }

  try {
    const code = generateCode(pilotId, familyMemberName, airline, password);
    console.log(`📝 Generated family code ${code} for pilot ${pilotId}`);
    res.json({ success: true, code });
  } catch (err) {
    console.error('❌ Error generating code:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all family codes for a pilot
app.get('/api/family/get-codes/:pilotId', (req, res) => {
  const { pilotId } = req.params;

  if (!pilotId) {
    return res.status(400).json({ success: false, error: 'pilotId is required' });
  }

  try {
    const codes = getCodesForPilot(pilotId);
    res.json({ success: true, codes });
  } catch (err) {
    console.error('❌ Error fetching codes:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Validate a family access code (used during family login)
app.post('/api/family/validate-code', (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, error: 'code is required' });
  }

  try {
    const result = validateCode(code);
    if (result) {
      console.log(`✅ Validated family code ${code}`);
      res.json({ success: true, ...result });
    } else {
      res.status(404).json({ success: false, error: 'Invalid code' });
    }
  } catch (err) {
    console.error('❌ Error validating code:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Revoke a family access code
app.delete('/api/family/revoke-code/:code', (req, res) => {
  const { code } = req.params;
  const { pilotId } = req.body;

  if (!code || !pilotId) {
    return res.status(400).json({ success: false, error: 'code and pilotId are required' });
  }

  try {
    const result = revokeCode(code, pilotId);
    if (result.success) {
      console.log(`🗑️ Revoked family code ${code}`);
      res.json({ success: true });
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('❌ Error revoking code:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================
   OPEN TRIPS PDF ENDPOINT
   Fetches PDF from myabx.com with auto-login
============================ */
app.post('/api/open-trips', async (req, res) => {
  const { employeeId, password } = req.body;

  if (!employeeId || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'employeeId and password are required' 
    });
  }

  const openTripsUrl = 'https://www.myabx.com/flightweb/Secure/Flight%20Crew%20Scheduling/CVG_OPEN_TIME.pdf';
  const myabxLoginUrl = 'https://www.myabx.com/flightweb/';

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    console.log('📄 Opening myabx.com for Open Trips PDF...');

    // Go to the PDF URL first - it will redirect to login if needed
    await page.goto(openTripsUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Check if we're on a login page
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);

    // If redirected to login, fill in credentials
    if (currentUrl.includes('login') || currentUrl.includes('Login') || currentUrl.includes('signin')) {
      console.log('🔐 Login required, entering credentials...');
      
      // Try common login form selectors
      const usernameSelectors = ['#username', '#Username', 'input[name="username"]', 'input[name="Username"]', '#txtUsername', 'input[type="text"]'];
      const passwordSelectors = ['#password', '#Password', 'input[name="password"]', 'input[name="Password"]', '#txtPassword', 'input[type="password"]'];
      
      let usernameField = null;
      let passwordField = null;
      
      for (const sel of usernameSelectors) {
        usernameField = await page.$(sel);
        if (usernameField) break;
      }
      
      for (const sel of passwordSelectors) {
        passwordField = await page.$(sel);
        if (passwordField) break;
      }
      
      if (usernameField && passwordField) {
        await usernameField.type(employeeId);
        await passwordField.type(password);
        
        // Try to find and click submit button
        const submitSelectors = ['button[type="submit"]', 'input[type="submit"]', '#btnLogin', '.login-button', 'button'];
        for (const sel of submitSelectors) {
          const submitBtn = await page.$(sel);
          if (submitBtn) {
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
              submitBtn.click()
            ]);
            break;
          }
        }
        
        // Wait a bit and try navigating to PDF again
        await page.waitForTimeout(2000);
        await page.goto(openTripsUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      }
    }

    // Check if we now have the PDF
    const finalUrl = page.url();
    console.log('📍 Final URL:', finalUrl);

    if (finalUrl.includes('.pdf')) {
      // Return the URL - user can open it directly since session may now be valid
      res.json({ 
        success: true, 
        url: openTripsUrl,
        message: 'PDF accessible, opening in browser'
      });
    } else {
      // Return the URL anyway - let user try manually
      res.json({ 
        success: true, 
        url: openTripsUrl,
        message: 'Login may be required'
      });
    }

  } catch (err) {
    console.error('❌ Open Trips error:', err.message);
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
