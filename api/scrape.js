// Vercel serverless function for crew scheduling scraper
const { scrapeCrewSchedule, getCrewNotifications } = require('../crew-scraper.cjs');

module.exports = async function handler(req, res) {
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
    
    // Prioritize frontend credentials over environment variables
    const options = {
      airline: req.body?.airline || req.query.airline || process.env.CREW_AIRLINE || 'ABX Air',
      username: req.body?.username || req.query.username,
      password: req.body?.password || req.query.password,
      headless: true // Always headless in serverless environment
    };

    // Validate credentials - require user to provide them
    if (!options.username || !options.password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide your crew portal username and password.',
        message: 'For security, each pilot must enter their own credentials to access their personal schedule.',
        required: ['username', 'password']
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

// Vercel serverless function configuration is handled in vercel.json