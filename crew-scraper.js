const puppeteer = require('puppeteer');
const fs = require('fs');

// Configuration - IMPORTANT: Keep this file secure and never commit to git
const CONFIG = {
  portalUrl: 'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp',
  username: process.env.CREW_USERNAME || '152780', // Set via environment variable or config
  password: process.env.CREW_PASSWORD || 'Abxcrew152780!a', // Set via environment variable or config
  backendUrl: 'http://localhost:3001/api/schedule/import',
  headless: false // Set to true for production, false for debugging
};

/**
 * Main scraper function
 */
async function scrapeCrewPortal() {
  console.log('🚀 Starting crew portal scraper...');
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: CONFIG.headless,
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    console.log('📍 Navigating to crew portal...');
    await page.goto(CONFIG.portalUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for login page to load
    await page.waitForTimeout(3000);
    
    console.log('🔐 Attempting login...');
    
    // IMPORTANT: You'll need to inspect the actual login form and update these selectors
    // Open the crew portal in Chrome, right-click on username field > Inspect
    // Find the actual input field selectors and update below
    
    // Example login flow (UPDATE THESE SELECTORS):
    const usernameSelector = 'input[name="username"]'; // Update this
    const passwordSelector = 'input[name="password"]'; // Update this
    const loginButtonSelector = 'button[type="submit"]'; // Update this
    
    // Wait for login form
    try {
      await page.waitForSelector(usernameSelector, { timeout: 10000 });
      
      // Fill in credentials
      await page.type(usernameSelector, CONFIG.username);
      await page.type(passwordSelector, CONFIG.password);
      
      // Click login button
      await page.click(loginButtonSelector);
      
      // Wait for navigation after login
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      
      console.log('✅ Login successful!');
    } catch (error) {
      console.error('❌ Login failed. Please update the selectors in crew-scraper.js');
      console.error('Error:', error.message);
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'login-error.png' });
      console.log('📸 Screenshot saved as login-error.png');
      
      throw error;
    }
    
    // Wait for dashboard to load
    await page.waitForTimeout(5000);
    
    console.log('📊 Extracting schedule data...');
    
    // Extract schedule data - UPDATE THESE SELECTORS BASED ON ACTUAL PORTAL STRUCTURE
    const scheduleData = await page.evaluate(() => {
      const flights = [];
      
      // EXAMPLE: Find all flight rows in a table
      // You'll need to inspect the actual HTML structure and update this
      const flightRows = document.querySelectorAll('.flight-row, tr.pairing-row, .schedule-item');
      
      flightRows.forEach(row => {
        try {
          // Extract data from each row - UPDATE THESE SELECTORS
          const flightNumber = row.querySelector('.flight-number')?.textContent?.trim();
          const date = row.querySelector('.date')?.textContent?.trim();
          const origin = row.querySelector('.origin')?.textContent?.trim();
          const destination = row.querySelector('.destination')?.textContent?.trim();
          const departure = row.querySelector('.departure-time')?.textContent?.trim();
          const arrival = row.querySelector('.arrival-time')?.textContent?.trim();
          const aircraft = row.querySelector('.aircraft-type')?.textContent?.trim();
          
          if (flightNumber && date) {
            flights.push({
              flightNumber,
              date,
              origin,
              destination,
              departure,
              arrival,
              aircraft
            });
          }
        } catch (err) {
          console.error('Error parsing flight row:', err);
        }
      });
      
      return flights;
    });
    
    console.log(`📋 Found ${scheduleData.length} flights`);
    
    if (scheduleData.length === 0) {
      console.warn('⚠️  No flights found. The selectors may need to be updated.');
      console.warn('Please inspect the crew portal HTML and update the selectors in crew-scraper.js');
      
      // Save page HTML for inspection
      const html = await page.content();
      fs.writeFileSync('portal-page.html', html);
      console.log('📄 Page HTML saved as portal-page.html for inspection');
    }
    
    // Transform data to match app format
    const formattedSchedule = transformScheduleData(scheduleData);
    
    // Save to file
    fs.writeFileSync('scraped-schedule.json', JSON.stringify(formattedSchedule, null, 2));
    console.log('💾 Schedule saved to scraped-schedule.json');
    
    // Send to backend
    if (scheduleData.length > 0) {
      await sendToBackend(formattedSchedule);
    }
    
    console.log('✅ Scraping completed successfully!');
    
    return formattedSchedule;
    
  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Transform scraped data to match app's schedule format
 */
function transformScheduleData(scrapedData) {
  // Group flights by pairing
  const pairings = [];
  let currentPairing = {
    pairingId: 'PAIR' + Date.now(),
    flights: []
  };
  
  scrapedData.forEach(flight => {
    currentPairing.flights.push({
      date: flight.date,
      flightNumber: flight.flightNumber,
      origin: flight.origin,
      destination: flight.destination,
      departure: flight.departure,
      arrival: flight.arrival,
      aircraft: flight.aircraft,
      crew: [] // Crew info would need separate extraction
    });
  });
  
  if (currentPairing.flights.length > 0) {
    pairings.push(currentPairing);
  }
  
  return pairings;
}

/**
 * Send scraped data to backend
 */
async function sendToBackend(scheduleData) {
  try {
    console.log('📤 Sending data to backend...');
    
    const response = await fetch(CONFIG.backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        schedule: scheduleData,
        timestamp: new Date().toISOString()
      })
    });
    
    if (response.ok) {
      console.log('✅ Data sent to backend successfully');
    } else {
      console.error('❌ Backend returned error:', response.status);
    }
  } catch (error) {
    console.error('❌ Failed to send to backend:', error.message);
    console.log('💡 Make sure the backend server is running on port 3001');
  }
}

/**
 * Run scraper on schedule
 */
async function scheduleScraper() {
  const cron = require('node-cron');
  
  console.log('⏰ Scheduler started - will run daily at 6:00 AM');
  
  // Run daily at 6:00 AM
  cron.schedule('0 6 * * *', async () => {
    console.log('🕐 Scheduled scrape starting...');
    try {
      await scrapeCrewPortal();
    } catch (error) {
      console.error('❌ Scheduled scrape failed:', error);
    }
  });
  
  // Also run immediately on start
  console.log('🚀 Running initial scrape...');
  await scrapeCrewPortal();
}

// Run scraper
if (require.main === module) {
  // Check if credentials are provided
  if (!CONFIG.username || !CONFIG.password) {
    console.error('❌ ERROR: Credentials not provided!');
    console.log('\n📝 Please set your credentials:');
    console.log('   Option 1: Set environment variables:');
    console.log('     set CREW_USERNAME=your_username');
    console.log('     set CREW_PASSWORD=your_password');
    console.log('     node crew-scraper.js');
    console.log('\n   Option 2: Edit CONFIG in crew-scraper.js (less secure)');
    process.exit(1);
  }
  
  // Choose mode
  const args = process.argv.slice(2);
  if (args.includes('--schedule')) {
    scheduleScraper();
  } else {
    scrapeCrewPortal()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

module.exports = { scrapeCrewPortal };
