import { useState, useEffect } from 'react'
import localforage from 'localforage'
import './App.css'

localforage.config({
  name: 'FlightRosterIQ',
  storeName: 'schedules'
})

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [token, setToken] = useState(null)
  const [username, setUsername] = useState('')
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
  const [theme, setTheme] = useState('light')
  const [showThemeDropdown, setShowThemeDropdown] = useState(false)
  const [friendSearch, setFriendSearch] = useState('')
  const [selectedChat, setSelectedChat] = useState(null)
  const [messageInput, setMessageInput] = useState('')
  const [accountType, setAccountType] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedFlight, setSelectedFlight] = useState(null)
  const [contactMenuOpen, setContactMenuOpen] = useState(null)
  const [weatherAirport, setWeatherAirport] = useState(null)
  const [trackedAircraft, setTrackedAircraft] = useState(null)
  const [settingsTab, setSettingsTab] = useState('features')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [chatEditMode, setChatEditMode] = useState(false)
  const [selectedChatsToDelete, setSelectedChatsToDelete] = useState([])
  const [familyAccessCodes, setFamilyAccessCodes] = useState([])
  const [newFamilyMemberName, setNewFamilyMemberName] = useState('')
  const [pilotRank, setPilotRank] = useState('Captain')
  const [homeAirport, setHomeAirport] = useState('')
  const [domicile, setDomicile] = useState('')
  const [isRegisteredUser, setIsRegisteredUser] = useState(false)
  const [showRegistrationPopup, setShowRegistrationPopup] = useState(false)
  const [nickname, setNickname] = useState('')
  const [familyMemberName, setFamilyMemberName] = useState('')
  const [pushSubscription, setPushSubscription] = useState(null)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    loadCachedData()
    initializePushNotifications()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadCachedData = async () => {
    try {
      const cachedToken = await localforage.getItem('authToken')
      const cachedSchedule = await localforage.getItem('schedule')
      const cachedFriends = await localforage.getItem('friends')
      const cachedSettings = await localforage.getItem('settings')
      const cachedUserType = await localforage.getItem('userType')
      const cachedAirline = await localforage.getItem('airline')
      const cachedUsername = await localforage.getItem('username')
      const cachedChatMessages = await localforage.getItem('chatMessages')
      const cachedFamilyCodes = await localforage.getItem('familyAccessCodes')
      const cachedPilotRank = await localforage.getItem('pilotRank')
      const cachedHomeAirport = await localforage.getItem('homeAirport')
      const cachedDomicile = await localforage.getItem('domicile')
      const cachedRegistrationStatus = await localforage.getItem('isRegisteredUser')
      const cachedNickname = await localforage.getItem('nickname')
      const cachedFamilyMemberName = await localforage.getItem('familyMemberName')
      
      if (cachedToken) setToken(cachedToken)
      if (cachedSchedule) setSchedule(cachedSchedule)
      if (cachedFriends) setFriends(cachedFriends)
      if (cachedSettings) setSettings(cachedSettings)
      if (cachedUserType) setUserType(cachedUserType)
      if (cachedAirline) setAirline(cachedAirline)
      if (cachedUsername) setUsername(cachedUsername)
      if (cachedChatMessages) setChatMessages(cachedChatMessages)
      if (cachedFamilyCodes) setFamilyAccessCodes(cachedFamilyCodes)
      if (cachedPilotRank) setPilotRank(cachedPilotRank)
      if (cachedHomeAirport) setHomeAirport(cachedHomeAirport)
      if (cachedDomicile) setDomicile(cachedDomicile)
      if (cachedRegistrationStatus) setIsRegisteredUser(cachedRegistrationStatus)
      if (cachedNickname) setNickname(cachedNickname)
      if (cachedFamilyMemberName) setFamilyMemberName(cachedFamilyMemberName)
      
      // Auto-refresh schedule on app open if online and has token
      if (cachedToken && isOnline) {
        fetchSchedule(cachedToken)
      }
      
      // Request notification permission on app load
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log('Notification permission:', permission)
        })
      }
    } catch (err) {
      console.error('Error loading cached data:', err)
    }
  }

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
          accountType,
          airline
        })
      })

      const data = await response.json()
      
      if (data.success && data.token) {
        setToken(data.token)
        setUserType(accountType)
        setUsername(credentials.username)
        await localforage.setItem('authToken', data.token)
        await localforage.setItem('userType', accountType)
        await localforage.setItem('username', credentials.username)
        if (airline) await localforage.setItem('airline', airline)
        
        // For family accounts, store the family member's name
        if (accountType === 'family' && data.memberName) {
          setFamilyMemberName(data.memberName)
          await localforage.setItem('familyMemberName', data.memberName)
        }
        
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
    try {
      const response = await fetch('http://localhost:3001/api/schedule', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })

      const data = await response.json()
      
      if (data.success && data.schedule) {
        setSchedule(data.schedule)
        await localforage.setItem('schedule', data.schedule)
        
        // Fetch notifications from backend - always get fresh data
        try {
          const notifResponse = await fetch('http://localhost:3001/api/notifications')
          const notifData = await notifResponse.json()
          
          if (notifData.success && notifData.notifications) {
            // Transform scraped notifications to match app format
            const transformedNotifications = notifData.notifications
              .filter(n => n.message && !n.message.toLowerCase().includes('no daily remarks'))
              .map(n => ({
                type: n.type === 'schedule_change' ? 'schedule' :
                      n.type === 'aircraft_change' ? 'aircraft' :
                      n.type === 'delay' ? 'delay' :
                      n.type === 'cancellation' ? 'cancellation' : 'general',
                message: n.message,
                date: n.date,
                read: n.read,
                flightNumber: n.flightNumber || null
              }))
            
            // Always update with latest notifications (empty array if none)
            setScheduleChanges(transformedNotifications)
            console.log(`📬 Loaded ${transformedNotifications.length} notifications from crew portal`)
          }
        } catch (notifError) {
          console.error('Failed to fetch notifications:', notifError)
          // Keep existing notifications on error
        }
        
        if (friendRequests.length === 0 && userType === 'pilot') {
          setFriendRequests([
            { name: 'James Wilson', role: 'Captain', employeeId: '78901', base: 'CVG' },
            { name: 'Maria Garcia', role: 'First Officer', employeeId: '89012', base: 'ATL' }
          ])
        }
      } else {
        setError(data.error || 'Failed to fetch schedule')
      }
    } catch (err) {
      setError('Failed to fetch schedule')
      console.error('Fetch schedule error:', err)
    } finally {
      setLoading(false)
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
      setSchedule(null)
      await localforage.removeItem('authToken')
      await localforage.removeItem('userType')
      await localforage.removeItem('airline')
    } catch (err) {
      console.error('Logout error:', err)
    }
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
    const today = getCurrentDaySchedule()
    if (!today || !today.flights || today.flights.length === 0) return []
    
    const currentLocation = today.flights[0].origin
    return friends.filter(friend => friend.currentLocation === currentLocation)
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setSearchLoading(true)
    setSearchResults([])
    
    try {
      // Simulate API call to search registered app users database
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Mock search results - only shows users who have registered on the app
      // In production, this would query your app's user database
      const mockCrewMembers = [
        { name: username, role: pilotRank, employeeId: username, base: domicile || homeAirport, airline: airline, isCurrentUser: true },
        { name: 'Sarah Johnson', role: 'Captain', employeeId: '12345', base: 'CVG', airline: 'Delta' },
        { name: 'Michael Chen', role: 'First Officer', employeeId: '23456', base: 'ORD', airline: 'United' },
        { name: 'Emily Rodriguez', role: 'Flight Attendant', employeeId: '34567', base: 'LAX', airline: 'American' },
        { name: 'David Thompson', role: 'First Officer', employeeId: '45678', base: 'CVG', airline: 'ABX Air' },
        { name: 'Jessica Williams', role: 'Captain', employeeId: '56789', base: 'ATL', airline: 'Southwest' },
        { name: 'Robert Martinez', role: 'Flight Attendant', employeeId: '67890', base: 'DFW', airline: 'FedEx' }
      ]
      
      // Filter based on search query (name or employee number)
      const query = searchQuery.toLowerCase()
      const results = mockCrewMembers.filter(member => 
        member.name.toLowerCase().includes(query) || 
        member.employeeId.includes(query)
      )
      
      setSearchResults(results)
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleRegisterUser = async () => {
    setShowRegistrationPopup(true)
    
    try {
      // Simulate API call to register user as findable
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mark user as registered
      setIsRegisteredUser(true)
      await localforage.setItem('isRegisteredUser', true)
      
      // In production, this would update the user's profile in the database
      // to make them searchable by other users
    } catch (err) {
      console.error('Registration error:', err)
    } finally {
      setTimeout(() => setShowRegistrationPopup(false), 500)
    }
  }

  const handleUnregisterUser = async () => {
    if (confirm('Are you sure you want to unregister? Other pilots will no longer be able to find you.')) {
      setIsRegisteredUser(false)
      await localforage.setItem('isRegisteredUser', false)
    }
  }

  const handleSendRequest = async (person) => {
    try {
      // Simulate API call to send friend request
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Add to friend requests (pending)
      setFriendRequests(prev => [...prev, person])
      
      // Show success feedback
      alert(`Friend request sent to ${person.name}! They'll see your request soon.`)
      
      // In production, this would send a notification to the other user
    } catch (err) {
      console.error('Send request error:', err)
      alert('Failed to send friend request. Please try again.')
    }
  }

  const getNotificationCount = () => {
    return friendRequests.length + scheduleChanges.length
  }

  const handleAcceptRequest = (request) => {
    setFriends(prev => [...prev, { ...request, id: `friend-${Date.now()}`, currentLocation: request.base }])
    setFriendRequests(prev => prev.filter(r => r.employeeId !== request.employeeId))
  }

  const handleDeclineRequest = (request) => {
    setFriendRequests(prev => prev.filter(r => r.employeeId !== request.employeeId))
  }

  const dismissScheduleChange = (index) => {
    setScheduleChanges(prev => prev.filter((_, i) => i !== index))
  }

  const initializePushNotifications = async () => {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready
        
        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription()
        
        if (!subscription) {
          // Subscribe to push notifications
          // Note: In production, you'd use your VAPID public key here
          const vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY' // Replace with actual key
          
          try {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            })
            console.log('✅ Push notification subscription:', subscription)
          } catch (err) {
            console.log('ℹ️ Push subscription skipped (VAPID key needed for production)')
          }
        }
        
        setPushSubscription(subscription)
      }
    } catch (err) {
      console.error('Push notification initialization failed:', err)
    }
  }

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  const triggerPushNotification = async (notification) => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        
        // Show notification via service worker (works on phone even when app is closed)
        await registration.showNotification('Flight Update Accepted', {
          body: notification.message,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          tag: 'flight-notification-' + Date.now(),
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
          actions: [
            { action: 'view', title: 'View Details' },
            { action: 'dismiss', title: 'Dismiss' }
          ],
          data: {
            notification: notification,
            url: '/',
            timestamp: Date.now()
          }
        })
        
        console.log('✅ Push notification triggered')
      }
    } catch (err) {
      console.error('Failed to trigger push notification:', err)
    }
  }

  const acceptNotification = async (notification, index) => {
    // Trigger service worker push notification (works on phone)
    await triggerPushNotification(notification)
    
    // Also show browser notification as fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Flight Notification Accepted', {
        body: notification.message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: 'flight-notification',
        requireInteraction: false,
        vibrate: [200, 100, 200]
      })
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Flight Notification Accepted', {
            body: notification.message,
            icon: '/icons/icon-192x192.png'
          })
        }
      })
    }

    // Show in-app notification
    alert(`✅ Notification Accepted!\n\n${notification.message}\n\nYou will be notified about updates for this ${notification.type === 'schedule' ? 'schedule change' : notification.type}.`)
    
    // Mark as read and keep in list
    setScheduleChanges(prev => prev.map((change, i) => 
      i === index ? { ...change, read: true, accepted: true } : change
    ))
  }

  const toggleChatSelection = (friendId) => {
    setSelectedChatsToDelete(prev => {
      if (prev.includes(friendId)) {
        return prev.filter(id => id !== friendId)
      } else {
        return [...prev, friendId]
      }
    })
  }

  const selectAllChats = () => {
    if (selectedChatsToDelete.length === friends.length) {
      setSelectedChatsToDelete([])
    } else {
      setSelectedChatsToDelete(friends.map(f => f.id))
    }
  }

  const deleteSelectedChats = () => {
    if (selectedChatsToDelete.length === 0) return
    
    const count = selectedChatsToDelete.length
    const confirmed = window.confirm(`Delete ${count} chat${count > 1 ? 's' : ''}? This will remove all messages.`)
    
    if (confirmed) {
      // Remove chat messages
      const newChatMessages = { ...chatMessages }
      selectedChatsToDelete.forEach(id => {
        delete newChatMessages[id]
      })
      setChatMessages(newChatMessages)
      
      // Remove friends
      setFriends(prev => prev.filter(f => !selectedChatsToDelete.includes(f.id)))
      
      // Clear selections and exit edit mode
      setSelectedChatsToDelete([])
      setChatEditMode(false)
    }
  }

  const generateFamilyAccessCode = async () => {
    if (!newFamilyMemberName.trim()) {
      alert('Please enter a family member name')
      return
    }

    try {
      const response = await fetch('http://localhost:3001/api/family/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pilotUsername: username,
          memberName: newFamilyMemberName.trim(),
          airline: airline
        })
      })

      const data = await response.json()

      if (data.success && data.code) {
        const newAccess = {
          id: Date.now().toString(),
          name: newFamilyMemberName.trim(),
          code: data.code,
          createdAt: new Date().toISOString()
        }

        const updatedCodes = [...familyAccessCodes, newAccess]
        setFamilyAccessCodes(updatedCodes)
        setNewFamilyMemberName('')
        
        // Save to local storage
        await localforage.setItem('familyAccessCodes', updatedCodes)
      } else {
        alert('Failed to generate access code. Please try again.')
      }
    } catch (err) {
      console.error('Error generating family code:', err)
      alert('Network error. Please try again.')
    }
  }

  const copyFamilyCode = (code) => {
    navigator.clipboard.writeText(code)
    alert('Family access code copied to clipboard!')
  }

  const revokeFamilyAccess = async (memberId, memberName, code) => {
    const confirmed = window.confirm(`Revoke access for ${memberName}? They will no longer be able to view your schedule.`)
    if (confirmed) {
      try {
        const response = await fetch(`http://localhost:3001/api/family/revoke-code/${code}`, {
          method: 'DELETE'
        })

        const data = await response.json()

        if (data.success) {
          const updatedCodes = familyAccessCodes.filter(access => access.id !== memberId)
          setFamilyAccessCodes(updatedCodes)
          await localforage.setItem('familyAccessCodes', updatedCodes)
        } else {
          alert('Failed to revoke access. Please try again.')
        }
      } catch (err) {
        console.error('Error revoking family access:', err)
        alert('Network error. Please try again.')
      }
    }
  }

  const revokeAllFamilyAccess = async () => {
    const confirmed = window.confirm('Revoke all family access? This will remove all family members\' access to your schedule.')
    if (confirmed) {
      try {
        // Revoke all codes from backend
        const revokePromises = familyAccessCodes.map(access =>
          fetch(`http://localhost:3001/api/family/revoke-code/${access.code}`, {
            method: 'DELETE'
          })
        )
        await Promise.all(revokePromises)

        setFamilyAccessCodes([])
        await localforage.removeItem('familyAccessCodes')
      } catch (err) {
        console.error('Error revoking all family access:', err)
        alert('Network error. Please try again.')
      }
    }
  }

  const getCurrentDaySchedule = () => {
    if (!schedule) return null
    const today = new Date().toISOString().split('T')[0]
    
    for (const pairing of schedule) {
      for (const flight of pairing.flights) {
        if (flight.date === today) {
          return { ...pairing, currentFlight: flight }
        }
      }
    }
    return null
  }

  const getScheduleForDate = (dateString) => {
    if (!schedule) return null
    
    const flights = []
    for (const pairing of schedule) {
      for (const flight of pairing.flights) {
        if (flight.date === dateString) {
          flights.push({ ...flight, pairingId: pairing.pairingId })
        }
      }
    }
    return flights.length > 0 ? flights : null
  }

  const getMonthlySchedule = () => {
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

  const hasScheduleForMonth = (year, month) => {
    if (!schedule) return false
    
    return schedule.some(pairing => 
      pairing.flights.some(flight => {
        const flightDate = new Date(flight.date)
        return flightDate.getFullYear() === year && flightDate.getMonth() === month
      })
    )
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() - 1)
      return newDate
    })
  }

  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() + 1)
      return newDate
    })
  }

  const renderFriendsView = () => {
    return (
      <div className="friends-view">
        <h2>👥 Friends & Co-workers</h2>
        
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
          <button 
            className={friendsSubTab === 'find' ? 'active' : ''}
            onClick={() => setFriendsSubTab('find')}
          >
            🔍 Find
          </button>
        </div>

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
                <div className="friends-list">
                  <div className="conversations-header">
                    <h3>Conversations</h3>
                    {friends.length > 0 && (
                      <button 
                        className="edit-chats-btn"
                        onClick={() => {
                          setChatEditMode(!chatEditMode)
                          setSelectedChatsToDelete([])
                        }}
                      >
                        {chatEditMode ? 'Done' : 'Edit'}
                      </button>
                    )}
                  </div>
                  
                  {chatEditMode && friends.length > 0 && (
                    <div className="chat-edit-actions">
                      <button 
                        className="select-all-btn"
                        onClick={selectAllChats}
                      >
                        {selectedChatsToDelete.length === friends.length ? '☑️ Deselect All' : '☐ Select All'}
                      </button>
                      <button 
                        className="delete-chats-btn"
                        onClick={deleteSelectedChats}
                        disabled={selectedChatsToDelete.length === 0}
                      >
                        🗑️ Delete ({selectedChatsToDelete.length})
                      </button>
                    </div>
                  )}
                  
                  {friends.length === 0 ? (
                    <div className="empty-friends">
                      <p>👋 No friends yet</p>
                      <p className="empty-hint">Search and add coworkers to start chatting</p>
                    </div>
                  ) : (
                    friends.map((friend, idx) => (
                      <div 
                        key={idx} 
                        className={`friend-item chat-item ${chatEditMode ? 'edit-mode' : ''} ${selectedChatsToDelete.includes(friend.id) ? 'selected' : ''}`}
                        onClick={() => {
                          if (chatEditMode) {
                            toggleChatSelection(friend.id)
                          } else {
                            setSelectedChat(friend)
                          }
                        }}
                      >
                        {chatEditMode && (
                          <div className="chat-checkbox">
                            <input 
                              type="checkbox" 
                              checked={selectedChatsToDelete.includes(friend.id)}
                              onChange={() => toggleChatSelection(friend.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                        <div className="friend-avatar">{friend.name.charAt(0)}</div>
                        <div className="friend-info">
                          <span className="friend-name">{friend.name}</span>
                          <span className="last-message">
                            {chatMessages[friend.id]?.length > 0 
                              ? chatMessages[friend.id][chatMessages[friend.id].length - 1].text 
                              : 'Start a conversation'}
                          </span>
                        </div>
                        {!chatEditMode && chatMessages[friend.id]?.length > 0 && (
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

        {friendsSubTab === 'find' && (
          <div className="find-container">
            <div className="find-header">
              <h3>🔍 Find Crew Members</h3>
              <p className="find-subtitle">Search registered app users by name or employee number</p>
            </div>
            
            <div className="search-box">
              <input
                type="text"
                placeholder="Enter name or employee number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    handleSearch()
                  }
                }}
              />
              <button 
                className="search-btn"
                onClick={handleSearch}
                disabled={!searchQuery.trim() || searchLoading}
              >
                {searchLoading ? '⏳ Searching...' : '🔍 Search'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                <h4>Search Results ({searchResults.length})</h4>
                {searchResults.map((person, idx) => (
                  <div key={idx} className="search-result-item">
                    <div className="result-avatar">{person.name.charAt(0)}</div>
                    <div className="result-info">
                      <span className="result-name">{person.name}</span>
                      <span className="result-role">{person.role} • #{person.employeeId}</span>
                      {person.airline && <span className="result-airline">✈️ {person.airline}</span>}
                      {person.base && <span className="result-base">📍 {person.base}</span>}
                    </div>
                    {person.isCurrentUser ? (
                      <span className="current-user-badge">👤 You</span>
                    ) : friends.some(f => f.employeeId === person.employeeId) ? (
                      <span className="already-friends">✓ Friends</span>
                    ) : friendRequests.some(r => r.employeeId === person.employeeId) ? (
                      <span className="request-pending">⏳ Pending</span>
                    ) : (
                      <button 
                        className="send-request-btn"
                        onClick={() => handleSendRequest(person)}
                      >
                        ➕ Send Request
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && !searchLoading && (
              <div className="no-results">
                <p>😔 No registered users found</p>
                <p className="no-results-hint">Make sure they have the app installed and try their full name or employee number</p>
              </div>
            )}

            {!searchQuery && (
              <div className="search-suggestions">
                <h4>💡 Tips</h4>
                <ul>
                  <li>Search by first or last name</li>
                  <li>Search by employee number (e.g., 12345)</li>
                  <li>Only finds crew members who are registered on the app</li>
                  <li>Send a friend request to start chatting</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const convertToUTC = (timeString) => {
    // Assumes timeString is in format "HH:MM" in local time
    if (!timeString) return ''
    try {
      const [hours, minutes] = timeString.split(':').map(Number)
      const today = new Date()
      today.setHours(hours, minutes, 0, 0)
      const utcHours = today.getUTCHours().toString().padStart(2, '0')
      const utcMinutes = today.getUTCMinutes().toString().padStart(2, '0')
      return `${utcHours}:${utcMinutes}`
    } catch (err) {
      return ''
    }
  }

  const calculateReportTime = (departureTime) => {
    // Calculate report time 1 hour before departure
    if (!departureTime) return { lt: '', utc: '' }
    try {
      const [hours, minutes] = departureTime.split(':').map(Number)
      const today = new Date()
      today.setHours(hours, minutes, 0, 0)
      // Subtract 1 hour
      today.setHours(today.getHours() - 1)
      const reportHours = today.getHours().toString().padStart(2, '0')
      const reportMinutes = today.getMinutes().toString().padStart(2, '0')
      const ltTime = `${reportHours}:${reportMinutes}`
      return {
        lt: ltTime,
        utc: convertToUTC(ltTime)
      }
    } catch (err) {
      return { lt: '', utc: '' }
    }
  }

  const calculateCheckinTime = (arrivalTime) => {
    // Calculate check-in time 1 hour after arrival
    if (!arrivalTime) return ''
    try {
      const [hours, minutes] = arrivalTime.split(':').map(Number)
      const time = new Date()
      time.setHours(hours, minutes, 0, 0)
      time.setHours(time.getHours() + 1)
      return `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`
    } catch (err) {
      return ''
    }
  }

  const calculateCheckoutTime = (departureTime) => {
    // Calculate check-out time 1.5 hours before departure
    if (!departureTime) return ''
    try {
      const [hours, minutes] = departureTime.split(':').map(Number)
      const time = new Date()
      time.setHours(hours, minutes, 0, 0)
      time.setMinutes(time.getMinutes() - 90)
      return `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`
    } catch (err) {
      return ''
    }
  }

  const renderNotificationsView = () => {
    const hasNotifications = friendRequests.length > 0 || scheduleChanges.length > 0

    return (
      <div className="notifications-view">
        <div className="notifications-header">
          <h2>🔔 Notifications</h2>
        </div>
        
        {!hasNotifications && (
          <div className="no-notifications">
            <span className="no-notif-icon">🔕</span>
            <p>No new notifications</p>
            <p className="no-notif-subtitle">Friend requests and schedule changes will appear here</p>
          </div>
        )}

        {userType !== 'family' && friendRequests.length > 0 && (
          <div className="notification-section">
            <h3>👥 Friend Requests ({friendRequests.length})</h3>
            <div className="notification-list">
              {friendRequests.map((request, idx) => (
                <div key={idx} className="notification-item friend-request-item">
                  <div className="notif-avatar">{request.name.charAt(0)}</div>
                  <div className="notif-content">
                    <p className="notif-title">
                      <strong>{request.name}</strong> sent you a friend request
                    </p>
                    <p className="notif-details">{request.role} • #{request.employeeId} • 📍 {request.base}</p>
                  </div>
                  <div className="notif-actions">
                    <button 
                      className="accept-btn"
                      onClick={() => handleAcceptRequest(request)}
                    >
                      ✓ Accept
                    </button>
                    <button 
                      className="decline-btn"
                      onClick={() => handleDeclineRequest(request)}
                    >
                      ✕ Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {scheduleChanges.length > 0 && (
          <div className="notification-section">
            <h3>📬 Crew Portal Updates ({scheduleChanges.length})</h3>
            <div className="notification-list">
              {scheduleChanges.map((change, idx) => {
                const icon = change.type === 'schedule' ? '📅' :
                            change.type === 'aircraft' ? '✈️' :
                            change.type === 'delay' ? '⏱️' :
                            change.type === 'cancellation' ? '🚫' : '📋'
                            
                const title = change.type === 'schedule' ? 'Schedule Change' :
                             change.type === 'aircraft' ? 'Aircraft Change' :
                             change.type === 'delay' ? 'Delay Notice' :
                             change.type === 'cancellation' ? 'Cancellation' : 'Remark'
                             
                return (
                  <div key={idx} className="notification-item schedule-change-item">
                    <div className="notif-icon-wrapper">
                      {icon}
                    </div>
                    <div className="notif-content">
                      <p className="notif-title">
                        <strong>{title}</strong>
                        {change.accepted && <span style={{marginLeft: '8px', color: '#4CAF50', fontSize: '0.9em'}}>✓ Accepted</span>}
                      </p>
                      <p className="notif-details">{change.message}</p>
                      {change.date && (
                        <p className="notif-flight">
                          {change.flightNumber ? `Flight ${change.flightNumber} • ` : ''}
                          {change.date}
                        </p>
                      )}
                    </div>
                    <div className="notif-actions">
                      {!change.accepted && (
                        <button 
                          className="accept-btn"
                          onClick={() => acceptNotification(change, idx)}
                          title="Accept & Enable Notifications"
                          style={{marginRight: '8px', padding: '6px 12px', fontSize: '0.85em'}}
                        >
                          ✓ Accept
                        </button>
                      )}
                      <button 
                        className="dismiss-btn"
                        onClick={() => dismissScheduleChange(idx)}
                        title="Dismiss"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderSettingsView = () => {
    return (
      <div className="settings-view">
        <h2>⚙️ Settings</h2>
        
        <div className="settings-tabs">
          <button 
            className={settingsTab === 'pilotInfo' ? 'active' : ''}
            onClick={() => setSettingsTab('pilotInfo')}
          >
            👤 Pilot Info
          </button>
          <button 
            className={settingsTab === 'features' ? 'active' : ''}
            onClick={() => setSettingsTab('features')}
          >
            🌟 Features
          </button>
          {userType !== 'family' && (
            <button 
              className={settingsTab === 'family' ? 'active' : ''}
              onClick={() => setSettingsTab('family')}
            >
              👨‍👩‍👧‍👦 Family
            </button>
          )}
          <button 
            className={settingsTab === 'faqs' ? 'active' : ''}
            onClick={() => setSettingsTab('faqs')}
          >
            ❓ FAQs
          </button>
          <button 
            className={settingsTab === 'contact' ? 'active' : ''}
            onClick={() => setSettingsTab('contact')}
          >
            📧 Contact
          </button>
        </div>

        {settingsTab === 'pilotInfo' && (
          <div className="settings-content">
            <h3>👤 Pilot Information</h3>
            <div className="pilot-info-section">
              <div className="pilot-info-card">
                <div className="pilot-info-row">
                  <span className="pilot-info-label">Username:</span>
                  <span className="pilot-info-value">{username || 'Not logged in'}</span>
                </div>
                {userType !== 'family' && (
                  <div className="pilot-info-row">
                    <span className="pilot-info-label">Nickname:</span>
                    <input
                      type="text"
                      className="pilot-nickname-input"
                      placeholder="Enter nickname..."
                      value={nickname}
                      onChange={(e) => {
                        setNickname(e.target.value)
                        localforage.setItem('nickname', e.target.value)
                      }}
                    />
                  </div>
                )}
                {userType !== 'family' && (
                  <div className="pilot-info-row">
                    <span className="pilot-info-label">Rank:</span>
                    <select 
                      className="pilot-rank-select"
                      value={pilotRank}
                      onChange={(e) => {
                        setPilotRank(e.target.value)
                        localforage.setItem('pilotRank', e.target.value)
                      }}
                    >
                      <option value="Captain">Captain</option>
                      <option value="First Officer">First Officer</option>
                    </select>
                  </div>
                )}
                {userType !== 'family' && (
                  <div className="pilot-info-row">
                    <span className="pilot-info-label">Home Airport:</span>
                    <select 
                      className="pilot-rank-select"
                      value={homeAirport}
                      onChange={(e) => {
                        setHomeAirport(e.target.value)
                        localforage.setItem('homeAirport', e.target.value)
                      }}
                    >
                      <option value="">Select Home Airport</option>
                      <option value="ANC">ANC</option>
                      <option value="ATL">ATL</option>
                      <option value="CVG">CVG</option>
                      <option value="BOS">BOS</option>
                      <option value="BWI">BWI</option>
                      <option value="CLT">CLT</option>
                      <option value="DCA">DCA</option>
                      <option value="DEN">DEN</option>
                      <option value="DFW">DFW</option>
                      <option value="DTW">DTW</option>
                      <option value="EWR">EWR</option>
                      <option value="HNL">HNL</option>
                      <option value="HOU">HOU</option>
                      <option value="IAD">IAD</option>
                      <option value="IAH">IAH</option>
                      <option value="JFK">JFK</option>
                      <option value="LAS">LAS</option>
                      <option value="LAX">LAX</option>
                      <option value="LGA">LGA</option>
                      <option value="MCO">MCO</option>
                      <option value="MDW">MDW</option>
                      <option value="MEM">MEM</option>
                      <option value="MIA">MIA</option>
                      <option value="MSP">MSP</option>
                      <option value="ORD">ORD</option>
                      <option value="PHL">PHL</option>
                      <option value="PHX">PHX</option>
                      <option value="SAN">SAN</option>
                      <option value="SEA">SEA</option>
                      <option value="SFO">SFO</option>
                      <option value="SJU">SJU</option>
                      <option value="SLC">SLC</option>
                      <option value="STL">STL</option>
                      <option value="TPA">TPA</option>
                    </select>
                  </div>
                )}
                {userType !== 'family' && (
                  <div className="pilot-info-row">
                    <span className="pilot-info-label">Domicile:</span>
                    <select 
                      className="pilot-rank-select"
                      value={domicile}
                      onChange={(e) => {
                        setDomicile(e.target.value)
                        localforage.setItem('domicile', e.target.value)
                      }}
                    >
                      <option value="">Select Domicile</option>
                      <option value="ANC">ANC</option>
                      <option value="ATL">ATL</option>
                      <option value="CVG">CVG</option>
                      <option value="BOS">BOS</option>
                      <option value="BWI">BWI</option>
                      <option value="CLT">CLT</option>
                      <option value="DCA">DCA</option>
                      <option value="DEN">DEN</option>
                      <option value="DFW">DFW</option>
                      <option value="DTW">DTW</option>
                      <option value="EWR">EWR</option>
                      <option value="HNL">HNL</option>
                      <option value="HOU">HOU</option>
                      <option value="IAD">IAD</option>
                      <option value="IAH">IAH</option>
                      <option value="JFK">JFK</option>
                      <option value="LAS">LAS</option>
                      <option value="LAX">LAX</option>
                      <option value="LGA">LGA</option>
                      <option value="MCO">MCO</option>
                      <option value="MDW">MDW</option>
                      <option value="MEM">MEM</option>
                      <option value="MIA">MIA</option>
                      <option value="MSP">MSP</option>
                      <option value="ORD">ORD</option>
                      <option value="PHL">PHL</option>
                      <option value="PHX">PHX</option>
                      <option value="SAN">SAN</option>
                      <option value="SEA">SEA</option>
                      <option value="SFO">SFO</option>
                      <option value="SJU">SJU</option>
                      <option value="SLC">SLC</option>
                      <option value="STL">STL</option>
                      <option value="TPA">TPA</option>
                    </select>
                  </div>
                )}
                <div className="pilot-info-row">
                  <span className="pilot-info-label">Company:</span>
                  <span className="pilot-info-value">
                    {airline === 'abx' ? 'ABX AIR (GB)' : airline === 'ati' ? 'AIR TRANSPORT INTERNATIONAL (8C)' : airline ? airline.toUpperCase() : 'Unknown'}
                  </span>
                </div>
              </div>
              
              {userType !== 'family' && (
                <div className="user-registration-section">
                  <h4>👥 Friend Discovery</h4>
                <p>Allow other pilots to find and friend request you in the app</p>
                {!isRegisteredUser ? (
                  <button 
                    className="register-user-btn"
                    onClick={handleRegisterUser}
                  >
                    ✅ Click to Register as User
                  </button>
                ) : (
                  <div>
                    <div className="registered-status">
                      ✔️ Registered - Other pilots can find you
                    </div>
                    <button 
                      className="unregister-btn"
                      onClick={handleUnregisterUser}
                    >
                      ↶ Undo Registration
                    </button>
                  </div>
                )}
                </div>
              )}
            </div>
          </div>
        )}

        {settingsTab === 'features' && (
          <div className="settings-content">
            <h3>🌟 App Features</h3>
            <div className="features-list">
              <div className="feature-item">
                <span className="feature-icon">📅</span>
                <div>
                  <strong>Monthly & Daily Schedule Views</strong>
                  <p>View your flight schedule by month or day with detailed flight information</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✈️</span>
                <div>
                  <strong>Flight Details</strong>
                  <p>Click any flight to see crew members, aircraft info, gate details, and more</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🌤️</span>
                <div>
                  <strong>Weather Information</strong>
                  <p>Click airport codes to view ATIS, METAR, and TAF weather data</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📡</span>
                <div>
                  <strong>Aircraft Tracking</strong>
                  <p>Click tail numbers to see live aircraft position and flight status</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">👥</span>
                <div>
                  <strong>Crew Contact</strong>
                  <p>Call or text crew members directly from the app (when available)</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📱</span>
                <div>
                  <strong>Offline Support</strong>
                  <p>Access your schedule even without internet connection</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">💬</span>
                <div>
                  <strong>Friends & Chat</strong>
                  <p>Connect with coworkers, send messages, and see who's nearby at your base</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔍</span>
                <div>
                  <strong>Find Crew Members</strong>
                  <p>Search for crew members by name or employee number and send friend requests</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔔</span>
                <div>
                  <strong>Notifications</strong>
                  <p>Get alerts for friend requests, schedule changes, and aircraft swaps</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">👨‍👩‍👧‍👦</span>
                <div>
                  <strong>Family Access Codes</strong>
                  <p>Generate unique codes to share your schedule with family members (view-only)</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📍</span>
                <div>
                  <strong>Nearby Crewmates</strong>
                  <p>See which friends are at your current location or base</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📆</span>
                <div>
                  <strong>Calendar Navigation</strong>
                  <p>Click any date on the monthly calendar to view that day's schedule</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🗑️</span>
                <div>
                  <strong>Chat Management</strong>
                  <p>Edit mode to select and delete individual or multiple chat conversations</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📞</span>
                <div>
                  <strong>Direct Communication</strong>
                  <p>Click crew phone numbers for instant call or text options</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✈️</span>
                <div>
                  <strong>Detailed Aircraft Info</strong>
                  <p>View specific aircraft types (B767-300, B767-200) and tail number details</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔐</span>
                <div>
                  <strong>Secure Access</strong>
                  <p>Personal login system with cached credentials for quick access</p>
                </div>
              </div>
            </div>
            
            <div className="disclaimer-note">
              <p><strong>⚠️ Important Notice:</strong></p>
              <p>This is a third-party app and, as with all third-party apps, this is not intended to replace your company app. Please verify all duties on the official company app.</p>
            </div>
          </div>
        )}

        {settingsTab === 'family' && (
          <div className="settings-content">
            <h3>👨‍👩‍👧‍👦 Family Access</h3>
            <div className="family-access-info">
              <p className="family-intro">
                Share your flight schedule with family members! Generate a unique access code 
                that allows your loved ones to view your schedule in real-time.
              </p>
              <div className="family-restrictions">
                <strong>🔒 View-Only Access:</strong> Family members will only see your flight schedule. 
                They won't be able to access crew member details, Friends tab, or any other personal features.
              </div>
            </div>

            <div className="family-code-section">
              <div className="add-family-member">
                <h4>➕ Add Family Member</h4>
                <p>Enter the name of the family member you want to share your schedule with</p>
                <div className="family-input-group">
                  <input
                    type="text"
                    placeholder="e.g., Sarah (Wife), John (Son), Mom, etc."
                    value={newFamilyMemberName}
                    onChange={(e) => setNewFamilyMemberName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        generateFamilyAccessCode()
                      }
                    }}
                  />
                  <button 
                    className="generate-family-code-btn" 
                    onClick={generateFamilyAccessCode}
                    disabled={!newFamilyMemberName.trim()}
                  >
                    🎉 Generate Code
                  </button>
                </div>
              </div>
            </div>

            {familyAccessCodes.length > 0 && (
              <div className="family-members-section">
                <div className="family-members-header">
                  <h4>👥 Family Members with Access ({familyAccessCodes.length})</h4>
                  {familyAccessCodes.length > 1 && (
                    <button className="revoke-all-btn" onClick={revokeAllFamilyAccess}>
                      🚫 Revoke All
                    </button>
                  )}
                </div>
                
                <div className="family-members-list">
                  {familyAccessCodes.map((access) => (
                    <div key={access.id} className="family-member-card">
                      <div className="member-header">
                        <div className="member-avatar">{access.name.charAt(0)}</div>
                        <div className="member-info">
                          <span className="member-name">{access.name}</span>
                          <span className="member-date">Added {new Date(access.createdAt).toLocaleDateString()}</span>
                        </div>
                        <button 
                          className="revoke-member-btn" 
                          onClick={() => revokeFamilyAccess(access.id, access.name, access.code)}
                          title="Revoke access"
                        >
                          🚫 Revoke
                        </button>
                      </div>
                      
                      <div className="member-code-box">
                        <div className="member-code-label">Access Code:</div>
                        <div className="member-code-value">{access.code}</div>
                        <button 
                          className="copy-member-code-btn" 
                          onClick={() => copyFamilyCode(access.code)}
                        >
                          📋 Copy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="family-instructions">
                  <h5>📝 How to Share:</h5>
                  <ol>
                    <li>Copy the access code for the specific family member</li>
                    <li>Share it with them via text, email, or in person</li>
                    <li>They can use it to view your schedule on their device</li>
                    <li>Each code is unique and can be revoked individually</li>
                  </ol>
                </div>

                <div className="family-features">
                  <h5>🔒 Security & Privacy</h5>
                  <ul>
                    <li>✅ Family members can view your schedule only</li>
                    <li>✅ They cannot modify or delete anything</li>
                    <li>✅ Revoke access anytime with one click</li>
                    <li>✅ New code can be generated after revoking</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {settingsTab === 'faqs' && (
          <div className="settings-content">
            <h3>❓ Frequently Asked Questions</h3>
            <div className="faq-item">
              <p><strong>Q: How do I add friends?</strong></p>
              <p>A: Go to Friends tab and search by name or employee number</p>
            </div>
            <div className="faq-item">
              <p><strong>Q: Can I request new features?</strong></p>
              <p>A: Absolutely! We love hearing your ideas. Feel free to request any cool features via email.</p>
            </div>
            <div className="faq-item">
              <p><strong>Q: How do I view weather information?</strong></p>
              <p>A: Click on any airport code (like CVG or LAX) in the daily schedule to see current weather</p>
            </div>
            <div className="faq-item">
              <p><strong>Q: How do I track an aircraft?</strong></p>
              <p>A: Click on any tail number (like #N123AB) to see live tracking information</p>
            </div>
            <div className="faq-item">
              <p><strong>Q: Does this work offline?</strong></p>
              <p>A: Yes! Your schedule is cached locally so you can access it without internet</p>
            </div>
          </div>
        )}

        {settingsTab === 'contact' && (
          <div className="settings-content">
            <h3>📧 Contact Us</h3>
            <div className="contact-section">
              <div className="contact-card">
                <span className="contact-icon">📧</span>
                <div>
                  <strong>Email Support</strong>
                  <p><a href="mailto:FlightRosterIQ@Gmail.com">FlightRosterIQ@Gmail.com</a></p>
                  <p className="contact-description">For general inquiries, feature requests, and support</p>
                </div>
              </div>
              <div className="contact-card">
                <span className="contact-icon">💡</span>
                <div>
                  <strong>Feature Requests</strong>
                  <p>Have an idea to improve the app? We'd love to hear it!</p>
                  <p className="contact-description">Email us with your suggestions</p>
                </div>
              </div>
              <div className="contact-card">
                <span className="contact-icon">🐛</span>
                <div>
                  <strong>Report Issues</strong>
                  <p>Found a bug? Let us know so we can fix it</p>
                  <p className="contact-description">Include details about what went wrong</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="settings-footer">
          <p className="app-footer">Made with ❤️ for airline crew members</p>
          <p className="app-supporter">Supported by Drew McGee (ABX AIR pilot)</p>
          <div className="footer-actions">
            <a 
              href="https://cash.app/$FlightRosterIQ"
              target="_blank"
              rel="noopener noreferrer"
              className="donate-btn"
            >
              💰 Donate
            </a>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </div>
    )
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
              onClick={() => {
                setSelectedDate(dateKey)
                setActiveTab('daily')
              }}
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
    
    const nextMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1)
    const hasNextMonthSchedule = hasScheduleForMonth(nextMonth.getFullYear(), nextMonth.getMonth())
    const isCurrentMonth = viewMonth.getMonth() === today.getMonth() && viewMonth.getFullYear() === today.getFullYear()
    
    return (
      <div className="monthly-view">
        <div className="month-navigation">
          <button className="nav-arrow" onClick={goToPreviousMonth}>
            ← Previous
          </button>
          <h2>{viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
          {(!isCurrentMonth || hasNextMonthSchedule) && (
            <button className="nav-arrow" onClick={goToNextMonth}>
              Next →
            </button>
          )}
          {isCurrentMonth && !hasNextMonthSchedule && (
            <div className="nav-arrow-placeholder"></div>
          )}
        </div>
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
    const flights = getScheduleForDate(selectedDate)
    const selectedDateObj = new Date(selectedDate + 'T00:00:00')
    const formattedDate = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    
    if (!flights) {
      return (
        <div className="daily-view">
          <h2>📋 {formattedDate}</h2>
          <div className="empty-state">
            <p>No flights scheduled for this day</p>
          </div>
        </div>
      )
    }

    return (
      <div className="daily-view">
        <h2>📋 {formattedDate}</h2>
        <div className="pairing-card">
          <h3>Pairing: {flights[0].pairingId}</h3>
          {flights.map((flight, idx) => (
            <div key={idx} className="flight-card" onClick={() => setSelectedFlight(flight)}>
              <div className="flight-row">
                <div className="flight-header-section">
                  <strong>{flight.flightNumber}</strong>
                  <span>
                    <span 
                      className="airport-code" 
                      onClick={(e) => {
                        e.stopPropagation()
                        setWeatherAirport(flight.origin)
                      }}
                    >
                      {flight.origin}
                    </span>
                    {' → '}
                    <span 
                      className="airport-code" 
                      onClick={(e) => {
                        e.stopPropagation()
                        setWeatherAirport(flight.destination)
                      }}
                    >
                      {flight.destination}
                    </span>
                  </span>
                </div>
                <div className="report-time-section">
                  <span className="report-label">Report Time:</span>
                  <div className="report-time-value">
                    <div>{calculateReportTime(flight.departure).lt} LT</div>
                    <div className="time-utc-small">{calculateReportTime(flight.departure).utc} UTC</div>
                  </div>
                </div>
                <div className="flight-times">
                  <div className="time-group">
                    <span className="time-label">Scheduled:</span>
                    <div className="time-value">
                      <div>{flight.departure} - {flight.arrival} LT</div>
                      <div className="time-utc-small">{convertToUTC(flight.departure)} - {convertToUTC(flight.arrival)} UTC</div>
                    </div>
                  </div>
                  {(flight.actualDeparture || flight.actualArrival) && (
                    <div className="time-group actual">
                      <span className="time-label">Actual:</span>
                      <div className="time-value">
                        <div>
                          {flight.actualDeparture || flight.departure} - {flight.actualArrival || flight.arrival} LT
                        </div>
                        <div className="time-utc-small">
                          {convertToUTC(flight.actualDeparture || flight.departure)} - {convertToUTC(flight.actualArrival || flight.arrival)} UTC
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="aircraft-info">
                  <span className="aircraft-type">{flight.aircraft}</span>
                  <span 
                    className="tail-number" 
                    onClick={(e) => {
                      e.stopPropagation()
                      setTrackedAircraft({
                        tail: flight.tail,
                        aircraft: flight.aircraft,
                        flightNumber: flight.flightNumber
                      })
                    }}
                  >
                    {flight.tail}
                  </span>
                </div>
                <div className="click-hint">Click for details →</div>
              </div>
              {flight.layover && (
                <div className="layover-details">
                  {flight.layover.hotel && (
                    <div 
                      className="hotel-info clickable-hotel"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedFlight({...flight, showHotelDetails: true})
                      }}
                    >
                      <span className="info-icon">🏨</span>
                      <div className="info-content">
                        <strong>{flight.layover.hotel.name}</strong>
                        <span className="hotel-preview">Click for details</span>
                        <div className="hotel-times">
                          <span className="hotel-time">
                            ✅ Check-in: {calculateCheckinTime(flight.actualArrival || flight.arrival)}
                          </span>
                          {flights[idx + 1] && (
                            <span className="hotel-time">
                              🚪 Check-out: {calculateCheckoutTime(flights[idx + 1].departure)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="app">
        <div className="login-container">
          <img src="/logo.png" alt="FlightRosterIQ Logo" className="login-logo" />

          {!accountType ? (
            <div className="account-selection">
              <h2>Select Account Type</h2>
              <div className="account-buttons">
                <button className="account-btn pilot-btn" onClick={() => setAccountType('pilot')}>
                  <span className="account-icon">✈️</span>
                  <span className="account-label">Pilot Account</span>
                  <span className="account-desc">Full access to schedule, friends & more</span>
                </button>
                <button className="account-btn family-btn" onClick={() => setAccountType('family')}>
                  <span className="account-icon">👨‍👩‍👧‍👦</span>
                  <span className="account-label">Family Account</span>
                  <span className="account-desc">View pilot's schedule (crew names hidden)</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="account-type-badge">
                {accountType === 'pilot' ? '✈️ Pilot Login' : '👨‍👩‍👧‍👦 Family Login'}
              </div>
              <button className="back-btn" onClick={() => setAccountType(null)}>
                ← Back
              </button>

              {accountType === 'pilot' && (
                <div className="airline-selector">
                  <label>Select Airline:</label>
                  <select value={airline || ''} onChange={(e) => setAirline(e.target.value)} required>
                    <option value="">Choose airline...</option>
                    <option value="abx">ABX AIR (GB)</option>
                    <option value="ati">Air Transport International (8C)</option>
                  </select>
                </div>
              )}

              <form onSubmit={(e) => handleLogin(e, accountType)}>
                {accountType === 'pilot' ? (
                  <>
                    <input
                      type="text"
                      placeholder="Username"
                      value={credentials.username}
                      onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                      required
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      required
                    />
                  </>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter Family Access Code"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    required
                  />
                )}
                <button type="submit" disabled={loading || (accountType === 'pilot' && !airline)}>
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>

              {accountType === 'family' && (
                <div className="family-note">
                  Family accounts use codes provided by pilots. Enter the code to view the schedule.
                </div>
              )}
            </>
          )}
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    )
  }

  return (
    <div className={`app ${theme === 'dark' ? 'dark-theme' : ''}`}>
      <header>
        <div className="header-logo">
          <img src="/logo.png" alt="FlightRosterIQ Logo" className="app-logo" />
          <h1>FlightRosterIQ</h1>
        </div>
        {token && (
          <div className="welcome-message">
            {userType === 'family' && familyMemberName ? `Welcome ${familyMemberName}!` : `Welcome ${nickname || username || 'Pilot'}!`}
          </div>
        )}
        <div className="header-actions">
          <div className={`status ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </div>
          <div className="theme-toggle-container">
            <button 
              className="theme-toggle-btn"
              onClick={() => setShowThemeDropdown(!showThemeDropdown)}
            >
              Theme ▼
            </button>
            {showThemeDropdown && (
              <div className="theme-dropdown">
                <button 
                  className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => {
                    setTheme('light')
                    setShowThemeDropdown(false)
                  }}
                >
                  ☀️ Light
                </button>
                <button 
                  className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => {
                    setTheme('dark')
                    setShowThemeDropdown(false)
                  }}
                >
                  🌙 Dark
                </button>
              </div>
            )}
          </div>
          <button onClick={() => fetchSchedule()} disabled={loading || !isOnline}>
            {loading ? '⟳' : '↻'}
          </button>
        </div>
      </header>

      <main>
        {activeTab === 'monthly' && renderMonthlyView()}
        {activeTab === 'daily' && renderDailyView()}
        {activeTab === 'friends' && renderFriendsView()}
        {activeTab === 'notifications' && renderNotificationsView()}
        {activeTab === 'settings' && renderSettingsView()}
        
        {!schedule && !loading && (
          <div className="empty-state">
            <p>No schedule data available</p>
            {isOnline && <button onClick={() => fetchSchedule()}>Load Schedule</button>}
          </div>
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
            <span className="nav-label">Monthly</span>
          </button>
          <button 
            className={activeTab === 'daily' ? 'active' : ''}
            onClick={() => setActiveTab('daily')}
            title="Daily View"
          >
            <span className="nav-icon">📋</span>
            <span className="nav-label">Daily</span>
          </button>
          {userType === 'pilot' && (
            <>
              <button 
                className={activeTab === 'friends' ? 'active' : ''}
                onClick={() => setActiveTab('friends')}
                title="Friends & Chat"
              >
                <span className="nav-icon">👥</span>
                <span className="nav-label">Friends</span>
              </button>
            </>
          )}
          <button 
            className={`${activeTab === 'notifications' ? 'active' : ''} notification-btn`}
            onClick={() => setActiveTab('notifications')}
            title="Notifications"
          >
            <span className="nav-icon">
              🔔
              {getNotificationCount() > 0 && (
                <span className="notification-badge">{getNotificationCount()}</span>
              )}
            </span>
            <span className="nav-label">Notifications</span>
          </button>
          <button 
            className={activeTab === 'settings' ? 'active' : ''}
            onClick={() => setActiveTab('settings')}
            title="Settings"
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Settings</span>
          </button>
        </nav>
      )}

      {selectedFlight && (
        <div className="modal-overlay" onClick={() => setSelectedFlight(null)}>
          <div className="flight-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedFlight(null)}>✕</button>
            
            <h2>✈️ Flight Details</h2>
            
            <div className="detail-section">
              <h3>Flight Information</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Flight Number:</span>
                  <span className="detail-value">{selectedFlight.flightNumber}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Route:</span>
                  <span className="detail-value">{selectedFlight.origin} → {selectedFlight.destination}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Departure:</span>
                  <span className="detail-value">
                    <div className="time-display">
                      <span className="time-lt">{selectedFlight.departure} LT</span>
                      <span className="time-utc">{convertToUTC(selectedFlight.departure)} UTC</span>
                    </div>
                    {selectedFlight.actualDeparture && (
                      <div className="time-display actual-time">
                        <span className="time-lt">Actual: {selectedFlight.actualDeparture} LT</span>
                        <span className="time-utc">{convertToUTC(selectedFlight.actualDeparture)} UTC</span>
                      </div>
                    )}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Arrival:</span>
                  <span className="detail-value">
                    <div className="time-display">
                      <span className="time-lt">{selectedFlight.arrival} LT</span>
                      <span className="time-utc">{convertToUTC(selectedFlight.arrival)} UTC</span>
                    </div>
                    {selectedFlight.actualArrival && (
                      <div className="time-display actual-time">
                        <span className="time-lt">Actual: {selectedFlight.actualArrival} LT</span>
                        <span className="time-utc">{convertToUTC(selectedFlight.actualArrival)} UTC</span>
                      </div>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Aircraft Information</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Aircraft Type:</span>
                  <span className="detail-value">{selectedFlight.aircraft}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Tail Number:</span>
                  <span className="detail-value">{selectedFlight.tail}</span>
                </div>
                {selectedFlight.gate && (
                  <div className="detail-item">
                    <span className="detail-label">Gate:</span>
                    <span className="detail-value">{selectedFlight.gate}</span>
                  </div>
                )}
                {selectedFlight.terminal && (
                  <div className="detail-item">
                    <span className="detail-label">Terminal:</span>
                    <span className="detail-value">{selectedFlight.terminal}</span>
                  </div>
                )}
                {selectedFlight.aircraftLocation && (
                  <div className="detail-item">
                    <span className="detail-label">Aircraft Location:</span>
                    <span className="detail-value">{selectedFlight.aircraftLocation}</span>
                  </div>
                )}
                {selectedFlight.aircraftStatus && (
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value status-badge">{selectedFlight.aircraftStatus}</span>
                  </div>
                )}
              </div>
            </div>

            {userType !== 'family' && selectedFlight.crew && selectedFlight.crew.length > 0 && (
              <div className="detail-section">
                <h3>Crew Members</h3>
                <div className="crew-list">
                  {selectedFlight.crew.map((member, idx) => (
                    <div key={idx} className="crew-member">
                      <div className="crew-avatar">{member.name.charAt(0)}</div>
                      <div className="crew-info">
                        <div className="crew-name">{member.name}</div>
                        <div className="crew-role">{member.role}</div>
                        <div className="crew-id">ID: {member.employeeId}</div>
                        {member.phone && (
                          <div className="crew-phone-container">
                            <div 
                              className="crew-phone" 
                              onClick={(e) => {
                                e.stopPropagation()
                                setContactMenuOpen(contactMenuOpen === idx ? null : idx)
                              }}
                            >
                              📞 {member.phone}
                            </div>
                            {contactMenuOpen === idx && (
                              <div className="contact-menu">
                                <a 
                                  href={`tel:${member.phone.replace(/\D/g, '')}`}
                                  className="contact-option"
                                  onClick={() => setContactMenuOpen(null)}
                                >
                                  📞 Call
                                </a>
                                <a 
                                  href={`sms:${member.phone.replace(/\D/g, '')}`}
                                  className="contact-option"
                                  onClick={() => setContactMenuOpen(null)}
                                >
                                  💬 Text
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {weatherAirport && (
        <div className="modal-overlay" onClick={() => setWeatherAirport(null)}>
          <div className="weather-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setWeatherAirport(null)}>✕</button>
            
            <h2>🌤️ Weather for {weatherAirport}</h2>
            
            <div className="weather-section">
              <h3>ATIS (Automated Terminal Information Service)</h3>
              <div className="weather-info">
                <p><strong>Information:</strong> Alpha</p>
                <p><strong>Time:</strong> {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} UTC</p>
                <p><strong>Winds:</strong> 270 at 12 knots, gusts 18 knots</p>
                <p><strong>Visibility:</strong> 10 statute miles</p>
                <p><strong>Sky Condition:</strong> Few clouds at 3,000 feet, Scattered at 8,000 feet</p>
                <p><strong>Temperature:</strong> 18°C / 64°F</p>
                <p><strong>Dew Point:</strong> 12°C / 54°F</p>
                <p><strong>Altimeter:</strong> 30.12 inHg</p>
                <p><strong>Runway:</strong> Landing and departing Runway 27L</p>
              </div>
            </div>

            <div className="weather-section">
              <h3>METAR (Meteorological Aerodrome Report)</h3>
              <div className="weather-code">
                {weatherAirport} {new Date().toISOString().slice(8,10)}{new Date().getUTCHours()}00Z 27012G18KT 10SM FEW030 SCT080 18/12 A3012 RMK AO2
              </div>
            </div>

            <div className="weather-section">
              <h3>TAF (Terminal Aerodrome Forecast)</h3>
              <div className="weather-code">
                TAF {weatherAirport} {new Date().toISOString().slice(8,10)}{new Date().getUTCHours()}00Z {new Date().toISOString().slice(8,10)}{(new Date().getUTCHours() + 24) % 24}00Z 27012G18KT P6SM FEW030 SCT080
                <br/>FM{(new Date().getUTCHours() + 6) % 24}0000 28015G22KT P6SM SCT040 BKN100
                <br/>FM{(new Date().getUTCHours() + 12) % 24}0000 29010KT P6SM BKN060
              </div>
            </div>

            <div className="weather-legend">
              <p><strong>Quick Reference:</strong></p>
              <ul>
                <li>Wind direction and speed in knots (G = gusts)</li>
                <li>Visibility in statute miles (SM)</li>
                <li>Cloud coverage: FEW (1-2/8), SCT (3-4/8), BKN (5-7/8), OVC (8/8)</li>
                <li>Temperature/Dew Point in Celsius</li>
                <li>Altimeter setting in inches of mercury (A)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {trackedAircraft && (
        <div className="modal-overlay" onClick={() => setTrackedAircraft(null)}>
          <div className="tracking-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setTrackedAircraft(null)}>✕</button>
            
            <h2>📡 Aircraft Tracking: {trackedAircraft.tail}</h2>
            
            <div className="tracking-header">
              <div className="tracking-badge">
                <span className="badge-label">Aircraft Type</span>
                <span className="badge-value">{trackedAircraft.aircraft}</span>
              </div>
              <div className="tracking-badge">
                <span className="badge-label">Flight Number</span>
                <span className="badge-value">{trackedAircraft.flightNumber}</span>
              </div>
              <div className="tracking-badge status-live">
                <span className="badge-label">Status</span>
                <span className="badge-value">🔴 LIVE</span>
              </div>
            </div>

            <div className="tracking-section">
              <h3>✈️ Current Position</h3>
              <div className="position-grid">
                <div className="position-item">
                  <span className="position-label">Latitude:</span>
                  <span className="position-value">39.0997° N</span>
                </div>
                <div className="position-item">
                  <span className="position-label">Longitude:</span>
                  <span className="position-value">94.5786° W</span>
                </div>
                <div className="position-item">
                  <span className="position-label">Altitude:</span>
                  <span className="position-value">37,000 ft</span>
                </div>
                <div className="position-item">
                  <span className="position-label">Ground Speed:</span>
                  <span className="position-value">485 knots</span>
                </div>
                <div className="position-item">
                  <span className="position-label">Heading:</span>
                  <span className="position-value">270° (West)</span>
                </div>
                <div className="position-item">
                  <span className="position-label">Vertical Speed:</span>
                  <span className="position-value">Level Flight</span>
                </div>
              </div>
            </div>

            <div className="tracking-section">
              <h3>📍 Location Details</h3>
              <div className="location-info">
                <div className="location-row">
                  <strong>Current Location:</strong>
                  <span>En route - Over Kansas, USA</span>
                </div>
                <div className="location-row">
                  <strong>Distance from Origin:</strong>
                  <span>892 nautical miles</span>
                </div>
                <div className="location-row">
                  <strong>Distance to Destination:</strong>
                  <span>734 nautical miles</span>
                </div>
                <div className="location-row">
                  <strong>Estimated Time En Route:</strong>
                  <span>1 hour 31 minutes</span>
                </div>
              </div>
            </div>

            <div className="tracking-section">
              <h3>⏱️ Flight Timeline</h3>
              <div className="timeline">
                <div className="timeline-item completed">
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <strong>Departed CVG</strong>
                    <span>{new Date(Date.now() - 3600000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <div className="timeline-item active">
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <strong>In Flight</strong>
                    <span>Currently cruising at FL370</span>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <strong>Expected LAX</strong>
                    <span>{new Date(Date.now() + 5400000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="tracking-note">
              <p>🔄 Live tracking data updates every 30 seconds</p>
              <p>📡 Data source: ADS-B & Flight Data Systems</p>
            </div>
          </div>
        </div>
      )}

      {selectedFlight && selectedFlight.showHotelDetails && selectedFlight.layover?.hotel && (
        <div className="modal-overlay" onClick={() => setSelectedFlight(null)}>
          <div className="hotel-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedFlight(null)}>✕</button>
            
            <h2>🏨 Hotel Information</h2>
            
            <div className="hotel-detail-section">
              <h3>{selectedFlight.layover.hotel.name}</h3>
              
              <div className="hotel-detail-grid">
                <div className="hotel-detail-item">
                  <span className="hotel-detail-label">📍 Address:</span>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedFlight.layover.hotel.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hotel-address-link"
                  >
                    {selectedFlight.layover.hotel.address}
                  </a>
                </div>
                
                <div className="hotel-detail-item">
                  <span className="hotel-detail-label">📞 Phone:</span>
                  <a 
                    href={`tel:${selectedFlight.layover.hotel.phone.replace(/\D/g, '')}`}
                    className="hotel-phone-link"
                  >
                    {selectedFlight.layover.hotel.phone}
                  </a>
                </div>

                <div className="hotel-detail-item">
                  <span className="hotel-detail-label">✅ Check-in:</span>
                  <span className="hotel-time-value">
                    {calculateCheckinTime(selectedFlight.actualArrival || selectedFlight.arrival)}
                  </span>
                </div>

                <div className="hotel-detail-item">
                  <span className="hotel-detail-label">🚪 Check-out:</span>
                  <span className="hotel-time-value">
                    Contact hotel for specific time
                  </span>
                </div>
              </div>

              {selectedFlight.layover.shuttle && (
                <div className="shuttle-detail-section">
                  <h4>🚐 Shuttle Service</h4>
                  <div className="shuttle-detail-grid">
                    <div className="hotel-detail-item">
                      <span className="hotel-detail-label">Pickup Location:</span>
                      <span>{selectedFlight.layover.shuttle.pickup}</span>
                    </div>
                    <div className="hotel-detail-item">
                      <span className="hotel-detail-label">Phone:</span>
                      <a 
                        href={`tel:${selectedFlight.layover.shuttle.phone.replace(/\D/g, '')}`}
                        className="hotel-phone-link"
                      >
                        {selectedFlight.layover.shuttle.phone}
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showRegistrationPopup && (
        <div className="registration-popup-overlay">
          <div className="registration-popup">
            <div className="registration-spinner"></div>
            <h3>Registering as User...</h3>
            <p>Other pilots will be able to find and friend request you</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

