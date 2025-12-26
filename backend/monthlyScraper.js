/* ============================
   MONTHLY ROSTER SCRAPER (DOM-Only)
   
   Navigation flow (as described by user):
   1. After login → shows current month calendar
   2. At top, right of "today" shows month name
   3. Click LEFT arrow = previous month
   4. Click RIGHT arrow (2x) = next month
   5. Click each day → shows flights
   6. Click same day again if more flights
   7. Click flight → shows details
   8. Click dropdown right of "crew members on this leg"
   9. Click hotel dropdown → hotel info
   10. At bottom: click "NEWS" tab → scrape each entry
============================ */

import fs from 'fs';

export async function scrapeMonthlyRoster(page, targetMonth, targetYear, options = {}) {
  const { scrapeNewsSection = false } = options; // Only scrape news when explicitly requested
  console.log(`📅 Scraping ${targetYear}-${targetMonth}${scrapeNewsSection ? ' (with news)' : ''}`);

  // Wait for page to load after login
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

  // Step 2: Wait for calendar to load (current month shows by default)
  console.log('⏳ Waiting for calendar to load...');
  await page.waitForTimeout(5000);

  // DEBUG: Log what we see
  const debugInfo = await page.evaluate(() => {
    const allClasses = new Set();
    document.querySelectorAll('*').forEach(el => {
      el.classList.forEach(c => allClasses.add(c));
    });

    // Look for navigation elements
    const navKeywords = ['today', 'month', 'prev', 'next', 'arrow', 'nav', 'calendar', 'header'];
    const navClasses = Array.from(allClasses).filter(c => 
      navKeywords.some(k => c.toLowerCase().includes(k))
    );

    // Look for day elements
    const dayKeywords = ['day', 'cell', 'date', 'gantt', 'bar', 'slot', 'grid'];
    const dayClasses = Array.from(allClasses).filter(c => 
      dayKeywords.some(k => c.toLowerCase().includes(k))
    );

    return {
      url: window.location.href,
      totalElements: document.querySelectorAll('*').length,
      navClasses: navClasses.slice(0, 30),
      dayClasses: dayClasses.slice(0, 30),
      visibleText: document.body.innerText.substring(0, 2500)
    };
  });

  console.log('🔍 DEBUG - URL:', debugInfo.url);
  console.log('🔍 DEBUG - Total elements:', debugInfo.totalElements);
  console.log('🔍 DEBUG - Nav classes:', debugInfo.navClasses.join(', '));
  console.log('🔍 DEBUG - Day classes:', debugInfo.dayClasses.join(', '));
  console.log('🔍 DEBUG - Visible text:', debugInfo.visibleText.substring(0, 1500));

  // Step 3: Navigate to target month (wrapped in try-catch - don't let navigation kill the scrape)
  try {
    await navigateToMonth(page, targetMonth, targetYear);
  } catch (navErr) {
    console.warn('⚠️ Month navigation failed, continuing with current view:', navErr.message);
  }

  // 📄 DEBUG: Save full HTML snapshot for analysis
  try {
    const html = await page.content();
    const filename = `/tmp/netline-${targetYear}-${targetMonth}-${Date.now()}.html`;
    fs.writeFileSync(filename, html);
    console.log(`📄 DOM snapshot saved: ${filename}`);
  } catch (snapshotErr) {
    console.warn('⚠️ Could not save HTML snapshot:', snapshotErr.message);
  }

  // Step 4: Scrape all days
  const duties = await scrapeDayByDay(page);

  // Step 5: Scrape News section (only if requested - typically only on last month)
  let news = [];
  if (scrapeNewsSection) {
    try {
      news = await scrapeNews(page);
    } catch (newsErr) {
      console.warn('⚠️ News scraping failed, continuing:', newsErr.message);
    }
  }

  console.log(`✅ Total scraped: ${duties.length} duties, ${news.length} news items`);
  
  // Deduplicate duties by creating a unique key
  const uniqueDuties = [];
  const seenKeys = new Set();
  for (const duty of duties) {
    const key = `${duty.flightNumber || ''}-${duty.date || duty.fromDate || ''}-${duty.from || ''}-${duty.to || ''}-${duty.departureTime || duty.fromTime || ''}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueDuties.push(duty);
    }
  }
  
  if (uniqueDuties.length !== duties.length) {
    console.log(`🔄 Deduplicated: ${duties.length} → ${uniqueDuties.length} duties`);
  }
  
  // Always return what we have - never throw if we got duties
  return {
    duties: uniqueDuties,
    news
  };
}

/* ===== MONTH NAVIGATION ===== */

async function navigateToMonth(page, targetMonth, targetYear) {
  if (!targetMonth || !targetYear) {
    console.log('📅 No target month specified, using current view');
    return;
  }

  console.log(`🗓️ Navigating to ${targetYear}-${targetMonth}...`);

  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  // Calculate how many months to move
  const targetMonths = targetYear * 12 + targetMonth;
  const currentMonths = currentYear * 12 + currentMonth;
  const diff = targetMonths - currentMonths;

  console.log(`📅 Current: ${currentYear}-${currentMonth}, Target: ${targetYear}-${targetMonth}, Diff: ${diff} months`);

  if (diff === 0) {
    console.log('✅ Already on target month');
    return;
  }

  // Find navigation arrows - to the right of "today"
  const direction = diff > 0 ? 'next' : 'prev';
  const clicks = Math.abs(diff);

  console.log(`🔄 Clicking ${direction} arrow ${clicks} time(s)...`);

  for (let i = 0; i < clicks; i++) {
    const clicked = await page.evaluate((dir) => {
      // Look for arrows near "today" text
      const todayElement = Array.from(document.querySelectorAll('*')).find(el => 
        el.innerText?.trim()?.toLowerCase() === 'today'
      );

      if (todayElement) {
        // Look for arrow buttons in the same row/parent
        const parent = todayElement.closest('[class*="header"], [class*="nav"], [class*="toolbar"], [class*="row"]') || todayElement.parentElement?.parentElement;
        
        if (parent) {
          // Only get actual clickable buttons, not SVG or icon elements
          const buttons = parent.querySelectorAll('button, [role="button"]');
          const buttonArray = Array.from(buttons).filter(btn => 
            typeof btn.click === 'function' && btn.tagName !== 'SVG'
          );
          
          // prev is usually first/left, next is usually last/right
          if (dir === 'prev' && buttonArray.length > 0) {
            buttonArray[0].click();
            return 'Clicked first button (prev)';
          } else if (dir === 'next' && buttonArray.length > 1) {
            buttonArray[buttonArray.length - 1].click();
            return 'Clicked last button (next)';
          } else if (dir === 'next' && buttonArray.length === 1) {
            // If there's only one button, try to find more by looking wider
            const widerParent = parent.parentElement;
            if (widerParent) {
              const widerButtons = widerParent.querySelectorAll('button, [role="button"]');
              const widerArray = Array.from(widerButtons).filter(btn => typeof btn.click === 'function');
              if (widerArray.length > 1) {
                widerArray[widerArray.length - 1].click();
                return 'Clicked last button from wider parent (next)';
              }
            }
          }
        }
      }

      // Fallback: look for any prev/next buttons
      const selectors = dir === 'next' 
        ? ['[class*="next"]', '[aria-label*="next"]', '[class*="forward"]', '[class*="right-arrow"]', 'button[class*="Right"]']
        : ['[class*="prev"]', '[aria-label*="prev"]', '[class*="back"]', '[class*="left-arrow"]', 'button[class*="Left"]'];

      for (const sel of selectors) {
        const btn = document.querySelector(sel);
        if (btn && typeof btn.click === 'function') {
          btn.click();
          return `Clicked ${sel}`;
        }
      }

      // Last resort: find buttons with arrow icons
      const allButtons = document.querySelectorAll('button');
      const navButtons = [];
      for (const btn of allButtons) {
        const svg = btn.querySelector('svg');
        if (svg) {
          // Check if it's likely a nav button (small, near top)
          const rect = btn.getBoundingClientRect();
          if (rect.top < 200 && rect.width < 100) {
            navButtons.push({ btn, left: rect.left });
          }
        }
      }
      
      // Sort by position and pick appropriate one
      if (navButtons.length >= 2) {
        navButtons.sort((a, b) => a.left - b.left);
        if (dir === 'prev') {
          navButtons[0].btn.click();
          return 'Clicked leftmost nav button (prev)';
        } else {
          navButtons[navButtons.length - 1].btn.click();
          return 'Clicked rightmost nav button (next)';
        }
      } else if (navButtons.length === 1) {
        navButtons[0].btn.click();
        return 'Clicked only nav button found';
      }

      return null;
    }, direction);

    console.log(`  Click ${i + 1}: ${clicked || 'No button found'}`);
    await page.waitForTimeout(1500);
    
    if (!clicked) {
      console.warn(`⚠️ Could not find navigation button for click ${i + 1}, stopping navigation`);
      break;
    }
  }

  console.log('✅ Month navigation complete');
}

/* ===== DAY SCRAPING ===== */

async function scrapeDayByDay(page) {
  console.log('📋 Scraping duty rows from page...');
  
  // Step 1: Expand all pairings by clicking toggle-sublist-button on PAR type events
  console.log('🔽 Expanding all pairings to show sub-events...');
  await page.evaluate(() => {
    const toggleButtons = document.querySelectorAll('[data-test-id="toggle-sublist-button"]');
    toggleButtons.forEach(btn => btn.click());
  });
  await page.waitForTimeout(2000);
  
  // Step 2: Click all duty rows to expand details
  console.log('🔽 Clicking all duty rows to expand...');
  await page.$$eval('[data-testid*="duty"], .duty-row, [data-test-id="duty-row"]', rows =>
    rows.forEach(r => r.click())
  );
  await page.waitForTimeout(3000);
  
  // Step 3: Expand crew sections
  console.log('👥 Expanding crew sections...');
  await page.$$eval('button, div, span', els => {
    els
      .filter(e =>
        e.innerText?.toLowerCase().includes('crew')
      )
      .forEach(e => e.click());
  });
  await page.waitForTimeout(1000);
  
  // Step 4: Expand hotel/layover sections
  console.log('🏨 Expanding hotel sections...');
  await page.$$eval('button, div, span', els => {
    els
      .filter(e =>
        e.innerText?.toLowerCase().includes('hotel') ||
        e.innerText?.toLowerCase().includes('layover') ||
        e.innerText?.toLowerCase().includes('accommodation')
      )
      .forEach(e => e.click());
  });
  await page.waitForTimeout(3000);
  
  // Step 5: Scrape all duty rows including sub-events (C_I = Check-in, flights, etc.)
  const duties = await page.evaluate(() => {
    const results = [];
    
    // Find all duty rows (including sub-events after expansion)
    const dutyRows = document.querySelectorAll('[data-test-id="duty-row"]');
    console.log(`Found ${dutyRows.length} duty rows`);
    
    dutyRows.forEach((row, index) => {
      try {
        // Get the event type (PAR = pairing/flight, OTHER = sick/vacation, C_I = check-in, etc)
        const eventTypeEl = row.querySelector('[data-event-type]');
        const eventType = eventTypeEl?.getAttribute('data-event-type') || 'UNKNOWN';
        
        // Check if this is a sub-event (check-in, flight leg, etc.)
        const isSubEvent = row.querySelector('[data-test-id="duty-row-subevent"]') !== null;
        
        // Get the icon text (shows duty type like "OTHER" or has flight icon)
        const iconEl = row.querySelector('[data-test-id="duty-row-icon"]');
        const iconText = iconEl?.innerText?.trim() || '';
        
        // Get the details section
        const detailsEl = row.querySelector('[data-test-id="duty-row-details"]');
        if (!detailsEl) return;
        
        // First line is usually the title/flight number
        const titleEl = detailsEl.querySelector('.IADP-jss155');
        const title = titleEl?.innerText?.trim() || '';
        
        // Get all the date/time spans
        const timeSpans = detailsEl.querySelectorAll('.IADP-jss158');
        let startLocation = '', startDate = '', startTime = '';
        let endLocation = '', endDate = '', endTime = '';
        
        if (timeSpans.length >= 1) {
          const spans1 = timeSpans[0].querySelectorAll('span');
          startLocation = spans1[0]?.innerText?.trim() || '';
          startDate = spans1[1]?.innerText?.trim() || '';
          startTime = spans1[2]?.innerText?.trim() || '';
        }
        
        if (timeSpans.length >= 2) {
          const spans2 = timeSpans[1].querySelectorAll('span');
          endLocation = spans2[0]?.innerText?.trim() || '';
          endDate = spans2[1]?.innerText?.trim() || '';
          endTime = spans2[2]?.innerText?.trim() || '';
        }
        
        // Parse flight info from title
        // For flights: "GB3130    763    N1489A" 
        // For pairings: "C6208/06Dec    Rank: FO"
        // For check-in: "Check-in"
        let flightNumber = '';
        let rank = '';
        let aircraft = '';
        let tailNumber = '';
        
        // Check if this is a flight leg (has aircraft type and tail)
        const flightLegMatch = title.match(/^([A-Z]{2}\d{3,4})\s+(\d{3})\s+(N\d{3,5}[A-Z]*)/);
        if (flightLegMatch) {
          flightNumber = flightLegMatch[1];
          aircraft = flightLegMatch[2];
          tailNumber = flightLegMatch[3];
        } else {
          // Pairing format
          const pairingMatch = title.match(/([A-Z]\d{3,4})/);
          if (pairingMatch) {
            flightNumber = pairingMatch[1];
          }
          const rankMatch = title.match(/Rank:\s*(\w+)/);
          if (rankMatch) {
            rank = rankMatch[1];
          }
        }
        
        // Extract additional info lines (layovers, premium, take-off/landing)
        const allInfoLines = Array.from(detailsEl.querySelectorAll('.IADP-jss155')).map(el => el.innerText.trim());
        const extraInfo = allInfoLines.slice(1).join(' | ');
        
        // Determine if this is a check-in (report time)
        const isCheckIn = eventType === 'C_I' || title.toLowerCase().includes('check-in');
        
        results.push({
          type: eventType,
          dutyType: iconText || eventType,
          isSubEvent: isSubEvent,
          isCheckIn: isCheckIn,
          title: title,
          flightNumber: flightNumber || title.split('/')[0] || title,
          rank: rank,
          aircraft: aircraft,
          tailNumber: tailNumber,
          from: startLocation,
          fromDate: startDate,
          fromTime: startTime,
          to: endLocation,
          toDate: endDate,
          toTime: endTime,
          extraInfo: extraInfo,
          eventId: row.className.match(/event-id-(\d+)/)?.[1] || '',
          // Store index for later detail fetching
          rowIndex: index
        });
        
      } catch (err) {
        console.log(`Error parsing duty row ${index}:`, err.message);
      }
    });
    
    return results;
  });
  
  console.log(`✅ Scraped ${duties.length} duties from duty list`);
  
  // Step 3: For PAR (pairing) events, click details-page-button to get hotel/crew info
  console.log('🏨 Fetching hotel and crew details for pairings...');
  const pairings = duties.filter(d => d.type === 'PAR' && !d.isSubEvent);
  
  for (let i = 0; i < pairings.length; i++) {
    const pairing = pairings[i];
    console.log(`  📋 Getting details for pairing ${i + 1}/${pairings.length}: ${pairing.flightNumber}`);
    
    try {
      // Click the details-page-button for this pairing
      const details = await getPairingDetails(page, pairing.eventId);
      
      // Attach details to the pairing
      pairing.hotel = details.hotel;
      pairing.crew = details.crew;
      pairing.hotelPhone = details.hotelPhone;
      pairing.hotelAddress = details.hotelAddress;
      
      console.log(`    ✅ Hotel: ${details.hotel || 'N/A'}, Crew: ${details.crew?.length || 0} members`);
    } catch (err) {
      console.warn(`    ⚠️ Could not get details for ${pairing.flightNumber}:`, err.message);
    }
  }
  
  // If we got duties from the duty list, return them
  if (duties.length > 0) {
    return duties.map(duty => ({
      flightNumber: duty.flightNumber,
      type: duty.type,
      dutyType: duty.dutyType,
      isSubEvent: duty.isSubEvent,
      isCheckIn: duty.isCheckIn,
      from: duty.from,
      to: duty.to,
      date: duty.fromDate,
      departureTime: duty.fromTime,
      arrivalTime: duty.toTime,
      arrivalDate: duty.toDate,
      rank: duty.rank,
      aircraft: duty.aircraft,
      tailNumber: duty.tailNumber,
      title: duty.title,
      extraInfo: duty.extraInfo,
      eventId: duty.eventId,
      // Report time is the check-in time
      reportTime: duty.isCheckIn ? duty.fromTime : null,
      // Hotel/crew info (only on pairings)
      hotel: duty.hotel || null,
      hotelPhone: duty.hotelPhone || null,
      hotelAddress: duty.hotelAddress || null,
      crew: duty.crew || []
    }));
  }
  
  // Fallback to visible content scraping
  console.log('⚠️ No duty rows found, trying visible text scrape...');
  return await scrapeVisibleContent(page);
}

/* ===== PAIRING DETAILS (Hotel/Crew) ===== */

async function getPairingDetails(page, eventId) {
  const details = { hotel: null, hotelPhone: null, hotelAddress: null, crew: [] };
  
  try {
    // Find and click the details-page-button for this specific pairing
    const clicked = await page.evaluate((evtId) => {
      // Find the duty row with this event ID
      const row = document.querySelector(`.event-id-${evtId}[data-test-id="duty-row"]`);
      if (!row) return false;
      
      // Find the details button within this row
      const detailsBtn = row.querySelector('[data-test-id="details-page-button"]');
      if (detailsBtn) {
        detailsBtn.click();
        return true;
      }
      return false;
    }, eventId);
    
    if (!clicked) {
      console.log(`    ⚠️ Details button not found for event ${eventId}`);
      return details;
    }
    
    // Wait for details panel/XHRs to load
    await page.waitForTimeout(3000);
    
    // Look for and click on "Crew" related elements to expand
    await page.$$eval('button, div, span', els => {
      els
        .filter(e => e.innerText?.toLowerCase().includes('crew'))
        .forEach(e => e.click());
    });
    await page.waitForTimeout(1000);
    
    // Look for and click on "Hotel/Layover" related elements to expand
    await page.$$eval('button, div, span', els => {
      els
        .filter(e =>
          e.innerText?.toLowerCase().includes('hotel') ||
          e.innerText?.toLowerCase().includes('layover') ||
          e.innerText?.toLowerCase().includes('accommodation')
        )
        .forEach(e => e.click());
    });
    await page.waitForTimeout(2000);
    
    // Extract hotel and crew information
    const extracted = await page.evaluate(() => {
      const result = { hotel: null, hotelPhone: null, hotelAddress: null, crew: [] };
      const text = document.body.innerText;
      
      // Extract hotel name (common hotel chains)
      const hotelPatterns = [
        /((?:Hilton|Marriott|Holiday Inn|Hampton|Courtyard|Sheraton|Westin|Hyatt|Radisson|Best Western|Comfort|Days Inn|La Quinta|Embassy|Doubletree|Residence Inn|Fairfield|Four Points|Crowne Plaza|InterContinental|Renaissance|Aloft|Element|Home2|Tru by Hilton|AC Hotels?|Moxy|SpringHill|TownePlace)[^\n]{0,50})/i,
        /Hotel[:\s]+([^\n]{5,60})/i,
        /Accommodation[:\s]+([^\n]{5,60})/i,
        /Layover[:\s]+([^\n]{5,60})/i
      ];
      
      for (const pattern of hotelPatterns) {
        const match = text.match(pattern);
        if (match) {
          result.hotel = match[1]?.trim();
          break;
        }
      }
      
      // Extract hotel phone
      const phoneMatch = text.match(/(?:Hotel|Accommodation)\s*(?:Phone|Tel|Contact)?[:\s]*(\+?[\d\-\(\)\s]{10,20})/i);
      if (phoneMatch) {
        result.hotelPhone = phoneMatch[1]?.trim();
      }
      
      // Extract crew members
      // Look for names in specific sections or patterns
      const crewSection = text.match(/Crew(?:\s+Members?)?(?:\s+on\s+this\s+(?:leg|flight))?[:\s]*([\s\S]{0,500}?)(?:Hotel|Accommodation|Notes|$)/i);
      if (crewSection) {
        // Extract names (First Last pattern)
        const namePattern = /([A-Z][a-z]+)\s+([A-Z][a-z]+)/g;
        const matches = [...crewSection[1].matchAll(namePattern)];
        const names = matches.map(m => `${m[1]} ${m[2]}`);
        
        // Filter out common non-name phrases
        const excludeList = ['Crew Member', 'First Officer', 'Flight Attendant', 'More Info', 'Click Here', 'View All', 'No Crew'];
        result.crew = names.filter(n => !excludeList.includes(n)).slice(0, 10);
      }
      
      // Alternative: look for crew in table rows or list items
      if (result.crew.length === 0) {
        const crewElements = document.querySelectorAll('[class*="crew"] [class*="name"], [class*="crew"] td, [class*="crew"] li');
        crewElements.forEach(el => {
          const name = el.innerText?.trim();
          if (name && name.match(/^[A-Z][a-z]+ [A-Z][a-z]+$/)) {
            result.crew.push(name);
          }
        });
      }
      
      return result;
    });
    
    Object.assign(details, extracted);
    
    // Close the details panel
    await page.evaluate(() => {
      // Try various close methods
      const closeSelectors = [
        '[class*="close"]', 
        '[aria-label*="close"]', 
        '[aria-label*="Close"]',
        '[data-test-id*="close"]',
        'button[class*="back"]'
      ];
      for (const sel of closeSelectors) {
        const btn = document.querySelector(sel);
        if (btn) {
          btn.click();
          return;
        }
      }
      // Try Escape key
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await page.waitForTimeout(500);
    
  } catch (err) {
    console.log(`    ⚠️ Error getting pairing details:`, err.message);
  }
  
  return details;
}

async function getFlightsFromView(page) {
  return await page.evaluate(() => {
    const flights = [];
    const text = document.body.innerText;

    // Flight pattern: 2-3 letter airline code + 3-4 digit number
    const flightPattern = /\b([A-Z]{2,3})\s*(\d{3,4})\b/g;
    const matches = [...text.matchAll(flightPattern)];

    const seen = new Set();
    
    matches.forEach(match => {
      const flightNum = `${match[1]}${match[2]}`;
      if (seen.has(flightNum)) return;
      seen.add(flightNum);

      // Get context
      const start = Math.max(0, match.index - 80);
      const end = Math.min(text.length, match.index + 150);
      const context = text.substring(start, end);

      // Parse
      const routeMatch = context.match(/\b([A-Z]{3})\s*[-–→>to\s]+([A-Z]{3})\b/i);
      const timeMatch = context.match(/\b(\d{1,2}:\d{2})\b/g);
      const dateMatch = context.match(/\b(\d{1,2}[\/\-]\d{1,2})\b|\b(\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i);

      flights.push({
        flightNumber: flightNum,
        from: routeMatch?.[1] || null,
        to: routeMatch?.[2] || null,
        departureTime: timeMatch?.[0] || null,
        arrivalTime: timeMatch?.[1] || null,
        date: dateMatch?.[0] || null,
        type: context.toUpperCase().includes('RES') ? 'RESERVE' :
              context.toUpperCase().includes('DH') ? 'DEADHEAD' : 'FLIGHT'
      });
    });

    return flights;
  });
}

async function getFlightDetails(page, flight) {
  const details = { crew: [], hotel: null, aircraft: null, tail: null };

  try {
    // Click on flight element
    const clicked = await page.evaluate((flightNum) => {
      const els = document.querySelectorAll('*');
      for (const el of els) {
        if (el.innerText?.includes(flightNum) && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
          const clickable = el.closest('button, [role="button"], a, [class*="row"], [class*="item"]') || el;
          clickable.click();
          return true;
        }
      }
      return false;
    }, flight.flightNumber);

    if (!clicked) return details;
    await page.waitForTimeout(600);

    // Expand "crew members on this leg" dropdown
    await page.evaluate(() => {
      const els = document.querySelectorAll('*');
      for (const el of els) {
        const text = el.innerText?.toLowerCase() || '';
        if (text.includes('crew') && (text.includes('leg') || text.includes('member'))) {
          const parent = el.closest('[class*="accordion"], [class*="section"], [class*="row"]') || el.parentElement;
          const btns = parent?.querySelectorAll('button, [role="button"], [class*="expand"], [class*="toggle"], svg');
          if (btns?.length) {
            btns[btns.length - 1].click(); // Click rightmost button
            return true;
          }
          el.click();
          return true;
        }
      }
      return false;
    });
    await page.waitForTimeout(500);

    // Expand hotel dropdown
    await page.evaluate(() => {
      const els = document.querySelectorAll('*');
      for (const el of els) {
        const text = el.innerText?.toLowerCase() || '';
        if (text.includes('hotel') && text.length < 100) {
          const parent = el.closest('[class*="accordion"], [class*="section"], [class*="row"]') || el.parentElement;
          const btns = parent?.querySelectorAll('button, [role="button"], [class*="expand"], svg');
          if (btns?.length) {
            btns[btns.length - 1].click();
            return true;
          }
          el.click();
          return true;
        }
      }
      return false;
    });
    await page.waitForTimeout(400);

    // Extract details
    const extracted = await page.evaluate(() => {
      const text = document.body.innerText;

      // Crew names
      const namePattern = /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g;
      const names = [...text.matchAll(namePattern)]
        .map(m => `${m[1]} ${m[2]}`)
        .filter(n => !['Crew Member', 'First Officer', 'Flight Attendant', 'More Info'].includes(n))
        .slice(0, 10);

      // Hotel
      const hotelMatch = text.match(/((?:Hilton|Marriott|Holiday Inn|Hampton|Courtyard|Sheraton|Westin|Hyatt|Radisson|Best Western|Comfort|Days Inn|La Quinta|Embassy|Doubletree|Residence Inn|Fairfield)[^\n]{0,40})/i);

      // Tail
      const tailMatch = text.match(/\b(N\d{3,5}[A-Z]{0,2})\b/);

      // Aircraft
      const aircraftMatch = text.match(/\b(B?7[0-9]{2}|A3[0-9]{2}|E1[0-9]{2}|CRJ|ERJ|MD[0-9]{2}|767|757|737|777|787|747)\b/i);

      return {
        crew: names,
        hotel: hotelMatch?.[1]?.trim() || null,
        tail: tailMatch?.[1] || null,
        aircraft: aircraftMatch?.[1] || null
      };
    });

    Object.assign(details, extracted);
    await closePopup(page);

  } catch (err) {
    console.log('⚠️ Error getting details:', err.message);
  }

  return details;
}

/* ===== NEWS SCRAPING ===== */

async function scrapeNews(page) {
  const newsItems = [];

  console.log('📰 Looking for NEWS tab...');

  // Click on NEWS tab at bottom
  const foundNews = await page.evaluate(() => {
    const els = document.querySelectorAll('*');
    for (const el of els) {
      const text = el.innerText?.trim()?.toUpperCase();
      if (text === 'NEWS' && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
        el.click();
        return true;
      }
    }
    return false;
  });

  if (!foundNews) {
    console.log('⚠️ NEWS tab not found');
    return newsItems;
  }

  await page.waitForTimeout(2000);
  console.log('✅ Clicked NEWS tab');

  // Find and click each news entry
  const newsEntries = await page.$$('[class*="news"], [class*="News"], [class*="item"], [class*="entry"], [class*="list-item"]');
  console.log(`📰 Found ${newsEntries.length} potential news entries`);

  for (let i = 0; i < Math.min(newsEntries.length, 20); i++) {
    try {
      // Re-fetch entries (DOM might change)
      const entries = await page.$$('[class*="news"], [class*="News"], [class*="item"], [class*="entry"]');
      if (i >= entries.length) break;

      await entries[i].click();
      await page.waitForTimeout(500);

      // Extract news content
      const content = await page.evaluate(() => {
        const popup = document.querySelector('[class*="popup"], [class*="modal"], [class*="dialog"], [class*="detail"], [class*="content"]');
        const container = popup || document.body;
        
        const title = container.querySelector('h1, h2, h3, [class*="title"]')?.innerText?.trim() || '';
        const body = container.innerText?.substring(0, 500) || '';
        const dateMatch = body.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/);

        return {
          title,
          date: dateMatch?.[0] || null,
          content: body.substring(0, 300)
        };
      });

      if (content.title || content.content) {
        newsItems.push(content);
      }

      await closePopup(page);
      await page.waitForTimeout(300);

    } catch (err) {
      console.log(`⚠️ Error on news item ${i}:`, err.message);
    }
  }

  console.log(`📰 Scraped ${newsItems.length} news items`);
  return newsItems;
}

/* ===== HELPERS ===== */

async function closePopup(page) {
  await page.evaluate(() => {
    const closeSelectors = ['[class*="close"]', '[aria-label*="close"]', '[aria-label*="Close"]'];
    for (const sel of closeSelectors) {
      const btn = document.querySelector(sel);
      if (btn) {
        btn.click();
        return;
      }
    }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
}

async function scrapeVisibleContent(page) {
  console.log('📜 Fallback: scraping visible text...');
  
  return await page.evaluate(() => {
    const results = [];
    const text = document.body.innerText;
    const flightPattern = /\b([A-Z]{2,3})\s*(\d{3,4})\b/g;
    const matches = [...text.matchAll(flightPattern)];
    const seen = new Set();

    matches.forEach(match => {
      const flightNum = `${match[1]}${match[2]}`;
      if (seen.has(flightNum)) return;
      seen.add(flightNum);

      const context = text.substring(Math.max(0, match.index - 80), Math.min(text.length, match.index + 150));
      const routeMatch = context.match(/\b([A-Z]{3})\s*[-–→>]\s*([A-Z]{3})\b/);
      const dateMatch = context.match(/\b(\d{1,2}[\/\-]\d{1,2})\b/);

      results.push({
        flightNumber: flightNum,
        from: routeMatch?.[1] || null,
        to: routeMatch?.[2] || null,
        date: dateMatch?.[0] || null,
        type: 'FLIGHT',
        crew: [],
        hotel: null
      });
    });

    return results;
  });
}
