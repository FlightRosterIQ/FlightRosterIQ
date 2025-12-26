// FlightRosterIQ Configuration
// Using Vercel proxy to avoid mixed content issues

const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Configuration for different environments
const config = {
  development: {
    // Local development - direct connection to backend
    API_BASE_URL: 'http://localhost:8080',
    WS_URL: 'ws://localhost:8080'
  },
  production: {
    // Production - direct connection to VPS backend
    API_BASE_URL: 'http://157.245.126.24:8080',
    WS_URL: 'ws://157.245.126.24:8080'  // WebSocket still direct (if needed)
  }
};

// Export the current environment's config
const currentConfig = isDevelopment ? config.development : config.production;

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