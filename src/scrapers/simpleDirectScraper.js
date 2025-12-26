// Simple Direct Scraper - Monthly Puppeteer scraping via /api/authenticate
// Backend uses Puppeteer to click through months and extract flights

import { API_BASE_URL } from '../config';

/**
 * Simple scraper that gets schedule data from Puppeteer month navigation
 * @param {string} employeeId - Crew member ID
 * @param {string} password - Password
 * @param {string} airline - 'abx' or 'ati'
 * @param {Function} onProgress - Optional callback for status updates (status, progress%)
 * @param {Function} onFlightsUpdate - Optional callback for progressive flight updates (flights[])
 * @param {Array} existingFlights - Optional array of existing flights to skip re-scraping months that have data
 * @returns {Promise<{flights: Array, news: Array}>} Object with flights and news arrays
 */
export async function simpleScrape(employeeId, password, airline = 'abx', onProgress = null, onFlightsUpdate = null, existingFlights = []) {
  console.log('🔧 [SIMPLE SCRAPER] Starting multi-month Puppeteer scrape for:', employeeId);
  
  // Calculate months to scrape (previous, current, next)
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  const currentYear = now.getFullYear();
  
  let prevMonth = currentMonth - 1;
  let prevYear = currentYear;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  
  let nextMonth = currentMonth + 1;
  let nextYear = currentYear;
  if (nextMonth === 13) {
    nextMonth = 1;
    nextYear += 1;
  }
  
  const monthsToScrape = [
    { month: prevMonth, year: prevYear, label: getMonthName(prevMonth), isPreviousMonth: true },
    { month: currentMonth, year: currentYear, label: getMonthName(currentMonth), isPreviousMonth: false },
    { month: nextMonth, year: nextYear, label: getMonthName(nextMonth), isPreviousMonth: false }
  ];
  
  // Helper to check if a month already has flights in existing data
  const getExistingFlightsForMonth = (year, month) => {
    if (!existingFlights || existingFlights.length === 0) return [];
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}-`;
    return existingFlights.filter(f => f.date && f.date.startsWith(prefix));
  };
  
  const allFlights = [];
  const allNews = [];
  
  try {
    for (let i = 0; i < monthsToScrape.length; i++) {
      const { month, year, label, isPreviousMonth } = monthsToScrape[i];
      const progress = Math.round(((i + 1) / monthsToScrape.length) * 100);
      const isLastMonth = i === monthsToScrape.length - 1;
      
      // Only skip re-scraping for PREVIOUS month if it already has flights
      // Current and next month should always be scraped fresh
      if (isPreviousMonth) {
        const existingMonthFlights = getExistingFlightsForMonth(year, month);
        if (existingMonthFlights.length > 0) {
          console.log(`⏭️ [SIMPLE SCRAPER] Skipping ${label} ${year} - already has ${existingMonthFlights.length} flights`);
          onProgress?.(`Using cached ${label} ${year} (${existingMonthFlights.length} flights)`, progress);
          allFlights.push(...existingMonthFlights);
          
          // Progressive update with existing data
          if (onFlightsUpdate && allFlights.length > 0) {
            console.log(`📤 [SIMPLE SCRAPER] Sending ${allFlights.length} flights to UI (from cache)`);
            onFlightsUpdate([...allFlights]);
          }
          continue;
        }
      }
      
      onProgress?.(`Syncing ${label} ${year}... (${i + 1}/${monthsToScrape.length})`, progress);
      console.log(`📅 [SIMPLE SCRAPER] Syncing ${label} ${year}...`);
      
      const authUrl = `${API_BASE_URL}/api/authenticate`;
      const authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employeeId: employeeId, 
          password: password,
          airline: airline,
          month: month,
          year: year,
          scrapeNews: isLastMonth // Only scrape news on the last month
        })
      });
      
      console.log(`📅 [SIMPLE SCRAPER] ${label} response status:`, authResponse.status);
      const authData = await authResponse.json();
      
      if (!authData.success) {
        console.error(`❌ [SIMPLE SCRAPER] ${label} failed:`, authData.error);
        continue; // Continue with other months
      }
      
      // Backend now returns { success, duties, news, count }
      const duties = authData.duties || [];
      const news = authData.news || [];
      
      console.log(`✅ [SIMPLE SCRAPER] ${label}: Got ${duties.length} duties, ${news.length} news items`);
      
      // Add news items (only once, from first successful response)
      if (news.length > 0 && allNews.length === 0) {
        allNews.push(...news);
      }
      
      // Transform duties to flights
      duties.forEach((duty, dutyIndex) => {
        // Each duty from DOM scraper has: flightNumber, from, to, date, type, crew, hotel, aircraft, tail
        // Date comes as "06Dec  " - need to convert to ISO format "2025-12-06"
        let flightDate = `${year}-${String(month).padStart(2, '0')}-01`; // default
        
        if (duty.date) {
          // Parse date like "06Dec" or "06Dec  " 
          const dateMatch = duty.date.trim().match(/^(\d{1,2})([A-Za-z]{3})/);
          if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const monthAbbr = dateMatch[2];
            const monthMap = {
              'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
              'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
              'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
            };
            const monthNum = monthMap[monthAbbr] || String(month).padStart(2, '0');
            flightDate = `${year}-${monthNum}-${day}`;
          }
        }
        
        // Clean up times - remove "LT" suffix
        const cleanTime = (time) => {
          if (!time) return '00:00';
          // Convert "05:00 LT" to "05:00"
          const match = time.match(/(\d{1,2}):?(\d{2})/);
          if (match) {
            return `${match[1].padStart(2, '0')}:${match[2]}`;
          }
          return time.replace(/\s*LT\s*/i, '').trim() || '00:00';
        };
        
        allFlights.push({
          id: `${year}-${month}-${dutyIndex}-${duty.flightNumber || 'duty'}`,
          flightNumber: duty.flightNumber || `Duty ${dutyIndex + 1}`,
          pairingId: duty.flightNumber,
          date: flightDate,
          origin: (duty.from || 'TBD').trim(),
          destination: (duty.to || 'TBD').trim(),
          departure: cleanTime(duty.departureTime),
          arrival: cleanTime(duty.arrivalTime),
          aircraft: duty.aircraft || 'TBD',
          aircraftType: duty.aircraft || 'TBD',
          tailNumber: duty.tailNumber || duty.tail || '',
          tail: duty.tailNumber || duty.tail || '',
          status: 'Confirmed',
          crewMembers: (duty.crew || []).map(name => ({ name, role: 'Crew' })),
          hotels: duty.hotel ? [{ name: duty.hotel, phone: duty.hotelPhone, address: duty.hotelAddress }] : [],
          isDeadhead: duty.type === 'DEADHEAD',
          isReserveDuty: duty.type === 'RESERVE' || duty.type === 'OTHER',
          isCheckIn: duty.isCheckIn || false,
          reportTime: duty.reportTime || null,
          dutyType: duty.type || 'FLIGHT',
          title: duty.title || '',
          extraInfo: duty.extraInfo || '',
          rawText: duty.rawText || ''
        });
      });
      
      // Progressive update: send flights so far to the UI
      if (onFlightsUpdate && allFlights.length > 0) {
        console.log(`📤 [SIMPLE SCRAPER] Sending ${allFlights.length} flights to UI (progressive update)`);
        onFlightsUpdate([...allFlights]);
      }
    }
    
    console.log('✅ [SIMPLE SCRAPER] Multi-month scrape complete! Total flights:', allFlights.length, 'News:', allNews.length);
    onProgress?.(`Completed! Loaded ${allFlights.length} flights`, 100);
    
    // Return object with both flights and news
    return { flights: allFlights, news: allNews };
    
  } catch (error) {
    console.error('❌ [SIMPLE SCRAPER] Error:', error);
    throw error;
  }
}

/**
 * Get month name from month number
 */
function getMonthName(month) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1];
}

/**
 * Transform duties to flight format for the app
 */
export function transformDutiesToFlights(duties) {
  console.log('🔄 [SIMPLE SCRAPER] Transforming', duties.length, 'duties to flights');
  
  const flights = [];
  
  duties.forEach(duty => {
    console.log('🔄 Processing duty:', duty.logicalId, 'legs:', duty.legs?.length || 0);
    
    if (duty.legs && duty.legs.length > 0) {
      // Create a flight for each leg
      duty.legs.forEach((leg, index) => {
        const legDate = leg.departUtc ? leg.departUtc.split('T')[0] : duty.startUtc.split('T')[0];
        flights.push({
          id: `${duty.logicalId}_leg${index}`,
          flightNumber: leg.flightNumber || duty.pairing || 'Unknown',
          pairingId: duty.pairing,
          date: legDate,
          origin: leg.from || 'Unknown',
          destination: leg.to || 'Unknown',
          departure: leg.departUtc || duty.startUtc,
          arrival: leg.arriveUtc || duty.endUtc,
          aircraft: leg.aircraft || 'Unknown',
          aircraftType: leg.aircraft || 'Unknown',
          tailNumber: leg.tail || '',
          tail: leg.tail || '',
          status: 'Confirmed',
          rank: duty.crew?.find(c => c.role === 'PIC' || c.role === 'CA') ? 'CA' : 'FO',
          crewMembers: duty.crew || [],
          hotels: duty.hotel ? [{ name: duty.hotel }] : [],
          isDeadhead: leg.deadhead || false,
          isReserveDuty: duty.type === 'OTHER',
          isTraining: duty.type === 'TRAINING',
          dutyType: duty.type,
          legNumber: index + 1,
          totalLegs: duty.legs.length
        });
      });
    } else {
      // No legs - create a single duty entry
      flights.push({
        id: duty.logicalId,
        flightNumber: duty.pairing || 'Reserve',
        pairingId: duty.pairing,
        date: duty.startUtc.split('T')[0],
        origin: 'Base',
        destination: 'Base',
        departure: duty.startUtc,
        arrival: duty.endUtc,
        aircraft: 'N/A',
        aircraftType: 'N/A',
        status: 'Confirmed',
        rank: 'FO',
        crewMembers: duty.crew || [],
        hotels: duty.hotel ? [{ name: duty.hotel }] : [],
        isReserveDuty: duty.type === 'OTHER',
        isTraining: duty.type === 'TRAINING',
        dutyType: duty.type
      });
    }
  });
  
  console.log('✅ [SIMPLE SCRAPER] Transformed to', flights.length, 'flights');
  return flights;
}
