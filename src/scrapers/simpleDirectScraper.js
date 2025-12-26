// Simple Direct Scraper - Puppeteer scraping via /api/authenticate
// The backend returns the full schedule data in the auth response

import { API_BASE_URL } from '../config';

/**
 * Simple scraper that gets schedule data from Puppeteer scraping
 * @param {string} employeeId - Crew member ID
 * @param {string} password - Password
 * @param {string} airline - 'abx' or 'ati'
 * @returns {Promise<Array>} Array of flights
 */
export async function simpleScrape(employeeId, password, airline = 'abx') {
  console.log('🔧 [SIMPLE SCRAPER] Starting Puppeteer scrape for:', employeeId);
  
  try {
    console.log('🌐 [SIMPLE SCRAPER] Calling authenticate endpoint with scraping...');
    const authUrl = `${API_BASE_URL}/api/authenticate`;
    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        employeeId: employeeId, 
        password: password, 
        airline: airline 
      })
    });
    
    console.log('🌐 [SIMPLE SCRAPER] Response status:', authResponse.status);
    const authData = await authResponse.json();
    console.log('🌐 [SIMPLE SCRAPER] Response data:', authData);
    console.log('🌐 [SIMPLE SCRAPER] Data structure:', JSON.stringify(authData.data, null, 2));
    
    if (!authData.success) {
      throw new Error(authData.error || 'Authentication/scraping failed');
    }
    
    // The backend returns flights directly in data.flights
    const flights = authData.data?.flights || [];
    console.log('🌐 [SIMPLE SCRAPER] Extracted flights:', flights);
    console.log('🌐 [SIMPLE SCRAPER] flights.length:', flights.length);
    
    console.log('✅ [SIMPLE SCRAPER] Success! Got', flights.length, 'flights from Puppeteer scrape');
    return flights;
    
  } catch (error) {
    console.error('❌ [SIMPLE SCRAPER] Error:', error);
    throw error;
  }
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
