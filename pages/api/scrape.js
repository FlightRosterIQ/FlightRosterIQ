// Next.js API route for crew scheduling scraper
const { scrapeCrewSchedule, getCrewNotifications } = require('../../crew-scraper.cjs');

export default async function handler(req, res) {
  // Set CORS headers for frontend access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST or GET.' 
    });
  }

  try {
    console.log('🚀 Crew scraper API called');
    
    // Get configuration from request body or environment
    const options = {
      airline: req.body?.airline || req.query.airline || process.env.CREW_AIRLINE,
      username: req.body?.username || process.env.CREW_USERNAME,
      password: req.body?.password || process.env.CREW_PASSWORD,
      headless: true // Always headless in serverless environment
    };

    // Validate credentials
    if (!options.username || !options.password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials. Please provide username and password or set environment variables.',
        required: ['CREW_USERNAME', 'CREW_PASSWORD']
      });
    }

    console.log(`📋 Scraping for airline: ${options.airline || 'ABX Air'}`);
    
    // Execute the scraping
    const result = await getCrewNotifications(options);
    
    if (result.success) {
      console.log('✅ Scraping completed successfully');
      return res.status(200).json({
        success: true,
        data: result.data,
        timestamp: result.timestamp,
        message: 'Schedule data retrieved successfully'
      });
    } else {
      console.error('❌ Scraping failed:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error,
        timestamp: result.timestamp
      });
    }

  } catch (error) {
    console.error('❌ API Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Configure API route for longer execution time
export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
  // Increase function timeout for Vercel Pro users (60s)
  maxDuration: 60,
};