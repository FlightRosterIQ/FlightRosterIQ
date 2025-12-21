const fetch = require('node-fetch');

/**
 * Zyte API Crew Portal Scraper
 * Uses Zyte's API for web scraping with anti-bot bypass capabilities
 */

// Configuration
const AIRLINE_CONFIGS = {
  'ABX Air': {
    portalUrl: 'https://crew.abxair.com/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp',
    loginSelectors: {
      username: 'input[name="username"], #username',
      password: 'input[name="password"], #password',
      submit: 'input[type="submit"], button[type="submit"], #kc-login'
    }
  },
  'ATI': {
    portalUrl: 'https://crew.airtransport.cc/nlcrew/ui/netline/crew/crm-workspace/index.html#/iadp',
    loginSelectors: {
      username: 'input[name="username"], #username',
      password: 'input[name="password"], #password',
      submit: 'input[type="submit"], button[type="submit"], #kc-login'
    }
  }
};

function getConfig(options = {}) {
  return {
    airline: options.airline || process.env.CREW_AIRLINE || 'ABX Air',
    username: options.username || process.env.CREW_USERNAME || '',
    password: options.password || process.env.CREW_PASSWORD || '',
    zyteApiKey: options.zyteApiKey || process.env.ZYTE_API_KEY || '',
    backendUrl: options.backendUrl || 'http://localhost:3001/api/schedule/import',
    extractCrewDetails: options.extractCrewDetails !== false,
    get portalUrl() { return AIRLINE_CONFIGS[this.airline]?.portalUrl || AIRLINE_CONFIGS['ABX Air'].portalUrl; },
    get loginSelectors() { return AIRLINE_CONFIGS[this.airline]?.loginSelectors || AIRLINE_CONFIGS['ABX Air'].loginSelectors; }
  };
}

/**
 * Make a request to Zyte API
 * @param {string} url - URL to scrape
 * @param {object} options - Zyte API options
 * @param {string} apiKey - Zyte API key
 * @returns {Promise<object>} - Zyte API response
 */
async function zyteApiRequest(url, options = {}, apiKey) {
  const requestOptions = {
    url,
    browserHtml: true,
    javascript: true,
    ...options
  };

  const response = await fetch('https://api.zyte.com/v1/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
    },
    body: JSON.stringify(requestOptions)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Zyte API request failed: ${response.status} ${response.statusText}\n${errorText}`);
  }

  return await response.json();
}

/**
 * Execute JavaScript actions on a page via Zyte API
 * @param {string} url - URL to navigate to
 * @param {Array} actions - Array of browser actions to execute
 * @param {string} apiKey - Zyte API key
 * @returns {Promise<object>} - Response with HTML content
 */
async function zyteExecuteActions(url, actions, apiKey) {
  const requestOptions = {
    url,
    browserHtml: true,
    actions
  };

  const response = await fetch('https://api.zyte.com/v1/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
    },
    body: JSON.stringify(requestOptions)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Zyte API action request failed: ${response.status} ${response.statusText}\n${errorText}`);
  }

  return await response.json();
}

/**
 * Main scraping function using Zyte API
 */
async function scrapeCrewPortalZyte(options = {}) {
  console.log('🚀 Starting Zyte API crew portal scraper...');
  
  const config = getConfig(options);
  
  if (!config.zyteApiKey) {
    throw new Error('Zyte API key is required. Set ZYTE_API_KEY environment variable or pass zyteApiKey option.');
  }

  if (!config.username || !config.password) {
    throw new Error('Username and password are required for crew portal access.');
  }

  try {
    console.log(`🎯 Target airline: ${config.airline}`);
    console.log(`🔗 Portal URL: ${config.portalUrl}`);

    // Step 1: Load the login page
    console.log('📄 Loading login page...');
    const loginPageResponse = await zyteApiRequest(
      config.portalUrl,
      {
        browserHtml: true,
        javascript: true
      },
      config.zyteApiKey
    );

    console.log('✅ Login page loaded');

    // Step 2: Perform login with browser actions
    console.log('🔐 Attempting login...');
    const loginActions = [
      {
        action: 'type',
        selector: config.loginSelectors.username,
        text: config.username
      },
      {
        action: 'type',
        selector: config.loginSelectors.password,
        text: config.password
      },
      {
        action: 'click',
        selector: config.loginSelectors.submit
      },
      {
        action: 'waitForNavigation',
        timeout: 30000
      }
    ];

    const loggedInResponse = await zyteExecuteActions(
      config.portalUrl,
      loginActions,
      config.zyteApiKey
    );

    console.log('✅ Login successful');

    // Step 3: Wait for schedule data to load
    console.log('⏳ Waiting for schedule data...');
    const scheduleActions = [
      {
        action: 'waitForSelector',
        selector: 'div[data-test-id="duty-row"], [data-test-id="duty-list"], .IADP-duty-list',
        timeout: 15000
      }
    ];

    const scheduleResponse = await zyteExecuteActions(
      config.portalUrl,
      scheduleActions,
      config.zyteApiKey
    );

    // Step 4: Extract schedule data using browser HTML
    console.log('📊 Extracting schedule data...');
    const html = scheduleResponse.browserHtml;
    
    // Parse HTML to extract schedule (you'll need to implement parsing logic)
    const scheduleData = parseScheduleFromHtml(html, config);

    console.log(`✅ Extracted ${scheduleData.duties?.length || 0} duties`);

    return {
      success: true,
      data: scheduleData,
      source: 'zyte-api'
    };

  } catch (error) {
    console.error('❌ Zyte scraping failed:', error);
    throw error;
  }
}

/**
 * Parse schedule data from HTML
 * This is a placeholder - you'll need to implement the actual parsing logic
 */
function parseScheduleFromHtml(html, config) {
  // TODO: Implement HTML parsing logic similar to your Puppeteer scraper
  // For now, return a basic structure
  console.log('⚠️ HTML parsing not yet implemented - using placeholder');
  
  return {
    duties: [],
    pilot: {
      name: config.username,
      airline: config.airline
    },
    scrapedAt: new Date().toISOString(),
    month: new Date().toISOString().slice(0, 7)
  };
}

/**
 * Alternative: Use Zyte's Auto Extract for automatic data extraction
 */
async function scrapeWithZyteAutoExtract(url, apiKey) {
  console.log('🤖 Using Zyte Auto Extract...');
  
  const response = await fetch('https://autoextract.zyte.com/v1/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
    },
    body: JSON.stringify([{
      url,
      pageType: 'article' // You may need to use custom extraction
    }])
  });

  if (!response.ok) {
    throw new Error(`Auto Extract failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// Export functions
module.exports = {
  scrapeCrewPortalZyte,
  zyteApiRequest,
  zyteExecuteActions,
  scrapeWithZyteAutoExtract,
  getConfig
};

// Allow direct execution for testing
if (require.main === module) {
  scrapeCrewPortalZyte()
    .then(result => {
      console.log('✅ Scraping completed successfully');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Scraping failed:', error);
      process.exit(1);
    });
}
