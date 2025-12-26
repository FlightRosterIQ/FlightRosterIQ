/* ============================
   MONTHLY ROSTER SCRAPER (DOM-Only)
   Navigation flow:
   1. Dismiss cookies
   2. Wait for calendar to load
   3. Click each day of the month
   4. For each day: click repeatedly until all flights shown
   5. Click each flight → get details
   6. Expand "crew members on this leg" dropdown → get crew
   7. Click hotel → get hotel info
   8. Move to next day
============================ */

export async function scrapeMonthlyRoster(page, targetMonth, targetYear) {
  console.log(`📅 Scraping ${targetYear}-${targetMonth}`);

  // Wait for page to fully load after login
  await page.waitForTimeout(3000);

  // Step 1: Dismiss cookie banner
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

  // Step 2: Wait for calendar to load
  console.log('⏳ Waiting for calendar to load...');
  await page.waitForTimeout(5000);

  // DEBUG: Log what we see
  const debugInfo = await page.evaluate(() => {
    const allClasses = new Set();
    document.querySelectorAll('*').forEach(el => {
      el.classList.forEach(c => allClasses.add(c));
    });

    // Look for day-related elements
    const dayKeywords = ['day', 'cell', 'date', 'calendar', 'gantt', 'bar', 'slot', 'grid'];
    const dayClasses = Array.from(allClasses).filter(c => 
      dayKeywords.some(k => c.toLowerCase().includes(k))
    );

    return {
      url: window.location.href,
      totalElements: document.querySelectorAll('*').length,
      dayClasses: dayClasses.slice(0, 50),
      visibleText: document.body.innerText.substring(0, 2000)
    };
  });

  console.log('🔍 DEBUG - URL:', debugInfo.url);
  console.log('🔍 DEBUG - Total elements:', debugInfo.totalElements);
  console.log('🔍 DEBUG - Day-related classes:', debugInfo.dayClasses.join(', '));
  console.log('🔍 DEBUG - Visible text:', debugInfo.visibleText.substring(0, 1500));

  // Step 3: Find day cells and scrape each one
  const allDuties = await scrapeDayByDay(page);

  console.log(`✅ Total scraped: ${allDuties.length} duties`);
  return allDuties;
}

async function scrapeDayByDay(page) {
  const allDuties = [];

  // Find all day cells - try multiple selectors
  const daySelectors = [
    '[class*="day-cell"]',
    '[class*="DayCell"]',
    '[class*="calendar-day"]',
    '[class*="gantt-day"]',
    '[class*="slot"]',
    'td[class*="day"]',
    '[role="gridcell"]',
    '[data-day]',
    '[data-date]'
  ];

  let dayCells = [];
  let usedSelector = '';

  for (const selector of daySelectors) {
    const elements = await page.$$(selector);
    if (elements.length > 0) {
      console.log(`✅ Found ${elements.length} day cells with: ${selector}`);
      dayCells = elements;
      usedSelector = selector;
      break;
    }
  }

  if (dayCells.length === 0) {
    console.log('⚠️ No day cells found, trying to scrape visible content...');
    return await scrapeVisibleContent(page);
  }

  // Click each day cell
  const daysToProcess = Math.min(dayCells.length, 31);
  console.log(`📆 Processing ${daysToProcess} days...`);

  for (let dayIndex = 0; dayIndex < daysToProcess; dayIndex++) {
    try {
      // Re-fetch day cells (DOM might have changed)
      const currentDayCells = await page.$$(usedSelector);
      if (dayIndex >= currentDayCells.length) break;

      const dayCell = currentDayCells[dayIndex];
      console.log(`📅 Day ${dayIndex + 1}/${daysToProcess}`);

      // Click on the day
      await dayCell.click();
      await page.waitForTimeout(800);

      // Keep clicking to get all flights for this day
      let previousFlightCount = 0;
      let sameCountIterations = 0;
      
      while (sameCountIterations < 3) {
        // Get flights visible now
        const flightsOnDay = await getFlightsFromCurrentView(page);
        
        if (flightsOnDay.length === previousFlightCount) {
          sameCountIterations++;
        } else {
          sameCountIterations = 0;
          previousFlightCount = flightsOnDay.length;
        }

        // Process each flight
        for (const flight of flightsOnDay) {
          if (!allDuties.some(d => d.flightNumber === flight.flightNumber && d.date === flight.date)) {
            // Click on flight to get details
            const flightDetails = await clickAndGetFlightDetails(page, flight);
            allDuties.push({ ...flight, ...flightDetails });
          }
        }

        // Click day again to see if more flights appear
        try {
          await dayCell.click();
          await page.waitForTimeout(500);
        } catch {
          break; // Day cell no longer available
        }
      }

      // Close any open popup before moving to next day
      await closeAnyPopup(page);
      await page.waitForTimeout(300);

    } catch (err) {
      console.log(`⚠️ Error on day ${dayIndex + 1}:`, err.message);
    }
  }

  return allDuties;
}

async function getFlightsFromCurrentView(page) {
  return await page.evaluate(() => {
    const flights = [];
    const text = document.body.innerText;
    
    // Look for flight patterns in the visible text
    const flightPattern = /\b([A-Z]{2,3})\s*(\d{3,4})\b/g;
    const matches = [...text.matchAll(flightPattern)];
    
    // Also look for specific flight elements
    const flightElements = document.querySelectorAll('[class*="flight"], [class*="leg"], [class*="segment"], [class*="Flight"], [class*="Leg"]');
    
    flightElements.forEach(el => {
      const elText = el.innerText || '';
      const match = elText.match(/\b([A-Z]{2,3})\s*(\d{3,4})\b/);
      const routeMatch = elText.match(/\b([A-Z]{3})\s*[-–→>to\s]+([A-Z]{3})\b/i);
      const timeMatch = elText.match(/\b(\d{1,2}:\d{2})\b/g);
      const dateMatch = elText.match(/\b(\d{1,2}[\/\-]\d{1,2})\b|\b(\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i);
      
      if (match) {
        flights.push({
          flightNumber: `${match[1]}${match[2]}`,
          from: routeMatch?.[1] || null,
          to: routeMatch?.[2] || null,
          departureTime: timeMatch?.[0] || null,
          arrivalTime: timeMatch?.[1] || null,
          date: dateMatch?.[0] || null,
          type: elText.toUpperCase().includes('RES') ? 'RESERVE' : 
                elText.toUpperCase().includes('DH') ? 'DEADHEAD' : 'FLIGHT',
          rawText: elText.substring(0, 100)
        });
      }
    });

    // If no specific elements, parse from visible matches
    if (flights.length === 0) {
      matches.forEach(match => {
        const context = text.substring(Math.max(0, match.index - 50), match.index + 100);
        const routeMatch = context.match(/\b([A-Z]{3})\s*[-–→>]\s*([A-Z]{3})\b/);
        const dateMatch = context.match(/\b(\d{1,2}[\/\-]\d{1,2})\b/);
        
        flights.push({
          flightNumber: `${match[1]}${match[2]}`,
          from: routeMatch?.[1] || null,
          to: routeMatch?.[2] || null,
          date: dateMatch?.[0] || null,
          type: 'FLIGHT'
        });
      });
    }

    // Remove duplicates
    const unique = [];
    flights.forEach(f => {
      if (!unique.some(u => u.flightNumber === f.flightNumber)) {
        unique.push(f);
      }
    });

    return unique;
  });
}

async function clickAndGetFlightDetails(page, flight) {
  const details = {
    crew: [],
    hotel: null,
    aircraft: null,
    tail: null
  };

  try {
    // Try to click on the flight element
    const clicked = await page.evaluate((flightNum) => {
      const elements = document.querySelectorAll('*');
      for (const el of elements) {
        if (el.innerText?.includes(flightNum) && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
          // Look for a clickable element nearby
          const clickable = el.closest('button, [role="button"], a, [class*="click"], [class*="row"]') || el;
          clickable.click();
          return true;
        }
      }
      return false;
    }, flight.flightNumber);

    if (!clicked) return details;

    await page.waitForTimeout(600);

    // Expand "crew members on this leg" dropdown
    console.log('👥 Expanding crew dropdown...');
    await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      for (const el of elements) {
        const text = el.innerText?.toLowerCase() || '';
        if (text.includes('crew') && (text.includes('leg') || text.includes('member'))) {
          // Find the expand button to the right
          const parent = el.closest('[class*="accordion"], [class*="expand"], [class*="section"], [class*="row"]') || el.parentElement;
          const buttons = parent?.querySelectorAll('button, [role="button"], [class*="expand"], [class*="toggle"], [class*="arrow"], svg') || [];
          
          for (const btn of buttons) {
            btn.click();
            return true;
          }
          
          // Try clicking the element itself
          el.click();
          return true;
        }
      }
      return false;
    });

    await page.waitForTimeout(500);

    // Extract crew info
    details.crew = await page.evaluate(() => {
      const crewNames = [];
      const text = document.body.innerText;
      
      // Look for name patterns (First Last)
      const namePattern = /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g;
      const matches = [...text.matchAll(namePattern)];
      
      // Filter out common non-names
      const excludeWords = ['Crew', 'Member', 'Captain', 'First', 'Officer', 'Flight', 'Attendant', 'Hotel', 'More', 'Info', 'Less', 'Show', 'Hide'];
      
      matches.forEach(match => {
        const name = `${match[1]} ${match[2]}`;
        if (!excludeWords.includes(match[1]) && !excludeWords.includes(match[2]) && !crewNames.includes(name)) {
          crewNames.push(name);
        }
      });
      
      return crewNames.slice(0, 10);
    });

    // Click on hotel to expand
    console.log('🏨 Checking for hotel info...');
    await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      for (const el of elements) {
        const text = el.innerText?.toLowerCase() || '';
        if (text.includes('hotel') && text.length < 100) {
          const parent = el.closest('[class*="accordion"], [class*="expand"], [class*="section"]') || el.parentElement;
          const buttons = parent?.querySelectorAll('button, [role="button"], [class*="expand"]') || [];
          
          for (const btn of buttons) {
            btn.click();
            return true;
          }
          el.click();
          return true;
        }
      }
      return false;
    });

    await page.waitForTimeout(400);

    // Extract hotel and other details
    const moreDetails = await page.evaluate(() => {
      const text = document.body.innerText;
      
      // Hotel
      const hotelMatch = text.match(/hotel[:\s]*([^\n]{5,50})/i) || 
                         text.match(/((?:Hilton|Marriott|Holiday Inn|Hampton|Courtyard|Sheraton|Westin|Hyatt|Radisson|Best Western|Comfort|Quality|Days Inn|La Quinta|Embassy)[^\n]{0,30})/i);
      
      // Tail number
      const tailMatch = text.match(/\b(N\d{3,5}[A-Z]{0,2})\b/);
      
      // Aircraft type
      const aircraftMatch = text.match(/\b(B?7[0-9]{2}|A3[0-9]{2}|E1[0-9]{2}|CRJ|ERJ|MD[0-9]{2}|767|757|737|777|787|747)\b/i);

      return {
        hotel: hotelMatch?.[1]?.trim() || null,
        tail: tailMatch?.[1] || null,
        aircraft: aircraftMatch?.[1] || null
      };
    });

    Object.assign(details, moreDetails);

    // Close popup
    await closeAnyPopup(page);

  } catch (err) {
    console.log('⚠️ Error getting flight details:', err.message);
  }

  return details;
}

async function closeAnyPopup(page) {
  await page.evaluate(() => {
    // Try close buttons
    const closeSelectors = [
      '[class*="close"]',
      '[aria-label*="close"]', 
      '[aria-label*="Close"]',
      'button[class*="Close"]',
      '[class*="modal"] button:first-child',
      '[class*="dialog"] button:first-child'
    ];
    
    for (const sel of closeSelectors) {
      const btns = document.querySelectorAll(sel);
      for (const btn of btns) {
        if (btn.innerText?.toLowerCase()?.includes('close') || btn.getAttribute('aria-label')?.toLowerCase()?.includes('close')) {
          btn.click();
          return true;
        }
      }
    }
    
    // Press Escape
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
    return false;
  });
}

async function scrapeVisibleContent(page) {
  console.log('📜 Scraping all visible content...');
  
  return await page.evaluate(() => {
    const results = [];
    const text = document.body.innerText;
    
    // Find all flight patterns
    const flightPattern = /\b([A-Z]{2,3})\s*(\d{3,4})\b/g;
    const matches = [...text.matchAll(flightPattern)];
    
    const seen = new Set();
    
    matches.forEach(match => {
      const flightNum = `${match[1]}${match[2]}`;
      if (seen.has(flightNum)) return;
      seen.add(flightNum);
      
      // Get context around the match
      const start = Math.max(0, match.index - 100);
      const end = Math.min(text.length, match.index + 200);
      const context = text.substring(start, end);
      
      // Parse details from context
      const routeMatch = context.match(/\b([A-Z]{3})\s*[-–→>]\s*([A-Z]{3})\b/);
      const dateMatch = context.match(/\b(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\b/);
      const timeMatch = context.match(/\b(\d{1,2}:\d{2})\b/g);
      
      results.push({
        flightNumber: flightNum,
        from: routeMatch?.[1] || null,
        to: routeMatch?.[2] || null,
        date: dateMatch?.[0] || null,
        departureTime: timeMatch?.[0] || null,
        arrivalTime: timeMatch?.[1] || null,
        type: context.toUpperCase().includes('RES') ? 'RESERVE' :
              context.toUpperCase().includes('DH') ? 'DEADHEAD' : 'FLIGHT',
        crew: [],
        hotel: null
      });
    });
    
    return results;
  });
}
