import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';
import { scrapeMonthlyRoster } from './monthlyScraper.js';
import {
  generateCode,
  getCodesForPilot,
  validateCode,
  revokeCode
} from './familyCodesStorage.js';
import {
  registerUser,
  unregisterUser,
  searchUsers,
  isUserRegistered
} from './registeredUsersStorage.js';

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

/* ============================
   WEATHER API ENDPOINT
   Fetches METAR/TAF from aviationweather.gov
============================ */
app.post('/api/weather', async (req, res) => {
  const { airport } = req.body;
  
  if (!airport) {
    return res.status(400).json({ success: false, error: 'airport code is required' });
  }
  
  console.log(`🌦️ Fetching weather for: ${airport}`);
  
  try {
    // Fetch METAR and TAF from aviationweather.gov in JSON format
    const metarUrl = `https://aviationweather.gov/api/data/metar?ids=${airport}&format=json`;
    const tafUrl = `https://aviationweather.gov/api/data/taf?ids=${airport}&format=json`;
    
    console.log(`📡 Fetching METAR: ${metarUrl}`);
    console.log(`📡 Fetching TAF: ${tafUrl}`);
    
    const [metarResponse, tafResponse] = await Promise.all([
      fetch(metarUrl),
      fetch(tafUrl)
    ]);
    
    let metarData = null;
    let tafData = null;
    let metarRaw = '';
    let tafRaw = '';
    
    // Parse METAR JSON
    try {
      const metarJson = await metarResponse.json();
      console.log(`📡 METAR JSON response:`, JSON.stringify(metarJson).substring(0, 300));
      if (Array.isArray(metarJson) && metarJson.length > 0) {
        metarData = metarJson[0];
        metarRaw = metarData.rawOb || '';
      }
    } catch (e) {
      console.log('⚠️ METAR not JSON, trying raw text');
      const rawText = await metarResponse.text();
      metarRaw = rawText.trim();
    }
    
    // Parse TAF JSON
    try {
      const tafJson = await tafResponse.json();
      console.log(`📡 TAF JSON response:`, JSON.stringify(tafJson).substring(0, 300));
      if (Array.isArray(tafJson) && tafJson.length > 0) {
        tafData = tafJson[0];
        tafRaw = tafData.rawTAF || '';
      }
    } catch (e) {
      console.log('⚠️ TAF not JSON, trying raw text');
      const rawText = await tafResponse.text();
      tafRaw = rawText.trim();
    }
    
    // Build decoded METAR from JSON data or parse from raw
    let decoded = null;
    if (metarData) {
      decoded = {
        raw: metarRaw,
        station: metarData.icaoId || airport,
        time: metarData.reportTime || '',
        wind: metarData.wdir && metarData.wspd 
          ? `${metarData.wdir}° at ${metarData.wspd} knots${metarData.wgst ? `, gusting ${metarData.wgst} knots` : ''}`
          : 'Calm',
        visibility: metarData.visib ? `${metarData.visib} statute miles` : '',
        sky: metarData.clouds?.map(c => `${c.cover} at ${c.base} feet`).join(', ') || 'Clear',
        temperature: metarData.temp != null ? `${metarData.temp}°C (${Math.round(metarData.temp * 9/5 + 32)}°F)` : '',
        dewpoint: metarData.dewp != null ? `${metarData.dewp}°C (${Math.round(metarData.dewp * 9/5 + 32)}°F)` : '',
        altimeter: metarData.altim ? `${(metarData.altim / 33.8639).toFixed(2)} inHg` : '',
        flightCategory: metarData.fltcat || '',
        wxString: metarData.wxString || ''
      };
    } else if (metarRaw) {
      decoded = decodeMetar(metarRaw);
    }
    
    console.log(`✅ Weather for ${airport}: METAR=${metarRaw ? 'OK' : 'N/A'}, TAF=${tafRaw ? 'OK' : 'N/A'}`);
    
    res.json({
      success: true,
      metar: metarRaw || 'No METAR available',
      taf: tafRaw || 'No TAF available',
      decoded: decoded
    });
    
  } catch (error) {
    console.error('❌ Weather fetch error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Decode METAR string into human-readable format
 */
function decodeMetar(metar) {
  if (!metar || metar === 'No METAR available') return null;
  
  try {
    const parts = metar.split(' ');
    const decoded = {
      raw: metar,
      station: parts[0] || '',
      time: '',
      wind: '',
      visibility: '',
      sky: '',
      temperature: '',
      dewpoint: '',
      altimeter: '',
      remarks: ''
    };
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // Time (e.g., "261856Z")
      if (/^\d{6}Z$/.test(part)) {
        const day = part.substring(0, 2);
        const hour = part.substring(2, 4);
        const min = part.substring(4, 6);
        decoded.time = `Day ${day}, ${hour}:${min} UTC`;
      }
      
      // Wind (e.g., "27008KT" or "VRB03KT")
      if (/^\d{3}\d{2,3}(G\d{2,3})?KT$/.test(part) || /^VRB\d{2,3}KT$/.test(part)) {
        if (part.startsWith('VRB')) {
          const speed = part.match(/VRB(\d+)KT/)?.[1];
          decoded.wind = `Variable at ${speed} knots`;
        } else {
          const dir = part.substring(0, 3);
          const speedMatch = part.match(/\d{3}(\d{2,3})(G(\d{2,3}))?KT/);
          if (speedMatch) {
            const speed = speedMatch[1];
            const gust = speedMatch[3];
            decoded.wind = gust 
              ? `${dir}° at ${speed} knots, gusting ${gust} knots`
              : `${dir}° at ${speed} knots`;
          }
        }
      }
      
      // Visibility (e.g., "10SM" or "1/2SM")
      if (/^\d+SM$/.test(part) || /^\d+\/\d+SM$/.test(part)) {
        const vis = part.replace('SM', '');
        decoded.visibility = `${vis} statute miles`;
      }
      
      // Sky condition (e.g., "FEW030", "SCT080", "BKN120", "OVC250")
      if (/^(FEW|SCT|BKN|OVC|CLR|SKC|VV)\d*$/.test(part)) {
        const conditions = {
          'FEW': 'Few',
          'SCT': 'Scattered',
          'BKN': 'Broken',
          'OVC': 'Overcast',
          'CLR': 'Clear',
          'SKC': 'Sky Clear',
          'VV': 'Vertical Visibility'
        };
        const condition = part.substring(0, 3);
        const altitude = part.substring(3);
        if (altitude) {
          decoded.sky += (decoded.sky ? ', ' : '') + `${conditions[condition] || condition} at ${parseInt(altitude) * 100} feet`;
        } else {
          decoded.sky = conditions[condition] || condition;
        }
      }
      
      // Temperature/Dewpoint (e.g., "18/12" or "M02/M05")
      if (/^M?\d{2}\/M?\d{2}$/.test(part)) {
        const [temp, dew] = part.split('/');
        const parseTemp = (t) => {
          if (t.startsWith('M')) {
            return -parseInt(t.substring(1));
          }
          return parseInt(t);
        };
        const tempC = parseTemp(temp);
        const dewC = parseTemp(dew);
        decoded.temperature = `${tempC}°C (${Math.round(tempC * 9/5 + 32)}°F)`;
        decoded.dewpoint = `${dewC}°C (${Math.round(dewC * 9/5 + 32)}°F)`;
      }
      
      // Altimeter (e.g., "A3012" or "Q1013")
      if (/^A\d{4}$/.test(part)) {
        const alt = part.substring(1);
        decoded.altimeter = `${alt.substring(0, 2)}.${alt.substring(2)} inHg`;
      }
      if (/^Q\d{4}$/.test(part)) {
        const alt = part.substring(1);
        decoded.altimeter = `${alt} hPa`;
      }
      
      // Remarks
      if (part === 'RMK') {
        decoded.remarks = parts.slice(i + 1).join(' ');
        break;
      }
    }
    
    return decoded;
  } catch (error) {
    console.error('Error decoding METAR:', error);
    return null;
  }
}

/* ============================
   FLIGHTAWARE API ENDPOINT
   Fetches actual flight times from AeroAPI
============================ */
app.post('/api/flightaware', async (req, res) => {
  const { tailNumber, flightNumber, departureDate, origin, destination } = req.body;
  
  console.log(`✈️ FlightAware lookup: ${flightNumber} / ${tailNumber} on ${departureDate}`);
  
  // Note: This requires a FlightAware AeroAPI key
  // For now, return a placeholder response indicating the feature needs API setup
  const AEROAPI_KEY = process.env.FLIGHTAWARE_API_KEY;
  
  if (!AEROAPI_KEY) {
    console.log('⚠️ FlightAware API key not configured');
    return res.json({
      success: false,
      error: 'FlightAware API key not configured',
      flightData: null
    });
  }
  
  try {
    // AeroAPI v4 endpoint for flight information
    const flightId = flightNumber.replace(/\s+/g, '');
    const url = `https://aeroapi.flightaware.com/aeroapi/flights/${flightId}?start=${departureDate}`;
    
    const response = await fetch(url, {
      headers: {
        'x-apikey': AEROAPI_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`AeroAPI returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Find the matching flight
    const flight = data.flights?.find(f => {
      const matchesTail = !tailNumber || f.registration === tailNumber;
      const matchesOrigin = !origin || f.origin?.code === origin || f.origin?.code_icao === origin;
      const matchesDest = !destination || f.destination?.code === destination || f.destination?.code_icao === destination;
      return matchesTail && matchesOrigin && matchesDest;
    });
    
    if (flight) {
      res.json({
        success: true,
        flightData: {
          flightNumber: flight.ident,
          tailNumber: flight.registration,
          origin: flight.origin?.code,
          destination: flight.destination?.code,
          scheduledDeparture: flight.scheduled_out,
          scheduledArrival: flight.scheduled_in,
          actualTimes: {
            actualDeparture: flight.actual_out || flight.estimated_out,
            actualArrival: flight.actual_in || flight.estimated_in
          },
          status: flight.status,
          aircraftType: flight.aircraft_type
        }
      });
    } else {
      res.json({
        success: false,
        error: 'Flight not found',
        flightData: null
      });
    }
    
  } catch (error) {
    console.error('❌ FlightAware error:', error.message);
    res.json({
      success: false,
      error: error.message,
      flightData: null
    });
  }
});

/* ============================
   USER REGISTRATION ENDPOINTS
   For cross-company pilot discovery
============================ */

// Register user endpoint
app.post('/api/register-user', (req, res) => {
  try {
    const { employeeId, name, role, base, airline } = req.body;
    
    if (!employeeId || !name) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    const user = registerUser(employeeId, name, role, base, airline);
    console.log(`✅ User registered: ${name} (${employeeId})`);
    
    res.json({ success: true, user });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Unregister user endpoint
app.post('/api/unregister-user', (req, res) => {
  try {
    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Missing employeeId' });
    }
    
    const result = unregisterUser(employeeId);
    console.log(`❌ User unregistered: ${employeeId}`);
    
    res.json({ success: true, result });
  } catch (err) {
    console.error('Unregistration error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Search users endpoint
app.get('/api/search-users', (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ success: true, users: [] });
    }
    
    const users = searchUsers(q);
    res.json({ success: true, users });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check if user is registered
app.get('/api/check-registration/:employeeId', (req, res) => {
  try {
    const { employeeId } = req.params;
    const registered = isUserRegistered(employeeId);
    
    res.json({ success: true, registered });
  } catch (err) {
    console.error('Check registration error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Puppeteer scraper running on port ${PORT}`);
});