// Simple Direct Scraper - No caching, no complexity
// Just authenticate and fetch roster directly

import { API_BASE_URL } from '../config';

/**
 * Simple scraper that authenticates and returns roster data
 * @param {string} employeeId - Crew member ID
 * @param {string} password - Password
 * @param {string} airline - 'abx' or 'ati'
 * @returns {Promise<Array>} Array of duties
 */
export async function simpleScrape(employeeId, password, airline = 'abx') {
  console.log('🔧 [SIMPLE SCRAPER] Starting scrape for:', employeeId);
  
  try {
    // Step 1: Authenticate
    console.log('🔐 [SIMPLE SCRAPER] Authenticating...');
    const authUrl = `${API_BASE_URL}/api/authenticate`;
    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, password, airline })
    });
    
    console.log('🔐 [SIMPLE SCRAPER] Auth response status:', authResponse.status);
    const authData = await authResponse.json();
    console.log('🔐 [SIMPLE SCRAPER] Auth result:', authData);
    
    if (!authData.success) {
      throw new Error(authData.error || 'Authentication failed');
    }
    
    // Step 2: Fetch roster events
    console.log('📅 [SIMPLE SCRAPER] Fetching roster...');
    const rosterUrl = `${API_BASE_URL}/api/netline/roster/events?crewCode=${employeeId}`;
    const rosterResponse = await fetch(rosterUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('📅 [SIMPLE SCRAPER] Roster response status:', rosterResponse.status);
    const rosterData = await rosterResponse.json();
    console.log('📅 [SIMPLE SCRAPER] Roster result:', rosterData);
    
    if (!rosterData.success) {
      throw new Error(rosterData.error || 'Failed to fetch roster');
    }
    
    console.log('✅ [SIMPLE SCRAPER] Success! Got', rosterData.duties?.length || 0, 'duties');
    return rosterData.duties || [];
    
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
