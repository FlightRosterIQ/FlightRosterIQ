import { useState } from 'react';
import Head from 'next/head';

export default function CrewScraper() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    airline: 'ABX Air'
  });

  const handleScrape = async () => {
    if (!credentials.username || !credentials.password) {
      setError('Please provide both username and password');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        console.log('Scraping successful:', data);
      } else {
        setError(data.error || 'Scraping failed');
      }
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetAirlines = async () => {
    try {
      const response = await fetch('/api/schedule?action=airlines');
      const data = await response.json();
      console.log('Available airlines:', data);
    } catch (err) {
      console.error('Error fetching airlines:', err);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <Head>
        <title>Crew Schedule Scraper</title>
      </Head>

      <h1>🛩️ Crew Schedule Scraper</h1>
      <p>Test the crew portal scraping functionality for your scheduling app.</p>

      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Scraper Configuration</h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Airline:
            <select 
              value={credentials.airline} 
              onChange={(e) => setCredentials({...credentials, airline: e.target.value})}
              style={{ marginLeft: '0.5rem', padding: '0.25rem' }}
            >
              <option value="ABX Air">ABX Air</option>
              <option value="ATI">ATI</option>
            </select>
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Username:
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              style={{ marginLeft: '0.5rem', padding: '0.25rem', width: '200px' }}
              placeholder="Your crew portal username"
            />
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Password:
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              style={{ marginLeft: '0.5rem', padding: '0.25rem', width: '200px' }}
              placeholder="Your crew portal password"
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={handleScrape} 
            disabled={isLoading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: isLoading ? '#ccc' : '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? '🔄 Scraping...' : '🚀 Start Scraping'}
          </button>

          <button 
            onClick={handleGetAirlines}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📋 Get Airlines
          </button>
        </div>
      </div>

      {error && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          <h4>❌ Error:</h4>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#efe', 
          border: '1px solid #cfc',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          <h4>✅ Scraping Results:</h4>
          <p><strong>Status:</strong> {result.success ? 'Success' : 'Failed'}</p>
          <p><strong>Timestamp:</strong> {result.timestamp}</p>
          <p><strong>Message:</strong> {result.message}</p>
          
          {result.data && (
            <div style={{ marginTop: '1rem' }}>
              <h5>📊 Data Summary:</h5>
              <p><strong>Duties Found:</strong> {result.data.duties?.length || 0}</p>
              <p><strong>Page Title:</strong> {result.data.pageTitle}</p>
              <p><strong>Portal URL:</strong> {result.data.url}</p>
              
              {result.data.duties && result.data.duties.length > 0 && (
                <details style={{ marginTop: '1rem' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                    📋 View Duty Details ({result.data.duties.length} items)
                  </summary>
                  <div style={{ 
                    maxHeight: '300px', 
                    overflow: 'auto', 
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    backgroundColor: '#f9f9f9',
                    border: '1px solid #ddd'
                  }}>
                    {result.data.duties.map((duty, index) => (
                      <div key={index} style={{ 
                        marginBottom: '0.5rem', 
                        padding: '0.25rem',
                        borderBottom: '1px solid #eee'
                      }}>
                        <strong>Duty #{index + 1}:</strong>
                        <br />
                        <small>{duty.content}</small>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ 
        padding: '1rem', 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6',
        borderRadius: '4px'
      }}>
        <h4>ℹ️ Usage Information:</h4>
        <ul>
          <li>This scraper connects to airline crew portals to retrieve schedule data</li>
          <li>Supports ABX Air and ATI portals</li>
          <li>Data is processed and can be used by your scheduling app</li>
          <li>For production use, set environment variables: CREW_USERNAME, CREW_PASSWORD</li>
          <li>The scraper runs in headless mode when deployed to Vercel</li>
        </ul>
      </div>
    </div>
  );
}