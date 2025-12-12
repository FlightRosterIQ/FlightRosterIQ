// Test FlightRosterIQ Server Connection
const API_BASE_URL = 'http://157.245.126.24:8080';

async function testServerConnection() {
  console.log('🧪 Testing FlightRosterIQ Server Connection...');
  console.log('Server:', API_BASE_URL);
  
  try {
    // Test 1: Check if server is responding
    console.log('\n1️⃣ Testing server health...');
    const healthResponse = await fetch(API_BASE_URL);
    console.log(`✅ Server responding: ${healthResponse.status}`);
    
    // Test 2: Test authentication endpoint with test data
    console.log('\n2️⃣ Testing authentication endpoint...');
    const authResponse = await fetch(`${API_BASE_URL}/api/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        employeeId: 'test123',
        password: 'testpass',
        airline: 'abx'
      })
    });
    
    const authData = await authResponse.json();
    console.log(`📡 Auth endpoint status: ${authResponse.status}`);
    console.log('📋 Response:', authData);
    
    if (authResponse.status === 401) {
      console.log('✅ Authentication endpoint working (expected 401 for invalid credentials)');
    } else if (authResponse.status === 200) {
      console.log('✅ Authentication endpoint working (test credentials accepted)');
    } else {
      console.log('⚠️ Unexpected response from authentication endpoint');
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if server is running on DigitalOcean');
    console.log('2. Verify firewall allows port 8080');
    console.log('3. Check server logs for errors');
  }
}

// Run the test
testServerConnection();