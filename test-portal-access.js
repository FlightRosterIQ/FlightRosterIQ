// Test ABX Air Crew Portal Connectivity
// Run this ON YOUR DIGITALOCEAN SERVER

const puppeteer = require('puppeteer');

async function testCrewPortalAccess() {
  console.log('🧪 Testing ABX Air Crew Portal Access from DigitalOcean...');
  
  let browser;
  try {
    console.log('🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security'
      ]
    });
    
    console.log('📄 Creating new page...');
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    const portalUrl = 'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp';
    console.log('🔗 Navigating to ABX Air crew portal...');
    console.log(`URL: ${portalUrl}`);
    
    const response = await page.goto(portalUrl, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    console.log(`✅ Page loaded successfully!`);
    console.log(`📊 Status: ${response.status()}`);
    console.log(`📄 Title: ${await page.title()}`);
    console.log(`🔗 Final URL: ${page.url()}`);
    
    // Check if we can find login elements
    try {
      const loginElements = await page.$$('input[type="text"], input[type="password"], input[name*="user"], input[name*="login"]');
      console.log(`🔍 Found ${loginElements.length} potential login elements`);
    } catch (err) {
      console.log('⚠️ Could not search for login elements');
    }
    
    await browser.close();
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Portal access failed:', error.message);
    
    if (error.message.includes('net::')) {
      console.log('🔧 Network issue - check firewall/DNS');
    } else if (error.message.includes('timeout')) {
      console.log('🔧 Timeout - portal may be slow or blocking requests');
    } else if (error.message.includes('launch')) {
      console.log('🔧 Browser launch failed - check Chrome installation');
    }
    
    if (browser) await browser.close();
  }
}

testCrewPortalAccess();