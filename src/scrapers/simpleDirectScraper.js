// Simple Direct Scraper - Monthly Puppeteer scraping via /api/authenticate
// Backend uses Puppeteer to click through months and extract flights

import { API_BASE_URL } from '../config';

/**
 * Simple scraper that gets schedule data from Puppeteer month navigation
 * @param {string} employeeId - Crew member ID
 * @param {string} password - Password
 * @param {string} airline - 'abx' or 'ati'
 * @param {Function} onProgress - Optional callback for status updates
 * @returns {Promise<{flights: Array, news: Array}>} Object with flights and news arrays
 */
export async function simpleScrape(employeeId, password, airline = 'abx', onProgress = null) {
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
    { month: prevMonth, year: prevYear, label: getMonthName(prevMonth) },
    { month: currentMonth, year: currentYear, label: getMonthName(currentMonth) },
    { month: nextMonth, year: nextYear, label: getMonthName(nextMonth) }
  ];
  
  const allFlights = [];
  const allNews = [];
  
  try {
    for (let i = 0; i < monthsToScrape.length; i++) {
      const { month, year, label } = monthsToScrape[i];
      const progress = Math.round(((i + 1) / monthsToScrape.length) * 100);
      
      onProgress?.(`Loading ${label} ${year}... (${i + 1}/${monthsToScrape.length})`, progress);
      console.log(`📅 [SIMPLE SCRAPER] Loading ${label} ${year}...`);
      
      const authUrl = `${API_BASE_URL}/api/authenticate`;
      const authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employeeId: employeeId, 
          password: password,
          airline: airline,
          month: month,
          year: year
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
        const flightDate = duty.date || `${year}-${String(month).padStart(2, '0')}-01`;
        
        allFlights.push({
          id: `${year}-${month}-${dutyIndex}-${duty.flightNumber || 'duty'}`,
          flightNumber: duty.flightNumber || `Duty ${dutyIndex + 1}`,
          pairingId: duty.flightNumber,
          date: flightDate,
          origin: duty.from || 'TBD',
          destination: duty.to || 'TBD',
          departure: duty.departureTime || '00:00',
          arrival: duty.arrivalTime || '00:00',
          aircraft: duty.aircraft || 'TBD',
          aircraftType: duty.aircraft || 'TBD',
          tailNumber: duty.tail || '',
          tail: duty.tail || '',
          status: 'Confirmed',
          crewMembers: (duty.crew || []).map(name => ({ name, role: 'Crew' })),
          hotels: duty.hotel ? [{ name: duty.hotel }] : [],
          isDeadhead: duty.type === 'DEADHEAD',
          isReserveDuty: duty.type === 'RESERVE',
          dutyType: duty.type || 'FLIGHT',
          rawText: duty.rawText || ''
        });
      });
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
