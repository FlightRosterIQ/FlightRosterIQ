/* ============================
   MONTHLY ROSTER SCRAPER (DOM-Only)
   Calendar-based approach:
   1. Dismiss cookies
   2. Wait for calendar/gantt view
   3. Click each day cell
   4. Click each flight for details
   5. Expand "crew members on this leg" dropdown
   6. Extract all info
============================ */

export async function scrapeMonthlyRoster(page, targetMonth, targetYear) {
  console.log(`📅 Scraping ${targetYear}-${targetMonth}`);

  // Wait for page to fully load after login
  await page.waitForTimeout(3000);

  // Step 1: Dismiss cookie banner if present
  console.log('🍪 Dismissing cookie banner...');
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const btn of btns) {
      if (btn.innerText.trim() === 'OK') {
        btn.click();
        break;
      }
    }
  });
  await page.waitForTimeout(1000);

  // Step 2: Wait for the calendar/gantt view to load
  console.log('⏳ Waiting for calendar to load...');
  await page.waitForTimeout(5000);

  // DEBUG: Log page structure to find calendar elements
  const debugInfo = await page.evaluate(() => {
    const body = document.body;
    const allClasses = [];
    
    body.querySelectorAll('*').forEach(el => {
      el.classList.forEach(c => {
        if (!allClasses.includes(c)) allClasses.push(c);
      });
    });

    // Find clickable elements that might be days or duties
    const clickables = [];
    document.querySelectorAll('[class*="day"], [class*="cell"], [class*="gantt"], [class*="bar"], [class*="duty"], [class*="event"], [class*="slot"], td, [role="gridcell"], [role="button"]').forEach((el, i) => {
      if (i < 30) {
        clickables.push({
          tag: el.tagName,
          className: (el.className?.toString() || '').substring(0, 80),
          text: (el.innerText || '').substring(0, 40),
          role: el.getAttribute('role'),
          dataAttrs: Array.from(el.attributes).filter(a => a.name.startsWith('data-')).map(a => `${a.name}=${a.value.substring(0, 20)}`).join(', ')
        });
      }
    });

    // Find duty-related classes
    const dutyClasses = allClasses.filter(c => {
      const lower = c.toLowerCase();
      return lower.includes('duty') || lower.includes('flight') || lower.includes('gantt') || 
             lower.includes('bar') || lower.includes('event') || lower.includes('pairing') ||
             lower.includes('cell') || lower.includes('day') || lower.includes('leg');
    });

    return {
      url: window.location.href,
      totalElements: body.querySelectorAll('*').length,
      clickables,
      dutyClasses: dutyClasses.slice(0, 40),
      visibleText: body.innerText.substring(0, 2500)
    };
  });

  console.log('🔍 DEBUG - URL:', debugInfo.url);
  console.log('🔍 DEBUG - Total elements:', debugInfo.totalElements);
  console.log('🔍 DEBUG - Sample clickables:', JSON.stringify(debugInfo.clickables.slice(0, 15), null, 2));
  console.log('🔍 DEBUG - Duty-related classes:', debugInfo.dutyClasses.join(', '));
  console.log('🔍 DEBUG - Visible text:', debugInfo.visibleText.substring(0, 1200));

  // Step 3: Scrape by clicking on day cells/bars
  const duties = await scrapeByClickingDays(page);

  console.log(`✅ Scraped ${duties.length} duties`);
  return duties;
}

async function scrapeByClickingDays(page) {
  const allDuties = [];

  // Find all clickable day/duty elements
  // Try multiple selector strategies
  const selectors = [
    '[class*="GanttBar"]',
    '[class*="gantt-bar"]',
    '[class*="gantt"] [class*="bar"]',
    '[class*="DutyBar"]',
    '[class*="duty-bar"]',
    '[class*="event-bar"]',
    '[class*="day-cell"]',
    '[class*="DayCell"]',
    'td[class*="day"]',
    '[role="gridcell"]',
    '[class*="slot"][class*="duty"]'
  ];

  let foundElements = [];
  
  for (const selector of selectors) {
    const elements = await page.$$(selector);
    if (elements.length > 0) {
      console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
      foundElements = elements;
      break;
    }
  }

  if (foundElements.length === 0) {
    console.log('⚠️ No day/duty elements found with standard selectors');
    console.log('📜 Attempting text-based scrape...');
    return await scrapeFromVisibleText(page);
  }

  // Click each element to get details
  console.log(`📋 Clicking ${Math.min(foundElements.length, 40)} elements...`);
  
  for (let i = 0; i < Math.min(foundElements.length, 40); i++) {
    try {
      const el = foundElements[i];
      
      // Click on the day/duty bar
      await el.click();
      await page.waitForTimeout(800);

      // Look for flights/duties in the popup/panel
      const flightsInDay = await extractFlightsFromPanel(page);
      
      for (const flight of flightsInDay) {
        // Click on the flight to get details
        if (flight.clickSelector) {
          await page.click(flight.clickSelector);
          await page.waitForTimeout(500);
          
          // Expand crew members dropdown
          await expandCrewDropdown(page);
          await page.waitForTimeout(500);
          
          // Extract full flight details including crew
          const fullDetails = await extractFlightDetails(page);
          allDuties.push({ ...flight, ...fullDetails });
          
          // Go back or close
          await closePopup(page);
        } else {
          allDuties.push(flight);
        }
      }

      // Close any open popup
      await closePopup(page);
      await page.waitForTimeout(300);
      
    } catch (err) {
      console.log(`⚠️ Error on element ${i}:`, err.message);
    }
  }

  return allDuties;
}

async function extractFlightsFromPanel(page) {
  return await page.evaluate(() => {
    const flights = [];
    
    // Look for popup/panel/drawer
    const panel = document.querySelector('[class*="popup"], [class*="modal"], [class*="drawer"], [class*="dialog"], [class*="detail"], [class*="Popover"], [class*="Panel"], [role="dialog"]');
    const container = panel || document.body;
    
    // Find flight rows within
    const flightRows = container.querySelectorAll('[class*="flight"], [class*="leg"], [class*="segment"], [class*="duty-row"], [class*="FlightRow"], [class*="LegRow"]');
    
    flightRows.forEach((row, idx) => {
      const text = row.innerText || '';
      
      // Parse flight info
      const flightMatch = text.match(/\b([A-Z]{2,3})\s*(\d{3,4})\b/);
      const routeMatch = text.match(/\b([A-Z]{3})\s*[-–→>to\s]+([A-Z]{3})\b/i);
      const timeMatch = text.match(/\b(\d{1,2}:\d{2})\b/g);
      
      if (flightMatch || routeMatch) {
        flights.push({
          flightNumber: flightMatch ? `${flightMatch[1]}${flightMatch[2]}` : null,
          from: routeMatch?.[1] || null,
          to: routeMatch?.[2] || null,
          times: timeMatch || [],
          rawText: text.substring(0, 150),
          type: text.toUpperCase().includes('RES') ? 'RESERVE' : 
                text.toUpperCase().includes('DH') ? 'DEADHEAD' : 'FLIGHT',
          clickSelector: null // Would need unique selector
        });
      }
    });
    
    // If no specific flight rows, parse from text
    if (flights.length === 0) {
      const text = container.innerText || '';
      const flightPattern = /\b([A-Z]{2,3})\s*(\d{3,4})\b/g;
      const matches = [...text.matchAll(flightPattern)];
      
      matches.forEach(match => {
        flights.push({
          flightNumber: `${match[1]}${match[2]}`,
          rawText: text.substring(Math.max(0, match.index - 20), match.index + 50),
          type: 'FLIGHT'
        });
      });
    }
    
    return flights;
  });
}

async function expandCrewDropdown(page) {
  console.log('👥 Expanding crew members dropdown...');
  
  await page.evaluate(() => {
    // Look for "crew members on this leg" text and click nearby dropdown/expander
    const allElements = document.querySelectorAll('*');
    
    for (const el of allElements) {
      const text = el.innerText?.toLowerCase() || '';
      if (text.includes('crew member') && text.includes('leg')) {
        // Found it - look for nearby expandable
        const parent = el.closest('[class*="accordion"], [class*="expandable"], [class*="collapsible"], [class*="dropdown"]') || el.parentElement;
        
        // Click the expander button
        const expandBtn = parent?.querySelector('button, [class*="expand"], [class*="toggle"], [class*="arrow"], svg, [role="button"]');
        if (expandBtn) {
          expandBtn.click();
          return true;
        }
        
        // Or click the element itself
        el.click();
        return true;
      }
    }
    
    // Fallback: click any accordion/expander
    const expanders = document.querySelectorAll('[class*="Accordion"] button, [class*="expand"], [aria-expanded="false"]');
    expanders.forEach(exp => {
      try { exp.click(); } catch {}
    });
    
    return false;
  });
}

async function extractFlightDetails(page) {
  return await page.evaluate(() => {
    const details = {
      crew: [],
      aircraft: null,
      tail: null,
      hotel: null,
      departureTime: null,
      arrivalTime: null,
      date: null
    };
    
    const text = document.body.innerText;
    
    // Extract date
    const dateMatch = text.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b|\b(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{2,4})\b/i);
    details.date = dateMatch?.[0] || null;
    
    // Extract times
    const times = text.match(/\b(\d{1,2}:\d{2})\b/g);
    if (times && times.length >= 2) {
      details.departureTime = times[0];
      details.arrivalTime = times[1];
    }
    
    // Extract tail number (usually N followed by numbers/letters)
    const tailMatch = text.match(/\b(N\d{3,5}[A-Z]{0,2})\b/);
    details.tail = tailMatch?.[1] || null;
    
    // Extract aircraft type
    const aircraftMatch = text.match(/\b(B?7[0-9]{2}|A3[0-9]{2}|E1[0-9]{2}|CRJ|ERJ|MD[0-9]{2})\b/i);
    details.aircraft = aircraftMatch?.[1] || null;
    
    // Extract crew members
    const crewSection = document.querySelector('[class*="crew"], [class*="member"], [class*="Crew"]');
    if (crewSection) {
      const names = crewSection.innerText.match(/[A-Z][a-z]+\s+[A-Z][a-z]+/g);
      if (names) details.crew = names.slice(0, 10);
    }
    
    // Alternative: look for names after "crew members" text
    const crewMatch = text.match(/crew members?[:\s]*([\s\S]{50,300})/i);
    if (crewMatch && details.crew.length === 0) {
      const names = crewMatch[1].match(/[A-Z][a-z]+\s+[A-Z][a-z]+/g);
      if (names) details.crew = names.slice(0, 10);
    }
    
    // Extract hotel
    const hotelMatch = text.match(/hotel[:\s]*([A-Za-z\s]+(?:Inn|Hotel|Suites|Resort|Lodge))/i);
    details.hotel = hotelMatch?.[1]?.trim() || null;
    
    return details;
  });
}

async function closePopup(page) {
  await page.evaluate(() => {
    const closeSelectors = [
      '[class*="close"]',
      '[aria-label*="close"]',
      '[aria-label*="Close"]',
      'button[class*="Close"]',
      '[class*="modal"] button',
      '[class*="dialog"] button'
    ];
    
    for (const sel of closeSelectors) {
      const btn = document.querySelector(sel);
      if (btn && btn.innerText?.toLowerCase().includes('close')) {
        btn.click();
        return;
      }
    }
    
    // Press Escape
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
  });
}

async function scrapeFromVisibleText(page) {
  console.log('📜 Scraping from visible text...');
  
  return await page.evaluate(() => {
    const results = [];
    const text = document.body.innerText;
    
    // Find flight patterns
    const flightPattern = /\b([A-Z]{2,3})\s*(\d{3,4})\b/g;
    const routePattern = /\b([A-Z]{3})\s*[-–→>]\s*([A-Z]{3})\b/g;
    const datePattern = /\b(\d{1,2}[\/\-]\d{1,2})\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b/gi;
    
    const flights = [...text.matchAll(flightPattern)];
    const routes = [...text.matchAll(routePattern)];
    const dates = [...text.matchAll(datePattern)];
    
    // Combine found patterns
    flights.forEach((match, i) => {
      results.push({
        flightNumber: `${match[1]}${match[2]}`,
        from: routes[i]?.[1] || null,
        to: routes[i]?.[2] || null,
        date: dates[i]?.[0] || null,
        type: 'FLIGHT'
      });
    });
    
    return results.slice(0, 50);
  });
}
