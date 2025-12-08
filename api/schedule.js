// Vercel serverless function for crew schedule management and data processing
const { transformScheduleData, AIRLINE_CONFIGS } = require('../crew-scraper.cjs');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res);
      case 'POST':
        return handlePost(req, res);
      case 'PUT':
        return handlePut(req, res);
      case 'DELETE':
        return handleDelete(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('❌ Schedule API Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

async function handleGet(req, res) {
  const { action } = req.query;

  switch (action) {
    case 'airlines':
      // Return available airlines
      return res.status(200).json({
        success: true,
        airlines: Object.keys(AIRLINE_CONFIGS),
        configs: AIRLINE_CONFIGS
      });

    case 'status':
      // Return scraper status
      return res.status(200).json({
        success: true,
        status: 'operational',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });

    default:
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Use: airlines, status'
      });
  }
}

async function handlePost(req, res) {
  const { action, data } = req.body;

  switch (action) {
    case 'import':
      // Process and store scraped schedule data
      try {
        const { schedule, notifications, username, timestamp } = data;
        
        // Transform the schedule data
        const transformedData = transformScheduleData(schedule || []);
        
        // Here you would typically save to a database
        // For now, we'll just return the processed data
        
        console.log(`📅 Processing schedule for user: ${username}`);
        console.log(`📊 Processed ${transformedData.pairings.length} pairings`);
        
        return res.status(200).json({
          success: true,
          message: 'Schedule imported successfully',
          processed: {
            pairings: transformedData.pairings.length,
            notifications: (notifications || []).length,
            user: username,
            timestamp: timestamp
          },
          data: transformedData
        });
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: `Import failed: ${error.message}`
        });
      }

    case 'validate':
      // Validate schedule data format
      try {
        const { schedule } = data;
        const isValid = Array.isArray(schedule) && schedule.every(item => 
          item.hasOwnProperty('flights') && Array.isArray(item.flights)
        );
        
        return res.status(200).json({
          success: true,
          valid: isValid,
          itemCount: schedule ? schedule.length : 0
        });
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: `Validation failed: ${error.message}`
        });
      }

    default:
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Use: import, validate'
      });
  }
}

async function handlePut(req, res) {
  // Update schedule data
  return res.status(200).json({
    success: true,
    message: 'Schedule update endpoint - implementation pending'
  });
}

async function handleDelete(req, res) {
  // Delete schedule data
  return res.status(200).json({
    success: true,
    message: 'Schedule deletion endpoint - implementation pending'
  });
}