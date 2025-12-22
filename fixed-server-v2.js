const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Family codes storage file
const FAMILY_CODES_FILE = path.join(__dirname, 'family-codes.json');

// Load family codes from file
function loadFamilyCodes() {
    try {
        if (fsSync.existsSync(FAMILY_CODES_FILE)) {
            const data = fsSync.readFileSync(FAMILY_CODES_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading family codes:', error);
    }
    return {};
}

// Save family codes to file
function saveFamilyCodes(codes) {
    try {
        fsSync.writeFileSync(FAMILY_CODES_FILE, JSON.stringify(codes, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving family codes:', error);
        return false;
    }
}

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// File path for registered users database
const USERS_DB_PATH = path.join(__dirname, 'registered_users.json');

// Crew hotel database - Common layover hotels for ABX and ATI
const CREW_HOTELS = {
    // Stockton, CA
    'KSCK': [
        {
            names: ['Hilton', 'Hilton SCK', 'Hilton Stockton', 'Stockton Hilton'],
            address: '2323 Grand Canal Blvd, Stockton, CA 95207, United States',
            phone: '+1 209-957-9090'
        }
    ],
    // Cincinnati, OH
    'KCVG': [
        {
            names: ['Marriott', 'Marriott CVG', 'Cincinnati Marriott'],
            address: '2395 Progress Dr, Hebron, KY 41048, United States',
            phone: '+1 859-586-0166'
        }
    ],
    // Fort Wayne, IN
    'KFWA': [
        {
            names: ['Hilton', 'Hilton FWA', 'Hilton Fort Wayne'],
            address: '1020 S Calhoun St, Fort Wayne, IN 46802, United States',
            phone: '+1 260-420-1100'
        }
    ],
    // Wilmington, OH (ABX/ATI hub)
    'KILN': [
        {
            names: ['Hampton Inn', 'Hampton ILN', 'Hampton Wilmington'],
            address: '201 Carrie Dr, Wilmington, OH 45177, United States',
            phone: '+1 937-382-4400'
        }
    ],
    // Anchorage, AK
    'PANC': [
        {
            names: ['Hilton', 'Hilton ANC', 'Hilton Anchorage'],
            address: '500 W 3rd Ave, Anchorage, AK 99501, United States',
            phone: '+1 907-272-7411'
        }
    ],
    // Honolulu, HI
    'PHNL': [
        {
            names: ['Hilton', 'Hilton HNL', 'Hilton Hawaiian Village'],
            address: '2005 Kalia Rd, Honolulu, HI 96815, United States',
            phone: '+1 808-949-4321'
        }
    ]
};

// Helper function to enrich hotel data with address and phone
const enrichHotelData = (hotel) => {
    if (!hotel || !hotel.location) return hotel;
    
    let airportCode = hotel.location;
    const hotelName = hotel.name ? hotel.name.toLowerCase() : '';
    
    // Convert 3-letter IATA to 4-letter ICAO if needed
    if (airportCode.length === 3) {
        // Add K prefix for US domestic airports
        airportCode = 'K' + airportCode;
    }
    
    // Check if we have data for this airport
    if (CREW_HOTELS[airportCode]) {
        for (const knownHotel of CREW_HOTELS[airportCode]) {
            // Check if the hotel name matches any known names
            const nameMatch = knownHotel.names.some(name => 
                hotelName.includes(name.toLowerCase()) || name.toLowerCase().includes(hotelName)
            );
            
            if (nameMatch) {
                console.log(`✨ Enriched hotel: ${hotel.name} at ${hotel.location} with address and phone`);
                return {
                    ...hotel,
                    address: hotel.address || knownHotel.address,
                    phone: hotel.phone || knownHotel.phone
                };
            }
        }
    }
    
    return hotel;
};

// Helper functions for user database
const loadUsers = async () => {
    try {
        const data = await fs.readFile(USERS_DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // File doesn't exist or is invalid, return empty object
        return {};
    }
};

const saveUsers = async (users) => {
    await fs.writeFile(USERS_DB_PATH, JSON.stringify(users, null, 2), 'utf8');
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const authenticateUser = async (employeeId, password, airline = 'ABX', targetMonth = null, targetYear = null, firstLogin = true) => {
    let browser = null;
    
    try {
        const monthStr = targetMonth ? `${targetYear}-${String(targetMonth).padStart(2, '0')}` : 'current';
        console.log(`🚀 REAL AUTHENTICATION for ${airline} pilot ${employeeId} - Month: ${monthStr}`);
        console.log(`📋 First login: ${firstLogin} - ${firstLogin ? 'Will scrape pilot profile' : 'Skip pilot profile, schedule only'}`);
        
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-extensions',
                '--disable-background-networking',
                '--disable-sync',
                '--disable-translate',
                '--metrics-recording-only',
                '--mute-audio',
                '--no-first-run',
                '--safebrowsing-disable-auto-update',
                '--disable-web-security'
            ],
            executablePath: '/usr/bin/chromium-browser',
            timeout: 60000
        });
        
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(120000);
        
        // Direct IADP URLs for each airline
        const crewPortalUrls = {
            'ABX': 'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp',
            'ATI': 'https://crew.airtransport.cc/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp'
        };
        
        const portalUrl = crewPortalUrls[airline.toUpperCase()] || crewPortalUrls['ABX'];
        console.log(`🌐 Navigating to ${airline.toUpperCase()} crew portal IADP...`);
        await page.goto(portalUrl, { waitUntil: 'networkidle0' });
        
        const currentUrl = page.url();
        console.log(`📍 Current URL: ${currentUrl}`);
        
        if (!currentUrl.includes('auth')) {
            throw new Error('Did not reach Keycloak login page');
        }
        
        console.log('✅ Keycloak login page loaded');
        
        // Try multiple selectors for username field
        let usernameSelector = null;
        const usernameSelectors = ['#username', 'input[name="username"]', 'input[type="text"]', '#login'];
        for (const selector of usernameSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 3000 });
                usernameSelector = selector;
                console.log(`✅ Username field found: ${selector}`);
                break;
            } catch (e) {
                console.log(`⏭️ Trying next selector...`);
            }
        }
        
        if (!usernameSelector) {
            throw new Error('Could not find username input field');
        }
        
        await page.type(usernameSelector, employeeId);
        console.log(`✅ Entered employee ID: ${employeeId}`);
        
        // Try multiple selectors for password field
        const passwordSelectors = ['#password', 'input[name="password"]', 'input[type="password"]'];
        let passwordSelector = null;
        for (const selector of passwordSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 3000 });
                passwordSelector = selector;
                break;
            } catch (e) {}
        }
        
        if (!passwordSelector) {
            throw new Error('Could not find password input field');
        }
        
        await page.type(passwordSelector, password);
        console.log('✅ Entered password');
        
        // Try multiple selectors for login button
        const loginSelectors = ['#kc-login', 'button[type="submit"]', 'input[type="submit"]', 'button[name="login"]'];
        let loginButton = null;
        for (const selector of loginSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 3000 });
                loginButton = selector;
                break;
            } catch (e) {}
        }
        
        if (!loginButton) {
            throw new Error('Could not find login button');
        }
        
        await page.click(loginButton);
        console.log('✅ Clicked login button');
        
        await sleep(8000);
        
        const finalUrl = page.url();
        console.log(`📍 Post-login URL: ${finalUrl}`);
        
        if (finalUrl.includes('auth/realms')) {
            throw new Error('Invalid credentials');
        }
        
        console.log('✅ REAL AUTH SUCCESS!');
        
        // Wait for IADP to load
        await sleep(10000);
        console.log('⏰ Waited 10s for IADP content to load');
        
        // Navigate to target month if specified
        if (targetMonth !== null && targetYear !== null) {
            console.log(`📅 Navigating to ${targetYear}-${String(targetMonth).padStart(2, '0')}...`);
            
            const currentDate = await page.evaluate(() => {
                const monthElement = document.querySelector('h2.IADP-MuiTypography-h2');
                return monthElement ? monthElement.textContent : '';
            });
            
            console.log(`📅 Current month displayed: ${currentDate}`);
            
            // Click next/previous month buttons to reach target month
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                               'July', 'August', 'September', 'October', 'November', 'December'];
            const targetMonthName = monthNames[targetMonth - 1];
            
            let attempts = 0;
            let foundMonth = false;
            
            while (attempts < 24 && !foundMonth) {
                const currentMonthText = await page.evaluate(() => {
                    const monthElement = document.querySelector('h2.IADP-MuiTypography-h2');
                    return monthElement ? monthElement.textContent : '';
                });
                
                if (currentMonthText.includes(targetMonthName) && currentMonthText.includes(String(targetYear))) {
                    console.log(`✅ Found target month: ${currentMonthText}`);
                    foundMonth = true;
                    break;
                }
                
                // Parse current month
                const monthMatch = currentMonthText.match(/([A-Z][a-z]+)\s+(\d{4})/);
                if (monthMatch) {
                    const currentMonthName = monthMatch[1];
                    const currentYear = parseInt(monthMatch[2]);
                    const currentMonthIndex = monthNames.indexOf(currentMonthName);
                    
                    const currentMonthNum = currentYear * 12 + currentMonthIndex;
                    const targetMonthNum = targetYear * 12 + (targetMonth - 1);
                    
                    if (targetMonthNum > currentMonthNum) {
                        // Click next button - try multiple selectors
                        await page.evaluate(() => {
                            const nextButton = document.querySelector('button.nav-arrow:last-of-type') || 
                                             document.querySelector('.nav-arrow:last-child') || 
                                             document.querySelector('button[aria-label*="next"]') ||
                                             document.querySelector('button:has(svg[data-testid="NavigateNextIcon"])');
                            if (nextButton) {
                                nextButton.click();
                                return true;
                            }
                            return false;
                        });
                        console.log(`➡️ Clicking next month...`);
                    } else {
                        // Click previous button - try multiple selectors
                        await page.evaluate(() => {
                            const prevButton = document.querySelector('button.nav-arrow:first-of-type') || 
                                             document.querySelector('.nav-arrow:first-child') || 
                                             document.querySelector('button[aria-label*="previous"]') ||
                                             document.querySelector('button:has(svg[data-testid="NavigateBeforeIcon"])');
                            if (prevButton) {
                                prevButton.click();
                                return true;
                            }
                            return false;
                        });
                        console.log(`⬅️ Clicking previous month...`);
                    }
                    
                    await sleep(2000);
                }
                
                attempts++;
            }
            
            if (!foundMonth) {
                console.log(`⚠️ Could not navigate to target month after ${attempts} attempts`);
                console.log(`💡 The crew portal may not have data available for ${targetMonthName} ${targetYear} yet`);
                // Continue anyway - the portal might have the data even if we couldn't navigate to it
                console.log(`🔄 Continuing with scraping - data may still be available...`);
            }
        }
        
        // Scroll through calendar to load all duty rows
        console.log('📜 Scrolling through calendar to load all duty rows...');
        await page.evaluate(async () => {
            const scrollContainer = document.querySelector('[data-test-id="calendar-container"]') || 
                                   document.querySelector('.IADP-jss1') || 
                                   document.body;
            
            // Scroll to bottom multiple times to trigger lazy loading with longer delays
            for (let i = 0; i < 20; i++) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Scroll back to top
            scrollContainer.scrollTop = 0;
            await new Promise(resolve => setTimeout(resolve, 500));
        });
        
        await sleep(2000);
        console.log('✅ Finished scrolling');
        
        // Scrape schedule data from IADP
        const scheduleData = await page.evaluate((skipPilotProfile) => {
            const pairings = [];
            
            // Parse month from calendar view
            const monthElements = document.querySelectorAll('h2.IADP-MuiTypography-h2');
            let currentMonth = '';
            let currentYear = new Date().getFullYear();
            
            if (monthElements.length > 0) {
                const monthText = monthElements[0].textContent || '';
                const monthMatch = monthText.match(/([A-Z][a-z]+)\s+(\d{4})/);
                if (monthMatch) {
                    currentMonth = monthMatch[1];
                    currentYear = parseInt(monthMatch[2]);
                }
            }
            
            // Get all main duty rows (PAR = pairing)
            const dutyRows = document.querySelectorAll('div[data-test-id="duty-row"]');
            console.log(`Found ${dutyRows.length} total duty rows`);
            
            dutyRows.forEach(row => {
                const eventType = row.querySelector('[data-event-type]')?.getAttribute('data-event-type');
                
                console.log(`  📋 Found event type: ${eventType}`);
                
                // "OTHER" events need to be expanded to see actual type (SICK, FLX, etc.)
                // These will be handled specially
                const isOther = eventType === 'OTHER';
                
                // Process PAR (pairings), DH (deadhead), GND (ground transportation), reserve duties (FLX, R1-R5, SICK, LOFT), and training
                const isReserveDuty = ['FLX', 'R1', 'R2', 'R3', 'R4', 'R5', 'SICK', 'LOFT'].includes(eventType);
                const isTraining = eventType === 'TRN' || eventType === 'TRAINING' || (eventType && eventType.includes('TRN'));
                const isDeadhead = eventType === 'DH';
                const isPairing = eventType === 'PAR';
                const isGroundTransport = eventType === 'GND' || eventType === 'GROUND';
                
                // Log unknown event types so we can add them
                if (!isPairing && !isDeadhead && !isReserveDuty && !isTraining && !isGroundTransport && !isOther) {
                    console.log(`  ⚠️ Unknown event type: ${eventType} - skipping`);
                    return;
                }
                
                const detailsDiv = row.querySelector('[data-test-id="duty-row-details"]');
                if (!detailsDiv) return;
                
                // Handle "OTHER" events - these could be SICK, FLX, etc.
                if (isOther) {
                    console.log(`  🔍 Processing OTHER event...`);
                    // Try to extract the actual duty type from the details
                    const allText = detailsDiv.textContent || '';
                    console.log(`  📝 OTHER event text content: "${allText.substring(0, 200)}..."`);
                    let actualType = 'OTHER';
                    
                    // Look for specific keywords
                    if (allText.includes('SICK')) actualType = 'SICK';
                    else if (allText.includes('FLX')) actualType = 'FLX';
                    else if (allText.includes('LOFT')) actualType = 'LOFT';
                    else if (allText.match(/R[1-5]/)) {
                        const match = allText.match(/R[1-5]/);
                        actualType = match[0];
                    }
                    
                    console.log(`  ✅ Detected actual type: ${actualType}`);
                    
                    const timeDivs = detailsDiv.querySelectorAll('div.IADP-jss158');
                    let startTime = '', endTime = '', dutyDate = '';
                    
                    if (timeDivs.length >= 2) {
                        const startText = timeDivs[0].textContent || '';
                        const startMatch = startText.match(/(\d{1,2}[A-Z][a-z]{2})\s+(\d{1,2}:\d{2})/);
                        if (startMatch) {
                            dutyDate = startMatch[1];
                            startTime = startMatch[2];
                        }
                        
                        const endText = timeDivs[timeDivs.length - 1].textContent || '';
                        const endMatch = endText.match(/\d{1,2}:\d{2}/);
                        if (endMatch) {
                            endTime = endMatch[0];
                        }
                    }
                    
                    if (dutyDate) {
                        const dayNum = dutyDate.match(/\d+/)?.[0];
                        const monthAbbr = dutyDate.match(/[A-Z][a-z]{2}/)?.[0];
                        const monthMap = {
                            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                            'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                        };
                        const monthNum = monthMap[monthAbbr] || '01';
                        const isoDate = `${currentYear}-${monthNum}-${dayNum.padStart(2, '0')}`;
                        
                        console.log(`  📅 OTHER (${actualType}): on ${isoDate} ${startTime}-${endTime}`);
                        
                        pairings.push({
                            pairingCode: actualType,
                            rank: actualType,
                            startDate: isoDate,
                            startTime: startTime,
                            startLocation: 'Base',
                            endTime: endTime,
                            endLocation: 'Base',
                            legs: [],
                            hotels: [],
                            isReserveDuty: true,
                            isTraining: false,
                            dutyType: actualType
                        });
                    }
                    return;
                }
                
                // Handle ground transportation
                if (isGroundTransport) {
                    const timeDivs = detailsDiv.querySelectorAll('div.IADP-jss158');
                    let startTime = '', endTime = '', transportDate = '', fromLocation = '', toLocation = '';
                    
                    if (timeDivs.length >= 2) {
                        const startText = timeDivs[0].textContent || '';
                        const startMatch = startText.match(/([A-Z]{3})?\s*(\d{1,2}[A-Z][a-z]{2})\s+(\d{1,2}:\d{2})/);
                        if (startMatch) {
                            fromLocation = startMatch[1] || 'Base';
                            transportDate = startMatch[2];
                            startTime = startMatch[3];
                        }
                        
                        const endText = timeDivs[timeDivs.length - 1].textContent || '';
                        const endMatch = endText.match(/([A-Z]{3})?\s*(\d{1,2}:\d{2})/);
                        if (endMatch) {
                            toLocation = endMatch[1] || 'Base';
                            endTime = endMatch[2];
                        }
                    }
                    
                    // Convert date to ISO format
                    if (transportDate) {
                        const dayNum = transportDate.match(/\d+/)?.[0];
                        const monthAbbr = transportDate.match(/[A-Z][a-z]{2}/)?.[0];
                        const monthMap = {
                            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                            'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                        };
                        const monthNum = monthMap[monthAbbr] || '01';
                        const isoDate = `${currentYear}-${monthNum}-${dayNum.padStart(2, '0')}`;
                        
                        console.log(`  🚗 Ground Transport: ${fromLocation} to ${toLocation} on ${isoDate} ${startTime}-${endTime}`);
                        
                        pairings.push({
                            pairingCode: 'GND',
                            rank: 'GND',
                            startDate: isoDate,
                            startTime: startTime,
                            startLocation: fromLocation,
                            endTime: endTime,
                            endLocation: toLocation,
                            legs: [],
                            hotels: [],
                            isReserveDuty: false,
                            isTraining: false,
                            isGroundTransport: true,
                            dutyType: 'Ground Transportation'
                        });
                    }
                    return;
                }
                
                // Handle reserve duty codes (FLX, R1-R5, SICK) and training
                if (isReserveDuty || isTraining) {
                    console.log(`  📅 Processing ${isTraining ? 'Training' : 'Reserve'} duty: ${eventType}`);
                    const timeDivs = detailsDiv.querySelectorAll('div.IADP-jss158');
                    let startTime = '', endTime = '', dutyDate = '';
                    
                    if (timeDivs.length >= 2) {
                        const startText = timeDivs[0].textContent || '';
                        const startMatch = startText.match(/(\d{1,2}[A-Z][a-z]{2})\s+(\d{1,2}:\d{2})/);
                        if (startMatch) {
                            dutyDate = startMatch[1];
                            startTime = startMatch[2];
                        }
                        
                        const endText = timeDivs[timeDivs.length - 1].textContent || '';
                        const endMatch = endText.match(/\d{1,2}:\d{2}/);
                        if (endMatch) {
                            endTime = endMatch[0];
                        }
                    }
                    
                    // Convert date to ISO format
                    if (dutyDate) {
                        const dayNum = dutyDate.match(/\d+/)?.[0];
                        const monthAbbr = dutyDate.match(/[A-Z][a-z]{2}/)?.[0];
                        const monthMap = {
                            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                            'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                        };
                        const monthNum = monthMap[monthAbbr] || '01';
                        const isoDate = `${currentYear}-${monthNum}-${dayNum.padStart(2, '0')}`;
                        
                        console.log(`  📅 ${isTraining ? 'Training' : 'Reserve'} Duty: ${eventType} on ${isoDate} ${startTime}-${endTime}`);
                        
                        pairings.push({
                            pairingCode: eventType,
                            rank: eventType,
                            startDate: isoDate,
                            startTime: startTime,
                            startLocation: isTraining ? 'Training' : 'Base',
                            endTime: endTime,
                            endLocation: isTraining ? 'Training' : 'Base',
                            legs: [],
                            hotels: [],
                            isReserveDuty: isReserveDuty,
                            isTraining: isTraining,
                            dutyType: eventType
                        });
                    }
                    return;
                }
                
                const spans = detailsDiv.querySelectorAll('div.IADP-jss155');
                if (spans.length < 1) return;
                
                // First span has pairing code like "C6223B/08Dec    Rank: FO" or DH flight info
                const pairingText = spans[0].textContent || '';
                
                // Handle DH (deadhead) flights differently
                if (isDeadhead) {
                    console.log(`  🚶 Processing Deadhead flight...`);
                    const timeDivs = detailsDiv.querySelectorAll('div.IADP-jss158');
                    console.log(`  📍 Found ${timeDivs.length} time divs in deadhead details`);
                    
                    // Log all text content for debugging
                    if (timeDivs.length > 0) {
                        console.log(`  📝 Deadhead text content:`);
                        timeDivs.forEach((div, i) => {
                            console.log(`    [${i}]: "${div.textContent}"`);
                        });
                    }
                    
                    const hotels = [];
                    
                    if (timeDivs.length >= 2) {
                        const depText = timeDivs[0].textContent || '';
                        const depMatch = depText.match(/([A-Z]{3})\s+(\d{1,2}[A-Z][a-z]{2})\s+(\d{1,2}:\d{2})/);
                        const arrText = timeDivs[1].textContent || '';
                        const arrMatch = arrText.match(/([A-Z]{3})\s+(\d{1,2}[A-Z][a-z]{2})\s+(\d{1,2}:\d{2})/);
                        
                        console.log(`  🛫 Departure match: ${depMatch ? `${depMatch[1]} ${depMatch[2]} ${depMatch[3]}` : 'FAILED'}`);
                        console.log(`  🛬 Arrival match: ${arrMatch ? `${arrMatch[1]} ${arrMatch[2]} ${arrMatch[3]}` : 'FAILED'}`);
                        
                        // Check for hotel after DH flight
                        const allSubEvents = row.querySelectorAll('div[data-test-id="sub-event"]');
                        allSubEvents.forEach(subEvent => {
                            const subEventType = subEvent.querySelector('div.IADP-jss157')?.textContent || '';
                            if (subEventType === 'HOT') {
                                const hotelDetails = subEvent.querySelector('div[data-test-id="sub-event-details"]');
                                if (hotelDetails) {
                                    const hotelSpans = hotelDetails.querySelectorAll('div.IADP-jss158');
                                    if (hotelSpans.length > 0) {
                                        const hotelText = hotelSpans[0].textContent || '';
                                        const hotelMatch = hotelText.match(/([A-Z]{3})\s+(.+)/);
                                        if (hotelMatch) {
                                            let address = '', phone = '';
                                            hotelSpans.forEach((span, idx) => {
                                                if (idx > 0) {
                                                    const text = span.textContent || '';
                                                    const phoneMatch = text.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/);
                                                    if (phoneMatch) phone = phoneMatch[0];
                                                    if (text.match(/\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/)) address = text.trim();
                                                }
                                            });
                                            
                                            // Create base hotel object
                                            const baseHotel = {
                                                location: hotelMatch[1],
                                                name: hotelMatch[2].trim(),
                                                address: address || null,
                                                phone: phone || null
                                            };
                                            
                                            // Add base hotel (will enrich later outside page.evaluate)
                                            hotels.push(baseHotel);
                                        }
                                    }
                                }
                            }
                        });
                        
                        if (depMatch && arrMatch) {
                            const dayNum = depMatch[2].match(/\d+/)?.[0];
                            const monthAbbr = depMatch[2].match(/[A-Z][a-z]{2}/)?.[0];
                            const monthMap = {
                                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                                'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                            };
                            const monthNum = monthMap[monthAbbr] || '01';
                            
                            // Handle year transitions (e.g., December to January)
                            let depYear = currentYear;
                            if (currentMonth === 'December' && monthAbbr === 'Jan') {
                                depYear = currentYear + 1;
                            }
                            
                            const isoDate = `${depYear}-${monthNum}-${dayNum.padStart(2, '0')}`;
                            
                            // Extract flight number from pairingText
                            const flightMatch = pairingText.match(/([A-Z0-9]{2}\d+)/);
                            const flightNumber = flightMatch ? flightMatch[1] : 'DH';
                            
                            console.log(`  ✈️ DH Flight: ${flightNumber} from ${depMatch[1]} to ${arrMatch[1]} on ${isoDate} - ${hotels.length} hotel(s)`);
                            
                            pairings.push({
                                pairingCode: `DH-${flightNumber}`,
                                rank: 'DH',
                                startDate: isoDate,
                                startTime: depMatch[3],
                                startLocation: depMatch[1],
                                endTime: arrMatch[3],
                                endLocation: arrMatch[1],
                                legs: [{
                                    flightNumber: flightNumber,
                                    aircraftType: 'Deadhead',
                                    tailNumber: 'DH',
                                    departure: { airport: depMatch[1], date: depMatch[2], time: depMatch[3] },
                                    arrival: { airport: arrMatch[1], date: arrMatch[2], time: arrMatch[3] },
                                    isCodeshare: false,
                                    operatingAirline: 'Deadhead',
                                    isDeadhead: true,
                                    crewMembers: []
                                }],
                                hotels: hotels
                            });
                        } else {
                            console.log(`  ❌ Failed to extract deadhead flight details - dep: ${!!depMatch}, arr: ${!!arrMatch}`);
                        }
                    } else {
                        console.log(`  ❌ Insufficient time divs for deadhead (need 2, found ${timeDivs.length})`);
                    }
                    return;
                }
                
                const pairingMatch = pairingText.match(/([A-Z]\d+[A-Z]?)\/(\d{1,2}[A-Z][a-z]{2})/);
                
                if (!pairingMatch) return;
                
                const pairingCode = pairingMatch[1];
                const startDateStr = pairingMatch[2]; // Like "08Dec"
                
                // Convert date to ISO format
                const dayNum = startDateStr.match(/\d+/)[0];
                const monthAbbr = startDateStr.match(/[A-Z][a-z]{2}/)[0];
                const monthMap = {
                    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                    'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                };
                const monthNum = monthMap[monthAbbr] || '01';
                const startDate = `${currentYear}-${monthNum}-${dayNum.padStart(2, '0')}`;
                
                // Get rank if present
                const rankMatch = pairingText.match(/Rank:\s*(\w+)/);
                const rank = rankMatch ? rankMatch[1] : 'FO';
                
                // Get start/end times from time divs
                const timeDivs = detailsDiv.querySelectorAll('div.IADP-jss158');
                let startTime = '', endTime = '', startLocation = '', endLocation = '';
                
                if (timeDivs.length >= 2) {
                    // First div = start
                    const startText = timeDivs[0].textContent || '';
                    const startMatch = startText.match(/([A-Z]{3})\s+(\d{1,2}[A-Z][a-z]{2})\s+(\d{1,2}:\d{2})/);
                    if (startMatch) {
                        startLocation = startMatch[1];
                        startTime = startMatch[3];
                    }
                    
                    // Last div = end
                    const endText = timeDivs[timeDivs.length - 1].textContent || '';
                    const endMatch = endText.match(/([A-Z]{3})\s+(\d{1,2}[A-Z][a-z]{2})\s+(\d{1,2}:\d{2})/);
                    if (endMatch) {
                        endLocation = endMatch[1];
                        const endDateStr = endMatch[2];
                        endTime = endMatch[3];
                    }
                }
                
                // Get all sub-events (legs, hotels, check-in/out)
                const legs = [];
                const hotels = [];
                
                // Find collapse div that contains sub-events
                const collapseDiv = row.querySelector('.IADP-MuiCollapse-root');
                if (collapseDiv) {
                    const subRows = collapseDiv.querySelectorAll('div[data-test-id="duty-row"]');
                    
                    subRows.forEach(subRow => {
                        const subEventType = subRow.querySelector('[data-event-type]')?.getAttribute('data-event-type');
                        const subDetails = subRow.querySelector('[data-test-id="duty-row-details"]');
                        
                        if (!subDetails) return;
                        
                        if (subEventType === 'LEG') {
                            // Flight leg
                            const legSpans = subDetails.querySelectorAll('div.IADP-jss155');
                            if (legSpans.length < 1) return;
                            
                            // Flight number and aircraft like "GB5112    762    N745AX" or "AA1234    321" (codeshare)
                            const flightText = legSpans[0].textContent || '';
                            const parts = flightText.split(/\s+/).filter(p => p.length > 0);
                            const flightNumber = parts[0] || '';
                            const aircraftCode = parts[1] || '';
                            const tailNumber = parts[2] || ''; // May be empty for codeshare flights
                            
                            // Detect if this is a codeshare flight (other airline)
                            const isCodeshare = flightNumber && !/^(GB|G5|1I)/i.test(flightNumber);
                            const airlineCode = flightNumber.match(/^[A-Z0-9]{2}/)?.[0] || 'GB';
                            
                            // Map airline codes to names
                            const airlineNames = {
                                'GB': 'ABX Air',
                                'G5': 'ABX Air',
                                '1I': 'ATI',
                                'AA': 'American Airlines',
                                'DL': 'Delta Air Lines',
                                'UA': 'United Airlines',
                                'WN': 'Southwest Airlines',
                                'B6': 'JetBlue Airways',
                                'NK': 'Spirit Airlines',
                                'F9': 'Frontier Airlines',
                                'AS': 'Alaska Airlines',
                                'HA': 'Hawaiian Airlines',
                                'SY': 'Sun Country Airlines',
                                'G4': 'Allegiant Air',
                                'AC': 'Air Canada',
                                'WS': 'WestJet',
                                'AM': 'Aeroméxico',
                                'CM': 'Copa Airlines',
                                'AV': 'Avianca',
                                'LA': 'LATAM Airlines',
                                'BA': 'British Airways',
                                'VS': 'Virgin Atlantic',
                                'AF': 'Air France',
                                'KL': 'KLM',
                                'LH': 'Lufthansa',
                                'IB': 'Iberia',
                                'AZ': 'ITA Airways',
                                'LX': 'Swiss International',
                                'OS': 'Austrian Airlines',
                                'SN': 'Brussels Airlines',
                                'TP': 'TAP Air Portugal',
                                'EI': 'Aer Lingus',
                                'SK': 'SAS Scandinavian',
                                'AY': 'Finnair',
                                'KE': 'Korean Air',
                                'NH': 'ANA',
                                'JL': 'Japan Airlines',
                                'SQ': 'Singapore Airlines',
                                'CX': 'Cathay Pacific',
                                'TG': 'Thai Airways',
                                'QF': 'Qantas',
                                'NZ': 'Air New Zealand',
                                'EK': 'Emirates',
                                'QR': 'Qatar Airways',
                                'EY': 'Etihad Airways',
                                'TK': 'Turkish Airlines',
                                'SV': 'Saudia',
                                'MS': 'EgyptAir'
                            };
                            
                            const operatingAirline = airlineNames[airlineCode] || airlineCode;
                            
                            // Convert aircraft codes to detailed types
                            const aircraftTypeMap = {
                                '762': 'B767-200',
                                '763': 'B767-300',
                                '764': 'B767-400',
                                '757': 'B757-200',
                                '767': 'B767-300',
                                '777': 'B777-200',
                                '321': 'A321',
                                '320': 'A320',
                                '319': 'A319',
                                '738': 'B737-800',
                                '739': 'B737-900'
                            };
                            const aircraftType = aircraftTypeMap[aircraftCode] || aircraftCode || 'Unknown';
                            const aircraftDisplay = isCodeshare ? `${aircraftType} (${operatingAirline})` : aircraftType;
                            
                            // Get departure/arrival
                            const legTimeDivs = subDetails.querySelectorAll('div.IADP-jss158');
                            let depAirport = '', depDate = '', depTime = '';
                            let arrAirport = '', arrDate = '', arrTime = '';
                            
                            if (legTimeDivs.length >= 2) {
                                const depText = legTimeDivs[0].textContent || '';
                                const depMatch = depText.match(/([A-Z]{3})\s+(\d{1,2}[A-Z][a-z]{2})\s+(\d{1,2}:\d{2})/);
                                if (depMatch) {
                                    depAirport = depMatch[1];
                                    depDate = depMatch[2];
                                    depTime = depMatch[3];
                                }
                                
                                const arrText = legTimeDivs[1].textContent || '';
                                const arrMatch = arrText.match(/([A-Z]{3})\s+(\d{1,2}[A-Z][a-z]{2})\s+(\d{1,2}:\d{2})/);
                                if (arrMatch) {
                                    arrAirport = arrMatch[1];
                                    arrDate = arrMatch[2];
                                    arrTime = arrMatch[3];
                                }
                            }
                            
                            // Extract crew member information
                            // Note: Crew dropdown clicking will be handled separately after page.evaluate
                            // For now, just mark where crew data should go
                            const crewMembers = [];
                            
                            // Try to extract actual times (for completed flights)
                            // Look for additional time divs or text that might contain "Actual" times
                            let actualDepTime = null, actualArrTime = null;
                            
                            try {
                                // Search for text containing "Actual" or look for extra time fields
                                const allDivs = subDetails.querySelectorAll('div');
                                allDivs.forEach(div => {
                                    const text = div.textContent || '';
                                    // Look for patterns like "Actual: 14:25" or just additional times
                                    if (text.includes('Actual') || text.match(/\d{1,2}:\d{2}/)) {
                                        const timeMatch = text.match(/(\d{1,2}:\d{2})/);
                                        if (timeMatch && !actualDepTime) {
                                            actualDepTime = timeMatch[1];
                                        } else if (timeMatch && !actualArrTime) {
                                            actualArrTime = timeMatch[1];
                                        }
                                    }
                                });
                                
                                // If we found times different from scheduled, use them
                                if (actualDepTime && actualDepTime !== depTime) {
                                    // Valid actual departure found
                                } else {
                                    actualDepTime = null;
                                }
                                
                                if (actualArrTime && actualArrTime !== arrTime) {
                                    // Valid actual arrival found
                                } else {
                                    actualArrTime = null;
                                }
                            } catch (error) {
                                console.log('Could not extract actual times:', error);
                            }
                            
                            legs.push({
                                flightNumber,
                                aircraftType: aircraftDisplay,
                                tailNumber: tailNumber || (isCodeshare ? 'Codeshare' : ''),
                                departure: { airport: depAirport, date: depDate, time: depTime },
                                arrival: { airport: arrAirport, date: arrDate, time: arrTime },
                                actualDeparture: actualDepTime,
                                actualArrival: actualArrTime,
                                isCodeshare,
                                operatingAirline,
                                crewMembers
                            });
                        } else if (subEventType === 'HOT') {
                            // Hotel - store basic info, will click details button later
                            const hotelSpans = subDetails.querySelectorAll('div.IADP-jss158');
                            if (hotelSpans.length > 0) {
                                const hotelText = hotelSpans[0].textContent || '';
                                const hotelMatch = hotelText.match(/([A-Z]{3})\s+(.+)/);
                                
                                if (hotelMatch) {
                                    const location = hotelMatch[1];
                                    const name = hotelMatch[2].trim();
                                    
                                    // Store hotel with index for later detail extraction
                                    hotels.push({
                                        location: location,
                                        name: name,
                                        subDetailsIndex: subDetails.getAttribute('data-sub-index') || hotels.length,
                                        address: null,
                                        phone: null,
                                        date: null,
                                        pickupTime: null,
                                        transferTime: null,
                                        transportType: null,
                                        remark: null
                                    });
                                }
                            }
                        }
                    });
                }
                
                pairings.push({
                    pairingCode,
                    rank,
                    startDate,
                    startTime,
                    startLocation,
                    endTime,
                    endLocation,
                    legs,
                    hotels
                });
            });
            
            return {
                flights: pairings,
                totalRows: dutyRows.length,
                pageTitle: document.title,
                url: window.location.href
            };
        });
        
        console.log(`📊 Scraped ${scheduleData.flights.length} pairings from ${scheduleData.totalRows} duty rows`);
        
        // Scrape remarks/notifications from the News tab
        console.log('📬 Extracting remarks and notifications from News tab...');
        
        const allNewsItems = [];
        
        // Try to click on News/Messages tab if it exists
        try {
            const newsTabClicked = await page.evaluate(() => {
                // Look for News tab button
                const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"], [role="tab"]'));
                const newsButton = buttons.find(btn => {
                    const text = (btn.textContent || '').toLowerCase();
                    return text.includes('news') || text.includes('message') || text.includes('notification');
                });
                
                if (newsButton) {
                    newsButton.click();
                    return true;
                }
                return false;
            });
            
            if (newsTabClicked) {
                console.log('✅ Clicked News tab, waiting for content...');
                await sleep(3000);
                
                // Find all sub-tabs within the News section
                const subTabs = await page.evaluate(() => {
                    const tabButtons = Array.from(document.querySelectorAll('[role="tab"], button[class*="tab"], .tab-button, [class*="Tab"]'));
                    return tabButtons.map((btn, idx) => ({
                        index: idx,
                        text: btn.textContent.trim(),
                        selector: `[role="tab"]:nth-of-type(${idx + 1})`
                    })).filter(tab => tab.text.length > 0 && tab.text.length < 50);
                });
                
                console.log(`📑 Found ${subTabs.length} sub-tabs in News section`);
                
                // Click each sub-tab and scrape content
                for (const tab of subTabs) {
                    try {
                        console.log(`📂 Clicking sub-tab: "${tab.text}"...`);
                        
                        await page.evaluate((tabText) => {
                            const tabs = Array.from(document.querySelectorAll('[role="tab"], button[class*="tab"]'));
                            const targetTab = tabs.find(t => t.textContent.trim() === tabText);
                            if (targetTab) {
                                targetTab.click();
                                return true;
                            }
                            return false;
                        }, tab.text);
                        
                        await sleep(2000);
                        
                        // Find all individual notification items in this tab
                        const notificationItems = await page.evaluate(() => {
                            const items = [];
                            const selectors = [
                                '[data-test-id^="news-item"]',
                                '[data-test-id*="notification-item"]',
                                '[class*="news-item"]',
                                '[class*="notification-item"]',
                                '[class*="message-item"]',
                                'li[class*="item"]',
                                'div[class*="card"]',
                                '[role="listitem"]'
                            ];
                            
                            for (const selector of selectors) {
                                const elements = document.querySelectorAll(selector);
                                if (elements.length > 0) {
                                    elements.forEach((elem, idx) => {
                                        items.push({
                                            index: idx,
                                            selector: selector,
                                            preview: elem.textContent.trim().substring(0, 100)
                                        });
                                    });
                                    break;
                                }
                            }
                            
                            return items;
                        });
                        
                        console.log(`📋 Found ${notificationItems.length} notification items in "${tab.text}"`);
                        
                        // Click into each notification and extract full content
                        for (const item of notificationItems.slice(0, 20)) { // Limit to 20 items per tab
                            try {
                                console.log(`📰 Opening notification ${item.index + 1}...`);
                                
                                // Click the notification item
                                const clicked = await page.evaluate((selector, idx) => {
                                    const items = document.querySelectorAll(selector);
                                    if (items[idx]) {
                                        items[idx].click();
                                        return true;
                                    }
                                    return false;
                                }, item.selector, item.index);
                                
                                if (!clicked) {
                                    console.log(`⚠️ Could not click notification ${item.index + 1}`);
                                    continue;
                                }
                                
                                await sleep(1500);
                                
                                // Extract full content from opened notification
                                const fullContent = await page.evaluate((tabName) => {
                                    // Look for modal, dialog, or expanded content area
                                    const contentSelectors = [
                                        '[role="dialog"]',
                                        '[class*="modal"]',
                                        '[class*="dialog"]',
                                        '[class*="detail"]',
                                        '[class*="expanded"]',
                                        '[data-test-id*="detail"]',
                                        '[data-test-id*="content"]'
                                    ];
                                    
                                    let contentArea = null;
                                    for (const sel of contentSelectors) {
                                        const elem = document.querySelector(sel);
                                        if (elem && elem.offsetHeight > 0) {
                                            contentArea = elem;
                                            break;
                                        }
                                    }
                                    
                                    if (!contentArea) {
                                        contentArea = document.body;
                                    }
                                    
                                    // Extract structured content
                                    const title = contentArea.querySelector('h1, h2, h3, [class*="title"], [data-test-id*="title"]')?.textContent.trim() || '';
                                    const date = contentArea.querySelector('[class*="date"], time, [data-test-id*="date"]')?.textContent.trim() || '';
                                    const body = contentArea.querySelector('[class*="body"], [class*="content"], p, [data-test-id*="body"]')?.textContent.trim() || '';
                                    
                                    // Get all text if structured extraction fails
                                    const fullText = !title && !body ? contentArea.textContent.trim() : '';
                                    
                                    return {
                                        title: title || 'Notification',
                                        date: date || new Date().toISOString(),
                                        body: body || fullText,
                                        message: [title, body || fullText].filter(Boolean).join(' - '),
                                        category: tabName,
                                        type: 'news',
                                        read: false
                                    };
                                }, tab.text);
                                
                                if (fullContent.message && fullContent.message.length > 10) {
                                    allNewsItems.push(fullContent);
                                    console.log(`✅ Extracted: "${fullContent.title.substring(0, 50)}..."`);
                                }
                                
                                // Close the notification (look for close button)
                                await page.evaluate(() => {
                                    const closeButtons = document.querySelectorAll('[aria-label*="close"], [class*="close"], button[class*="Close"]');
                                    if (closeButtons.length > 0) {
                                        closeButtons[0].click();
                                    }
                                    // Also try pressing Escape
                                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                                });
                                
                                await sleep(500);
                                
                            } catch (itemError) {
                                console.log(`⚠️ Error extracting notification ${item.index + 1}:`, itemError.message);
                            }
                        }
                        
                        console.log(`✅ Extracted ${notificationItems.length} items from "${tab.text}"`);
                        
                    } catch (tabError) {
                        console.log(`⚠️ Error scraping sub-tab "${tab.text}":`, tabError.message);
                    }
                }
            } else {
                console.log('⚠️ News tab not found, checking current page...');
            }
        } catch (e) {
            console.log('⚠️ Could not click News tab:', e.message);
        }
        
        // Merge all news items from sub-tabs with fallback scraping
        const remarks = await page.evaluate(() => {
            const remarksList = [];
            
            // Strategy 1: Look for news items using data-test-id
            const newsItems = document.querySelectorAll('[data-test-id^="news-item"], [data-test-id*="notification"], [data-test-id*="message"]');
            
            newsItems.forEach(item => {
                const newsContainer = item.closest('[class*="news"]') || item.closest('[class*="notification"]') || item.parentElement;
                
                // Extract title/message
                const titleElem = newsContainer.querySelector('[data-test-id="news-item-title"]') || 
                                newsContainer.querySelector('[data-test-id*="title"]') ||
                                newsContainer.querySelector('[class*="title"]') ||
                                newsContainer.querySelector('h3, h4, h5, h6, strong, b');
                const title = titleElem ? titleElem.textContent.trim() : '';
                
                // Extract date
                const dateElem = newsContainer.querySelector('[data-test-id="news-item-subtitle"]') ||
                               newsContainer.querySelector('[data-test-id*="date"]') ||
                               newsContainer.querySelector('[class*="date"]') ||
                               newsContainer.querySelector('time');
                const date = dateElem ? dateElem.textContent.trim() : '';
                
                // Extract body/content
                const bodyElem = newsContainer.querySelector('[data-test-id="news-item-body"]') ||
                               newsContainer.querySelector('[data-test-id*="body"]') ||
                               newsContainer.querySelector('[data-test-id*="content"]') ||
                               newsContainer.querySelector('[class*="body"]') ||
                               newsContainer.querySelector('[class*="content"]') ||
                               newsContainer.querySelector('p, div[class*="text"]');
                const body = bodyElem ? bodyElem.textContent.trim() : '';
                
                // Get full text if nothing found
                const fullText = !title && !body ? newsContainer.textContent.trim() : '';
                
                // Combine for message
                const message = fullText || [title, body].filter(Boolean).join(' - ');
                
                if (message && message.length > 5) {
                    remarksList.push({
                        message: message,
                        date: date || new Date().toISOString(),
                        type: 'news',
                        read: false,
                        title: title || '',
                        body: body || ''
                    });
                }
            });
            
            // Strategy 2: Look for any notification/alert boxes
            if (remarksList.length === 0) {
                const alertBoxes = document.querySelectorAll('[role="alert"], [class*="alert"], [class*="notification"], .news-item, .message-item');
                alertBoxes.forEach(box => {
                    const text = box.textContent.trim();
                    if (text && text.length > 10) {
                        remarksList.push({
                            message: text,
                            date: new Date().toISOString(),
                            type: 'notification',
                            read: false
                        });
                    }
                });
            }
            
            // Strategy 3: Look in lists or tables
            if (remarksList.length === 0) {
                const rows = document.querySelectorAll('tr, li, [class*="list-item"]');
                rows.forEach(row => {
                    // Skip if it looks like a calendar row
                    if (row.querySelector('[class*="duty"]') || row.querySelector('[class*="flight"]')) {
                        return;
                    }
                    
                    const text = row.textContent.trim();
                    // Look for typical notification/message patterns
                    if (text && text.length > 15 && (
                        text.match(/\d{1,2}\/\d{1,2}/) || // dates
                        text.toLowerCase().includes('schedule') ||
                        text.toLowerCase().includes('change') ||
                        text.toLowerCase().includes('update') ||
                        text.toLowerCase().includes('notice') ||
                        text.toLowerCase().includes('reminder')
                    )) {
                        remarksList.push({
                            message: text,
                            date: new Date().toISOString(),
                            type: 'notice',
                            read: false
                        });
                    }
                });
            }
            
            return remarksList;
        });
        
        // Combine sub-tab items with fallback scraped items
        const combinedRemarks = [...allNewsItems, ...remarks];
        
        // Remove duplicates based on message content
        const uniqueRemarks = [];
        const seen = new Set();
        
        for (const remark of combinedRemarks) {
            const key = remark.message.substring(0, 100); // Use first 100 chars as key
            if (!seen.has(key)) {
                seen.add(key);
                uniqueRemarks.push(remark);
            }
        }
        
        scheduleData.remarks = uniqueRemarks;
        console.log(`📬 Found ${uniqueRemarks.length} total news/notifications from crew portal (${allNewsItems.length} from sub-tabs, ${remarks.length} from fallback)`);

        
        // Extract pilot profile information (only on first login)
        let pilotProfile = null;
        
        if (firstLogin) {
            console.log('👤 Extracting pilot profile information (first login)...');
            
            pilotProfile = await page.evaluate(() => {
            const profile = {
                name: '',
                employeeId: '',
                rank: '',
                base: '',
                email: '',
                phone: ''
            };
            
            // Look for profile/name elements
            const nameElements = document.querySelectorAll('[class*="profile"], [class*="name"], [data-test-id*="profile"]');
            
            nameElements.forEach(elem => {
                const text = (elem.textContent || '').trim();
                
                // Look for name patterns
                const nameMatch = text.match(/([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
                if (nameMatch && !profile.name) {
                    profile.name = nameMatch[1];
                }
                
                // Look for employee ID
                const idMatch = text.match(/(?:Employee|ID|#)[\s:]*(\d{5,7})/i);
                if (idMatch && !profile.employeeId) {
                    profile.employeeId = idMatch[1];
                }
                
                // Look for rank
                const rankMatch = text.match(/(?:Rank|Position)[\s:]*(Captain|First Officer|FO|CA)/i);
                if (rankMatch && !profile.rank) {
                    profile.rank = rankMatch[1];
                }
                
                // Look for base
                const baseMatch = text.match(/(?:Base|Home)[\s:]*([A-Z]{3})/i);
                if (baseMatch && !profile.base) {
                    profile.base = baseMatch[1];
                }
            });
            
            return profile;
        });
        
        scheduleData.pilotProfile = pilotProfile;
        console.log(`👤 Pilot: ${pilotProfile.name || 'Unknown'} (${employeeId})`);
        } else {
            console.log('⏭️ Skipping pilot profile scraping (subsequent login)');
            scheduleData.pilotProfile = null;
        }
        
        // Extract hotel details by clicking details buttons
        console.log('🏨 Extracting hotel details...');
        let hotelDetailsExtracted = 0;
        
        for (let flight of scheduleData.flights) {
            if (flight.hotels && flight.hotels.length > 0) {
                for (let hotel of flight.hotels) {
                    try {
                        // Click details button for this hotel
                        const detailsClicked = await page.evaluate(() => {
                            const detailsButtons = document.querySelectorAll('[data-test-id="details-page-button"]');
                            // Find the button associated with this hotel (would need better targeting)
                            for (let btn of detailsButtons) {
                                btn.click();
                                return true;
                            }
                            return false;
                        });
                        
                        if (detailsClicked) {
                            await sleep(1500);
                            
                            // Extract hotel details using data-test-id selectors
                            const hotelDetails = await page.evaluate(() => {
                                const details = {};
                                const hotelItems = document.querySelectorAll('[data-test-id="hotel-key"]');
                                
                                hotelItems.forEach(keyElem => {
                                    const key = keyElem.textContent.trim();
                                    const valueElem = keyElem.parentElement.querySelector('[data-test-id="hotel-value"]');
                                    const value = valueElem ? valueElem.textContent.trim() : '';
                                    
                                    if (key && value) {
                                        details[key] = value;
                                    }
                                });
                                
                                return details;
                            });
                            
                            // Update hotel object with extracted details
                            if (hotelDetails['Date']) hotel.date = hotelDetails['Date'];
                            if (hotelDetails['Hotel name']) hotel.name = hotelDetails['Hotel name'];
                            if (hotelDetails['Address']) hotel.address = hotelDetails['Address'];
                            if (hotelDetails['Hotel contacts']) hotel.phone = hotelDetails['Hotel contacts'];
                            if (hotelDetails['Pickup time']) hotel.pickupTime = hotelDetails['Pickup time'];
                            if (hotelDetails['Transfer time']) hotel.transferTime = hotelDetails['Transfer time'];
                            if (hotelDetails['Transport company type']) hotel.transportType = hotelDetails['Transport company type'];
                            if (hotelDetails['Remark']) hotel.remark = hotelDetails['Remark'];
                            
                            hotelDetailsExtracted++;
                            
                            // Close the details modal (press Escape or click back)
                            await page.keyboard.press('Escape');
                            await sleep(500);
                        }
                    } catch (e) {
                        console.log(`   ⚠️ Could not extract hotel details: ${e.message}`);
                    }
                }
            }
        }
        
        console.log(`✅ Extracted details for ${hotelDetailsExtracted} hotels`);
        
        // Extract crew member information from expanded duty rows
        console.log('👥 Extracting crew information from duty rows...');
        
        // Only extract crew for actual pairings (PAR), not deadheads or reserve duties
        const pairingIndices = [];
        scheduleData.flights.forEach((flight, i) => {
            if (!flight.isDeadhead && !flight.isReserveDuty && !flight.isTraining && !flight.isGroundTransport) {
                pairingIndices.push(i);
            }
        });
        
        console.log(`Found ${pairingIndices.length} pairings to extract crew from`);
        
        for (let idx of pairingIndices) {
            try {
                // Find all duty rows using the correct selector
                const dutyRows = await page.$$('div[data-test-id="duty-row"]');
                
                if (dutyRows[idx]) {
                    console.log(`   Clicking pairing ${idx + 1}...`);
                    // Click on the duty row to expand it
                    await dutyRows[idx].click();
                    await sleep(1500); // Wait for pairing to expand
                    
                    // Now look for "CREW MEMBERS ON THIS LEG" section within each leg of this pairing
                    const crewData = await page.evaluate((rowIndex) => {
                        const allCrew = [];
                        const dutyRows = document.querySelectorAll('div[data-test-id="duty-row"]');
                        const pairingRow = dutyRows[rowIndex];
                        
                        if (!pairingRow) {
                            return allCrew;
                        }
                        
                        // Find the collapse container that holds the legs
                        const collapseDiv = pairingRow.querySelector('.IADP-MuiCollapse-root');
                        if (!collapseDiv) {
                            return allCrew;
                        }
                        
                        // Find all leg sub-rows within this pairing
                        const legRows = collapseDiv.querySelectorAll('div[data-test-id="duty-row"]');
                        
                        legRows.forEach((legRow, legIdx) => {
                            const legEventType = legRow.querySelector('[data-event-type]')?.getAttribute('data-event-type');
                            
                            // Only process actual flight legs (LEG event type)
                            if (legEventType !== 'LEG') return;
                            
                            const legDetails = legRow.querySelector('[data-test-id="duty-row-details"]');
                            if (!legDetails) return;
                            
                            // Look for crew members accordion using data-test-id
                            const crewLabel = legDetails.querySelector('[data-test-id="crew-members-label"]');
                            
                            if (!crewLabel) {
                                return;
                            }
                            
                            // Find the accordion button to expand crew section
                            const crewAccordion = crewLabel.closest('.IADP-MuiAccordionSummary-root');
                            if (crewAccordion) {
                                const isExpanded = crewAccordion.classList.contains('Mui-expanded');
                                if (!isExpanded) {
                                    try {
                                        crewAccordion.click();
                                    } catch (e) {
                                        console.log(`Error clicking crew accordion: ${e.message}`);
                                    }
                                }
                            }
                            
                            // Extract crew information using data-test-id selectors
                            const crewForLeg = [];
                            const crewCards = legDetails.querySelectorAll('[data-test-id="crew-member-card"]');
                            
                            crewCards.forEach(card => {
                                // Extract name
                                const nameElem = card.querySelector('[data-test-id="crew-member-name"]');
                                let name = nameElem ? nameElem.textContent.trim() : '';
                                
                                // Check if this is a deadhead crew member (name starts with "DH ")
                                const isDeadhead = name.startsWith('DH ');
                                if (isDeadhead) {
                                    name = name.substring(3).trim(); // Remove "DH " prefix
                                }
                                
                                if (!name) return;
                                
                                // Extract details (Rank, HB, Seniority, Crew Id, Phone)
                                const detailsElem = card.querySelector('[data-test-id="crew-member-details"]');
                                let rank = '';
                                let homeBase = '';
                                let seniority = '';
                                let employeeId = '';
                                let phone = '';
                                
                                if (detailsElem) {
                                    const spans = detailsElem.querySelectorAll('span');
                                    spans.forEach(span => {
                                        const text = span.textContent || '';
                                        if (text.includes('Rank:')) {
                                            rank = text.replace('Rank:', '').trim();
                                        } else if (text.includes('HB:')) {
                                            homeBase = text.replace('HB:', '').trim();
                                        } else if (text.includes('Seniority:')) {
                                            seniority = text.replace('Seniority:', '').trim();
                                        } else if (text.includes('Crew Id:')) {
                                            employeeId = text.replace('Crew Id:', '').trim();
                                        } else if (text.includes('Phone:')) {
                                            phone = text.replace('Phone:', '').trim();
                                        }
                                    });
                                }
                                
                                // Extract previous and next event
                                const prevEventElem = card.querySelector('[data-test-id="crew-member-previous-event"]');
                                const nextEventElem = card.querySelector('[data-test-id="crew-member-next-event"]');
                                const previousEvent = prevEventElem ? prevEventElem.textContent.trim() : '';
                                const nextEvent = nextEventElem ? nextEventElem.textContent.trim() : '';
                                
                                // Convert rank abbreviations to full role names
                                let role = rank;
                                if (rank === 'CA') role = 'Captain';
                                else if (rank === 'FO') role = 'First Officer';
                                
                                crewForLeg.push({
                                    name: name,
                                    role: role,
                                    employeeId: employeeId,
                                    phone: phone,
                                    base: homeBase,
                                    seniority: seniority,
                                    isDeadhead: isDeadhead,
                                    previousEvent: previousEvent,
                                    nextEvent: nextEvent
                                });
                            });
                            
                            // Store crew for this leg
                            if (crewForLeg.length > 0) {
                                allCrew.push({ legIndex: legIdx, crew: crewForLeg });
                            }
                        });
                        
                        return allCrew;
                    }, idx);
                    
                    console.log(`   Pairing ${idx + 1}: Found crew for ${crewData.length} legs`);
                    
                    // Update crew members for the corresponding legs in this pairing
                    if (crewData.length > 0 && scheduleData.flights[idx].legs) {
                        crewData.forEach(({ legIndex, crew }) => {
                            if (scheduleData.flights[idx].legs[legIndex]) {
                                scheduleData.flights[idx].legs[legIndex].crewMembers = crew;
                                crew.forEach(member => {
                                    console.log(`      Leg ${legIndex + 1} - ${member.role}: ${member.name} ${member.employeeId ? `(${member.employeeId})` : ''} ${member.phone || ''}`);
                                });
                            }
                        });
                    }
                    
                    // Collapse the duty row
                    await dutyRows[idx].click();
                    await sleep(300);
                }
            } catch (e) {
                console.log(`   ⚠️ Could not get crew for pairing ${idx + 1}: ${e.message}`);
            }
        }
        
        console.log('✅ Crew extraction completed');
        
        await browser.close();
        
        return {
            success: true,
            authenticated: true,
            message: `Real authentication successful for ${employeeId}`,
            data: {
                employeeId,
                airline: airline || 'ABX',
                loginTime: new Date().toISOString(),
                scheduleData: scheduleData || { flights: [] },
                realAuth: true
            }
        };
        
    } catch (error) {
        if (browser) await browser.close();
        console.error('❌ Authentication error:', error.message);
        throw error;
    }
};

app.post('/api/authenticate', async (req, res) => {
    const { employeeId, password, airline, month, year } = req.body;
    console.log(`🔐 REAL AUTH: ${airline || 'ABX'} pilot ${employeeId}`);
    
    if (!employeeId || !password) {
        return res.status(400).json({
            success: false,
            error: 'Employee ID and password required'
        });
    }
    
    try {
        const result = await authenticateUser(employeeId, password, airline, month, year);
        res.json(result);
    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Authentication failed',
            details: error.message
        });
    }
});

app.post('/api/scrape', async (req, res) => {
    const { employeeId, password, airline, month, year, firstLogin } = req.body;
    const monthStr = month && year ? `${year}-${String(month).padStart(2, '0')}` : 'current';
    console.log(`🔄 SCRAPE REQUEST: ${airline || 'ABX'} pilot ${employeeId} - Month: ${monthStr} - First login: ${firstLogin !== false}`);
    
    if (!employeeId || !password) {
        return res.status(400).json({
            success: false,
            error: 'Credentials required for scraping'
        });
    }
    
    try {
        const result = await authenticateUser(employeeId, password, airline, month, year, firstLogin !== false);
        result.message = `Automatic scraping successful for ${employeeId}`;
        result.autoScrape = true;
        res.json(result);
    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Scraping failed',
            details: error.message
        });
    }
});

app.get('/api/schedule', (req, res) => {
    res.json({
        success: true,
        schedule: null,
        message: 'Please login to load your schedule'
    });
});

app.get('/api/notifications', (req, res) => {
    res.json({
        success: true,
        notifications: []
    });
});

// Accept notification - send back to crew portal
app.post('/api/notifications/accept', async (req, res) => {
    const { notificationId, message, type, date } = req.body;
    
    console.log(`✅ Notification acceptance received: ${notificationId} - ${message}`);
    
    try {
        // In a real implementation, this would:
        // 1. Authenticate with crew portal
        // 2. Send acknowledgment/acceptance back to the portal
        // 3. Update notification status in the portal system
        
        // For now, we'll log the acceptance
        // Future: Integrate with crew portal API to POST acceptance
        
        res.json({
            success: true,
            message: 'Notification accepted',
            notificationId: notificationId,
            acknowledged: true
        });
    } catch (error) {
        console.error('Error accepting notification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process notification acceptance'
        });
    }
});

// Dismiss notification
app.post('/api/notifications/dismiss', async (req, res) => {
    const { notificationId } = req.body;
    
    console.log(`🗑️ Notification dismissed: ${notificationId}`);
    
    try {
        // Log the dismissal
        // Future: Could sync with crew portal to mark as read
        
        res.json({
            success: true,
            message: 'Notification dismissed',
            notificationId: notificationId
        });
    } catch (error) {
        console.error('Error dismissing notification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to dismiss notification'
        });
    }
});

// Family access code generation
app.post('/api/family/generate-code', (req, res) => {
    const { pilotUsername, memberName, airline, pilotPassword } = req.body;
    
    if (!pilotUsername || !memberName || !pilotPassword) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields'
        });
    }
    
    // Generate a unique 8-character access code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Load existing codes
    const familyCodes = loadFamilyCodes();
    
    // Store the code with pilot credentials
    familyCodes[code] = {
        code: code,
        pilotEmployeeId: pilotUsername,
        password: pilotPassword,
        airline: airline || 'abx',
        memberName: memberName,
        pilotName: pilotUsername,
        createdAt: new Date().toISOString()
    };
    
    // Save to file
    if (saveFamilyCodes(familyCodes)) {
        console.log(`✅ Generated family code: ${code} for ${memberName} (Pilot: ${pilotUsername})`);
        res.json({
            success: true,
            code: code,
            pilotUsername: pilotUsername,
            memberName: memberName
        });
    } else {
        res.status(500).json({
            success: false,
            error: 'Failed to save family code'
        });
    }
});

// Auth login endpoint for family code validation
app.post('/api/auth/login', async (req, res) => {
    const { username, accountType } = req.body;
    
    if (accountType === 'family') {
        // For family accounts, validate the access code
        const familyCodes = loadFamilyCodes();
        const codeData = familyCodes[username];
        
        if (codeData) {
            console.log(`✅ Valid family code: ${username} for ${codeData.memberName}`);
            return res.json({
                success: true,
                accountType: 'family',
                memberName: codeData.memberName,
                pilotName: codeData.pilotName || codeData.pilotEmployeeId,
                airline: codeData.airline,
                pilotEmployeeId: codeData.pilotEmployeeId,
                password: codeData.password
            });
        } else {
            console.error(`❌ Invalid family access code: ${username}`);
            return res.status(401).json({
                success: false,
                error: 'Invalid family access code'
            });
        }
    }
    
    // For pilot accounts, return success (actual auth happens in /api/scrape)
    res.json({
        success: true,
        accountType: accountType || 'pilot'
    });
});

// Get family codes for a pilot
app.post('/api/family/get-codes', (req, res) => {
    const { pilotEmployeeId } = req.body;
    
    if (!pilotEmployeeId) {
        return res.status(400).json({
            success: false,
            error: 'Pilot employee ID required'
        });
    }
    
    try {
        const familyCodes = JSON.parse(fs.readFileSync(familyCodesPath, 'utf8'));
        
        // Find all codes belonging to this pilot
        const pilotCodes = [];
        for (const [code, data] of Object.entries(familyCodes)) {
            if (data.pilotEmployeeId === pilotEmployeeId) {
                pilotCodes.push({
                    id: code,
                    code: code,
                    memberName: data.memberName,
                    createdAt: data.createdAt || new Date().toISOString()
                });
            }
        }
        
        res.json({
            success: true,
            codes: pilotCodes
        });
    } catch (error) {
        console.error('Error getting family codes:', error);
        res.json({
            success: true,
            codes: []
        });
    }
});

// Revoke family access code
app.delete('/api/family/revoke-code/:code', (req, res) => {
    const { code } = req.params;
    
    if (!code) {
        return res.status(400).json({
            success: false,
            error: 'Access code required'
        });
    }
    
    try {
        const familyCodes = JSON.parse(fs.readFileSync(familyCodesPath, 'utf8'));
        
        if (familyCodes[code]) {
            delete familyCodes[code];
            fs.writeFileSync(familyCodesPath, JSON.stringify(familyCodes, null, 2));
            
            console.log(`🔐 Revoked family access code: ${code}`);
            
            res.json({
                success: true,
                message: 'Family access code revoked successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Access code not found'
            });
        }
    } catch (error) {
        console.error('Error revoking family code:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to revoke access code'
        });
    }
});


// Weather API endpoint - proxy to avoid CORS issues
app.post('/api/weather', async (req, res) => {
    const { airport } = req.body;
    
    if (!airport) {
        return res.status(400).json({
            success: false,
            error: 'Airport code required'
        });
    }
    
    try {
        let metar = 'No METAR available';
        let decoded = null;
        let taf = 'No TAF available';
        
        try {
            // Use Aviation Weather Center API with JSON decoded format
            // Free, no API key required, provides both raw and decoded data
            const metarUrl = `https://aviationweather.gov/api/data/metar?ids=${airport}&format=json`;
            const tafUrl = `https://aviationweather.gov/api/data/taf?ids=${airport}&format=json`;
            
            console.log(`🌤️ Fetching weather for ${airport} from Aviation Weather Center API...`);
            
            const [metarResponse, tafResponse] = await Promise.all([
                fetch(metarUrl),
                fetch(tafUrl)
            ]);
            
            console.log(`METAR response status: ${metarResponse.status}, TAF response status: ${tafResponse.status}`);
            
            if (metarResponse.ok) {
                const metarJson = await metarResponse.json();
                console.log('📊 METAR JSON response:', JSON.stringify(metarJson[0], null, 2));
                if (metarJson && metarJson.length > 0) {
                    const metarData = metarJson[0];
                    metar = metarData.rawOb || 'No METAR available';
                    
                    // Extract observation time from raw METAR (format: DDHHMMz)
                    const obsTimeMatch = metarData.rawOb?.match(/\s(\d{6})Z/);
                    let obsTimeFormatted = null;
                    if (obsTimeMatch) {
                        const day = obsTimeMatch[1].substring(0, 2);
                        const hour = obsTimeMatch[1].substring(2, 4);
                        const minute = obsTimeMatch[1].substring(4, 6);
                        // Get current month and year
                        const now = new Date();
                        const month = now.toLocaleString('en-US', { month: 'long' });
                        const year = now.getFullYear();
                        obsTimeFormatted = `${month} ${day}, ${year} at ${hour}:${minute}Z`;
                    }
                    
                    // Create decoded weather object from JSON response
                    // Note: AWC API returns temp/dewp in Celsius, altim in millibars
                    decoded = {
                        temperature: metarData.temp != null ? `${metarData.temp}°C` : null,
                        dewpoint: metarData.dewp != null ? `${metarData.dewp}°C` : null,
                        visibility: metarData.visib != null ? `${metarData.visib} SM` : null,
                        wind: metarData.wdir != null && metarData.wspd != null ? 
                            `${metarData.wdir}° at ${metarData.wspd} knots${metarData.wgst ? ` gusting to ${metarData.wgst}` : ''}` : null,
                        altimeter: metarData.altim != null ? `${(metarData.altim * 0.02953).toFixed(2)} inHg` : null,
                        clouds: metarData.cover ? metarData.cover : null,
                        flightCategory: metarData.fltcat || metarData.fltCat || null,
                        observationTime: obsTimeFormatted,
                        station: metarData.name || null
                    };
                    
                    console.log(`✅ METAR data received for ${airport}`);
                } else {
                    console.log(`⚠️ No METAR data found for ${airport}`);
                }
            } else {
                console.log(`⚠️ METAR fetch failed with status ${metarResponse.status}`);
            }
            
            if (tafResponse.ok) {
                const tafJson = await tafResponse.json();
                console.log('📊 TAF JSON response:', JSON.stringify(tafJson[0], null, 2));
                if (tafJson && tafJson.length > 0) {
                    const tafData = tafJson[0];
                    taf = {
                        raw: tafData.rawTAF || 'No TAF available',
                        decoded: tafData.forecast ? tafData.forecast.map(period => ({
                            timeFrom: period.fcstTime?.from || null,
                            timeTo: period.fcstTime?.to || null,
                            wind: period.wdir != null && period.wspd != null ? 
                                `${period.wdir}° at ${period.wspd} knots${period.wgst ? ` gusting to ${period.wgst}` : ''}` : 'Variable',
                            visibility: period.visib != null ? `${period.visib} SM` : null,
                            clouds: period.cover || null,
                            weather: period.wxString || null,
                            flightCategory: period.fltcat || period.fltCat || null
                        })) : null
                    };
                    console.log(`✅ TAF data received for ${airport}`);
                } else {
                    console.log(`⚠️ No TAF data found for ${airport}`);
                }
            } else {
                console.log(`⚠️ TAF fetch failed with status ${tafResponse.status}`);
            }
        } catch (error) {
            console.error('Aviation Weather Center error:', error);
        }
        
        res.json({
            success: true,
            metar,
            decoded,
            taf
        });
    } catch (error) {
        console.error('Weather API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch weather data'
        });
    }
});

// Hotel details endpoint using Google Places API
app.post('/api/hotel-details', async (req, res) => {
    const { hotelName, location, address, phone } = req.body;
    
    try {
        // Return the address and phone from crew portal if available
        const hotelData = {
            name: hotelName,
            address: address || `${location}`,
            phone: phone || 'Not available',
            phone: '+1-800-555-0100',
            checkIn: '15:00',
            checkOut: '11:00',
            rating: 4.2,
            amenities: ['Free WiFi', 'Breakfast', 'Shuttle', 'Gym']
        };
        
        res.json({
            success: true,
            hotel: mockHotelData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch hotel details'
        });
    }
});

// FlightAware API endpoint for live aircraft tracking
app.post('/api/flightaware', async (req, res) => {
    const { tailNumber, flightNumber, departureDate, origin, destination } = req.body;
    
    try {
        let actualTimes = null;
        let flightAwareUrl = null;
        
        // Convert GB/8C to ABX/ATI for FlightAware
        let faFlightNumber = flightNumber;
        if (flightNumber && flightNumber.startsWith('GB')) {
            faFlightNumber = 'ABX' + flightNumber.substring(2);
        } else if (flightNumber && flightNumber.startsWith('8C')) {
            faFlightNumber = 'ATI' + flightNumber.substring(2);
        }
        
        // For past flights with date and airports, construct the specific URL
        if (departureDate && origin && destination) {
            const flightDate = new Date(departureDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (flightDate < today) {
                // Format: YYYYMMDD
                const dateStr = flightDate.toISOString().split('T')[0].replace(/-/g, '');
                
                // Convert 3-letter IATA to 4-letter ICAO if needed
                const originICAO = origin.length === 3 ? `K${origin}` : origin;
                const destICAO = destination.length === 3 ? `K${destination}` : destination;
                
                // Try to construct the most likely URL pattern
                // FlightAware uses format: /live/flight/FLIGHT/history/DATE/TIMEZ/ORIGIN/DEST
                // We don't know the exact time, so try just the date-based history page
                flightAwareUrl = `https://flightaware.com/live/flight/${faFlightNumber}/history/${dateStr}`;
                
                console.log(`📅 Constructed FlightAware URL: ${flightAwareUrl}`);
                console.log(`   Origin: ${origin} (${originICAO}), Dest: ${destination} (${destICAO})`);
                
                // Instead of scraping, return the URL so user can click through
                res.json({
                    success: true,
                    flightData: {
                        tailNumber: tailNumber,
                        flightNumber: flightNumber,
                        isLive: false,
                        status: 'Historical',
                        message: 'Click to view on FlightAware',
                        flightAwareUrl: flightAwareUrl,
                        actualTimes: null,
                        needsSetup: true
                    }
                });
                return;
            }
        }
        
        // For current flights or if we don't have enough info
        flightAwareUrl = `https://flightaware.com/live/flight/${faFlightNumber}`;
        
        res.json({
            success: true,
            flightData: {
                tailNumber: tailNumber,
                flightNumber: flightNumber,
                isLive: false,
                status: 'View on FlightAware',
                message: 'Click to view flight details',
                flightAwareUrl: flightAwareUrl,
                actualTimes: null,
                needsSetup: true
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch flight data'
        });
    }
});

// User registration endpoints
app.post('/api/register-user', async (req, res) => {
    try {
        const { employeeId, name, role, base, airline } = req.body;
        
        if (!employeeId) {
            return res.status(400).json({ success: false, error: 'Employee ID is required' });
        }
        
        const users = await loadUsers();
        
        // Add or update user
        users[employeeId] = {
            employeeId,
            name: name || employeeId,
            role: role || 'Unknown',
            base: base || 'Unknown',
            airline: airline || 'Unknown',
            registeredAt: new Date().toISOString()
        };
        
        await saveUsers(users);
        
        console.log(`✅ User registered: ${employeeId} (${name})`);
        
        res.json({ 
            success: true, 
            message: 'User registered successfully',
            user: users[employeeId]
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to register user' 
        });
    }
});

app.post('/api/unregister-user', async (req, res) => {
    try {
        const { employeeId } = req.body;
        
        if (!employeeId) {
            return res.status(400).json({ success: false, error: 'Employee ID is required' });
        }
        
        const users = await loadUsers();
        
        if (users[employeeId]) {
            delete users[employeeId];
            await saveUsers(users);
            console.log(`❌ User unregistered: ${employeeId}`);
        }
        
        res.json({ 
            success: true, 
            message: 'User unregistered successfully' 
        });
    } catch (error) {
        console.error('Unregister error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to unregister user' 
        });
    }
});

app.post('/api/search-users', async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query || query.trim().length === 0) {
            return res.json({ success: true, users: [] });
        }
        
        const users = await loadUsers();
        const searchQuery = query.toLowerCase().trim();
        
        // Filter users by name or employee ID (case-insensitive, partial match)
        // Search works for:
        // - Full or partial name (first name, last name, or full name)
        // - Full or partial employee ID
        // - Works across both ABX and ATI airlines
        const results = Object.values(users).filter(user => {
            const userName = (user.name || '').toLowerCase();
            const userEmployeeId = (user.employeeId || '').toLowerCase();
            
            // Check if query matches name or employee ID
            return userName.includes(searchQuery) || userEmployeeId.includes(searchQuery);
        });
        
        console.log(`🔍 Search for "${query}" found ${results.length} registered users from all airlines`);
        
        res.json({ 
            success: true, 
            users: results 
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to search users',
            users: []
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// Subscription status endpoint
app.post('/api/subscription/status', (req, res) => {
    const { employeeId } = req.body;
    
    // For now, return trial status
    res.json({
        success: true,
        status: 'trial',
        plan: null,
        daysRemaining: 30,
        trialStartDate: new Date().toISOString()
    });
});

// Catch-all route to serve React app for any non-API routes
app.get(/^(?!\/api).*$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
🚀 FlightRosterIQ - REAL AUTHENTICATION FIXED!
🌐 Server: http://157.245.126.24:${PORT}
🔐 Real crew portal auth enabled
🔄 Automatic scraping fixed
✅ Ready for production!
    `);
});
