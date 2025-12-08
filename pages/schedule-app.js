// Example: How to integrate the scraper into your main scheduling app
// This shows how to add crew portal login to any React component

import { useState } from 'react';

export default function CrewScheduleIntegration() {
  const [userCredentials, setUserCredentials] = useState({
    username: '',
    password: '',
    airline: 'ABX Air'
  });
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(true);

  const fetchUserSchedule = async () => {
    if (!userCredentials.username || !userCredentials.password) {
      alert('Please enter your crew portal credentials');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userCredentials)
      });

      const result = await response.json();
      
      if (result.success) {
        setScheduleData(result.data);
        setShowLogin(false); // Hide login form after successful fetch
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUserCredentials({ username: '', password: '', airline: 'ABX Air' });
    setScheduleData(null);
    setShowLogin(true);
  };

  if (showLogin) {
    return (
      <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '2rem' }}>
        <h2>🛩️ Access Your Schedule</h2>
        <p>Enter your crew portal login to view your personal schedule:</p>
        
        <div style={{ marginBottom: '1rem' }}>
          <label>
            Airline:
            <select 
              value={userCredentials.airline}
              onChange={(e) => setUserCredentials({...userCredentials, airline: e.target.value})}
              style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            >
              <option value="ABX Air">ABX Air</option>
              <option value="ATI">ATI</option>
            </select>
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>
            Username:
            <input
              type="text"
              value={userCredentials.username}
              onChange={(e) => setUserCredentials({...userCredentials, username: e.target.value})}
              placeholder="Your crew portal username"
              style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>
            Password:
            <input
              type="password"
              value={userCredentials.password}
              onChange={(e) => setUserCredentials({...userCredentials, password: e.target.value})}
              placeholder="Your crew portal password"
              style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </label>
        </div>

        <button 
          onClick={fetchUserSchedule}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: loading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {loading ? '🔄 Getting Your Schedule...' : '📋 Get My Schedule'}
        </button>

        <p style={{ fontSize: '12px', color: '#666', marginTop: '1rem' }}>
          🔒 Your credentials are used only to fetch your schedule and are never stored.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>📅 Your Crew Schedule</h2>
        <button 
          onClick={logout}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔓 Logout
        </button>
      </div>

      {scheduleData && (
        <div>
          <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h3>📊 Schedule Summary</h3>
            <p><strong>Duties Found:</strong> {scheduleData.duties?.length || 0}</p>
            <p><strong>Portal:</strong> {scheduleData.pageTitle}</p>
            <p><strong>Last Updated:</strong> {new Date(scheduleData.timestamp).toLocaleString()}</p>
          </div>

          {scheduleData.duties && scheduleData.duties.length > 0 ? (
            <div>
              <h3>📋 Your Duties</h3>
              {scheduleData.duties.map((duty, index) => (
                <div key={index} style={{
                  padding: '1rem',
                  marginBottom: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#fff'
                }}>
                  <h4>Duty #{index + 1}</h4>
                  <p>{duty.content}</p>
                  <small style={{ color: '#666' }}>Element: {duty.element}</small>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
              <h3>📭 No Duties Found</h3>
              <p>No scheduled duties were found for your account at this time.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}