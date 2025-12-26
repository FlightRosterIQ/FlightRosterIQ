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
  
  // Always return what we have - never throw if we got duties
  return {
    duties,
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
  const allDuties = [];

  // Find day cells
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

  let usedSelector = '';
  let dayCount = 0;

  for (const selector of daySelectors) {
    const count = await page.$$eval(selector, els => els.length);
    if (count > 0) {
      console.log(`✅ Found ${count} day cells with: ${selector}`);
      usedSelector = selector;
      dayCount = count;
      break;
    }
  }

  if (dayCount === 0) {
    console.log('⚠️ No day cells found, trying visible text scrape...');
    return await scrapeVisibleContent(page);
  }

  // Click each day
  const daysToProcess = Math.min(dayCount, 31);
  console.log(`📆 Processing ${daysToProcess} days...`);

  for (let dayIndex = 0; dayIndex < daysToProcess; dayIndex++) {
    try {
      // Get current day cells (DOM may have changed)
      const dayCells = await page.$$(usedSelector);
      if (dayIndex >= dayCells.length) break;

      const dayCell = dayCells[dayIndex];
      console.log(`📅 Day ${dayIndex + 1}/${daysToProcess}`);

      // Click on day - keep clicking to get all flights
      let clickCount = 0;
      let lastFlightCount = 0;
      let noNewFlightsCount = 0;

      while (noNewFlightsCount < 2 && clickCount < 5) {
        await dayCell.click();
        await page.waitForTimeout(800);
        clickCount++;

        // Get flights from current view
        const flights = await getFlightsFromView(page);
        
        if (flights.length === lastFlightCount) {
          noNewFlightsCount++;
        } else {
          noNewFlightsCount = 0;
          lastFlightCount = flights.length;
        }

        // Process new flights
        for (const flight of flights) {
          if (!allDuties.some(d => d.flightNumber === flight.flightNumber && d.date === flight.date)) {
            // Get full details by clicking on flight
            const details = await getFlightDetails(page, flight);
            allDuties.push({ ...flight, ...details });
          }
        }
      }

      // Close any popup before next day
      await closePopup(page);
      await page.waitForTimeout(300);

    } catch (err) {
      console.log(`⚠️ Error on day ${dayIndex + 1}:`, err.message);
    }
  }

  return allDuties;
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
