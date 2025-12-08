import { useState, useEffect } from 'react'
import localforage from 'localforage'
import './App.css'

// Configure localforage for offline storage
localforage.config({
  name: 'FlightRosterIQ',
  storeName: 'schedules'
})

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [token, setToken] = useState(null)
  const [schedule, setSchedule] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [weatherData, setWeatherData] = useState({})
  const [aircraftData, setAircraftData] = useState({})
  const [activeTab, setActiveTab] = useState('daily')
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [friendsSubTab, setFriendsSubTab] = useState('chats')
  const [chatMessages, setChatMessages] = useState({})
  const [scheduleChanges, setScheduleChanges] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [userType, setUserType] = useState('pilot')
  const [airline, setAirline] = useState(null)
  const [settings, setSettings] = useState({
    notifications: true,
    autoRefresh: true,
    theme: 'light'
  })

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load cached data on mount
    loadCachedData()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-navigate to daily tab on mount
  useEffect(() => {
    if (token && schedule) {
      setActiveTab('daily')
    }
  }, [token, schedule])
  const loadCachedData = async () => {
    try {
      const cachedToken = await localforage.getItem('authToken')
      const cachedSchedule = await localforage.getItem('schedule')
      const cachedFriends = await localforage.getItem('friends')
      const cachedSettings = await localforage.getItem('settings')
      const cachedUserType = await localforage.getItem('userType')
      const cachedAirline = await localforage.getItem('airline')
      
      if (cachedToken) setToken(cachedToken)
      if (cachedSchedule) setSchedule(cachedSchedule)
      if (cachedFriends) setFriends(cachedFriends)
      if (cachedSettings) setSettings(cachedSettings)
      if (cachedUserType) setUserType(cachedUserType)
      if (cachedAirline) setAirline(cachedAirline)
    } catch (err) {
      console.error('Error loading cached data:', err)
    }
  } }
  const handleLogin = async (e, accountType) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...credentials,
          accountType: accountType,
          airline: airline
        })
      })

      const data = await response.json()

      if (data.success) {
        setToken(data.token)
        setUserType(data.accountType || accountType) // Use backend's validated accountType
        await localforage.setItem('authToken', data.token)
        await localforage.setItem('userType', data.accountType || accountType)
        await localforage.setItem('airline', airline)
        await localforage.setItem('pilotUsername', credentials.username) // Store for code generation
        await fetchSchedule(data.token)
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSchedule = async (authToken = token) => {
    if (!authToken) {
      setError('Please login first')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:3001/api/schedule', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })

      const data = await response.json()

      if (data.success) {
        setSchedule(data.data)
        await localforage.setItem('schedule', data.data)
        await localforage.setItem('lastUpdated', new Date().toISOString())
        
        // Check for schedule change notifications
        if (data.notifications && data.notifications.length > 0) {
          setScheduleChanges(data.notifications)
          if (settings.notifications) {
            alert(`You have ${data.notifications.length} pending schedule change(s)!`)
          }
        }
        
        // Fetch weather for all airports in schedule
        await fetchWeatherForSchedule(data.data)
      } else {
        setError(data.error || 'Failed to fetch schedule')
      }
    } catch (err) {
      setError('Network error. Showing cached data.')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchWeatherForSchedule = async (scheduleData) => {
    if (!scheduleData || !isOnline) return

    const airports = new Set()
    scheduleData.forEach(pairing => {
      pairing.flights?.forEach(flight => {
        if (flight.origin) airports.add(flight.origin.substring(0, 4))
        if (flight.destination) airports.add(flight.destination.substring(0, 4))
      })
    })

    try {
      const response = await fetch('http://localhost:3001/api/weather/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icaoCodes: Array.from(airports) })
      })

      const data = await response.json()
      if (data.success) {
        const weatherMap = {}
        data.data.forEach(w => {
          weatherMap[w.icao] = w
        })
        setWeatherData(weatherMap)
        await localforage.setItem('weatherData', weatherMap)
      }
    } catch (err) {
      console.error('Weather fetch error:', err)
    }
  }

  const fetchAircraftInfo = async (registration) => {
    if (!registration || aircraftData[registration]) return

    try {
      const response = await fetch(`http://localhost:3001/api/aircraft/${registration}`)
      const data = await response.json()
      
      if (data.success) {
        const updatedAircraftData = {
          ...aircraftData,
          [registration]: data.data
        }
        setAircraftData(updatedAircraftData)
        await localforage.setItem('aircraftData', updatedAircraftData)
      }
    } catch (error) {
      console.error('Error fetching aircraft info:', error)
    }
  }

  const handleLogout = async () => {
    try {
      if (isOnline && token) {
        await fetch('http://localhost:3001/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      }
      setToken(null)
      setUserType('pilot')
      setAirline(null)
      await localforage.removeItem('authToken')
      await localforage.removeItem('userType')
      await localforage.removeItem('airline')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const sendFriendRequest = async (nameOrEmployeeId) => {
    if (!isOnline) {
      setError('Must be online to send friend requests')
      return
    }

    try {
      const response = await fetch('http://localhost:3001/api/friends/request', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nameOrEmployeeId })
      })

      const data = await response.json()
      if (data.success) {
        alert('Friend request sent!')
      } else {
        setError(data.error || 'Failed to send request')
      }
    } catch (err) {
      setError('Failed to send friend request')
    }
  }

  const acceptFriendRequest = async (requestId) => {
    try {
      const response = await fetch('http://localhost:3001/api/friends/accept', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requestId })
      })

      const data = await response.json()
      if (data.success) {
        setFriends([...friends, data.friend])
        setFriendRequests(friendRequests.filter(r => r.id !== requestId))
        await localforage.setItem('friends', [...friends, data.friend])
      }
    } catch (err) {
      console.error('Accept request error:', err)
    }
  }

  const updateSettings = async (newSettings) => {
    setSettings(newSettings)
    await localforage.setItem('settings', newSettings)
  }

  const getCurrentDaySchedule = () => {
    if (!schedule) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return schedule.filter(pairing => {
  const getMonthlySchedule = () => {
    if (!schedule) return {}
    
    const monthData = {}
    schedule.forEach(pairing => {
      pairing.flights?.forEach(flight => {
        const date = new Date(flight.departure)
        const dateKey = date.toISOString().split('T')[0]
        
        if (!monthData[dateKey]) {
          monthData[dateKey] = []
        }
        monthData[dateKey].push({ ...flight, pairingId: pairing.pairingId })
      })
    })
    
    return monthData
  }

  const fetchScheduleChanges = async () => {
    if (!isOnline || !token) return

    try {
      const response = await fetch('http://localhost:3001/api/schedule/changes', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        setScheduleChanges(data.changes)
        await localforage.setItem('scheduleChanges', data.changes)
      }
    } catch (err) {
      console.error('Fetch schedule changes error:', err)
    }
  }

  const acceptScheduleChange = async (changeId) => {
    if (!isOnline) {
      setError('Must be online to accept schedule changes')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`http://localhost:3001/api/schedule/changes/${changeId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        alert('Schedule change accepted! Refreshing schedule...')
        // Remove from changes list
        setScheduleChanges(scheduleChanges.filter(c => c.id !== changeId))
        // Refresh schedule to get updated data
        await fetchSchedule()
      } else {
        setError(data.error || 'Failed to accept schedule change')
      }
    } catch (err) {
      setError('Failed to accept schedule change')
    } finally {
      setLoading(false)
    }
  }

  const viewScheduleChangeDetails = async (changeId) => {
    if (!isOnline) {
      setError('Must be online to view change details')
      return
    }

    try {
      const response = await fetch(`http://localhost:3001/api/schedule/changes/${changeId}/details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success && data.details) {
        // Show details in alert or modal (you can enhance this with a proper modal later)
        const details = data.details
        let message = 'Schedule Change Details:\n\n'
        if (details.reason) message += `Reason: ${details.reason}\n\n`
        if (details.oldSchedule) message += `Old: ${details.oldSchedule}\n`
        if (details.newSchedule) message += `New: ${details.newSchedule}\n`
        alert(message)
      }
    } catch (err) {
      console.error('View change details error:', err)
    }
  }

  const getMonthData = () => {
    if (!schedule) return {}
    
    const monthData = {}
    schedule.forEach(pairing => {
      pairing.flights.forEach(flight => {
        const dateKey = flight.date
        if (!monthData[dateKey]) {
          monthData[dateKey] = []
        }
        monthData[dateKey].push({ ...flight, pairingId: pairing.pairingId })
      })
    })
    
    return monthData
  }

  if (!token) {
    const [accountType, setAccountType] = React.useState(null)

    return (
      <div className="app">
        <div className="login-container">
          <img src="/logo.png" alt="FlightRosterIQ Logo" className="login-logo" />
          <div className={`status ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </div>
          
          {!airline ? (
            <div className="airline-selection">
              <h2>Select Airline</h2>
              <div className="airline-dropdown">
                <select 
                  onChange={(e) => setAirline(e.target.value)}
                  defaultValue=""
                  className="airline-select"
                >
                  <option value="" disabled>Choose your airline...</option>
                  <option value="abx">ABX AIR (GB)</option>
                  <option value="ati">Air Transport International (8C)</option>
                </select>
              </div>
            </div>
          ) : !accountType ? (
            <>
              <div className="selected-airline-badge">
                ✈️ {airline.toUpperCase()}
              </div>
              <button 
                className="back-btn"
                onClick={() => setAirline(null)}
              >
                ← Change Airline
              </button>
              <div className="account-type-selection">
                <h2>Select Account Type</h2>
              <div className="account-buttons">
                <button 
                  className="account-btn pilot-btn"
                  onClick={() => setAccountType('pilot')}
                >
                  <span className="account-icon">✈️</span>
                  <span className="account-label">Pilot</span>
                  <span className="account-desc">Full schedule access</span>
                </button>
                <button 
                  className="account-btn family-btn"
                  onClick={() => setAccountType('family')}
                >
                  <span className="account-icon">👨‍👩‍👧‍👦</span>
                  <span className="account-label">Family/Friends</span>
                  <span className="account-desc">View schedule only</span>
                </button>
              </div>
            </div>
            </>
          ) : (
            <>
              <div className="login-badges">
                <div className="selected-airline-badge">
                  ✈️ {airline.toUpperCase()}
                </div>
                <div className="account-type-badge">
                  {accountType === 'pilot' ? '✈️ Pilot Login' : '👨‍👩‍👧‍👦 Family/Friends Login'}
                </div>
              </div>
              <button 
                className="back-btn"
                onClick={() => setAccountType(null)}
              >
                ← Change Account Type
              </button>
              <form onSubmit={(e) => {
                e.preventDefault()
                handleLogin(e, accountType)
              }}>
                {accountType === 'pilot' ? (
                  <>
                    <input
                      type="text"
                      placeholder="Employee Number or Username"
                      value={credentials.username}
                      onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                      required
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                      required
                    />
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Access Code (provided by pilot)"
                      value={credentials.username}
                      onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                      required
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                      required
                    />
                    <p className="family-note">
                      ℹ️ Family accounts have limited access - no crew info or friends list
                    </p>
                  </>
                )}
                <button type="submit" disabled={loading || !isOnline}>
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>
              {error && <div className="error">{error}</div>}
              {!isOnline && <div className="warning">You must be online to login</div>}
            </>
          )}
        </div>
      </div>
    )
  }
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    // Only allow navigating to months that have schedule data
    const nextMonthKey = nextMonth.toISOString().substring(0, 7) // YYYY-MM
    const hasScheduleData = schedule?.some(pairing => 
      pairing.flights?.some(flight => {
        const flightMonth = new Date(flight.departure).toISOString().substring(0, 7)
        return flightMonth === nextMonthKey
      })
    )
    
    if (hasScheduleData) {
      setCurrentMonth(nextMonth)
    }
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  const renderMonthlyView = () => {
    const monthData = getMonthlySchedule()
    const today = new Date()
    const viewMonth = currentMonth
    const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay()
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
    
    const calendar = []
    let day = 1
    
    for (let i = 0; i < 6; i++) {
      const week = []
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < firstDay) {
          week.push(<div key={`empty-${j}`} className="calendar-day empty"></div>)
        } else if (day > daysInMonth) {
          week.push(<div key={`empty-${j}`} className="calendar-day empty"></div>)
        } else {
          const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
          const dateKey = date.toISOString().split('T')[0]
          const hasFlights = monthData[dateKey]?.length > 0
          const isToday = day === today.getDate() && 
                          viewMonth.getMonth() === today.getMonth() && 
                          viewMonth.getFullYear() === today.getFullYear()
          
          week.push(
            <div 
              key={day} 
              className={`calendar-day ${hasFlights ? 'has-duty' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => hasFlights && setActiveTab('daily')}
            >
              <div className="day-number">{day}</div>
              {hasFlights && <div className="duty-indicator">{monthData[dateKey].length} flights</div>}
            </div>
          )
          day++
        }
      }
      calendar.push(<div key={i} className="calendar-week">{week}</div>)
    }
    
    const hasNextMonth = schedule && schedule.some(pairing => 
      pairing.flights.some(flight => {
        const flightDate = new Date(flight.date)
        return flightDate.getMonth() === viewMonth.getMonth() + 1 && 
               flightDate.getFullYear() === viewMonth.getFullYear()
      })
    )
    
    return (
      <div className="monthly-view">
        <div className="month-navigation">
          <button onClick={goToPreviousMonth} className="nav-arrow">‹</button>
          <h2>{viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
          <button 
            onClick={goToNextMonth} 
            className="nav-arrow"
            disabled={!hasNextMonth}
            title={!hasNextMonth ? 'No schedule data available for next month' : ''}
          >›</button>
        </div>
        {(viewMonth.getMonth() !== today.getMonth() || viewMonth.getFullYear() !== today.getFullYear()) && (
          <button onClick={goToToday} className="today-btn">Go to Today</button>
        )}
        <div className="calendar-header">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="day-name">{day}</div>
          ))}
        </div>
        <div className="calendar-grid">{calendar}</div>
      </div>
    )
  }

  const renderDailyView = () => {
    const todaySchedule = getCurrentDaySchedule()
    const now = new Date()
    
    return (
      <div className="daily-view">
        <h2>{now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
        <div className="current-time">Current Time: {now.toLocaleTimeString()}</div>
        
        {!todaySchedule || todaySchedule.length === 0 ? (
          <div className="no-flights">No flights scheduled for today</div>
        ) : (
          todaySchedule.map((pairing, idx) => (
            <div key={idx} className="pairing-card">
              <h3>Pairing: {pairing.pairingId}</h3>
              
              {pairing.flights?.map((flight, fIdx) => {
                const originICAO = flight.origin?.substring(0, 4)
                const destICAO = flight.destination?.substring(0, 4)
                const originWeather = weatherData[originICAO]
                const destWeather = weatherData[destICAO]
                
                return (
                  <div key={fIdx} className="flight-card">
                    <div className="flight-row">
                      <strong>{flight.flightNumber}</strong>
                      <span>{flight.origin} → {flight.destination}</span>
                      <div className="flight-times">
                        <div className="time-group">
                          <span className="time-label">Scheduled:</span>
                          <span className="time-value">{flight.departure} - {flight.arrival}</span>
                        </div>
                        {(flight.actualDeparture || flight.actualArrival) && (
                          <div className="time-group actual">
                            <span className="time-label">Actual:</span>
                            <span className="time-value">
                              {flight.actualDeparture || flight.departure} - {flight.actualArrival || flight.arrival}
                            </span>
                          </div>
                        )}
                      </div>
                      <span>{flight.aircraft} {flight.tail}</span>
                    </div>

                    {originWeather && (
                      <div className="weather-section compact">
                        <h4>🌤️ {originICAO} Weather</h4>
                        {originWeather.metar && (
                          <div className="weather-item">
                            <strong>METAR:</strong>
                            <pre>{originWeather.metar.rawOb || JSON.stringify(originWeather.metar, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    {destWeather && (
                      <div className="weather-section compact">
                        <h4>🌤️ {destICAO} Weather</h4>
                        {destWeather.metar && (
                          <div className="weather-item">
                            <strong>METAR:</strong>
                            <pre>{destWeather.metar.rawOb || JSON.stringify(destWeather.metar, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )
              })}

              {pairing.hotel && (
                <div className="hotel-section compact">
                  <h4>🏨 {pairing.hotel.name}</h4>
                  <p>📞 {pairing.hotel.phone}</p>
                  <p>{pairing.hotel.address}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    )
  }

  const sendChatMessage = async (friendId, message) => {
    if (!message.trim()) return
    
    const newMessage = {
      id: Date.now(),
      senderId: username,
      text: message,
      timestamp: new Date().toISOString()
    }
    
    const updatedMessages = {
      ...chatMessages,
      [friendId]: [...(chatMessages[friendId] || []), newMessage]
    }
    setChatMessages(updatedMessages)
    await localforage.setItem('chatMessages', updatedMessages)
  }

  const getNearbyCrewmates = () => {
    // Get current location from user's schedule
    const today = getCurrentDaySchedule()
    if (!today || !today.flights || today.flights.length === 0) return []
    
    const currentFlight = today.flights[0]
    const currentLocation = currentFlight.origin
    
    // Filter friends who are in the same location
    return friends.filter(friend => {
      return friend.currentLocation === currentLocation
    })
  }

  const renderFriendsView = () => {
    const [friendSearch, setFriendSearch] = React.useState('')
    const [selectedChat, setSelectedChat] = React.useState(null)
    const [messageInput, setMessageInput] = React.useState('')
    
    return (
      <div className="friends-view">
        <h2>👥 Friends & Co-workers</h2>
        
        {/* Sub-tabs */}
        <div className="friends-subtabs">
          <button 
            className={friendsSubTab === 'chats' ? 'active' : ''}
            onClick={() => setFriendsSubTab('chats')}
          >
            💬 Chats
          </button>
          <button 
            className={friendsSubTab === 'nearby' ? 'active' : ''}
            onClick={() => setFriendsSubTab('nearby')}
          >
            📍 Nearby
          </button>
        </div>

        {/* Chats Tab */}
        {friendsSubTab === 'chats' && (
          <div className="chats-container">
            {selectedChat ? (
              <div className="chat-window">
                <div className="chat-header">
                  <button className="back-to-list" onClick={() => setSelectedChat(null)}>
                    ← Back
                  </button>
                  <h3>{selectedChat.name}</h3>
                </div>
                
                <div className="messages-list">
                  {(chatMessages[selectedChat.id] || []).map((msg) => (
                    <div key={msg.id} className={`message ${msg.senderId === username ? 'sent' : 'received'}`}>
                      <div className="message-bubble">
                        <p>{msg.text}</p>
                        <span className="message-time">
                          {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(chatMessages[selectedChat.id] || []).length === 0 && (
                    <div className="empty-chat">
                      <p>👋 Start a conversation!</p>
                    </div>
                  )}
                </div>
                
                <div className="message-input-container">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        sendChatMessage(selectedChat.id, messageInput)
                        setMessageInput('')
                      }
                    }}
                  />
                  <button onClick={() => {
                    sendChatMessage(selectedChat.id, messageInput)
                    setMessageInput('')
                  }}>
                    Send
                  </button>
                </div>
              </div>
            ) : (
              <div className="friends-list-container">
                <div className="friend-search">
                  <input
                    type="text"
                    placeholder="Search friends or add new..."
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                  />
                  <button onClick={() => sendFriendRequest(friendSearch)} disabled={!isOnline}>
                    Add Friend
                  </button>
                </div>

                {friendRequests.length > 0 && (
                  <div className="friend-requests">
                    <h3>Pending Requests ({friendRequests.length})</h3>
                    {friendRequests.map((request, idx) => (
                      <div key={idx} className="request-item">
                        <span className="request-name">{request.name}</span>
                        <span className="request-id">#{request.employeeId}</span>
                        <button className="accept-btn" onClick={() => acceptFriendRequest(request.id)}>Accept</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="friends-list">
                  <h3>Conversations</h3>
                  {friends.length === 0 ? (
                    <div className="empty-friends">
                      <p>👋 No friends yet</p>
                      <p className="empty-hint">Search and add coworkers to start chatting</p>
                    </div>
                  ) : (
                    friends.map((friend, idx) => (
                      <div key={idx} className="friend-item chat-item" onClick={() => setSelectedChat(friend)}>
                        <div className="friend-avatar">{friend.name.charAt(0)}</div>
                        <div className="friend-info">
                          <span className="friend-name">{friend.name}</span>
                          <span className="last-message">
                            {chatMessages[friend.id]?.length > 0 
                              ? chatMessages[friend.id][chatMessages[friend.id].length - 1].text 
                              : 'Start a conversation'}
                          </span>
                        </div>
                        {chatMessages[friend.id]?.length > 0 && (
                          <span className="message-count">{chatMessages[friend.id].length}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nearby Tab */}
        {friendsSubTab === 'nearby' && (
          <div className="nearby-container">
            <div className="nearby-header">
              <h3>📍 Nearby Crewmates</h3>
              <p className="nearby-subtitle">Friends in your current location</p>
            </div>
            
            {getNearbyCrewmates().length === 0 ? (
              <div className="empty-nearby">
                <p>🌍 No nearby crewmates found</p>
                <p className="empty-hint">Friends at your current base will appear here</p>
              </div>
            ) : (
              <div className="nearby-list">
                {getNearbyCrewmates().map((friend, idx) => (
                  <div key={idx} className="nearby-item">
                    <div className="friend-avatar">{friend.name.charAt(0)}</div>
                    <div className="friend-info">
                      <span className="friend-name">{friend.name}</span>
                      <span className="friend-location">📍 {friend.currentLocation}</span>
                    </div>
                    <button className="chat-nearby-btn" onClick={() => {
                      setFriendsSubTab('chats')
                      setSelectedChat(friend)
                    }}>
                      💬 Chat
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const [familyCode, setFamilyCode] = React.useState('')
  const [showCodeGenerator, setShowCodeGenerator] = React.useState(false)

  const generateFamilyCode = async () => {
    const pilotUsername = await localforage.getItem('pilotUsername') || 'PILOT'
    const randomSuffix = 'FAM' + Math.floor(Math.random() * 9999)
    const code = `${pilotUsername}-${randomSuffix}`
    setFamilyCode(code)
    setShowCodeGenerator(true)
  }

  const copyFamilyCode = () => {
    navigator.clipboard.writeText(`Username: ${familyCode}\nPassword: [Use your pilot password]`)
    alert('Family access code copied! Share with family members.')
  }





  const renderSettingsView = () => {
    return (
      <div className="settings-view">
        <h2>⚙️ Settings</h2>
        
        {userType === 'pilot' && (
          <div className="setting-group family-code-section">
            <h3>👨‍👩‍👧‍👦 Family Access</h3>
            <p className="family-note">Generate access codes for family members to view your schedule (crew details hidden)</p>
            <button className="generate-code-btn" onClick={generateFamilyCode}>
              Generate Family Code
            </button>
            
            {showCodeGenerator && (
              <div className="family-code-display">
                <div className="code-box">
                  <strong>Username:</strong> <code>{familyCode}</code>
                </div>
                <div className="code-box">
                  <strong>Password:</strong> [Use your pilot password]
                </div>
                <button className="copy-code-btn" onClick={copyFamilyCode}>
                  📋 Copy Code
                </button>
                <p className="code-note">⚠️ Family members use this username with your pilot password. They will NOT see crew details or friend lists.</p>
              </div>
            )}
          </div>
        )}
        
        <div className="setting-group">
          <label>
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={(e) => updateSettings({...settings, notifications: e.target.checked})}
            />
            Enable Notifications
          </label>
        </div>

        <div className="setting-group">
          <label>
            <input
              type="checkbox"
              checked={settings.autoRefresh}
              onChange={(e) => updateSettings({...settings, autoRefresh: e.target.checked})}
            />
            Auto-refresh schedule daily
          </label>
        </div>

        <div className="setting-group">
          <label>Theme:</label>
          <select 
            value={settings.theme}
            onChange={(e) => updateSettings({...settings, theme: e.target.value})}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </div>

        <div className="setting-group">
          <button onClick={() => localforage.clear()}>Clear All Cache</button>
          <button onClick={handleLogout}>Logout</button>
        </div>

        <div className="app-info">
          <h3>About</h3>
          <p><strong>Version</strong> 1.0.0</p>
          <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
          
          <div className="app-description">
            <h4>📱 App Overview</h4>
            <p>FlightRosterIQ is a progressive web app that provides offline access to your airline schedule with real-time weather, hotel information, and crew coordination features.</p>
            
            <h4>✈️ Features</h4>
            <ul>
              <li>📅 Monthly and Daily schedule views</li>
              <li>🌤️ Live weather (METAR/TAF/ATIS) for all airports</li>
              <li>🏨 Hotel details with contact information</li>
              <li>👥 Share schedules with coworkers via Friends</li>
              <li>🔔 Automatic schedule change notifications</li>
              <li>📴 Full offline support with cached data</li>
              <li>👨‍👩‍👧‍👦 Family access with privacy controls</li>
            </ul>
          </div>
          
          <div className="app-support">
            <p><strong>💙 Supported by Andrew McGee</strong></p>
            <p>If you find this app helpful, consider supporting development:</p>
            <a 
              href="https://paypal.me/yourusername" 
              target="_blank" 
              rel="noopener noreferrer"
              className="paypal-link"
            >
              ☕ Buy me a coffee via PayPal
            </a>
          </div>
          
          <div className="app-faq-contact">
            <h4>❓ FAQs & Contact</h4>
            <div className="faq-item">
              <p><strong>Q: How do I add my airline?</strong></p>
              <p>A: Contact us with your airline's crew portal URL.</p>
            </div>
            <div className="faq-item">
              <p><strong>Q: Can family members view my schedule?</strong></p>
              <p>A: Yes! Generate a family access code in Settings (crew details hidden).</p>
            </div>
            <div className="faq-item">
              <p><strong>Q: Does this work offline?</strong></p>
              <p>A: Yes! Schedules and weather data are cached for offline viewing.</p>
            </div>
            <div className="faq-item">
              <p><strong>Q: Can I request new features?</strong></p>
              <p>A: Absolutely! We love hearing your ideas. Feel free to request any cool features via email.</p>
            </div>
            <div className="contact-info">
              <p>✈️ <strong>Need your airline added?</strong></p>
              <p>💬 <strong>Need support or have questions?</strong></p>
              <p>💡 <strong>Have a feature idea?</strong></p>
              <p><strong>Email:</strong> <a href="mailto:FlightRosterIQ@Gmail.com" className="email-link">FlightRosterIQ@Gmail.com</a></p>
            </div>
          </div>
          
          <p className="app-footer">Made with ❤️ for airline crew members</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <div className="header-logo">
          <img src="/logo.png" alt="FlightRosterIQ Logo" className="app-logo" />
          <h1>FlightRosterIQ</h1>
        </div>
        <div className="header-actions">
          <div className={`status ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? '🟢' : '🔴'}
          </div>
          <button onClick={() => fetchSchedule()} disabled={loading || !isOnline}>
            {loading ? '⟳' : '↻'}
          </button>
        </div>
      </header>

      <main>
        {schedule && (
          <>
            {activeTab === 'monthly' && renderMonthlyView()}
            {activeTab === 'daily' && renderDailyView()}
            {activeTab === 'changes' && (
              <div className="changes-view">
                <h2>📬 Schedule Changes</h2>
                
                {scheduleChanges.length === 0 ? (
                  <div className="no-changes">
                    <p>No pending schedule changes</p>
                    <button onClick={fetchScheduleChanges} disabled={!isOnline}>
                      Check for Changes
                    </button>
                  </div>
                ) : (
                  <div className="changes-list">
                    {scheduleChanges.map((change, idx) => (
                      <div key={idx} className="change-card">
                        <div className="change-header">
                          <span className="change-type">Schedule Modification</span>
                          <span className="change-time">{change.timestamp}</span>
                        </div>
                        <div className="change-message">{change.message}</div>
                        {change.revisionNumber && (
                          <div className="revision">Revision: {change.revisionNumber}</div>
                        )}
                        <div className="change-actions">
                          {change.hasViewButton && (
                            <button 
                              className="view-btn"
                              onClick={() => viewScheduleChangeDetails(change.id)}
                              disabled={!isOnline}
                            >
                              View Details
                            </button>
                          )}
                          {change.hasAcceptButton && (
                            <button 
                              className="accept-btn"
                              onClick={() => acceptScheduleChange(change.id)}
                              disabled={loading || !isOnline}
                            >
                              {loading ? 'Accepting...' : 'Accept Change'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeTab === 'friends' && renderFriendsView()}
            {activeTab === 'settings' && renderSettingsView()}
          </>
        )}
      </main>

      {!schedule && !loading && (
        <div className="empty-state">
          <p>No schedule data available</p>
          {isOnline && <button onClick={() => fetchSchedule()}>Load Schedule</button>}
        </div>
      )}

      {schedule && activeTab === 'all' && (
        <div className="schedule-container">
          {schedule.map((pairing, idx) => (
            <div key={idx} className="pairing-card">
              <h2>Pairing: {pairing.pairingId}</h2>
              
              {pairing.layoverLocation && (
                <div className="layover-info">
                  <h3>📍 Layover: {pairing.layoverLocation}</h3>
                </div>
              )}

              {pairing.hotel && (
                <div className="hotel-section">
                  <h3>🏨 Hotel Information</h3>
                  <div className="hotel-details">
                    <strong>{pairing.hotel.name}</strong>
                    <p>{pairing.hotel.address}</p>
                    {pairing.hotel.phone && <p>📞 {pairing.hotel.phone}</p>}
                    {pairing.hotel.checkIn && <p>Check-in: {pairing.hotel.checkIn}</p>}
                    {pairing.hotel.checkOut && <p>Check-out: {pairing.hotel.checkOut}</p>}
                    {pairing.hotel.confirmationNumber && (
                      <p>Confirmation: {pairing.hotel.confirmationNumber}</p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flights-section">
                <h3>✈️ Flights</h3>
                {pairing.flights?.map((flight, fIdx) => {
                  const originICAO = flight.origin?.substring(0, 4)
                  const destICAO = flight.destination?.substring(0, 4)
                  const originWeather = weatherData[originICAO]
                  const destWeather = weatherData[destICAO]
                  
                  return (
                    <div key={fIdx} className="flight-card">
                      <div className="flight-row">
                        <strong>{flight.flightNumber}</strong>
                        <span>{flight.origin} → {flight.destination}</span>
                        <div className="flight-times">
                          <div className="time-group">
                            <span className="time-label">Scheduled:</span>
                            <span className="time-value">{flight.departure} - {flight.arrival}</span>
                          </div>
                          {(flight.actualDeparture || flight.actualArrival) && (
                            <div className="time-group actual">
                              <span className="time-label">Actual:</span>
                              <span className="time-value">
                                {flight.actualDeparture || flight.departure} - {flight.actualArrival || flight.arrival}
                              </span>
                            </div>
                          )}
                        </div>
                        <span>{flight.aircraft} {flight.tail}</span>
                        {flight.tail && (
                          <button 
                            className="track-btn"
                            onClick={() => fetchAircraftInfo(flight.tail)}
                          >
                            📍 Track
                          </button>
                        )}
                      </div>

                      {aircraftData[flight.tail] && (
                        <div className="aircraft-info">
                          <h4>Aircraft: {flight.tail}</h4>
                          <p>Type: {flight.aircraft}</p>
                          {aircraftData[flight.tail].alternatives && (
                            <div>
                              <strong>Track Live:</strong>
                              {aircraftData[flight.tail].alternatives.map((link, i) => (
                                <a key={i} href={link} target="_blank" rel="noopener noreferrer">
                                  {link.includes('flightaware') ? 'FlightAware' : 
                                   link.includes('flightradar24') ? 'FlightRadar24' : 'ADS-B Exchange'}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {originWeather && (
                        <div className="weather-section">
                          <h4>🌤️ {originICAO} Weather (Departure)</h4>
                          {originWeather.metar && (
                            <div className="weather-item">
                              <strong>METAR:</strong>
                              <pre>{originWeather.metar.rawOb || JSON.stringify(originWeather.metar, null, 2)}</pre>
                            </div>
                          )}
                          {originWeather.taf && (
      {token && (
        <nav className="bottom-nav">
          <button 
            className={activeTab === 'monthly' ? 'active' : ''}
            onClick={() => setActiveTab('monthly')}
          >
            <span className="nav-icon">📅</span>
            <span className="nav-label">Monthly</span>
          </button>
          <button 
            className={activeTab === 'daily' ? 'active' : ''}
            onClick={() => setActiveTab('daily')}
          >
            <span className="nav-icon">📋</span>
            <span className="nav-label">Daily</span>
          </button>
          {userType === 'pilot' && (
            <>
              <button 
                className={`${activeTab === 'changes' ? 'active' : ''} ${scheduleChanges.length > 0 ? 'has-badge' : ''}`}
                onClick={() => setActiveTab('changes')}
                title="Changes"
              >
                <span className="nav-icon">
                  📬
                  {scheduleChanges.length > 0 && <span className="badge">{scheduleChanges.length}</span>}
                </span>
              </button>
              <button 
                className={activeTab === 'friends' ? 'active' : ''}
                onClick={() => setActiveTab('friends')}
                title="Friends"
              >
                <span className="nav-icon">👥</span>
              </button>
            </>
          )}
          <button 
            className={activeTab === 'settings' ? 'active' : ''}
            onClick={() => setActiveTab('settings')}
            title="Settings"
          >
            <span className="nav-icon">⚙️</span>
          </button>
        </nav>
      )}
                  )
                })}
              </div>

              {userType === 'pilot' && (
                <div className="crew-section">
                  <h3>👥 Crew</h3>
                  {pairing.crew?.map((member, cIdx) => (
                    <div key={cIdx} className="crew-member">
                      <strong>{member.name}</strong> - {member.rank}
                      <div className="crew-details">
                        <span>Base: {member.base}</span>
                        <span>Seniority: {member.seniority}</span>
                        <span>ID: {member.crewId}</span>
                        {member.phone && <span>📞 {member.phone}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
            )}
          </>
        )}
      </main>

      {token && (
        <nav className="bottom-nav">
          <button 
            className={activeTab === 'monthly' ? 'active' : ''}
            onClick={() => setActiveTab('monthly')}
            title="Monthly View"
          >
            <span className="nav-icon">📅</span>
          </button>
          <button 
            className={activeTab === 'daily' ? 'active' : ''}
            onClick={() => setActiveTab('daily')}
            title="Daily View"
          >
            <span className="nav-icon">📋</span>
          </button>
          <button 
            className={activeTab === 'friends' ? 'active' : ''}
            onClick={() => setActiveTab('friends')}
            title="Friends & Chat"
          >
            <span className="nav-icon">👥</span>
          </button>
          <button 
            className={activeTab === 'settings' ? 'active' : ''}
            onClick={() => setActiveTab('settings')}
            title="Settings"
          >
            <span className="nav-icon">⚙️</span>
          </button>
        </nav>
      )}
    </div>
  )
}

export default App
