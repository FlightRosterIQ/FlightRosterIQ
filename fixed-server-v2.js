const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

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
                '--disable-gpu'
            ],
            executablePath: '/usr/bin/chromium-browser'
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
                        // Click next button
                        await page.evaluate(() => {
                            const nextButton = document.querySelector('.nav-arrow:last-child, button:contains("Next")');
                            if (nextButton) nextButton.click();
                        });
                        console.log(`➡️ Clicking next month...`);
                    } else {
                        // Click previous button
                        await page.evaluate(() => {
                            const prevButton = document.querySelector('.nav-arrow:first-child, button:contains("Previous")');
                            if (prevButton) prevButton.click();
                        });
                        console.log(`⬅️ Clicking previous month...`);
                    }
                    
                    await sleep(2000);
                }
                
                attempts++;
            }
            
            if (!foundMonth) {
                console.log(`⚠️ Could not navigate to target month after ${attempts} attempts`);
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
                    const timeDivs = detailsDiv.querySelectorAll('div.IADP-jss158');
                    const hotels = [];
                    
                    if (timeDivs.length >= 2) {
                        const depText = timeDivs[0].textContent || '';
                        const depMatch = depText.match(/([A-Z]{3})\s+(\d{1,2}[A-Z][a-z]{2})\s+(\d{1,2}:\d{2})/);
                        const arrText = timeDivs[1].textContent || '';
                        const arrMatch = arrText.match(/([A-Z]{3})\s+(\d{1,2}[A-Z][a-z]{2})\s+(\d{1,2}:\d{2})/);
                        
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
                                            
                                            // Enrich with known hotel data
                                            const enrichedHotel = enrichHotelData(baseHotel);
                                            hotels.push(enrichedHotel);
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
                        }
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
                            // Hotel - extract all available information
                            const hotelSpans = subDetails.querySelectorAll('div.IADP-jss158');
                            if (hotelSpans.length > 0) {
                                const hotelText = hotelSpans[0].textContent || '';
                                const hotelMatch = hotelText.match(/([A-Z]{3})\s+(.+)/);
                                
                                if (hotelMatch) {
                                    const location = hotelMatch[1];
                                    let name = hotelMatch[2].trim();
                                    let address = '';
                                    let phone = '';
                                    
                                    // Try to extract address and phone from other spans
                                    hotelSpans.forEach((span, idx) => {
                                        if (idx > 0) {
                                            const text = span.textContent || '';
                                            // Look for phone numbers
                                            const phoneMatch = text.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/);
                                            if (phoneMatch) {
                                                phone = phoneMatch[0];
                                            }
                                            // Look for addresses (street numbers and street names)
                                            if (text.match(/\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/)) {
                                                address = text.trim();
                                            }
                                        }
                                    });
                                    
                                    // Also check all divs in subDetails for hotel info
                                    const allDivs = subDetails.querySelectorAll('div');
                                    allDivs.forEach(div => {
                                        const text = div.textContent || '';
                                        if (!phone) {
                                            const phoneMatch = text.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/);
                                            if (phoneMatch) phone = phoneMatch[0];
                                        }
                                        if (!address && text.match(/\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/) && text.length < 100) {
                                            address = text.trim();
                                        }
                                    });
                                    
                                    // Create base hotel object
                                    const baseHotel = {
                                        location: location,
                                        name: name,
                                        address: address || null,
                                        phone: phone || null
                                    };
                                    
                                    // Enrich with known hotel data
                                    const enrichedHotel = enrichHotelData(baseHotel);
                                    hotels.push(enrichedHotel);
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
        
        // Scrape remarks/notifications
        console.log('📬 Extracting remarks and notifications...');
        
        const remarks = await page.evaluate(() => {
            const remarksList = [];
            
            // Look for remarks/news elements
            const remarkElements = document.querySelectorAll('[data-test-id*="remark"], [data-test-id*="news"], [class*="remark"], [class*="notification"], [class*="message"]');
            
            remarkElements.forEach(elem => {
                const text = (elem.textContent || '').trim();
                const dateElem = elem.querySelector('[class*="date"], [data-date]');
                const date = dateElem ? dateElem.textContent : '';
                
                if (text && text.length > 10) {
                    remarksList.push({
                        message: text,
                        date: date || new Date().toISOString(),
                        type: 'remark',
                        read: false
                    });
                }
            });
            
            return remarksList;
        });
        
        scheduleData.remarks = remarks;
        console.log(`📬 Found ${remarks.length} remarks/notifications`);
        
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
                    
                    // Now look for "CREW MEMBERS ON THIS LEG" dropdown buttons within each leg of this pairing
                    const crewData = await page.evaluate((rowIndex) => {
                        const allCrew = [];
                        const dutyRows = document.querySelectorAll('div[data-test-id="duty-row"]');
                        const pairingRow = dutyRows[rowIndex];
                        
                        console.log(`[CREW DEBUG] Processing pairing row ${rowIndex}`);
                        if (!pairingRow) {
                            console.log(`[CREW DEBUG] No pairing row found at index ${rowIndex}`);
                            return allCrew;
                        }
                        
                        // Find the collapse container that holds the legs
                        const collapseDiv = pairingRow.querySelector('.IADP-MuiCollapse-root');
                        if (!collapseDiv) {
                            console.log(`[CREW DEBUG] No collapse div found in pairing row ${rowIndex}`);
                            return allCrew;
                        }
                        
                        // Find all leg sub-rows within this pairing
                        const legRows = collapseDiv.querySelectorAll('div[data-test-id="duty-row"]');
                        console.log(`[CREW DEBUG] Found ${legRows.length} leg rows in pairing ${rowIndex}`);
                        
                        legRows.forEach((legRow, legIdx) => {
                            const legEventType = legRow.querySelector('[data-event-type]')?.getAttribute('data-event-type');
                            
                            console.log(`[CREW DEBUG] Leg ${legIdx} event type: ${legEventType}`);
                            
                            // Only process actual flight legs (LEG event type)
                            if (legEventType !== 'LEG') return;
                            
                            const legDetails = legRow.querySelector('[data-test-id="duty-row-details"]');
                            if (!legDetails) {
                                console.log(`[CREW DEBUG] No leg details found for leg ${legIdx}`);
                                return;
                            }
                            
                            // Look for "CREW MEMBERS ON THIS LEG" dropdown button or expandable section
                            const allButtons = legDetails.querySelectorAll('button, div[role="button"], span[role="button"], [aria-expanded], [class*="expand"], [class*="collapse"]');
                            console.log(`[CREW DEBUG] Leg ${legIdx}: Found ${allButtons.length} potential buttons`);
                            let crewDropdown = null;
                            
                            // Search for crew dropdown
                            allButtons.forEach(btn => {
                                const text = (btn.textContent || '').toUpperCase();
                                const ariaLabel = (btn.getAttribute('aria-label') || '').toUpperCase();
                                if (text.includes('CREW') || ariaLabel.includes('CREW')) {
                                    crewDropdown = btn;
                                    console.log(`[CREW DEBUG] Leg ${legIdx}: Found crew dropdown with text "${btn.textContent}"`);
                                }
                            });
                            
                            if (!crewDropdown) {
                                console.log(`[CREW DEBUG] Leg ${legIdx}: No crew dropdown found`);
                            }
                            
                            // Click dropdown if found and not expanded
                            if (crewDropdown) {
                                const isExpanded = crewDropdown.getAttribute('aria-expanded');
                                if (isExpanded !== 'true') {
                                    try {
                                        crewDropdown.click();
                                        console.log(`Clicked crew dropdown for leg ${legIdx + 1}`);
                                    } catch (e) {
                                        console.log(`Error clicking crew dropdown: ${e.message}`);
                                    }
                                }
                            }
                            
                            // Extract crew information from this leg
                            // Look in the leg details and any expanded sections
                            const crewForLeg = [];
                            const processedNames = new Set();
                            
                            // Search all elements within this leg
                            const allElements = legDetails.querySelectorAll('div, span, p, li, td');
                            
                            allElements.forEach(elem => {
                                const text = elem.textContent || '';
                                
                                // Match crew patterns
                                const patterns = [
                                    // "CA: JOHN SMITH" or "Captain: JOHN SMITH"
                                    { regex: /(?:CA|Captain|CPT)[\s:]+([A-Z][A-Z\s]+?)(?=\s*(?:FO|CA|Captain|Employee|Phone|Base|$|\d{5}))/gi, role: 'Captain' },
                                    { regex: /(?:FO|First Officer|F\/O)[\s:]+([A-Z][A-Z\s]+?)(?=\s*(?:FO|CA|Captain|Employee|Phone|Base|$|\d{5}))/gi, role: 'First Officer' },
                                    // "SMITH, JOHN - Captain"
                                    { regex: /([A-Z][A-Z\s,]+?)\s*-\s*(?:Captain|CPT|CA)/gi, role: 'Captain' },
                                    { regex: /([A-Z][A-Z\s,]+?)\s*-\s*(?:First Officer|FO|F\/O)/gi, role: 'First Officer' },
                                    // "John Smith CA" or "John Smith Captain"
                                    { regex: /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:CA|Captain|CPT)/gi, role: 'Captain' },
                                    { regex: /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:FO|First Officer|F\/O)/gi, role: 'First Officer' }
                                ];
                                
                                patterns.forEach(({ regex, role }) => {
                                    const matches = [...text.matchAll(regex)];
                                    for (const match of matches) {
                                        let name = match[1].trim();
                                        
                                        // Clean up name
                                        name = name.replace(/\s+/g, ' ').trim();
                                        
                                        // Remove trailing punctuation or numbers
                                        name = name.replace(/[,\-:]+$/, '').trim();
                                        
                                        // Convert "LAST, FIRST" to "FIRST LAST"
                                        if (name.includes(',')) {
                                            const parts = name.split(',').map(p => p.trim());
                                            name = parts.length > 1 ? `${parts[1]} ${parts[0]}` : name;
                                        }
                                        
                                        // Capitalize properly (from "JOHN SMITH" to "John Smith")
                                        if (name === name.toUpperCase()) {
                                            name = name.split(' ').map(word => 
                                                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                                            ).join(' ');
                                        }
                                        
                                        // Validate name and check uniqueness
                                        const nameParts = name.split(' ').filter(p => p.length > 0);
                                        if (nameParts.length >= 2 && name.length > 3 && name.length < 50 && !processedNames.has(name)) {
                                            processedNames.add(name);
                                            
                                            // Look for additional info nearby
                                            let employeeId = '';
                                            let phone = '';
                                            let base = '';
                                            
                                            // Search parent and surrounding text
                                            const parentText = elem.parentElement?.textContent || text;
                                            const nearbyText = elem.parentElement?.parentElement?.textContent || parentText;
                                            
                                            // Employee ID (5-8 digits)
                                            const idMatch = nearbyText.match(/\b(\d{5,8})\b/);
                                            if (idMatch && nearbyText.indexOf(idMatch[1]) > nearbyText.indexOf(name)) {
                                                employeeId = idMatch[1];
                                            }
                                            
                                            // Phone number
                                            const phoneMatch = nearbyText.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/);
                                            if (phoneMatch) phone = phoneMatch[0];
                                            
                                            // Base (3-letter airport code)
                                            const baseMatch = nearbyText.match(/\b([A-Z]{3})\b/);
                                            if (baseMatch && baseMatch[1] !== name.split(' ')[0].substring(0, 3)) {
                                                base = baseMatch[1];
                                            }
                                            
                                            crewForLeg.push({
                                                name: name,
                                                role: role,
                                                employeeId: employeeId,
                                                phone: phone,
                                                base: base
                                            });
                                        }
                                    }
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

// Family access code generation
app.post('/api/family/generate-code', (req, res) => {
    const { pilotUsername, memberName, airline } = req.body;
    
    if (!pilotUsername || !memberName) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields'
        });
    }
    
    // Generate a unique 8-character access code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    res.json({
        success: true,
        code: code,
        pilotUsername: pilotUsername,
        memberName: memberName
    });
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
