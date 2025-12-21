const puppeteer = require('puppeteer');
const fs = require('fs');

/**
 * ENHANCED CREW PORTAL SCRAPER
 * Extracts complete schedule data including:
 * - Accurate flight dates and times
 * - Hotel/layover information
 * - Complete crew member details
 * - Aircraft information
 * - All pairing details
 */

const AIRLINE_CONFIGS = {
  'ABX Air': {
    portalUrl: 'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp',
    loginSelectors: {
      username: 'input[name="username"], #username',
      password: 'input[name="password"], #password',
      submit: 'input[type="submit"], button[type="submit"], #kc-login'
    }
  },
  'ATI': {
    portalUrl: 'https://crew.airtransport.cc/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp',
    loginSelectors: {
      username: 'input[name="username"], #username',
      password: 'input[name="password"], #password',
      submit: 'input[type="submit"], button[type="submit"], #kc-login'
    }
  }
};

function getConfig(options = {}) {
  return {
    airline: options.airline || process.env.CREW_AIRLINE || 'ABX Air',
    username: options.username || process.env.CREW_USERNAME || '',
    password: options.password || process.env.CREW_PASSWORD || '',
    headless: options.headless !== false,
    extractCrewDetails: options.extractCrewDetails !== false,
    get portalUrl() { return AIRLINE_CONFIGS[this.airline]?.portalUrl || AIRLINE_CONFIGS['ABX Air'].portalUrl; },
    get loginSelectors() { return AIRLINE_CONFIGS[this.airline]?.loginSelectors || AIRLINE_CONFIGS['ABX Air'].loginSelectors; }
  };
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Parse date string like "06Dec" into full ISO date
 */
function parseCrewDate(dateStr, year = new Date().getFullYear()) {
  const months = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  
  const match = dateStr.match(/(\d{2})([A-Za-z]{3})/);
  if (!match) return null;
  
  const day = parseInt(match[1]);
  const monthName = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
  const month = months[monthName];
  
  if (month === undefined) return null;
  
  const date = new Date(year, month, day);
  return date.toISOString();
}

/**
 * Extract complete schedule data from the crew portal
 */
async function scrapeCompleteSchedule() {
  console.log('🚀 Starting Enhanced Crew Portal Scraper...');
  
  const CONFIG = getConfig();
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: CONFIG.headless,
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Login
    console.log('📍 Navigating to portal...');
    await page.goto(CONFIG.portalUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    if (CONFIG.username && CONFIG.password) {
      console.log('🔐 Logging in...');
      await sleep(1500);
      
      const usernameInput = await page.$(CONFIG.loginSelectors.username);
      if (usernameInput) {
        await page.type(CONFIG.loginSelectors.username, CONFIG.username, { delay: 50 });
        await page.type(CONFIG.loginSelectors.password, CONFIG.password, { delay: 50 });
        await page.click(CONFIG.loginSelectors.submit);
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
        console.log('✅ Login successful');
      }
    }
    
    await sleep(3000);
    
    // Navigate to Duty Plan view
    console.log('📋 Opening Duty Plan...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      for (const link of links) {
        const text = (link.textContent || '').trim().toUpperCase();
        if (text === 'DUTY PLAN' || text === 'DUTYPLAN') {
          link.click();
          return true;
        }
      }
      return false;
    });
    
    await sleep(3000);
    
    // Extract the full page text content for parsing
    const pageContent = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync('portal-full-content.txt', pageContent);
    console.log('📄 Page content saved for parsing');
    
    // Parse complete schedule data
    const scheduleData = parsePortalContent(pageContent);
    console.log(`✅ Extracted ${scheduleData.pairings.length} pairings`);
    
    // Extract crew details by clicking into each flight
    if (CONFIG.extractCrewDetails) {
      console.log('👥 Extracting crew member details...');
      await extractCrewDetails(page, scheduleData);
    }
    
    // Extract hotel information
    console.log('🏨 Extracting hotel/layover information...');
    await extractHotelInfo(page, scheduleData);
    
    // Save final data
    fs.writeFileSync('schedule-complete.json', JSON.stringify(scheduleData, null, 2));
    console.log('💾 Complete schedule data saved');
    
    await browser.close();
    return scheduleData;
    
  } catch (error) {
    console.error('❌ Scraping error:', error);
    if (browser) await browser.close();
    throw error;
  }
}

/**
 * Parse the portal text content into structured schedule data
 */
function parsePortalContent(content) {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const pairings = [];
  let currentYear = new Date().getFullYear();
  
  console.log('🔍 Parsing portal content...');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for pairing header: "C6208/06Dec    Rank: FO"
    const pairingMatch = line.match(/^([A-Z]\d+)\/(\d{2}[A-Za-z]{3})\s+Rank:\s*([A-Z]+)/);
    if (pairingMatch) {
      const [, pairingNumber, startDate, rank] = pairingMatch;
      
      const pairing = {
        pairingNumber,
        startDate: parseCrewDate(startDate, currentYear),
        rank,
        flights: [],
        hotel: null,
        layover: null
      };
      
      // Extract flights from following lines
      let j = i + 1;
      while (j < lines.length) {
        const currentLine = lines[j].trim();
        
        // Stop at next pairing or OTHER section
        if (currentLine.match(/^[A-Z]\d+\/\d{2}[A-Za-z]{3}/) || currentLine.startsWith('OTHER')) {
          break;
        }
        
        // Flight line: "GB3130    763    N1489A"
        const flightMatch = currentLine.match(/^([A-Z]{2}\d+)\s+(\d+)\s+([A-Z0-9]+)/);
        if (flightMatch) {
          const [, flightNumber, aircraftType, tailNumber] = flightMatch;
          
          const flight = {
            flightNumber,
            aircraftType,
            tailNumber,
            origin: '',
            destination: '',
            departureDate: '',
            arrivalDate: '',
            departureTime: '',
            arrivalTime: '',
            crew: []
          };
          
          // Next line: origin info "CVG    06Dec    22:30 LT"
          if (j + 1 < lines.length) {
            const originMatch = lines[j + 1].match(/([A-Z]{3})\s+(\d{2}[A-Za-z]{3})\s+(\d{2}:\d{2})\s+LT/);
            if (originMatch) {
              flight.origin = originMatch[1];
              flight.departureDate = parseCrewDate(originMatch[2], currentYear);
              flight.departureTime = originMatch[3];
              flight.date = flight.departureDate; // Main date for sorting
            }
          }
          
          // Next line: destination info "SDF    07Dec    00:04 LT"
          if (j + 2 < lines.length) {
            const destMatch = lines[j + 2].match(/([A-Z]{3})\s+(\d{2}[A-Za-z]{3})\s+(\d{2}:\d{2})\s+LT/);
            if (destMatch) {
              flight.destination = destMatch[1];
              flight.arrivalDate = parseCrewDate(destMatch[1], currentYear);
              flight.arrivalTime = destMatch[3];
            }
          }
          
          pairing.flights.push(flight);
          j += 3; // Skip the origin/dest lines we just processed
        } else {
          j++;
        }
      }
      
      if (pairing.flights.length > 0) {
        // Determine layover location (destination of last flight)
        const lastFlight = pairing.flights[pairing.flights.length - 1];
        if (lastFlight.destination && lastFlight.destination !== pairing.flights[0].origin) {
          pairing.layover = lastFlight.destination;
        }
        
        pairings.push(pairing);
      }
      
      i = j - 1; // Continue from where we left off
    }
  }
  
  return {
    pilot: {
      name: '',
      employeeNumber: '',
      airline: getConfig().airline
    },
    pairings,
    scrapedAt: new Date().toISOString()
  };
}

/**
 * Extract crew member details by clicking into flight details
 */
async function extractCrewDetails(page, scheduleData) {
  try {
    // Find all flight detail buttons
    const detailButtons = await page.$$('[data-test-id="details-page-button"]');
    console.log(`🔍 Found ${detailButtons.length} flight detail buttons`);
    
    // Limit to reasonable number to avoid timeouts
    const maxFlights = Math.min(detailButtons.length, 20);
    
    for (let i = 0; i < maxFlights; i++) {
      try {
        // Get flight number to match with our data
        const flightInfo = await detailButtons[i].evaluate(btn => {
          const row = btn.closest('[data-test-id="duty-row"]');
          const text = row?.textContent || '';
          const match = text.match(/([A-Z]{2}\d+)/);
          return match ? match[1] : null;
        });
        
        if (!flightInfo) continue;
        
        // Click to open details
        await detailButtons[i].click();
        await sleep(1500);
        
        // Extract crew members
        const crewMembers = await page.evaluate(() => {
          const crew = [];
          const crewElements = document.querySelectorAll('[data-test-id*="crew"], .crew-member, [class*="CrewMember"]');
          
          crewElements.forEach(el => {
            const text = el.textContent?.trim();
            if (!text || text.length < 3) return;
            
            // Parse crew member: "SMITH, JOHN - CA"
            const match = text.match(/([A-Z]+),\s*([A-Z]+)\s*-\s*([A-Z]+)/);
            if (match) {
              crew.push({
                lastName: match[1],
                firstName: match[2],
                position: match[3],
                fullName: `${match[2]} ${match[1]}`
              });
            } else if (text.length < 100) {
              // Fallback: just store the text
              crew.push({ name: text });
            }
          });
          
          return crew;
        });
        
        // Match and add crew to the right flight
        scheduleData.pairings.forEach(pairing => {
          pairing.flights.forEach(flight => {
            if (flight.flightNumber === flightInfo) {
              flight.crew = crewMembers;
            }
          });
        });
        
        console.log(`✅ Extracted ${crewMembers.length} crew for flight ${flightInfo}`);
        
        // Close modal
        await page.keyboard.press('Escape');
        await sleep(500);
        
      } catch (err) {
        console.warn(`⚠️ Error extracting crew for flight ${i + 1}:`, err.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Crew extraction error:', error.message);
  }
}

/**
 * Extract hotel/layover information
 */
async function extractHotelInfo(page, scheduleData) {
  try {
    // Look for hotel information in the page
    const hotelData = await page.evaluate(() => {
      const hotels = {};
      
      // Look for hotel sections or cards
      const hotelElements = document.querySelectorAll('[class*="hotel"], [class*="layover"], [class*="Hotel"], [class*="Layover"]');
      
      hotelElements.forEach(el => {
        const text = el.textContent?.trim();
        if (!text) return;
        
        // Extract hotel name, phone, address
        const nameMatch = text.match(/Hotel[:\s]+([^\n]+)/i);
        const phoneMatch = text.match(/(?:Phone|Tel|☎)[:\s]+([\d\s\-\(\)]+)/i);
        const addressMatch = text.match(/(?:Address|Location)[:\s]+([^\n]+)/i);
        
        if (nameMatch || phoneMatch || addressMatch) {
          // Try to find associated airport code
          const airportMatch = text.match(/\b([A-Z]{3})\b/);
          const airport = airportMatch ? airportMatch[1] : 'UNKNOWN';
          
          hotels[airport] = {
            name: nameMatch ? nameMatch[1].trim() : 'Unknown Hotel',
            phone: phoneMatch ? phoneMatch[1].trim() : '',
            address: addressMatch ? addressMatch[1].trim() : ''
          };
        }
      });
      
      return hotels;
    });
    
    // Match hotels to pairings based on layover location
    scheduleData.pairings.forEach(pairing => {
      if (pairing.layover && hotelData[pairing.layover]) {
        pairing.hotel = hotelData[pairing.layover];
        console.log(`🏨 Added hotel info for ${pairing.layover}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Hotel extraction error:', error.message);
  }
}

// Export functions
module.exports = {
  scrapeCompleteSchedule,
  parseCrewDate,
  parsePortalContent,
  getConfig
};

// Run if executed directly
if (require.main === module) {
  scrapeCompleteSchedule()
    .then(data => {
      console.log('\n✅ SCRAPING COMPLETE');
      console.log(`📊 Total pairings: ${data.pairings.length}`);
      console.log(`✈️ Total flights: ${data.pairings.reduce((sum, p) => sum + p.flights.length, 0)}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ SCRAPING FAILED:', error);
      process.exit(1);
    });
}
