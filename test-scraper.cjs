/**
 * Test script to verify scraper setup
 * Run with: node test-scraper.js
 */

async function testBackendConnection() {
  console.log('🧪 Testing backend connection...\n');
  
  try {
    // Test 1: Check backend is running
    console.log('1️⃣ Testing backend status endpoint...');
    const statusResponse = await fetch('http://localhost:3001/api/schedule/status');
    const statusData = await statusResponse.json();
    
    if (statusData.success) {
      console.log('   ✅ Backend is running');
      console.log(`   📊 Using ${statusData.usingMockData ? 'MOCK' : 'SCRAPED'} data`);
      console.log(`   📦 Pairings: ${statusData.pairings}\n`);
    }
    
    // Test 2: Send test data to import endpoint
    console.log('2️⃣ Testing schedule import endpoint...');
    const testSchedule = [{
      pairingId: 'TEST001',
      flights: [{
        date: '2025-12-09',
        flightNumber: 'TEST123',
        origin: 'CVG',
        destination: 'LAX',
        departure: '10:00',
        arrival: '12:30',
        aircraft: 'B767-300'
      }]
    }];
    
    const importResponse = await fetch('http://localhost:3001/api/schedule/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schedule: testSchedule,
        timestamp: new Date().toISOString()
      })
    });
    
    const importData = await importResponse.json();
    
    if (importData.success) {
      console.log('   ✅ Import endpoint working');
      console.log(`   📝 Imported ${importData.pairings} pairing(s)\n`);
    }
    
    // Test 3: Verify data was stored
    console.log('3️⃣ Verifying data persistence...');
    const verifyResponse = await fetch('http://localhost:3001/api/schedule/status');
    const verifyData = await verifyResponse.json();
    
    if (verifyData.hasScrapedData) {
      console.log('   ✅ Data stored successfully');
      console.log(`   📦 ${verifyData.pairings} pairing(s) available\n`);
    }
    
    console.log('✅ All tests passed! Backend is ready for scraper.\n');
    console.log('📝 Next steps:');
    console.log('   1. Install Puppeteer: npm install puppeteer node-cron');
    console.log('   2. Set credentials: set CREW_USERNAME=your_username');
    console.log('   3. Set credentials: set CREW_PASSWORD=your_password');
    console.log('   4. Update selectors in crew-scraper.js (see SCRAPER_SETUP.md)');
    console.log('   5. Run scraper: node crew-scraper.js');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the backend is running:');
    console.log('   node server-simple.cjs');
  }
}

// Run tests
testBackendConnection();
