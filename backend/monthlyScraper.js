/* ============================
   MONTHLY ROSTER SCRAPER (DOM-Only)
   - Navigate months via arrows
   - Expand all duty rows
   - Expand crew & hotel panels
   - Scrape visible DOM text
   - Fail-safe everywhere
============================ */

export async function scrapeMonthlyRoster(page, targetMonth, targetYear) {
  console.log(`📅 Scraping ${targetYear}-${targetMonth}`);

  await navigateToMonth(page, targetMonth, targetYear);

  // Give React time to render
  await page.waitForTimeout(3000);

  // Expand everything
  await expandAll(page);

  const duties = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('[data-testid="duty-row"], .duty-row, [class*="duty"], [class*="pairing"]'));

    return rows.map(row => {
      const safe = (sel) => row.querySelector(sel)?.innerText?.trim() || null;

      const typeText = row.innerText.toUpperCase();
      let type = 'FLIGHT';
      if (typeText.includes('RES')) type = 'RESERVE';
      else if (typeText.includes('IADP')) type = 'IADP';
      else if (typeText.includes('DH')) type = 'DEADHEAD';

      return {
        date: safe('.duty-date, [class*="date"]'),
        pairing: safe('.pairing-number, [class*="pairing"]'),
        type,
        aircraft: safe('.aircraft, [class*="aircraft"]'),
        tail: safe('.tail, [class*="tail"]'),
        from: safe('.leg-from, [class*="departure"], [class*="origin"]'),
        to: safe('.leg-to, [class*="arrival"], [class*="destination"]'),
        hotel: safe('.hotel-name, [class*="hotel"]'),
        crew: Array.from(row.querySelectorAll('.crew-member, [class*="crew"]')).map(c => c.innerText.trim())
      };
    });
  });

  console.log(`✅ Scraped ${duties.length} duties`);
  return duties;
}

/* ------------------ HELPERS ------------------ */

async function navigateToMonth(page, month, year) {
  if (!month || !year) {
    console.log('📅 No month/year specified, using current view');
    return;
  }

  const target = `${year}-${String(month).padStart(2, '0')}`;
  console.log(`🗓️ Navigating to ${target}`);

  const getCurrent = async () =>
    page.evaluate(() =>
      document.querySelector('.month-label, [class*="month"], [class*="calendar-header"]')?.innerText || ''
    );

  let attempts = 0;
  while (attempts < 12) {
    const current = await getCurrent();
    console.log(`📅 Current: "${current}"`);
    
    if (current.includes(String(year)) && current.includes(getMonthName(month))) {
      console.log(`✅ Reached target month`);
      return;
    }

    // Determine direction
    const isForward = needsForward(current, month, year);
    const btnSelector = isForward 
      ? '.next-month, [class*="next"], button[aria-label*="next"], svg[class*="next"]'
      : '.prev-month, [class*="prev"], button[aria-label*="prev"], svg[class*="prev"]';

    console.log(`🔄 Clicking ${isForward ? 'next' : 'prev'} month`);

    const clicked = await page.evaluate((selector) => {
      const btn = document.querySelector(selector);
      if (btn) {
        btn.click();
        return true;
      }
      // Try finding by arrow icon
      const arrows = document.querySelectorAll('button, [role="button"]');
      for (const arrow of arrows) {
        if (arrow.querySelector('svg')) {
          arrow.click();
          return true;
        }
      }
      return false;
    }, btnSelector);

    if (!clicked) {
      console.log('⚠️ Could not find month navigation button');
      break;
    }

    await page.waitForTimeout(1500);
    attempts++;
  }

  console.log(`⚠️ Month navigation finished after ${attempts} attempts`);
}

function getMonthName(month) {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[month - 1] || '';
}

function needsForward(current, targetMonth, targetYear) {
  // Simple heuristic - compare year and month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  const targetDate = new Date(targetYear, targetMonth - 1);
  const nowDate = new Date(currentYear, currentMonth - 1);
  
  return targetDate > nowDate;
}

async function expandAll(page) {
  console.log('📂 Expanding all duty rows...');

  // Expand duty rows - try multiple selectors
  const expandSelectors = [
    '.expand-button',
    '.info-button',
    '[class*="expand"]',
    '[class*="toggle"]',
    '[aria-expanded="false"]',
    'button[class*="icon"]'
  ];

  for (const selector of expandSelectors) {
    const buttons = await page.$$(selector);
    console.log(`  Found ${buttons.length} buttons with "${selector}"`);
    for (const btn of buttons) {
      try { 
        await btn.click(); 
        await page.waitForTimeout(200);
      } catch {}
    }
  }

  await page.waitForTimeout(2000);

  // Expand crew dropdowns
  console.log('👥 Expanding crew details...');
  const crewSelectors = ['.crew-toggle', '[class*="crew"] button', '[class*="member"] button'];
  
  for (const selector of crewSelectors) {
    const buttons = await page.$$(selector);
    for (const btn of buttons) {
      try { 
        await btn.click(); 
        await page.waitForTimeout(200);
      } catch {}
    }
  }

  await page.waitForTimeout(1000);
  console.log('✅ Expansion complete');
}
