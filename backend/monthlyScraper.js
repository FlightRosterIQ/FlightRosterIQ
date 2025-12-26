/* ============================
   MONTHLY ROSTER SCRAPER (DOM-Only)
   
   Navigation flow (as described by user):
   1. After login -> shows current month calendar
   2. At top, right of "today" shows month name
   3. Click LEFT arrow = previous month
   4. Click RIGHT arrow (2x) = next month
   5. Click each day -> shows flights
   6. Click same day again if more flights
   7. Click flight -> shows details
   8. Click dropdown right of "crew members on this leg"
   9. Click hotel dropdown -> hotel info
   10. At bottom: click "NEWS" tab -> scrape each entry
============================ */

import fs from 'fs';

/**
 * Helper: Convert "01Dec" or "26Nov" format to "YYYY-MM-DD"
 * @param {string} dateStr - Date in format "DDMon" (e.g., "01Dec", "26Nov")
 * @param {number} targetYear - The year to use
 * @param {number} targetMonth - The month being scraped (1-12)
 * @returns {string} - Date in "YYYY-MM-DD" format
 */
function normalizeDate(dateStr, targetYear, targetMonth) {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  // Parse "DDMon" format (e.g., "01Dec", "26Nov")
  const monthMap = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
  };
  
  const match = dateStr.match(/^(\d{1,2})([A-Za-z]{3})$/);
  if (!match) return dateStr;
  
  const day = match[1].padStart(2, '0');
  const monthAbbr = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
  const month = monthMap[monthAbbr];
  
  if (!month) return dateStr;
  
  // Determine the year: if month is earlier than target month, it's next year
  // e.g., if scraping December (12) and see "01Jan", that's next year
  let year = targetYear;
  if (month < targetMonth && targetMonth === 12) {
    year = targetYear + 1;
  } else if (month > targetMonth && targetMonth === 1) {
    year = targetYear - 1;
  }
  
  return `${year}-${String(month).padStart(2, '0')}-${day}`;
}

export async function scrapeMonthlyRoster(page, targetMonth, targetYear, options = {}) {
  const { scrapeNewsSection = false } = options; // Only scrape news when explicitly requested
  console.log(`=[LOG] Scraping ${targetYear}-${targetMonth}${scrapeNewsSection ? ' (with news)' : ''}`);

  // Wait for page to load after login
  await page.waitForTimeout(3000);

  // Step 1: Dismiss cookie banner
  console.log('=[LOG] Dismissing cookie banner...');
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
  console.log('[WAIT]� Waiting for calendar to load...');
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

  console.log('=[LOG] DEBUG - URL:', debugInfo.url);
  console.log('=[LOG] DEBUG - Total elements:', debugInfo.totalElements);
  console.log('=[LOG] DEBUG - Nav classes:', debugInfo.navClasses.join(', '));
  console.log('=[LOG] DEBUG - Day classes:', debugInfo.dayClasses.join(', '));
  console.log('=[LOG] DEBUG - Visible text:', debugInfo.visibleText.substring(0, 1500));

  // Step 3: Navigate to target month (wrapped in try-catch - don't let navigation kill the scrape)
  try {
    await navigateToMonth(page, targetMonth, targetYear);
  } catch (navErr) {
    console.warn('[WARN] Month navigation failed, continuing with current view:', navErr.message);
  }

  // [DEBUG] Save full HTML snapshot for selector analysis
  try {
    await page.waitForTimeout(5000); // Wait for React to finish rendering
    const html = await page.content();
    // Save to data folder (cross-platform compatible)
    const dataDir = new URL('./data/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
    const filename = `${dataDir}netline_rendered_${targetYear}-${targetMonth}_${Date.now()}.html`;
    fs.writeFileSync(filename, html);
    console.log(`[DEBUG] DOM snapshot saved: ${filename}`);
    console.log(`[DEBUG] HTML size: ${(html.length / 1024).toFixed(1)} KB`);
  } catch (snapshotErr) {
    console.warn('[WARN] Could not save HTML snapshot:', snapshotErr.message);
  }

  // Step 4: Scrape all days
  const duties = await scrapeDayByDay(page, targetYear, targetMonth);

  // Step 5: Scrape News section (only if requested - typically only on last month)
  let news = [];
  if (scrapeNewsSection) {
    try {
      news = await scrapeNews(page);
    } catch (newsErr) {
      console.warn('G��n+� News scraping failed, continuing:', newsErr.message);
    }
  }

  console.log(`[OK] Total scraped: ${duties.length} duties, ${news.length} news items`);
  
  // Mark reserve duties (SBY type or CVG-CVG with type=SBY/RSV only, not SICK/OTHER)
  for (const duty of duties) {
    // Only mark as RSV if it's a standby/reserve type, NOT sick/vacation/other
    const isSickOrVacation = duty.type === 'OTHER' && 
      (duty.title?.toLowerCase().includes('sick') || 
       duty.title?.toLowerCase().includes('vacation') || 
       duty.title?.toLowerCase().includes('vac'));
    
    if (duty.type === 'SBY' || 
        (duty.from && duty.to && duty.from === duty.to && !isSickOrVacation && duty.type !== 'OTHER')) {
      duty.isReserveDuty = true;
      duty.dutyType = 'RSV';
      if (!duty.flightNumber || duty.flightNumber === duty.title) {
        duty.flightNumber = 'RSV';
      }
      console.log(`[RSV] Marked as reserve: ${duty.from}-${duty.to} on ${duty.date || duty.fromDate}`);
    }
  }
  
  // Deduplicate duties by creating a unique key using exact date
  const uniqueDuties = [];
  const seenKeys = new Set();
  for (const duty of duties) {
    // Use exact date, flight number, origin, dest, and time for deduplication
    const exactDate = duty.date || duty.fromDate || '';
    const key = `${duty.flightNumber || ''}-${exactDate}-${duty.from || ''}-${duty.to || ''}-${duty.departureTime || duty.fromTime || ''}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueDuties.push(duty);
    } else {
      console.log(`[DEDUP] Skipping duplicate: ${key}`);
    }
  }
  
  if (uniqueDuties.length !== duties.length) {
    console.log(`[DEDUP] Deduplicated: ${duties.length} -> ${uniqueDuties.length} duties`);
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
    console.log('=[LOG] No target month specified, using current view');
    return;
  }

  console.log(`=[LOG] Navigating to ${targetYear}-${targetMonth}...`);

  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  // Calculate how many months to move
  const targetMonths = targetYear * 12 + targetMonth;
  const currentMonths = currentYear * 12 + currentMonth;
  const diff = targetMonths - currentMonths;

  console.log(`=[LOG] Current: ${currentYear}-${currentMonth}, Target: ${targetYear}-${targetMonth}, Diff: ${diff} months`);

  if (diff === 0) {
    console.log('G�� Already on target month');
    return;
  }

  // Find navigation arrows - to the right of "today"
  const direction = diff > 0 ? 'next' : 'prev';
  const clicks = Math.abs(diff);

  console.log(`=[LOG] Clicking ${direction} arrow ${clicks} time(s)...`);

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
      console.warn(`G��n+� Could not find navigation button for click ${i + 1}, stopping navigation`);
      break;
    }
  }

  console.log('G�� Month navigation complete');
}

/* ===== DAY SCRAPING ===== */

async function scrapeDayByDay(page, targetYear, targetMonth) {
  console.log('=[LOG] Scraping duty rows from page...');
  
  // Step 1: Expand all pairings by clicking toggle-sublist-button on PAR type events
  console.log('=[LOG] Expanding all pairings to show sub-events...');
  await page.evaluate(() => {
    const toggleButtons = document.querySelectorAll('[data-test-id="toggle-sublist-button"]');
    toggleButtons.forEach(btn => btn.click());
  });
  await page.waitForTimeout(2000);
  
  // Step 2: Click all duty rows to expand details
  console.log('=[LOG] Clicking all duty rows to expand...');
  await page.$$eval('[data-testid*="duty"], .duty-row, [data-test-id="duty-row"]', rows =>
    rows.forEach(r => r.click())
  );
  await page.waitForTimeout(3000);
  
  // Step 3: Expand crew sections
  console.log('=[LOG] Expanding crew sections...');
  await page.$$eval('button, div, span', els => {
    els
      .filter(e =>
        e.innerText?.toLowerCase().includes('crew')
      )
      .forEach(e => e.click());
  });
  await page.waitForTimeout(1000);
  
  // Step 4: Expand hotel/layover sections
  console.log('=[LOG] Expanding hotel sections...');
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
  const duties = await page.evaluate((targetYear, targetMonth) => {
    const results = [];
    
    // Helper: Convert "01Dec" or "26Nov" format to "YYYY-MM-DD" (in browser context)
    const normalizeDate = (dateStr, targetYear, targetMonth) => {
      if (!dateStr || typeof dateStr !== 'string') return dateStr;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      
      const monthMap = {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
      };
      
      const match = dateStr.match(/^(\d{1,2})([A-Za-z]{3})$/);
      if (!match) return dateStr;
      
      const day = match[1].padStart(2, '0');
      const monthAbbr = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
      const parsedMonth = monthMap[monthAbbr];
      
      if (!parsedMonth) return dateStr;
      
      let yearToUse = targetYear;
      if (parsedMonth < targetMonth && targetMonth === 12) {
        yearToUse = targetYear + 1;
      } else if (parsedMonth > targetMonth && targetMonth === 1) {
        yearToUse = targetYear - 1;
      }
      
      return `${yearToUse}-${String(parsedMonth).padStart(2, '0')}-${day}`;
    };
    
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
        let hotelName = ''; // For HOT events, extract hotel name
        
        if (timeSpans.length >= 1) {
          const spans1 = timeSpans[0].querySelectorAll('span');
          startLocation = (spans1[0]?.innerText || '').trim();
          startDate = (spans1[1]?.innerText || '').trim();
          startTime = (spans1[2]?.innerText || '').replace(/\s*LT\s*$/i, '').trim();
          
          // For HOT events, the format is: <span class="IADP-jss161">SEA </span><span>Doubletree</span>
          // So spans[1] contains the hotel name, not a date
          if (eventType === 'HOT' && spans1.length >= 2) {
            hotelName = (spans1[1]?.innerText || '').trim();
            startDate = ''; // Not a date for HOT
          }
        }
        
        if (timeSpans.length >= 2) {
          const spans2 = timeSpans[1].querySelectorAll('span');
          endLocation = (spans2[0]?.innerText || '').trim();
          endDate = (spans2[1]?.innerText || '').trim();
          endTime = (spans2[2]?.innerText || '').replace(/\s*LT\s*$/i, '').trim();
        }
        
        // Normalize dates with trimmed values
        const normalizedStartDate = normalizeDate(startDate, targetYear, targetMonth);
        const normalizedEndDate = normalizeDate(endDate, targetYear, targetMonth);
        
        console.log(`[SCRAPE] Row ${index}: type=${eventType}, title=${title}, from=${startLocation} ${startDate} -> ${normalizedStartDate}`);
        
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
          fromDate: normalizedStartDate,
          fromTime: startTime,
          to: endLocation,
          toDate: normalizedEndDate,
          toTime: endTime,
          extraInfo: extraInfo,
          hotelName: hotelName || '', // For HOT events, contains the hotel name
          eventId: row.className.match(/event-id-(\d+)/)?.[1] || '',
          // Store index for later detail fetching
          rowIndex: index
        });
        
      } catch (err) {
        console.log(`Error parsing duty row ${index}:`, err.message);
      }
    });
    
    return results;
  }, targetYear, targetMonth);
  
  console.log(`✈️ Scraped ${duties.length} duties from duty list`);
  
  // Debug: Log all unique duty types found
  const dutyTypes = [...new Set(duties.map(d => d.type))];
  console.log(`📊 [DEBUG] Duty types found: ${dutyTypes.join(', ')}`);
  console.log(`📊 [DEBUG] PAR count (all): ${duties.filter(d => d.type === 'PAR').length}`);
  console.log(`📊 [DEBUG] PAR count (non-sub): ${duties.filter(d => d.type === 'PAR' && !d.isSubEvent).length}`);
  console.log(`📊 [DEBUG] HOT count: ${duties.filter(d => d.type === 'HOT').length}`);
  
  // Step 2.5: Extract hotel info from HOT sub-events and link to parent pairings
  // HOT events are hotel layover rows - they have airport code + hotel name
  const hotelEvents = duties.filter(d => d.type === 'HOT');
  console.log(`🏨 Found ${hotelEvents.length} hotel events in duty list`);
  
  // Map hotels to their locations for easy lookup
  const hotelsByLocation = {};
  hotelEvents.forEach(h => {
    const location = h.from?.trim();
    // hotelName is now properly extracted from HOT events
    const hotelName = h.hotelName?.trim() || h.to?.trim() || '';
    
    console.log(`  🏨 Hotel at ${location}: "${hotelName}", eventId=${h.eventId}`);
    
    if (location && hotelName) {
      if (!hotelsByLocation[location]) hotelsByLocation[location] = [];
      hotelsByLocation[location].push({
        name: hotelName,
        eventId: h.eventId,
        date: h.fromDate || h.toDate
      });
    }
  });
  
  // Log hotel summary
  const allHotels = Object.values(hotelsByLocation).flat();
  console.log(`🏨 [DEBUG] Hotels extracted: ${allHotels.map(h => h.name).join(', ') || 'none'}`);
  
  // Step 3: For PAR (pairing) events, try to get details OR use HOT sub-events
  console.log('📋[LOG] Processing pairings for hotel and crew details...');
  const pairings = duties.filter(d => d.type === 'PAR' && !d.isSubEvent);
  console.log(`📋 [DEBUG] Found ${pairings.length} pairings to process`);
  
  // First, try to link hotels from HOT sub-events to their parent pairings
  // HOT events appear as sub-events under pairings in the DOM structure
  pairings.forEach(pairing => {
    // Check if there's a hotel in the destination location
    const destLocation = pairing.to?.trim();
    if (destLocation && hotelsByLocation[destLocation]) {
      const hotels = hotelsByLocation[destLocation];
      if (hotels.length > 0) {
        // Use the first hotel for this location
        pairing.hotel = hotels[0].name;
        console.log(`  🏨 Linked hotel "${pairing.hotel}" to pairing ${pairing.flightNumber} at ${destLocation}`);
      }
    }
  });
  
  for (let i = 0; i < pairings.length; i++) {
    const pairing = pairings[i];
    console.log(`  📋[LOG] Getting details for pairing ${i + 1}/${pairings.length}: ${pairing.flightNumber} (hotel from HOT: ${pairing.hotel || 'none'})`);
    
    try {
      // Click the details-page-button for this pairing
      const details = await getPairingDetails(page, pairing.eventId);
      
      // Attach details to the pairing - prefer details from click if available
      // But keep hotel from HOT if details didn't find one
      if (details.hotel) {
        pairing.hotel = details.hotel;
      }
      pairing.hotelPhone = details.hotelPhone;
      pairing.hotelFax = details.hotelFax;
      pairing.hotelEmail = details.hotelEmail;
      pairing.hotelAddress = details.hotelAddress;
      pairing.hotelCity = details.hotelCity;
      pairing.hotelZip = details.hotelZip;
      pairing.hotelCountry = details.hotelCountry;
      pairing.pickupTime = details.pickupTime;
      pairing.transferTime = details.transferTime;
      pairing.transportType = details.transportType;
      pairing.crew = details.crew;
      
      console.log(`    ✅ Hotel: ${pairing.hotel || 'N/A'}, Crew: ${details.crew?.length || 0} members`);
      
      // Log crew member details if found
      if (details.crew && details.crew.length > 0) {
        details.crew.forEach((c, idx) => {
          console.log(`       👤 ${idx + 1}. ${c.name} (${c.rank || 'N/A'}) - HB: ${c.homeBase || 'N/A'}, ID: ${c.crewId || 'N/A'}`);
        });
      }
    } catch (err) {
      console.warn(`    ⚠️ Could not get details for ${pairing.flightNumber}:`, err.message);
      // Keep any hotel info from HOT events
    }
  }
  
  // Step 4: Propagate crew info from pairings (PAR) to their child flight legs (LEG)
  // Flight legs are sub-events that belong to a pairing
  console.log('👥 [LOG] Propagating crew info to flight legs...');
  const flightLegs = duties.filter(d => d.type === 'LEG');
  console.log(`👥 [DEBUG] Found ${flightLegs.length} flight legs to link crew to`);
  
  // Create a map of pairing eventIds to their crew
  const pairingCrewMap = {};
  pairings.forEach(p => {
    if (p.eventId && p.crew && p.crew.length > 0) {
      pairingCrewMap[p.eventId] = {
        crew: p.crew,
        hotel: p.hotel,
        pairingCode: p.flightNumber
      };
    }
  });
  
  // Try to match flight legs to their parent pairing by date/time proximity
  flightLegs.forEach(leg => {
    // Find the pairing that contains this flight leg's date
    const legDate = leg.fromDate;
    const matchingPairing = pairings.find(p => {
      if (!p.fromDate || !p.toDate) return false;
      return legDate >= p.fromDate && legDate <= p.toDate;
    });
    
    if (matchingPairing && matchingPairing.crew && matchingPairing.crew.length > 0) {
      leg.crew = matchingPairing.crew;
      leg.parentPairing = matchingPairing.flightNumber;
      console.log(`   ✈️ Linked ${leg.crew.length} crew to flight ${leg.flightNumber} from pairing ${matchingPairing.flightNumber}`);
    }
  });
  
  // If we got duties from the duty list, return them
  if (duties.length > 0) {
    const result = duties.map(duty => ({
      flightNumber: duty.flightNumber,
      type: duty.type,
      dutyType: duty.dutyType,
      isSubEvent: duty.isSubEvent,
      isCheckIn: duty.isCheckIn,
      from: duty.from,
      to: duty.to,
      date: duty.fromDate,  // Already normalized above
      departureTime: duty.fromTime,
      arrivalTime: duty.toTime,
      arrivalDate: duty.toDate,  // Already normalized above
      rank: duty.rank,
      aircraft: duty.aircraft,
      tailNumber: duty.tailNumber,
      title: duty.title,
      extraInfo: duty.extraInfo,
      eventId: duty.eventId,
      parentPairing: duty.parentPairing || null,
      // Report time is the check-in time
      reportTime: duty.isCheckIn ? duty.fromTime : null,
      // Hotel/crew info (from pairings or propagated to legs)
      hotel: duty.hotel || null,
      hotelPhone: duty.hotelPhone || null,
      hotelFax: duty.hotelFax || null,
      hotelEmail: duty.hotelEmail || null,
      hotelAddress: duty.hotelAddress || null,
      hotelCity: duty.hotelCity || null,
      hotelZip: duty.hotelZip || null,
      hotelCountry: duty.hotelCountry || null,
      pickupTime: duty.pickupTime || null,
      transferTime: duty.transferTime || null,
      transportType: duty.transportType || null,
      crew: duty.crew || [],
      // Reserve duty flag
      isReserveDuty: duty.isReserveDuty || false
    }));
    
    // Log summary of crew assignments
    const dutiesWithCrew = result.filter(d => d.crew && d.crew.length > 0);
    console.log(`👥 [SUMMARY] ${dutiesWithCrew.length} duties have crew info attached`);
    
    return result;
  }
  
  // Fallback to visible content scraping
  console.log('G��n+� No duty rows found, trying visible text scrape...');
  return await scrapeVisibleContent(page);
}

/* ===== PAIRING DETAILS (Hotel/Crew) ===== */

async function getPairingDetails(page, eventId) {
  const details = { 
    hotel: null, 
    hotelPhone: null,
    hotelFax: null,
    hotelEmail: null,
    hotelAddress: null,
    hotelCity: null,
    hotelZip: null,
    hotelCountry: null,
    pickupTime: null,
    transferTime: null,
    transportType: null,
    crew: [] 
  };
  
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
      console.log(`    G��n+� Details button not found for event ${eventId}`);
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
      const result = { 
        hotel: null, 
        hotelPhone: null, 
        hotelFax: null,
        hotelEmail: null,
        hotelAddress: null,
        hotelCity: null,
        hotelZip: null,
        hotelCountry: null,
        pickupTime: null,
        transferTime: null,
        transportType: null,
        crew: [] 
      };
      
      const text = document.body.innerText;
      
      // === HOTEL DETAILS EXTRACTION ===
      
      // Extract hotel name - look for "Hotel name" label or common patterns
      const hotelNameMatch = text.match(/Hotel\s+name[:\s]+([^\n]+)/i) || 
                             text.match(/Hotel\s+details[:\s]+([^\n]+)/i);
      if (hotelNameMatch) {
        result.hotel = hotelNameMatch[1]?.trim();
      } else {
        // Fallback: look for common hotel chains
        const hotelPatterns = [
          /((?:Hilton|Marriott|Holiday Inn|Hampton|Courtyard|Sheraton|Westin|Hyatt|Radisson|Best Western|Comfort|Days Inn|La Quinta|Embassy|Doubletree|Residence Inn|Fairfield|Four Points|Crowne Plaza|InterContinental|Renaissance|Aloft|Element|Home2|Tru by Hilton|AC Hotels?|Moxy|SpringHill|TownePlace|Homewood)[^\n]{0,50})/i
        ];
        for (const pattern of hotelPatterns) {
          const match = text.match(pattern);
          if (match) {
            result.hotel = match[1]?.trim();
            break;
          }
        }
      }
      
      // Extract hotel address components
      const cityMatch = text.match(/City[:\s]+([^\n]+)/i);
      if (cityMatch) result.hotelCity = cityMatch[1]?.trim();
      
      const streetMatch = text.match(/Street[:\s]+([^\n]+)/i);
      if (streetMatch) result.hotelAddress = streetMatch[1]?.trim();
      
      const zipMatch = text.match(/Zip[:\s]+([^\n]+)/i);
      if (zipMatch) result.hotelZip = zipMatch[1]?.trim();
      
      const countryMatch = text.match(/Country[:\s]+([^\n]+)/i);
      if (countryMatch) result.hotelCountry = countryMatch[1]?.trim();
      
      // Combine address if individual components found
      if (!result.hotelAddress && (result.hotelCity || result.hotelZip)) {
        const parts = [result.hotelAddress, result.hotelCity, result.hotelZip, result.hotelCountry].filter(Boolean);
        if (parts.length > 0) {
          result.hotelAddress = parts.join(', ');
        }
      }
      
      // Extract hotel phone
      const phoneMatch = text.match(/Phone[:\s]+([+\d\-\(\)\s]{10,20})/i);
      if (phoneMatch) {
        result.hotelPhone = phoneMatch[1]?.trim();
      }
      
      // Extract hotel fax
      const faxMatch = text.match(/Fax[:\s]+([+\d\-\(\)\s]{10,20})/i);
      if (faxMatch) {
        result.hotelFax = faxMatch[1]?.trim();
      }
      
      // Extract hotel email
      const emailMatch = text.match(/Email[:\s]+([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      if (emailMatch) {
        result.hotelEmail = emailMatch[1]?.trim();
      }
      
      // Extract pickup time
      const pickupMatch = text.match(/Pickup\s+time[:\s]+([^\n]+)/i);
      if (pickupMatch) {
        result.pickupTime = pickupMatch[1]?.trim();
      }
      
      // Extract transfer time
      const transferMatch = text.match(/Transfer\s+time[:\s]+([^\n]+)/i);
      if (transferMatch) {
        result.transferTime = transferMatch[1]?.trim();
      }
      
      // Extract transport type
      const transportMatch = text.match(/Transport\s+company\s+type[:\s]+([^\n]+)/i);
      if (transportMatch) {
        result.transportType = transportMatch[1]?.trim();
      }
      
      // === CREW MEMBERS EXTRACTION ===
      console.log('[CREW DEBUG] Starting crew extraction...');
      console.log('[CREW DEBUG] Page text length:', text.length);
      
      // Method 1: Look for "CREW MEMBERS ON THIS LEG" section
      const crewSection = text.match(/CREW\s+MEMBERS\s+ON\s+THIS\s+LEG([\s\S]{0,3000}?)(?:YOUR\s+ROLE|EVENT\s+REMARK|Hotel|Accommodation|Transport|$)/i);
      
      if (crewSection) {
        console.log('[CREW DEBUG] Found CREW MEMBERS section');
        const crewText = crewSection[1];
        
        // Pattern 1: Look for structured format
        // NAME
        // RANK: CA  HB: CVG  SENIORITY: 123  CREW ID: 123456  PHONE: 555-1234
        const structuredPattern = /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+)\s*\n\s*RANK:\s*([A-Z]{2,3})\s+HB:\s*([A-Z]{3})\s+SENIORITY:\s*(\d+)\s+CREW\s*ID:\s*(\d+)(?:\s+PHONE:\s*([\d\-]+))?/gi;
        let match;
        while ((match = structuredPattern.exec(crewText)) !== null) {
          result.crew.push({
            name: match[1].trim(),
            rank: match[2],
            homeBase: match[3],
            seniority: match[4],
            crewId: match[5],
            phone: match[6] || null
          });
          console.log('[CREW DEBUG] Found crew member (structured):', match[1].trim());
        }
        
        // Pattern 2: Single line format with all details
        // JOHN DOE CA CVG 123 123456 555-1234
        if (result.crew.length === 0) {
          const singleLinePattern = /^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+)\s+(CA|FO|FA|FB|FP|ACM)\s+([A-Z]{3})\s+(\d{1,4})\s+(\d{5,7})/gm;
          while ((match = singleLinePattern.exec(crewText)) !== null) {
            result.crew.push({
              name: match[1].trim(),
              rank: match[2],
              homeBase: match[3],
              seniority: match[4],
              crewId: match[5],
              phone: null
            });
            console.log('[CREW DEBUG] Found crew member (single line):', match[1].trim());
          }
        }
        
        // Pattern 3: Table format - look for names followed by rank
        if (result.crew.length === 0) {
          const tablePattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s*(?:\||\t|,)?\s*(Captain|First\s+Officer|CA|FO|FA|Flight\s+Attendant)/gi;
          while ((match = tablePattern.exec(crewText)) !== null) {
            const rankMap = { 'Captain': 'CA', 'First Officer': 'FO', 'Flight Attendant': 'FA' };
            const rank = rankMap[match[2]] || match[2].toUpperCase().replace(/\s+/g, '').substring(0,2);
            result.crew.push({
              name: match[1].trim(),
              rank: rank,
              homeBase: null,
              seniority: null,
              crewId: null,
              phone: null
            });
            console.log('[CREW DEBUG] Found crew member (table):', match[1].trim());
          }
        }
      }
      
      // Method 2: Look for crew names in alternative sections
      if (result.crew.length === 0) {
        // Try to find any section with crew-related keywords
        const altCrewPatterns = [
          /Assigned\s+Crew[:\s]*([\s\S]{0,1000}?)(?:Notes|Remarks|Hotel|$)/i,
          /Crew\s+List[:\s]*([\s\S]{0,1000}?)(?:Notes|Remarks|Hotel|$)/i,
          /Operating\s+Crew[:\s]*([\s\S]{0,1000}?)(?:Notes|Remarks|Hotel|$)/i
        ];
        
        for (const pattern of altCrewPatterns) {
          const altMatch = text.match(pattern);
          if (altMatch) {
            console.log('[CREW DEBUG] Found alternative crew section');
            // Extract names from this section
            const namePattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/g;
            const names = altMatch[1].match(namePattern) || [];
            const excludeTerms = ['Crew', 'List', 'Member', 'Captain', 'Officer', 'Flight', 'Attendant', 'Assigned', 'Operating', 'Hotel', 'Phone', 'Email'];
            
            names.forEach(name => {
              if (!excludeTerms.some(term => name.includes(term)) && name.length > 4) {
                result.crew.push({
                  name: name.trim(),
                  rank: null,
                  homeBase: null,
                  seniority: null,
                  crewId: null,
                  phone: null
                });
                console.log('[CREW DEBUG] Found crew member (alt section):', name.trim());
              }
            });
            if (result.crew.length > 0) break;
          }
        }
      }
      
      // Method 3: DOM-based extraction as fallback
      if (result.crew.length === 0) {
        console.log('[CREW DEBUG] Trying DOM-based extraction');
        const crewElements = document.querySelectorAll('[class*="crew"] [class*="name"], [class*="crew"] td, [class*="crew"] li, [data-test-id*="crew"]');
        crewElements.forEach(el => {
          const name = el.innerText?.trim();
          if (name && name.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+/) && name.length < 40) {
            const excludeList = ['Crew Member', 'First Officer', 'Flight Attendant', 'More Info', 'Click Here', 'View All', 'No Crew'];
            if (!excludeList.some(ex => name.includes(ex))) {
              result.crew.push({ name: name, rank: null, homeBase: null, seniority: null, crewId: null, phone: null });
              console.log('[CREW DEBUG] Found crew member (DOM):', name);
            }
          }
        });
      }
      
      console.log('[CREW DEBUG] Total crew members found:', result.crew.length);
      
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
    console.log(`    G��n+� Error getting pairing details:`, err.message);
  }
  
  return details;
}

async function getFlightsFromView(page, targetYear, targetMonth) {
  return await page.evaluate((year, month) => {
    const flights = [];
    const text = document.body.innerText;

    // Helper: Convert "01Dec" or "26Nov" format to "YYYY-MM-DD" (in browser context)
    const normalizeDate = (dateStr, targetYear, targetMonth) => {
      if (!dateStr || typeof dateStr !== 'string') return dateStr;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      
      const monthMap = {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
      };
      
      const match = dateStr.match(/^(\d{1,2})([A-Za-z]{3})$/);
      if (!match) return dateStr;
      
      const day = match[1].padStart(2, '0');
      const monthAbbr = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
      const parsedMonth = monthMap[monthAbbr];
      
      if (!parsedMonth) return dateStr;
      
      let yearToUse = targetYear;
      if (parsedMonth < targetMonth && targetMonth === 12) {
        yearToUse = targetYear + 1;
      } else if (parsedMonth > targetMonth && targetMonth === 1) {
        yearToUse = targetYear - 1;
      }
      
      return `${yearToUse}-${String(parsedMonth).padStart(2, '0')}-${day}`;
    };

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

      // Parse route (e.g., CVG -> SEA, CVG-SEA, CVG to SEA)
      const routeMatch = context.match(/\b([A-Z]{3})\s*(?:->|to|-)\s*([A-Z]{3})\b/i);
      const timeMatch = context.match(/\b(\d{1,2}:\d{2})\b/g);
      const dateMatch = context.match(/\b(\d{1,2}[\/\-]\d{1,2})\b|\b(\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i);

      flights.push({
        flightNumber: flightNum,
        from: routeMatch?.[1] || null,
        to: routeMatch?.[2] || null,
        departureTime: timeMatch?.[0] || null,
        arrivalTime: timeMatch?.[1] || null,
        date: normalizeDate(dateMatch?.[0] || null, year, month),
        type: context.toUpperCase().includes('RES') ? 'RESERVE' :
              context.toUpperCase().includes('DH') ? 'DEADHEAD' : 'FLIGHT'
      });
    });

    return flights;
  }, targetYear, targetMonth);
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
    console.log('G��n+� Error getting details:', err.message);
  }

  return details;
}

/* ===== NEWS SCRAPING ===== */

async function scrapeNews(page) {
  const newsItems = [];

  console.log('=[LOG] Looking for NEWS tab...');

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
    console.log('G��n+� NEWS tab not found');
    return newsItems;
  }

  await page.waitForTimeout(2000);
  console.log('G�� Clicked NEWS tab');

  // Find and click each news entry
  const newsEntries = await page.$$('[class*="news"], [class*="News"], [class*="item"], [class*="entry"], [class*="list-item"]');
  console.log(`=[LOG] Found ${newsEntries.length} potential news entries`);

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
      console.log(`G��n+� Error on news item ${i}:`, err.message);
    }
  }

  console.log(`=[LOG] Scraped ${newsItems.length} news items`);
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
  console.log('=[LOG] Fallback: scraping visible text...');
  
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
      const routeMatch = context.match(/\b([A-Z]{3})\s*(?:->|to|-)\s*([A-Z]{3})\b/);
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
