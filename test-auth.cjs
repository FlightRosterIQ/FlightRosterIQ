// Test script for new authentication system
const fetch = require('node-fetch');

async function testAuth() {
  try {
    console.log('🧪 Testing multi-airline crew portal authentication...\n');
    
    // Test both airlines
    const airlines = [
      { name: 'ABX Air', username: '152780', password: 'Abxcrew152780!a' },
      { name: 'ATI', username: 'test', password: 'test' } // Replace with real ATI credentials when available
    ];
    
    for (const airlineTest of airlines) {
      console.log(`Testing ${airlineTest.name}...`);
      
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: airlineTest.username,
          password: airlineTest.password, 
          accountType: 'pilot',
          airline: airlineTest.name
        })
      });
    
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ ${airlineTest.name} Authentication successful!`);
        console.log('🎫 Token:', result.token);
        console.log('👤 Employee ID:', result.employeeId);
        console.log('📝 Message:', result.message);
      } else {
        console.log(`❌ ${airlineTest.name} Authentication failed`);
        console.log('📝 Error:', result.error);
      }
      console.log(''); // Empty line between tests
    }
    
  } catch (error) {
    console.error('🔥 Test error:', error.message);
  }
}

testAuth();