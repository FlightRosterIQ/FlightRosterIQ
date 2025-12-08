import { useState } from 'react';
import Head from 'next/head';

export default function Home() {
  const [userCredentials, setUserCredentials] = useState({
    username: '',
    password: '',
    airline: 'ABX Air'
  });
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUserSchedule = async () => {
    if (!userCredentials.username || !userCredentials.password) {
      setError('Please enter your crew portal credentials');
      return;
    }

    setLoading(true);
    setError(null);
    setScheduleData(null);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userCredentials)
      });

      const result = await response.json();
      
      if (result.success) {
        setScheduleData(result.data);
      } else {
        setError(result.error || 'Failed to fetch schedule data');
      }
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearData = () => {
    setScheduleData(null);
    setError(null);
    setUserCredentials({ username: '', password: '', airline: 'ABX Air' });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <Head>
        <title>Crew Schedule App - ABX Air & ATI</title>
        <meta name="description" content="Access your crew portal schedule data" />
      </Head>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', color: '#333', marginBottom: '0.5rem' }}>
            🛩️ Crew Schedule App
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#666' }}>
            Access your ABX Air & ATI crew portal schedule data
          </p>
        </div>

        {!scheduleData ? (
          /* Login Form */
          <div style={{ 
            maxWidth: '500px', 
            margin: '0 auto', 
            backgroundColor: 'white', 
            padding: '2rem', 
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#333' }}>
              Access Your Schedule
            </h2>
            
            <div style={{ 
              padding: '1rem', 
              backgroundColor: '#e3f2fd', 
              border: '1px solid #2196f3', 
              borderRadius: '8px', 
              marginBottom: '2rem' 
            }}>
              <strong>🔒 Privacy Notice:</strong> Your credentials are only used to fetch your schedule and are never stored.
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Airline:
              </label>
              <select 
                value={userCredentials.airline}
                onChange={(e) => setUserCredentials({...userCredentials, airline: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              >
                <option value="ABX Air">ABX Air</option>
                <option value="ATI">Air Transport International (ATI)</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Username:
              </label>
              <input
                type="text"
                value={userCredentials.username}
                onChange={(e) => setUserCredentials({...userCredentials, username: e.target.value})}
                placeholder="Your crew portal username"
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Password:
              </label>
              <input
                type="password"
                value={userCredentials.password}
                onChange={(e) => setUserCredentials({...userCredentials, password: e.target.value})}
                placeholder="Your crew portal password"
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            </div>

            {error && (
              <div style={{ 
                padding: '1rem', 
                backgroundColor: '#ffebee', 
                border: '1px solid #f44336',
                borderRadius: '6px',
                marginBottom: '1rem',
                color: '#d32f2f'
              }}>
                <strong>❌ Error:</strong> {error}
              </div>
            )}

            <button 
              onClick={fetchUserSchedule}
              disabled={loading}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: loading ? '#ccc' : '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '18px',
                fontWeight: 'bold'
              }}
            >
              {loading ? '🔄 Getting Your Schedule...' : '📋 Get My Schedule'}
            </button>
          </div>
        ) : (
          /* Schedule Results */
          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '2rem' 
            }}>
              <h2 style={{ color: '#333' }}>📅 Your Crew Schedule</h2>
              <button 
                onClick={clearData}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                🔄 Get Another Schedule
              </button>
            </div>

            <div style={{ 
              backgroundColor: 'white', 
              padding: '2rem', 
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              marginBottom: '2rem'
            }}>
              <h3 style={{ marginBottom: '1rem' }}>📊 Schedule Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <strong>Duties Found:</strong> {scheduleData.duties?.length || 0}
                </div>
                <div>
                  <strong>Portal:</strong> {scheduleData.pageTitle}
                </div>
                <div>
                  <strong>Retrieved:</strong> {new Date(scheduleData.timestamp).toLocaleString()}
                </div>
              </div>
            </div>

            {scheduleData.duties && scheduleData.duties.length > 0 ? (
              <div style={{ 
                backgroundColor: 'white', 
                padding: '2rem', 
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{ marginBottom: '1.5rem' }}>📋 Your Duties</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {scheduleData.duties.map((duty, index) => (
                    <div key={index} style={{
                      padding: '1.5rem',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      backgroundColor: '#fafafa'
                    }}>
                      <h4 style={{ marginBottom: '0.5rem', color: '#333' }}>
                        Duty #{index + 1}
                      </h4>
                      <p style={{ marginBottom: '0.5rem', fontSize: '14px' }}>
                        {duty.content}
                      </p>
                      <small style={{ color: '#666' }}>
                        Element: {duty.element}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ 
                backgroundColor: 'white', 
                padding: '3rem', 
                textAlign: 'center', 
                borderRadius: '12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{ marginBottom: '1rem' }}>📭 No Duties Found</h3>
                <p style={{ color: '#666' }}>
                  No scheduled duties were found for your account at this time.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ 
          marginTop: '4rem', 
          padding: '2rem', 
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h4 style={{ marginBottom: '1rem' }}>ℹ️ How This Works</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div>
              <strong>🔒 Secure:</strong> Your credentials are never stored
            </div>
            <div>
              <strong>⚡ Real-Time:</strong> Data fetched directly from crew portals
            </div>
            <div>
              <strong>👥 Multi-User:</strong> Each pilot sees their own schedule
            </div>
            <div>
              <strong>🛩️ Multi-Airline:</strong> Supports ABX Air & ATI
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}