// FlightRosterIQ Configuration
// Update the API_BASE_URL with your DigitalOcean server IP address

// Force production server for crew scraper (always use DigitalOcean server)
const USE_PRODUCTION_SERVER = true;

const isDevelopment = !USE_PRODUCTION_SERVER && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Configuration for different environments
const config = {
  development: {
    API_BASE_URL: 'http://localhost:3001',
    WS_URL: 'ws://localhost:3001'
  },
  production: {
    // DigitalOcean server IP for FlightRosterIQ crew scraper
    API_BASE_URL: 'https://157.245.126.24:8080',
    WS_URL: 'wss://157.245.126.24:8080'
  }
};

// Export the current environment's config - always use production for crew scraper
const currentConfig = config.production;

const API_BASE_URL = currentConfig.API_BASE_URL;
const WS_URL = currentConfig.WS_URL;

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, defaultOptions);
    return response;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
};

// Export for ES modules
export { API_BASE_URL, WS_URL, apiCall };
export default currentConfig;