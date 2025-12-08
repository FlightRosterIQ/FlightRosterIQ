// Quick ATI test
const fetch = require('node-fetch');

async function testATI() {
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test-ati',
        password: 'test-pass', 
        accountType: 'pilot',
        airline: 'ATI'
      })
    });
    
    const result = await response.json();
    console.log('ATI Test Result:', result);
  } catch (error) {
    console.error('ATI Test Error:', error.message);
  }
}

testATI();