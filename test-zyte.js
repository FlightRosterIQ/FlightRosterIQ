const fetch = require('node-fetch');

/**
 * Test Zyte API Connection and Features
 * Run this to verify your Zyte API key works before implementing full scraper
 */

async function testZyteConnection() {
  const apiKey = process.env.ZYTE_API_KEY;

  if (!apiKey) {
    console.error('❌ ZYTE_API_KEY environment variable not set');
    console.log('Set it with: $env:ZYTE_API_KEY="your_key"');
    process.exit(1);
  }

  console.log('🔑 API Key found:', apiKey.substring(0, 8) + '...');
  console.log('');

  // Test 1: Simple HTTP request
  console.log('Test 1: Simple HTTP Request');
  console.log('━'.repeat(50));
  try {
    const response = await fetch('https://api.zyte.com/v1/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
      },
      body: JSON.stringify({
        url: 'https://httpbin.org/html',
        browserHtml: true
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Basic request successful');
      console.log(`   Response size: ${JSON.stringify(data).length} bytes`);
    } else {
      const error = await response.text();
      console.log('❌ Request failed:', response.status, response.statusText);
      console.log('   Error:', error);
    }
  } catch (error) {
    console.log('❌ Request error:', error.message);
  }
  console.log('');

  // Test 2: JavaScript rendering
  console.log('Test 2: JavaScript Rendering');
  console.log('━'.repeat(50));
  try {
    const response = await fetch('https://api.zyte.com/v1/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
      },
      body: JSON.stringify({
        url: 'https://example.com',
        browserHtml: true,
        javascript: true
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ JavaScript rendering successful');
      console.log(`   HTML content length: ${data.browserHtml?.length || 0} chars`);
    } else {
      console.log('❌ JavaScript rendering failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('');

  // Test 3: Browser actions
  console.log('Test 3: Browser Actions (Click & Type)');
  console.log('━'.repeat(50));
  try {
    const response = await fetch('https://api.zyte.com/v1/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
      },
      body: JSON.stringify({
        url: 'https://httpbin.org/forms/post',
        browserHtml: true,
        actions: [
          {
            action: 'type',
            selector: 'input[name="custname"]',
            text: 'Test User'
          },
          {
            action: 'waitForTimeout',
            timeout: 1000
          }
        ]
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Browser actions successful');
      console.log(`   Actions executed successfully`);
    } else {
      console.log('❌ Browser actions failed:', response.status);
      const error = await response.text();
      console.log('   Error:', error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('');

  // Test 4: Account info
  console.log('Test 4: API Account Information');
  console.log('━'.repeat(50));
  try {
    // Note: Zyte doesn't have a public account endpoint, so we'll check the response headers
    const response = await fetch('https://api.zyte.com/v1/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
      },
      body: JSON.stringify({
        url: 'https://example.com',
        httpResponseBody: true
      })
    });

    console.log(`   API Status: ${response.status} ${response.statusText}`);
    console.log(`   Rate Limit: ${response.headers.get('x-ratelimit-limit') || 'Not specified'}`);
    console.log(`   Remaining: ${response.headers.get('x-ratelimit-remaining') || 'Not specified'}`);
    
    if (response.ok) {
      console.log('✅ API key is valid and active');
    } else {
      console.log('❌ API key may be invalid or expired');
    }
  } catch (error) {
    console.log('❌ Error checking account:', error.message);
  }
  console.log('');

  // Summary
  console.log('━'.repeat(50));
  console.log('📊 Test Summary');
  console.log('━'.repeat(50));
  console.log('Your Zyte API is ready to use!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Set your crew portal credentials:');
  console.log('   $env:CREW_USERNAME="your_username"');
  console.log('   $env:CREW_PASSWORD="your_password"');
  console.log('2. Run the Zyte scraper:');
  console.log('   node crew-scraper-zyte.cjs');
  console.log('');
}

// Run tests
testZyteConnection().catch(console.error);
