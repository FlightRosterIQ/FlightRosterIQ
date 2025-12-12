// Test FlightRosterIQ Authentication Flow
async function testAuthentication() {
  console.log('🧪 Testing FlightRosterIQ Authentication Flow...');
  
  const testCreds = {
    employeeId: 'test123',
    password: 'testpass',
    airline: 'abx'
  };
  
  try {
    console.log('📤 Sending authentication request...');
    console.log('Credentials:', testCreds);
    
    const response = await fetch('http://157.245.126.24:8080/api/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173'
      },
      body: JSON.stringify(testCreds)
    });
    
    console.log(`📡 Response status: ${response.status}`);
    console.log(`📋 Response headers:`, Object.fromEntries(response.headers.entries()));
    
    const result = await response.json();
    console.log('📄 Response body:', result);
    
    if (response.status === 401) {
      console.log('✅ Expected 401 response for invalid test credentials');
    } else {
      console.log('⚠️ Unexpected response status');
    }
    
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    console.log('🔧 This indicates a network or CORS issue');
  }
}

testAuthentication();