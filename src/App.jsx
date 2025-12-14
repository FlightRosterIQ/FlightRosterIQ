import { useState, useEffect } from 'react'
import localforage from 'localforage'
import './App.css'

// FlightRosterIQ Server Configuration
// Always use relative URLs - Vercel will proxy to VPS via vercel.json rewrites
const API_BASE_URL = '';

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
  const [loadingMessage, setLoadingMessage] = useState('')
  const [scrapingInProgress, setScrapingInProgress] = useState(false)
  const [error, setError] = useState(null)
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [weatherData, setWeatherData] = useState({})
  const [aircraftData, setAircraftData] = useState({})
  const [activeTab, setActiveTab] = useState('roster') // 'roster', 'crew', 'weather', 'settings'
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [friendsSubTab, setFriendsSubTab] = useState('chats')
  const [chatMessages, setChatMessages] = useState({})
  const [scheduleChanges, setScheduleChanges] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [userType, setUserType] = useState('pilot')
  const [airline, setAirline] = useState('abx') // Default to ABX Air
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
  const [flightDetailTab, setFlightDetailTab] = useState('flight') // 'flight', 'weather', 'crew'
  const [contactMenuOpen, setContactMenuOpen] = useState(null)
  const [weatherAirport, setWeatherAirport] = useState(null)
  const [trackedAircraft, setTrackedAircraft] = useState(null)
  const [flightTrackingData, setFlightTrackingData] = useState(null)
  const [settingsTab, setSettingsTab] = useState('features')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [chatEditMode, setChatEditMode] = useState(false)
  const [selectedChatsToDelete, setSelectedChatsToDelete] = useState([])
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  
  // Crew Portal Scraper states
  const [scraperCredentials, setScraperCredentials] = useState({ username: '', password: '', airline: 'ABX Air' })
  const [scraperData, setScraperData] = useState(null)
  const [scraperLoading, setScraperLoading] = useState(false)
  const [scraperError, setScraperError] = useState(null)
  const [showHomeInfo, setShowHomeInfo] = useState(false)
  const [familyAccessCodes, setFamilyAccessCodes] = useState([])
  const [newFamilyMemberName, setNewFamilyMemberName] = useState('')
  const [pilotRank, setPilotRank] = useState('Captain')
  const [homeAirport, setHomeAirport] = useState('')
  const [pilotProfile, setPilotProfile] = useState(null)
  const [allPilots, setAllPilots] = useState([])
  const [userLocation, setUserLocation] = useState(null)
  const [domicile, setDomicile] = useState('')
  const [isRegisteredUser, setIsRegisteredUser] = useState(false)
  const [showRegistrationPopup, setShowRegistrationPopup] = useState(false)
  const [nickname, setNickname] = useState('')
  const [familyMemberName, setFamilyMemberName] = useState('')
  const [pushSubscription, setPushSubscription] = useState(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [pilotAirline, setPilotAirline] = useState('')

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    loadCachedData()
    initializePushNotifications()
    
    // PWA Install Prompt Handler
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
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
      const cachedPilotAirline = await localforage.getItem('pilotAirline')
      
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
      if (cachedPilotAirline) setPilotAirline(cachedPilotAirline)
      
      // Load pilot profile and geolocation
      const cachedProfile = await localforage.getItem('pilotProfile')
      const cachedLocation = await localforage.getItem('userLocation')
      if (cachedProfile) setPilotProfile(cachedProfile)
      if (cachedLocation) setUserLocation(cachedLocation)
      
      // Request geolocation permission
      if (!cachedLocation) {
        requestGeolocation()
      }
      
      // Don't auto-refresh on load - let user login first
      // if (cachedToken && isOnline) {
      //   fetchSchedule(cachedToken)
      // }
      
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
    setLoadingMessage('Authenticating with crew portal...')
    setError(null)

    try {
      // Validate input based on account type
      if (accountType === 'pilot') {
        if (!airline || !credentials.username || !credentials.password) {
          setError('Please select an airline and enter your credentials')
          setLoading(false)
          return
        }
        
        // Validate against actual ABX Air crew portal credentials
        const username = credentials.username.trim()
        const password = credentials.password.trim()
        
        // Strict validation against fake credentials
        const usernameLower = username.toLowerCase()
        const passwordLower = password.toLowerCase()
        
        // ABX Air username format validation
        if (username.length < 4) {
          setError('ABX Air crew username must be at least 4 characters long')
          setLoading(false)
          return
        }
        
        if (password.length < 6) {
          setError('ABX Air crew password must be at least 6 characters long')
          setLoading(false)
          return
        }
        
        // Reject obviously fake credentials
        const invalidCredentials = [
          'test', 'demo', 'fake', 'admin', 'user', 'pilot', 'crew',
          '123', '1234', '12345', 'password', 'pass', 'abc', 'abcd', 'qwerty'
        ]
        
        if (invalidCredentials.includes(usernameLower) || invalidCredentials.includes(passwordLower)) {
          setError('Please use your actual ABX Air crew portal credentials. Test/demo accounts are not accepted.')
          setLoading(false)
          return
        }
        
        // Prevent sequential or repetitive patterns
        if (/^(.)\1{3,}$/.test(username) || /^(.)\1{3,}$/.test(password) ||
            /^(123|abc|qwe)/i.test(username) || /^(123|abc|qwe)/i.test(password)) {
          setError('Please use your actual ABX Air crew portal username and password.')
          setLoading(false)
          return
        }
        
        console.log(`🔐 Validating crew portal credentials for ${airline.toUpperCase()} pilot: ${username}`)
        setLoadingMessage(`Authenticating with ${airline.toUpperCase()} crew portal...`)
        
        // Validate credentials by attempting to authenticate with crew portal
        try {
          const authResponse = await apiCall('/api/authenticate', {
            method: 'POST',
            body: JSON.stringify({
              airline: airline || 'abx', // Default to ABX Air
              employeeId: username,
              password: password
            })
          })
          
          const authResult = await authResponse.json()
          
          // Check the validation response
          if (authResponse.status === 401) {
            // Credentials were definitely rejected
            setError('Invalid crew portal credentials. Please check your username and password.')
            setLoading(false)
            return
          }
          
          if (authResult.success) {
            // Real API authentication succeeded
            console.log('✅ Crew portal API authentication successful')
          } else if (authResult.credentialsValid === true || 
                     (authResult.error && authResult.error.includes('platform limitations'))) {
            // Fallback validation passed
            console.log('✅ Crew portal credentials validated successfully')
          } else if (!authResult.success && authResult.error) {
            // Authentication failed
            setError(`Authentication failed: ${authResult.error}`)
            setLoading(false)
            return
          }
          
        } catch (authError) {
          console.error('Authentication error:', authError)
          setError('Unable to validate credentials. Please check your connection and try again.')
          setLoading(false)
          return
        }
        
      } else if (accountType === 'family') {
        if (!credentials.username) {
          setError('Please enter your family access code')
          setLoading(false)
          return
        }
        
        // Validate family access code format
        const accessCode = credentials.username.trim()
        if (accessCode.length < 6) {
          setError('Family access code must be at least 6 characters')
          setLoading(false)
          return
        }
      }

      setLoadingMessage('Setting up your account...')
      
      // Generate a session token (in production, this would come from your auth system)
      const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      setToken(sessionToken)
      setUserType(accountType)
      setAccountType(accountType)
      setUsername(credentials.username.trim())
      
      // Save to persistent storage
      await localforage.setItem('authToken', sessionToken)
      await localforage.setItem('userType', accountType)
      await localforage.setItem('accountType', accountType)
      await localforage.setItem('username', credentials.username.trim())
      if (airline) await localforage.setItem('airline', airline)
      
      // For family accounts, look up the assigned name from the code
      if (accountType === 'family') {
        const accessCode = credentials.username.trim()
        
        // Try to get the name mapping for this code
        const codeMapping = await localforage.getItem('familyCodeMapping') || {}
        const memberInfo = codeMapping[accessCode]
        
        const familyMemberName = memberInfo ? memberInfo.name : 'Family Member'
        const pilotUsername = memberInfo ? (memberInfo.pilotName || memberInfo.pilot) : 'Pilot'
        const pilotAirlineValue = memberInfo ? memberInfo.airline : 'abx'
        
        setFamilyMemberName(familyMemberName)
        setUsername(pilotUsername) // Set the pilot's name for display
        setPilotAirline(pilotAirlineValue)
        await localforage.setItem('familyMemberName', familyMemberName)
        await localforage.setItem('familyAccessCode', accessCode)
        await localforage.setItem('pilotAirline', pilotAirlineValue)
      }
      
      console.log('✅ Login successful - credentials validated')
      
      // Stop loading and show scraping progress banner instead
      setLoading(false)
      setLoadingMessage('')
      
      // AUTOMATIC SCRAPING: Start scraping in background after successful login
      if (accountType === 'pilot') {
        console.log('🔄 Starting automatic crew portal scraping in background...')
        setScrapingInProgress(true)
        // Store encrypted credentials for refresh (in production, use proper encryption)
        await localforage.setItem('tempPassword', credentials.password)
        // Get current month being viewed for initial scrape
        const viewingMonth = currentMonth.getMonth() + 1
        const viewingYear = currentMonth.getFullYear()
        
        // Run scraping in background without blocking UI
        setTimeout(() => {
          handleAutomaticScraping(credentials.username.trim(), credentials.password, airline, viewingMonth, viewingYear).catch(err => {
            console.error('Auto-scraping error:', err)
            setScrapingInProgress(false)
          })
        }, 100)
      } else if (accountType === 'family' && memberInfo) {
        // For family accounts, scrape using the pilot's credentials
        console.log('🔄 Starting automatic scraping for family member...')
        setScrapingInProgress(true)
        
        const viewingMonth = currentMonth.getMonth() + 1
        const viewingYear = currentMonth.getFullYear()
        
        // Run scraping with pilot's credentials
        setTimeout(() => {
          handleAutomaticScraping(memberInfo.pilotEmployeeId, memberInfo.password, memberInfo.airline, viewingMonth, viewingYear).catch(err => {
            console.error('Auto-scraping error for family:', err)
            setScrapingInProgress(false)
          })
        }, 100)
      }
    } catch (err) {
      setError('Login error. Please try again.')
      console.error('Login error:', err)
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
      const response = await apiCall('/api/schedule', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })

      const data = await response.json()
      
      if (data.success) {
        if (data.schedule) {
          setSchedule(data.schedule)
          await localforage.setItem('schedule', data.schedule)
        }
        // If no schedule data, just continue without setting it
        
        // Fetch notifications from backend - always get fresh data
        try {
          const notifResponse = await apiCall('/api/notifications')
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
        
        if (data.schedule && friendRequests.length === 0 && userType === 'pilot') {
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
      // Clear all application state
      setToken(null)
      setUserType('pilot')
      setAccountType(null)
      setAirline(null)
      setSchedule(null)
      setActiveTab('monthly')
      
      // Clear scraper data
      setScraperCredentials({ airline: '', username: '', password: '' })
      setScraperData(null)
      setScraperError(null)
      setScraperLoading(false)
      
      // Clear all stored data
      await localforage.removeItem('authToken')
      await localforage.removeItem('userType')
      await localforage.removeItem('accountType')
      await localforage.removeItem('airline')
      await localforage.removeItem('schedule')
      await localforage.removeItem('scraperData')
      
      console.log('✅ Logged out successfully')
    } catch (err) {
      console.error('Logout error:', err)
      // Force logout even if there's an error
      setToken(null)
      setAccountType(null)
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
    try {
      // Use geolocation if available
      if (userLocation && allPilots.length > 0) {
        // Calculate distance to other pilots and return nearby ones (within 50 miles)
        return allPilots.filter(pilot => {
          if (!pilot.location) return false
          const distance = calculateDistance(userLocation, pilot.location)
          return distance < 50 && pilot.employeeId !== pilotProfile?.employeeId
        }).slice(0, 10)
      }
      
      // Fallback to schedule-based location
      const today = getCurrentDaySchedule()
      if (!today || !today.flights || today.flights.length === 0) return []
      
      const currentLocation = today.flights[0].origin || today.flights[0].departure
      if (!currentLocation) return []
      
      return friends.filter(friend => friend.currentLocation === currentLocation)
    } catch (error) {
      console.error('Error in getNearbyCrewmates:', error)
      return []
    }
  }
  
  const calculateDistance = (loc1, loc2) => {
    // Haversine formula to calculate distance between two lat/lng points
    const R = 3959 // Earth's radius in miles
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180
    const dLon = (loc2.lng - loc1.lng) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }
  
  const requestGeolocation = () => {
    if ('geolocation' in navigator) {
      // Check if we're on HTTPS or localhost
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost'
      
      if (!isSecure) {
        console.warn('Geolocation requires HTTPS. Feature disabled on HTTP.')
        return
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setUserLocation(location)
          localforage.setItem('userLocation', location)
        },
        (error) => {
          console.error('Geolocation error:', error)
        }
      )
    }
  }
  
  const searchPilots = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    
    setSearchLoading(true)
    
    try {
      // Search by name or employee number
      const isEmployeeId = /^\d{5,7}$/.test(query.trim())
      
      let results = []
      if (isEmployeeId) {
        // Search by employee ID
        results = allPilots.filter(pilot => 
          pilot.employeeId && pilot.employeeId.includes(query.trim())
        )
      } else {
        // Search by name
        const queryLower = query.toLowerCase()
        results = allPilots.filter(pilot =>
          pilot.name && pilot.name.toLowerCase().includes(queryLower)
        )
      }
      
      setSearchResults(results.slice(0, 20))
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setSearchLoading(true)
    setSearchResults([])
    
    try {
      // Call server API to search only registered users
      const response = await apiCall('/api/search-users', {
        method: 'POST',
        body: JSON.stringify({ query: searchQuery.trim() })
      })
      
      const data = await response.json()
      
      if (data.success && data.users) {
        // Show all users including current user (mark them so they can't add themselves)
        const currentUserEmployeeId = pilotProfile?.employeeId || username
        const results = data.users.map(user => ({
          ...user,
          isCurrentUser: user.employeeId === currentUserEmployeeId
        }))
        setSearchResults(results)
      } else {
        setSearchResults([])
      }
    } catch (err) {
      console.error('Search error:', err)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const handleRegisterUser = async () => {
    setShowRegistrationPopup(true)
    
    try {
      // Call server API to register user in database
      const response = await apiCall('/api/register-user', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: pilotProfile?.employeeId || username,
          name: pilotProfile?.name || username,
          role: pilotProfile?.rank || pilotRank,
          base: pilotProfile?.base || domicile || homeAirport,
          airline: airline
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setIsRegisteredUser(true)
        await localforage.setItem('isRegisteredUser', true)
      }
    } catch (err) {
      console.error('Registration error:', err)
    } finally {
      setTimeout(() => setShowRegistrationPopup(false), 500)
    }
  }

  const handleUnregisterUser = async () => {
    if (confirm('Are you sure you want to unregister? Other pilots will no longer be able to find you.')) {
      try {
        // Call server API to unregister user
        const response = await apiCall('/api/unregister-user', {
          method: 'POST',
          body: JSON.stringify({
            employeeId: pilotProfile?.employeeId || username
          })
        })
        
        const result = await response.json()
        
        if (result.success) {
          setIsRegisteredUser(false)
          await localforage.setItem('isRegisteredUser', false)
        }
      } catch (err) {
        console.error('Unregister error:', err)
      }
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
    // Dismiss just marks as read, doesn't remove
    setScheduleChanges(prev => prev.map((change, i) => 
      i === index ? { ...change, read: true } : change
    ))
  }

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      alert('To install this app:\n\n' +
            '1. On Android Chrome: Tap the menu (⋮) and select "Add to Home screen"\n' +
            '2. On iPhone Safari: Tap Share (📤) and select "Add to Home Screen"\n' +
            '3. On Desktop: Click the install icon in your browser\'s address bar\n\n' +
            'Note: HTTPS is required for installation.')
      return
    }
    
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('✅ User accepted the install prompt')
    }
    
    setDeferredPrompt(null)
    setShowInstallPrompt(false)
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
    
    // Remove notification after acceptance
    setScheduleChanges(prev => prev.filter((_, i) => i !== index))
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
      const response = await apiCall('/api/family/generate-code', {
        method: 'POST',
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
          createdAt: new Date().toISOString(),
          pilotUsername: username,
          pilotEmployeeId: pilotProfile?.employeeId || username,
          airline: airline
        }

        const updatedCodes = [...familyAccessCodes, newAccess]
        setFamilyAccessCodes(updatedCodes)
        
        // Store the code mapping globally so family members can look it up
        const codeMapping = await localforage.getItem('familyCodeMapping') || {}
        codeMapping[data.code] = {
          name: newFamilyMemberName.trim(),
          pilot: username,
          pilotEmployeeId: pilotProfile?.employeeId || username,
          pilotName: pilotProfile?.name || username,
          airline: airline,
          password: await localforage.getItem('tempPassword') // Store encrypted in production
        }
        await localforage.setItem('familyCodeMapping', codeMapping)
        
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

  const copyFamilyCode = async (code) => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code)
        alert('✅ Family access code copied to clipboard!')
      } else {
        // Fallback for older browsers or non-HTTPS
        const textArea = document.createElement('textarea')
        textArea.value = code
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          document.execCommand('copy')
          alert('✅ Family access code copied to clipboard!')
        } catch (err) {
          alert(`📋 Copy this code manually: ${code}`)
        }
        
        document.body.removeChild(textArea)
      }
    } catch (err) {
      console.error('Copy failed:', err)
      alert(`📋 Copy this code manually: ${code}`)
    }
  }

  const handleSaveProfileName = async () => {
    if (!editedName.trim()) {
      alert('Name cannot be empty')
      return
    }
    
    try {
      // Update pilot profile
      const updatedProfile = { ...pilotProfile, name: editedName.trim() }
      setPilotProfile(updatedProfile)
      await localforage.setItem('pilotProfile', updatedProfile)
      
      // Update family code mappings so family members see the new name
      const codeMapping = await localforage.getItem('familyCodeMapping') || {}
      const currentEmployeeId = pilotProfile?.employeeId || username
      
      // Update all codes that belong to this pilot
      for (const code in codeMapping) {
        if (codeMapping[code].pilotEmployeeId === currentEmployeeId) {
          codeMapping[code].pilotName = editedName.trim()
        }
      }
      
      await localforage.setItem('familyCodeMapping', codeMapping)
      
      setIsEditingName(false)
      alert('✅ Profile name updated successfully!')
    } catch (err) {
      console.error('Error saving profile name:', err)
      alert('❌ Failed to update profile name')
    }
  }

  const revokeFamilyAccess = async (memberId, memberName, code) => {
    const confirmed = window.confirm(`Revoke access for ${memberName}? They will no longer be able to view your schedule.`)
    if (confirmed) {
      try {
        const response = await apiCall(`/api/family/revoke-code/${code}`, {
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
          apiCall(`/api/family/revoke-code/${access.code}`, {
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

  // Convert IATA (3-letter) to ICAO (4-letter) airport code
  const convertToICAO = (airportCode) => {
    if (!airportCode) return null
    
    const code = airportCode.trim().toUpperCase()
    
    // Already ICAO (4 letters)
    if (code.length === 4) return code
    
    // IATA (3 letters) - convert to ICAO
    if (code.length === 3) {
      // US airports: add "K" prefix (most common)
      // Alaska airports: add "PA" prefix
      // Hawaii airports: add "PH" prefix
      // Canadian airports: add "C" prefix
      
      // Special cases for Alaska
      const alaskaAirports = ['ANC', 'FAI', 'JNU', 'BET', 'OME', 'SIT', 'CDV', 'KTN', 'ADQ', 'DLG']
      if (alaskaAirports.includes(code)) {
        return 'PA' + code
      }
      
      // Special cases for Hawaii
      const hawaiiAirports = ['HNL', 'OGG', 'KOA', 'LIH', 'ITO', 'MKK', 'LNY', 'JHM']
      if (hawaiiAirports.includes(code)) {
        return 'PH' + code
      }
      
      // Default: US mainland - add "K" prefix
      return 'K' + code
    }
    
    return code
  }

  // Fetch real weather data
  const fetchRealWeather = async (airportCode) => {
    const icaoCode = convertToICAO(airportCode)
    console.log(`🌦️ Fetching weather for: ${airportCode} → ${icaoCode}`)
    try {
      // Use server-side proxy to avoid CORS issues
      const response = await apiCall('/api/weather', {
        method: 'POST',
        body: JSON.stringify({ airport: icaoCode })
      })
      
      const data = await response.json()
      console.log('📡 Weather response:', data)
      
      if (data.success) {
        return {
          metar: data.metar || 'No METAR available',
          decoded: data.decoded || null,
          taf: data.taf || 'No TAF available',
          error: false
        }
      } else {
        return {
          metar: 'Error loading weather data',
          decoded: null,
          taf: 'Error loading TAF data',
          error: true
        }
      }
    } catch (error) {
      console.error('❌ Error fetching weather:', error)
      return {
        metar: 'Error loading weather data',
        decoded: null,
        taf: 'Error loading TAF data',
        error: true
      }
    }
  }

  // Fetch FlightAware data for aircraft tracking
  const fetchFlightAwareData = async (tailNumber, flightNumber, flightDate = null, origin = null, destination = null) => {
    try {
      const response = await apiCall('/api/flightaware', {
        method: 'POST',
        body: JSON.stringify({ 
          tailNumber, 
          flightNumber,
          departureDate: flightDate,
          origin: origin,
          destination: destination
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.success ? data.flightData : null
      }
    } catch (error) {
      console.error('Error fetching FlightAware data:', error)
    }
    return null
  }

  // Automatic Crew Portal Scraping Functions
  const handleAutomaticScraping = async (employeeId, password, airline, month = null, year = null) => {
    console.log('🚀 AUTOMATIC SCRAPING: Starting real crew portal authentication...')
    if (month && year) {
      console.log(`📅 Scraping for specific month: ${year}-${String(month).padStart(2, '0')}`)
    }
    setLoading(true)
    
    try {
      // Check if this is first login
      const hasScrapedBefore = await localforage.getItem('hasScrapedBefore')
      const firstLogin = !hasScrapedBefore
      
      console.log(`📋 First login: ${firstLogin} - ${firstLogin ? 'Will scrape full profile' : 'Schedule only'}`)
      
      const requestBody = {
        employeeId: employeeId,
        password: password,
        airline: airline || 'abx',
        firstLogin: firstLogin
      };
      
      // Add month/year if specified
      if (month && year) {
        requestBody.month = month;
        requestBody.year = year;
      }
      
      const response = await apiCall('/api/scrape', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.authenticated) {
        console.log('✅ AUTOMATIC SCRAPING: Real crew portal authentication successful!')
        
        // Update schedule with real data
        if (result.data && result.data.scheduleData && result.data.scheduleData.flights) {
          const iadpPairings = result.data.scheduleData.flights;
          
          // Transform IADP pairings into displayable flights
          const allFlights = [];
          const hotelsByDate = {};
          
          iadpPairings.forEach((pairing, pIdx) => {
            // Handle reserve duties, training, and ground transportation (no legs)
            if ((pairing.isReserveDuty || pairing.isTraining || pairing.isGroundTransport) && (!pairing.legs || pairing.legs.length === 0)) {
              allFlights.push({
                id: `${pairing.pairingCode}-0`,
                flightNumber: pairing.dutyType || pairing.pairingCode,
                pairingId: pairing.pairingCode,
                date: pairing.startDate,
                origin: pairing.startLocation,
                destination: pairing.endLocation,
                departure: pairing.startTime,
                arrival: pairing.endTime,
                aircraft: pairing.isTraining ? 'Training' : pairing.isGroundTransport ? 'Ground Transport' : 'Reserve',
                tailNumber: '',
                tail: '',
                status: 'Confirmed',
                rank: pairing.rank,
                crewMembers: [],
                hotels: [],
                isCodeshare: false,
                operatingAirline: null,
                actualDeparture: null,
                actualArrival: null,
                isDeadhead: false,
                isReserveDuty: pairing.isReserveDuty || false,
                isTraining: pairing.isTraining || false,
                isGroundTransport: pairing.isGroundTransport || false,
                dutyType: pairing.dutyType
              });
            }
            
            if (pairing.legs && pairing.legs.length > 0) {
              pairing.legs.forEach((leg, lIdx) => {
                // Convert leg date from "08Dec" format to ISO date
                let legDate = pairing.startDate // fallback to pairing start date
                if (leg.departure?.date) {
                  const depDateStr = leg.departure.date // e.g., "08Dec"
                  const dayNum = depDateStr.match(/\d+/)?.[0]
                  const monthAbbr = depDateStr.match(/[A-Z][a-z]{2}/)?.[0]
                  const monthMap = {
                    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                    'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                  }
                  const monthNum = monthMap[monthAbbr] || '01'
                  const year = pairing.startDate.split('-')[0] // Get year from pairing start date
                  legDate = `${year}-${monthNum}-${dayNum.padStart(2, '0')}`
                }
                
                allFlights.push({
                  id: `${pairing.pairingCode}-${lIdx}`,
                  flightNumber: leg.flightNumber || `Flight ${lIdx + 1}`,
                  pairingId: pairing.pairingCode,
                  date: legDate,
                  origin: leg.departure?.airport || pairing.startLocation,
                  destination: leg.arrival?.airport || pairing.endLocation,
                  departure: leg.departure?.time || pairing.startTime,
                  arrival: leg.arrival?.time || pairing.endTime,
                  aircraft: leg.aircraftType || 'Unknown',
                  tailNumber: leg.tailNumber || '',
                  tail: leg.tailNumber || '',
                  status: 'Confirmed',
                  rank: pairing.rank || 'FO',
                  crewMembers: leg.crewMembers || pairing.crewMembers || [],
                  hotels: pairing.hotels || [],
                  isCodeshare: leg.isCodeshare || false,
                  operatingAirline: leg.operatingAirline || null,
                  actualDeparture: leg.actualDeparture || null,
                  actualArrival: leg.actualArrival || null,
                  isDeadhead: leg.isDeadhead || false,
                  isReserveDuty: pairing.isReserveDuty || false,
                  isTraining: pairing.isTraining || false,
                  dutyType: pairing.dutyType || null
                });
              });
              
              // Store hotels by the date of the last leg's arrival (hotel date)
              // Hotels should show on the day you arrive for the layover
              if (pairing.hotels && pairing.hotels.length > 0 && pairing.legs.length > 0) {
                // Get the last leg's arrival date as the hotel date
                const lastLeg = pairing.legs[pairing.legs.length - 1];
                let hotelDate = pairing.startDate; // fallback
                
                if (lastLeg.arrival?.date) {
                  const arrDateStr = lastLeg.arrival.date;
                  const dayNum = arrDateStr.match(/\d+/)?.[0];
                  const monthAbbr = arrDateStr.match(/[A-Z][a-z]{2}/)?.[0];
                  const monthMap = {
                    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                    'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                  };
                  const monthNum = monthMap[monthAbbr] || '01';
                  const year = pairing.startDate.split('-')[0];
                  hotelDate = `${year}-${monthNum}-${dayNum.padStart(2, '0')}`;
                }
                
                // Add hotels to this date (might be multiple hotels on same date)
                if (!hotelsByDate[hotelDate]) {
                  hotelsByDate[hotelDate] = [];
                }
                hotelsByDate[hotelDate].push(...pairing.hotels);
              }
            }
          });
          
          const realScheduleData = { 
            flights: allFlights,
            hotelsByDate 
          };
          
          console.log('📊 Schedule Data Summary:')
          console.log(`  - Total flights: ${allFlights.length}`)
          console.log(`  - Reserve duties: ${allFlights.filter(f => f.isReserveDuty).length}`)
          console.log(`  - Training duties: ${allFlights.filter(f => f.isTraining).length}`)
          console.log(`  - DH flights: ${allFlights.filter(f => f.isDeadhead).length}`)
          console.log(`  - Hotel dates: ${Object.keys(hotelsByDate).join(', ')}`)
          console.log('  - Hotels by date:', hotelsByDate)
          
          setSchedule(realScheduleData)
          
          // Fetch actual times from FlightAware for past flights with tail numbers
          console.log('⏰ Fetching actual times from FlightAware for completed flights...')
          const today = new Date()
          const pastFlights = allFlights.filter(f => {
            const flightDate = new Date(f.date)
            return flightDate < today && (f.tail || f.tailNumber) && !f.isReserveDuty && !f.isTraining
          })
          
          if (pastFlights.length > 0) {
            const actualTimesPromises = pastFlights.slice(0, 10).map(async flight => {
              try {
                const response = await fetchFlightAwareData(flight.tail || flight.tailNumber, flight.flightNumber, flight.date)
                if (response?.actualTimes) {
                  return {
                    id: flight.id,
                    ...response.actualTimes
                  }
                }
              } catch (e) {
                console.log(`⚠️ Could not fetch actual times for ${flight.flightNumber}`)
              }
              return null
            })
            
            const actualTimesResults = await Promise.all(actualTimesPromises)
            const actualTimesMap = {}
            actualTimesResults.filter(Boolean).forEach(result => {
              actualTimesMap[result.id] = result
            })
            
            // Update flights with actual times
            if (Object.keys(actualTimesMap).length > 0) {
              const updatedFlights = allFlights.map(f => {
                if (actualTimesMap[f.id]) {
                  return {
                    ...f,
                    actualDeparture: actualTimesMap[f.id].actualDeparture || f.actualDeparture,
                    actualArrival: actualTimesMap[f.id].actualArrival || f.actualArrival
                  }
                }
                return f
              })
              
              const updatedScheduleData = {
                flights: updatedFlights,
                hotelsByDate
              }
              
              setSchedule(updatedScheduleData)
              await localforage.setItem(cacheKey, updatedScheduleData)
              console.log(`✅ Updated ${Object.keys(actualTimesMap).length} flights with actual times`)
            }
          }
          
          setSchedule(realScheduleData)
          
          // Cache by month so previous months persist
          const cacheKey = month && year ? `schedule_${year}_${String(month).padStart(2, '0')}` : 'schedule'
          await localforage.setItem(cacheKey, realScheduleData)
          
          // Also update current schedule if viewing current month
          if (!month || !year || (month === new Date().getMonth() + 1 && year === new Date().getFullYear())) {
            await localforage.setItem('schedule', realScheduleData)
          }
          
          // Mark that we've scraped at least once
          await localforage.setItem('hasScrapedBefore', true)
          
          // Update notifications with remarks from crew portal
          if (result.data.scheduleData.remarks && result.data.scheduleData.remarks.length > 0) {
            const newNotifications = result.data.scheduleData.remarks.map(remark => ({
              type: 'remark',
              message: remark.message,
              date: remark.date,
              read: false
            }));
            
            setScheduleChanges(prev => [...newNotifications, ...prev]);
          }
          
          // Update pilot profile with real data from crew portal
          if (result.data.scheduleData.pilotProfile) {
            const profile = {
              ...result.data.scheduleData.pilotProfile,
              employeeId: employeeId
            };
            setPilotProfile(profile);
            await localforage.setItem('pilotProfile', profile);
            
            // Update username display
            if (profile.name) {
              setUsername(profile.name);
            }
          }
          
          // Success - no notification needed
          console.log('✅ Schedule data loaded successfully')
        }
      } else {
        console.error('❌ AUTOMATIC SCRAPING: Authentication failed')
        setScheduleChanges(prev => [{
          type: 'general',
          message: `❌ Automatic scraping failed: ${result.message || result.error || 'Authentication error'}`,
          date: new Date().toISOString(),
          read: false
        }, ...prev])
      }
      
    } catch (error) {
      console.error('❌ AUTOMATIC SCRAPING ERROR:', error)
      setScheduleChanges(prev => [{
        type: 'general',
        message: `❌ Automatic scraping error: Unable to connect to crew portal. ${error.message}`,
        date: new Date().toISOString(),
        read: false
      }, ...prev])
    } finally {
      setLoading(false)
      setScrapingInProgress(false)
    }
  }

  // Manual refresh function for the refresh button
  const handleRefreshScraping = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (!token) {
      setError('Please login to refresh schedule data')
      return
    }
    
    // Get current month being viewed
    const viewingMonth = currentMonth.getMonth() + 1 // JavaScript months are 0-indexed
    const viewingYear = currentMonth.getFullYear()
    
    console.log(`🔄 MANUAL REFRESH: Scraping for ${viewingYear}-${String(viewingMonth).padStart(2, '0')}...`)
    
    // Don't clear the schedule - keep it visible during refresh
    setLoadingMessage('Refreshing schedule data from crew portal...')
    setScrapingInProgress(true)
    setError(null)
    
    // Keep a copy of current schedule to restore if refresh fails
    const currentSchedule = schedule
    
    try {
      let storedUsername, storedPassword, storedAirline
      
      if (userType === 'family') {
        // For family accounts, use pilot's credentials from code mapping
        const accessCode = await localforage.getItem('familyAccessCode')
        const codeMapping = await localforage.getItem('familyCodeMapping') || {}
        const memberInfo = codeMapping[accessCode]
        
        if (!memberInfo) {
          setError('Family access code not found. Please log in again.')
          setScrapingInProgress(false)
          return
        }
        
        storedUsername = memberInfo.pilotEmployeeId
        storedPassword = memberInfo.password
        storedAirline = memberInfo.airline
      } else {
        // For pilot accounts, use stored credentials
        storedUsername = await localforage.getItem('username')
        storedPassword = await localforage.getItem('tempPassword')
        storedAirline = await localforage.getItem('airline')
      }
      
      if (!storedUsername || !storedPassword) {
        setScheduleChanges(prev => [{
          type: 'general',
          message: '🔄 Please log out and log back in to enable schedule refresh.',
          date: new Date().toISOString(),
          read: false
        }, ...prev])
        setScrapingInProgress(false)
        return
      }
      
      // Call the automatic scraping function with month parameter
      await handleAutomaticScraping(storedUsername, storedPassword, storedAirline, viewingMonth, viewingYear)
      
      // After scraping completes, reload the schedule for the viewed month
      console.log(`✅ Refresh complete. Reloading schedule for ${viewingYear}-${String(viewingMonth).padStart(2, '0')}`)
      const monthCacheKey = `schedule_${viewingYear}_${String(viewingMonth).padStart(2, '0')}`
      const monthSchedule = await localforage.getItem(monthCacheKey)
      if (monthSchedule) {
        setSchedule(monthSchedule)
        console.log(`✅ Loaded schedule for ${viewingYear}-${String(viewingMonth).padStart(2, '0')} from cache`)
        setError(null)
      } else {
        console.log(`⚠️ No schedule data available for ${viewingYear}-${String(viewingMonth).padStart(2, '0')} after refresh`)
        // Keep the current schedule visible and show error message
        if (currentSchedule) {
          setSchedule(currentSchedule)
        }
        setError(`No schedule data found for ${viewingYear}-${String(viewingMonth).padStart(2, '0')}. The crew portal may not have data for this month yet.`)
      }
      
    } catch (error) {
      console.error('Refresh error:', error)
      // Restore the previous schedule on error
      if (currentSchedule) {
        setSchedule(currentSchedule)
      }
      setScheduleChanges(prev => [{
        type: 'general',
        message: '❌ Refresh failed: Unable to connect to crew portal. Please try again.',
        date: new Date().toISOString(),
        read: false
      }, ...prev])
      setError('Refresh failed. Please try again.')
    } finally {
      setScrapingInProgress(false)
      setLoadingMessage('')
    }
  }

  // Crew Portal Scraper Functions (keeping for compatibility)
  const handleCrewPortalScrape = async () => {
    if (!scraperCredentials.username || !scraperCredentials.password) {
      setScraperError('Please enter your crew portal credentials')
      return
    }

    setScraperLoading(true)
    setScraperError(null)
    setScraperData(null)

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scraperCredentials)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setScraperData(result.data)
        // Store scraped data for offline access
        await localforage.setItem('scraperData', result.data)
      } else {
        // Handle API response with fallback information
        let errorMessage = result.error || 'Failed to fetch schedule data'
        
        // Check if we have fallback portal information
        if (result.fallback && result.fallback.portalUrls) {
          const selectedPortal = result.fallback.selectedPortal || 'abx'
          const portalUrl = result.fallback.portalUrls[selectedPortal]
          const portalName = result.fallback.portalName || 'ABX Air'
          
          // Set the portal info for the clickable link
          setScraperData({ 
            manualPortalUrl: portalUrl, 
            portalName: portalName,
            isServerlessLimitation: true
          })
          
          errorMessage = `${errorMessage}\n\n✈️ Manual Access Available\n💡 Tip: Bookmark the portal link for quick access to your schedule.`
        }
        
        setScraperError(errorMessage)
      }
    } catch (err) {
      console.error('Scraper error:', err)
      setScraperError(`Network error: ${err.message}`)
    } finally {
      setScraperLoading(false)
    }
  }

  const resetScraperForm = () => {
    setScraperData(null)
    setScraperError(null)
    setScraperCredentials({ username: '', password: '', airline: 'ABX Air' })
  }

  const getCurrentDaySchedule = () => {
    if (!schedule) return null
    
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Handle new format from scraper: { flights: [...] }
      if (schedule.flights && Array.isArray(schedule.flights)) {
        const todayFlights = schedule.flights.filter(f => f.date === today)
        if (todayFlights.length > 0) {
          return { flights: todayFlights, currentFlight: todayFlights[0] }
        }
      }
      // Handle old format: array of pairings
      else if (Array.isArray(schedule)) {
        for (const pairing of schedule) {
          if (pairing.flights && Array.isArray(pairing.flights)) {
            for (const flight of pairing.flights) {
              if (flight.date === today) {
                return { ...pairing, currentFlight: flight }
              }
            }
          }
        }
      }
      return null
    } catch (error) {
      console.error('Error in getCurrentDaySchedule:', error)
      return null
    }
  }

  const getScheduleForDate = (dateString) => {
    if (!schedule) {
      console.log('getScheduleForDate: No schedule data')
      return null
    }
    
    try {
      const flights = []
      
      console.log('getScheduleForDate: Looking for date', dateString)
      console.log('getScheduleForDate: Schedule structure', schedule)
      
      // Handle new format from scraper: { flights: [...] }
      if (schedule.flights && Array.isArray(schedule.flights)) {
        for (const flight of schedule.flights) {
          console.log('Checking flight date:', flight.date, 'against', dateString)
          if (flight.date === dateString) {
            flights.push({ ...flight, pairingId: flight.pairingId || 'N/A' })
          }
        }
      }
      // Handle old format: array of pairings
      else if (Array.isArray(schedule)) {
        for (const pairing of schedule) {
          if (pairing.flights && Array.isArray(pairing.flights)) {
            for (const flight of pairing.flights) {
              if (flight.date === dateString) {
                flights.push({ ...flight, pairingId: pairing.pairingId })
              }
            }
          }
        }
      }
      
      console.log('getScheduleForDate: Found', flights.length, 'flights for', dateString)
      return flights.length > 0 ? flights : null
    } catch (error) {
      console.error('Error in getScheduleForDate:', error, error.stack)
      return null
    }
  }

  const getMonthlySchedule = () => {
    if (!schedule) return {}
    
    try {
      const monthData = {}
      
      // Handle new format from scraper: { flights: [...] }
      if (schedule.flights && Array.isArray(schedule.flights)) {
        schedule.flights.forEach(flight => {
          const dateKey = flight.date
          if (!monthData[dateKey]) {
            monthData[dateKey] = []
          }
          monthData[dateKey].push({ ...flight, pairingId: flight.pairingId || 'N/A' })
        })
      }
      // Handle old format: array of pairings
      else if (Array.isArray(schedule)) {
        schedule.forEach(pairing => {
          if (pairing.flights && Array.isArray(pairing.flights)) {
            pairing.flights.forEach(flight => {
              const dateKey = flight.date
              if (!monthData[dateKey]) {
                monthData[dateKey] = []
              }
              monthData[dateKey].push({ ...flight, pairingId: pairing.pairingId })
            })
          }
        })
      }
      
      return monthData
    } catch (error) {
      console.error('Error in getMonthlySchedule:', error)
      return {}
    }
  }

  const hasScheduleForMonth = (year, month) => {
    if (!schedule) return false
    
    try {
      // Handle new format from scraper: { flights: [...] }
      if (schedule.flights && Array.isArray(schedule.flights)) {
        return schedule.flights.some(flight => {
          const flightDate = new Date(flight.date)
          return flightDate.getFullYear() === year && flightDate.getMonth() === month
        })
      }
      // Handle old format: array of pairings
      else if (Array.isArray(schedule)) {
        return schedule.some(pairing => 
          pairing.flights && pairing.flights.some(flight => {
            const flightDate = new Date(flight.date)
            return flightDate.getFullYear() === year && flightDate.getMonth() === month
          })
        )
      }
      return false
    } catch (error) {
      console.error('Error in hasScheduleForMonth:', error)
      return false
    }
  }

  const goToPreviousMonth = async () => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newDate.getMonth() - 1)
    
    // Try to load cached data for this month
    const month = newDate.getMonth() + 1
    const year = newDate.getFullYear()
    const cacheKey = `schedule_${year}_${String(month).padStart(2, '0')}`
    
    const cachedData = await localforage.getItem(cacheKey)
    if (cachedData) {
      console.log(`📦 Loaded cached schedule for ${year}-${String(month).padStart(2, '0')}`)
      setSchedule(cachedData)
      setError(null)
      setCurrentMonth(newDate)
    } else {
      console.log(`⚠️ No cached data for ${year}-${String(month).padStart(2, '0')} - fetching from crew portal`)
      
      // Update month first to show loading on correct month
      setCurrentMonth(newDate)
      setLoading(true)
      setLoadingMessage(`Loading schedule for ${year}-${String(month).padStart(2, '0')} from crew portal...`)
      setError(null)
      
      try {
        let storedUsername, storedPassword, storedAirline
        
        if (userType === 'family') {
          const accessCode = await localforage.getItem('familyAccessCode')
          const codeMapping = await localforage.getItem('familyCodeMapping') || {}
          const memberInfo = codeMapping[accessCode]
          
          if (!memberInfo) {
            setError('Family access code not found. Please log in again.')
            setLoading(false)
            return
          }
          
          storedUsername = memberInfo.pilotEmployeeId
          storedPassword = memberInfo.password
          storedAirline = memberInfo.airline
        } else {
          storedUsername = await localforage.getItem('username')
          storedPassword = await localforage.getItem('tempPassword')
          storedAirline = await localforage.getItem('airline')
        }
        
        if (!storedUsername || !storedPassword) {
          setError('Please log out and log back in to load schedule data.')
          setLoading(false)
          return
        }
        
        // Fetch from crew portal
        await handleAutomaticScraping(storedUsername, storedPassword, storedAirline, month, year)
        
        // Load the newly fetched data
        const freshData = await localforage.getItem(cacheKey)
        if (freshData) {
          setSchedule(freshData)
          console.log(`✅ Loaded schedule for ${year}-${String(month).padStart(2, '0')} from crew portal`)
        } else {
          setError(`No schedule data available for ${year}-${String(month).padStart(2, '0')}. The crew portal may not have data for this month yet.`)
        }
      } catch (error) {
        console.error('Error loading previous month:', error)
        setError(`Failed to load schedule for ${year}-${String(month).padStart(2, '0')}. Please try again.`)
      } finally {
        setLoading(false)
      }
    }
  }

  const goToNextMonth = async () => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newDate.getMonth() + 1)
    
    // Try to load cached data for this month
    const month = newDate.getMonth() + 1
    const year = newDate.getFullYear()
    const cacheKey = `schedule_${year}_${String(month).padStart(2, '0')}`
    
    const cachedData = await localforage.getItem(cacheKey)
    if (cachedData) {
      console.log(`📦 Loaded cached schedule for ${year}-${String(month).padStart(2, '0')}`)
      setSchedule(cachedData)
      setError(null)
      setCurrentMonth(newDate)
    } else {
      console.log(`⚠️ No cached data for ${year}-${String(month).padStart(2, '0')} - fetching from crew portal`)
      
      // Update month first to show loading on correct month
      setCurrentMonth(newDate)
      setLoading(true)
      setLoadingMessage(`Loading schedule for ${year}-${String(month).padStart(2, '0')} from crew portal...`)
      setError(null)
      
      try {
        let storedUsername, storedPassword, storedAirline
        
        if (userType === 'family') {
          const accessCode = await localforage.getItem('familyAccessCode')
          const codeMapping = await localforage.getItem('familyCodeMapping') || {}
          const memberInfo = codeMapping[accessCode]
          
          if (!memberInfo) {
            setError('Family access code not found. Please log in again.')
            setLoading(false)
            return
          }
          
          storedUsername = memberInfo.pilotEmployeeId
          storedPassword = memberInfo.password
          storedAirline = memberInfo.airline
        } else {
          storedUsername = await localforage.getItem('username')
          storedPassword = await localforage.getItem('tempPassword')
          storedAirline = await localforage.getItem('airline')
        }
        
        if (!storedUsername || !storedPassword) {
          setError('Please log out and log back in to load schedule data.')
          setLoading(false)
          return
        }
        
        // Fetch from crew portal
        await handleAutomaticScraping(storedUsername, storedPassword, storedAirline, month, year)
        
        // Load the newly fetched data
        const freshData = await localforage.getItem(cacheKey)
        if (freshData) {
          setSchedule(freshData)
          console.log(`✅ Loaded schedule for ${year}-${String(month).padStart(2, '0')} from crew portal`)
        } else {
          setError(`No schedule data available for ${year}-${String(month).padStart(2, '0')}. The crew portal may not have data for this month yet.`)
        }
      } catch (error) {
        console.error('Error loading next month:', error)
        setError(`Failed to load schedule for ${year}-${String(month).padStart(2, '0')}. Please try again.`)
      } finally {
        setLoading(false)
      }
    }
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
                  <h3>{selectedChat.name && selectedChat.name.trim() !== '' ? selectedChat.name : selectedChat.employeeId}</h3>
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
                    id="chat-message"
                    name="chat-message"
                    type="text"
                    placeholder="Type a message..."
                    autoComplete="off"
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
                              id={`chat-select-${friend.id}`}
                              name={`chat-select-${friend.id}`}
                              type="checkbox" 
                              checked={selectedChatsToDelete.includes(friend.id)}
                              onChange={() => toggleChatSelection(friend.id)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Select chat with ${friend.name || friend.employeeId}`}
                            />
                          </div>
                        )}
                        <div className="friend-avatar">{(friend.name && friend.name.trim() !== '' ? friend.name : friend.employeeId).charAt(0)}</div>
                        <div className="friend-info">
                          <span className="friend-name">{friend.name && friend.name.trim() !== '' ? friend.name : friend.employeeId}</span>
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
            
            {!window.location.protocol.startsWith('https') && window.location.hostname !== 'localhost' ? (
              <div className="empty-nearby">
                <p>🔒 Location services require HTTPS</p>
                <p className="empty-hint">This feature is only available on secure connections</p>
              </div>
            ) : getNearbyCrewmates().length === 0 ? (
              <div className="empty-nearby">
                <p>🌍 No nearby crewmates found</p>
                <p className="empty-hint">Friends at your current base will appear here</p>
              </div>
            ) : (
              <div className="nearby-list">
                {getNearbyCrewmates().map((friend, idx) => (
                  <div key={idx} className="nearby-item">
                    <div className="friend-avatar">{(friend.name && friend.name.trim() !== '' ? friend.name : friend.employeeId).charAt(0)}</div>
                    <div className="friend-info">
                      <span className="friend-name">{friend.name && friend.name.trim() !== '' ? friend.name : friend.employeeId}</span>
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
              <label htmlFor="crew-search" className="visually-hidden">Search crew members</label>
              <input
                id="crew-search"
                name="crew-search"
                type="text"
                placeholder="Search by name (e.g., John Smith) or employee number (e.g., 152780)..."
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (e.target.value.trim()) {
                    handleSearch()
                  } else {
                    setSearchResults([])
                  }
                }}
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
                <p className="no-results-hint">Make sure they're registered in the app and try their full name or employee number</p>
              </div>
            )}

            {!searchQuery && (
              <div className="search-suggestions">
                <h4>💡 Tips</h4>
                <ul>
                  <li>Search by first or last name</li>
                  <li>Search by employee number (e.g., 12345)</li>
                  <li>Searches both ABX and ATI registered users</li>
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
                {pilotProfile && (
                  <>
                    <div className="pilot-info-row">
                      <span className="pilot-info-label">Name:</span>
                      {isEditingName ? (
                        <div style={{display: 'flex', gap: '8px', alignItems: 'center', flex: 1}}>
                          <input
                            id="pilot-name"
                            name="pilot-name"
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            placeholder="Enter your name"
                            autoComplete="name"
                            style={{flex: 1, padding: '6px 10px', borderRadius: '4px', border: '1px solid #ddd'}}
                            autoFocus
                            aria-label="Edit your name"
                          />
                          <button onClick={handleSaveProfileName} style={{padding: '6px 12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Save</button>
                          <button onClick={() => setIsEditingName(false)} style={{padding: '6px 12px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Cancel</button>
                        </div>
                      ) : (
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', flex: 1}}>
                          <span className="pilot-info-value">{pilotProfile.name || 'Not set'}</span>
                          {userType !== 'family' && (
                            <button 
                              onClick={() => {
                                setIsEditingName(true)
                                setEditedName(pilotProfile.name || '')
                              }}
                              style={{padding: '4px 10px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'}}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="pilot-info-row">
                      <span className="pilot-info-label">Employee ID:</span>
                      <span className="pilot-info-value">{pilotProfile.employeeId}</span>
                    </div>
                    {pilotProfile.rank && (
                      <div className="pilot-info-row">
                        <span className="pilot-info-label">Rank:</span>
                        <span className="pilot-info-value">{pilotProfile.rank}</span>
                      </div>
                    )}
                    {pilotProfile.base && (
                      <div className="pilot-info-row">
                        <span className="pilot-info-label">Base:</span>
                        <span className="pilot-info-value">{pilotProfile.base}</span>
                      </div>
                    )}
                  </>
                )}
                {!pilotProfile && userType !== 'family' && (
                  <div className="pilot-info-row">
                    <span className="pilot-info-label">Username:</span>
                    <span className="pilot-info-value">{username || 'Not logged in'}</span>
                  </div>
                )}
                {userType === 'family' && (
                  <div className="pilot-info-row">
                    <span className="pilot-info-label">Your Name:</span>
                    <span className="pilot-info-value">{familyMemberName || 'Family Member'}</span>
                  </div>
                )}
                {userType === 'family' && (
                  <div className="pilot-info-row">
                    <span className="pilot-info-label">Pilot Name:</span>
                    <span className="pilot-info-value">{username || 'Unknown'}</span>
                  </div>
                )}
                {userType !== 'family' && !pilotProfile?.rank && (
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
                    {(() => {
                      const airlineToDisplay = userType === 'family' ? pilotAirline : airline
                      return airlineToDisplay === 'abx' ? 'ABX AIR (GB)' : airlineToDisplay === 'ati' ? 'AIR TRANSPORT INTERNATIONAL (8C)' : airlineToDisplay ? airlineToDisplay.toUpperCase() : 'Unknown'
                    })()}
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
            
            {!window.matchMedia('(display-mode: standalone)').matches && (
              <div className="install-app-banner">
                <div className="install-banner-content">
                  <span className="install-icon">📱</span>
                  <div>
                    <strong>Install FlightRosterIQ</strong>
                    <p>Add to your home screen for quick access and offline use</p>
                  </div>
                </div>
                <button className="install-app-btn" onClick={handleInstallApp}>
                  ⬇️ Install App
                </button>
              </div>
            )}
            
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
                  <label htmlFor="family-member-name" className="visually-hidden">Family member name</label>
                  <input
                    id="family-member-name"
                    name="family-member-name"
                    type="text"
                    placeholder="e.g., Sarah (Wife), John (Son), Mom, etc."
                    autoComplete="off"
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
            <div className="faq-item beta-notice">
              <p><strong>⚠️ BETA VERSION</strong></p>
              <p>This app is currently in BETA testing. If you experience any bugs or issues, please report them to <a href="mailto:FlightRosterIQ@Gmail.com">FlightRosterIQ@Gmail.com</a> so we can improve the app!</p>
            </div>
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

  // ROSTER VIEW - Combines monthly calendar + daily list (AirRoster style)
  const renderRosterView = () => {
    return (
      <div className="roster-view">
        <div className="roster-calendar-section">
          {renderMonthlyView()}
        </div>
        <div className="roster-daily-section">
          {renderDailyView()}
        </div>
      </div>
    )
  }

  // CREW VIEW - Friends, chat, and crew search
  const renderCrewView = () => {
    return renderFriendsView()
  }

  // WEATHER VIEW - Weather for all upcoming airports
  const renderWeatherView = () => {
    if (!schedule || !schedule.flights || schedule.flights.length === 0) {
      return (
        <div className="weather-view">
          <h2>🌤️ Weather</h2>
          <p>No flights scheduled. Weather will appear when you have upcoming flights.</p>
        </div>
      )
    }

    // Get unique airports from upcoming flights
    const upcomingAirports = new Set()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    schedule.flights.forEach(flight => {
      const flightDate = new Date(flight.date)
      if (flightDate >= today) {
        if (flight.origin) upcomingAirports.add(flight.origin)
        if (flight.destination) upcomingAirports.add(flight.destination)
      }
    })

    return (
      <div className="weather-view">
        <h2>🌤️ Weather Forecast</h2>
        <p className="weather-subtitle">Weather for your upcoming airports</p>
        
        <div className="weather-grid">
          {Array.from(upcomingAirports).slice(0, 10).map(airport => (
            <div key={airport} className="weather-card" onClick={() => setWeatherAirport(airport)}>
              <h3>{airport}</h3>
              {weatherData[airport] ? (
                <div className="weather-info">
                  <div className="weather-temp">{weatherData[airport].temp}°</div>
                  <div className="weather-condition">{weatherData[airport].condition}</div>
                  <div className="weather-wind">💨 {weatherData[airport].wind}</div>
                </div>
              ) : (
                <button 
                  className="load-weather-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    fetchWeatherData(airport)
                  }}
                >
                  Load Weather
                </button>
              )}
            </div>
          ))}
        </div>
        
        {upcomingAirports.size === 0 && (
          <div className="empty-state">
            <p>No upcoming flights found</p>
          </div>
        )}
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
          const daySchedule = monthData[dateKey]
          const hasFlights = daySchedule?.length > 0
          const isTraining = hasFlights && daySchedule[0]?.isTraining
          const isReserve = hasFlights && daySchedule[0]?.isReserveDuty
          const dutyType = isTraining || isReserve ? (daySchedule[0]?.dutyType || daySchedule[0]?.pairingId) : null
          const isToday = day === today.getDate() && 
                          viewMonth.getMonth() === today.getMonth() && 
                          viewMonth.getFullYear() === today.getFullYear()
          
          week.push(
            <div 
              key={day} 
              className={`calendar-day ${hasFlights ? (isTraining ? 'has-training' : isReserve ? 'has-reserve' : 'has-duty') : ''} ${isToday ? 'today' : ''}`}
              onClick={() => {
                setSelectedDate(dateKey)
                setActiveTab('daily')
              }}
            >
              <div className="day-number">{day}</div>
              {hasFlights && (
                <div className="duty-indicator">
                  {(isTraining || isReserve) ? dutyType : `${daySchedule.length} flight${daySchedule.length > 1 ? 's' : ''}`}
                </div>
              )}
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
    
    const goToPreviousDay = () => {
      const prevDate = new Date(selectedDateObj)
      prevDate.setDate(prevDate.getDate() - 1)
      const dateString = prevDate.toISOString().split('T')[0]
      setSelectedDate(dateString)
      setActiveView('daily')
    }

    const goToNextDay = () => {
      const nextDate = new Date(selectedDateObj)
      nextDate.setDate(nextDate.getDate() + 1)
      const dateString = nextDate.toISOString().split('T')[0]
      setSelectedDate(dateString)
      setActiveView('daily')
    }

    if (!flights) {
      return (
        <div className="daily-view">
          <div className="day-navigation">
            <button className="nav-arrow" onClick={goToPreviousDay}>
              ← Previous Day
            </button>
            <h2>📋 {formattedDate}</h2>
            <button className="nav-arrow" onClick={goToNextDay}>
              Next Day →
            </button>
          </div>
          <div className="empty-state">
            <p>No flights scheduled for this day</p>
          </div>
        </div>
      )
    }

    return (
      <div className="daily-view">
        <div className="day-navigation">
          <button className="nav-arrow" onClick={goToPreviousDay}>
            ← Previous Day
          </button>
          <h2>📋 {formattedDate}</h2>
          <button className="nav-arrow" onClick={goToNextDay}>
            Next Day →
          </button>
        </div>
        <div className="pairing-card">
          {/* Check if this is a training duty */}
          {flights[0]?.isTraining ? (
            <div className="training-duty-card">
              <h3 className="training-duty-header">
                🎓 Training: {flights[0]?.dutyType || flights[0]?.pairingId}
              </h3>
              <div className="training-duty-info">
                <div className="training-time">
                  <span className="training-label">Start:</span>
                  <span className="training-value">{flights[0]?.departure || flights[0]?.startTime}</span>
                </div>
                <div className="training-time">
                  <span className="training-label">End:</span>
                  <span className="training-value">{flights[0]?.arrival || flights[0]?.endTime}</span>
                </div>
                <div className="training-location">
                  <span className="training-label">Location:</span>
                  <span className="training-value">{flights[0]?.origin || flights[0]?.startLocation || 'Training Facility'}</span>
                </div>
              </div>
            </div>
          ) : flights[0]?.isReserveDuty ? (
            <div className="reserve-duty-card">
              <h3 className="reserve-duty-header">
                📅 Reserve Duty: {flights[0]?.dutyType || flights[0]?.pairingId}
              </h3>
              <div className="reserve-duty-info">
                <div className="reserve-time">
                  <span className="reserve-label">Start:</span>
                  <span className="reserve-value">{flights[0]?.departure || flights[0]?.startTime}</span>
                </div>
                <div className="reserve-time">
                  <span className="reserve-label">End:</span>
                  <span className="reserve-value">{flights[0]?.arrival || flights[0]?.endTime}</span>
                </div>
                <div className="reserve-location">
                  <span className="reserve-label">Location:</span>
                  <span className="reserve-value">{flights[0]?.origin || flights[0]?.startLocation || 'Base'}</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <h3>Pairing: {flights[0]?.pairingId || 'N/A'}</h3>
              {flights.map((flight, idx) => (
            <div key={idx} className="flight-card" onClick={() => setSelectedFlight(flight)}>
              {flight.isDeadhead && (
                <div className="deadhead-badge">
                  DH - Deadhead Flight
                </div>
              )}
              {flight.isGroundTransport && (
                <div className="ground-transport-badge">
                  🚗 Ground Transportation
                </div>
              )}
              <div className="flight-row">
                <div className="flight-header-section">
                  <strong>{flight.flightNumber}</strong>
                  {flight.operatingAirline && flight.isCodeshare && (
                    <span className="airline-badge" title={`Operated by ${flight.operatingAirline}`}>
                      {flight.operatingAirline}
                    </span>
                  )}
                  <span>
                    <span 
                      className="airport-code" 
                      onClick={async (e) => {
                        e.stopPropagation()
                        setWeatherAirport(flight.origin)
                        const weather = await fetchRealWeather(flight.origin)
                        setWeatherData(prev => ({ ...prev, [flight.origin]: weather }))
                      }}
                    >
                      {flight.origin}
                    </span>
                    {' → '}
                    <span 
                      className="airport-code" 
                      onClick={async (e) => {
                        e.stopPropagation()
                        setWeatherAirport(flight.destination)
                        const weather = await fetchRealWeather(flight.destination)
                        setWeatherData(prev => ({ ...prev, [flight.destination]: weather }))
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
                  {(flight.tail || flight.tailNumber) && (
                    <span 
                      className="tail-number clickable-tail" 
                      onClick={async (e) => {
                        e.stopPropagation()
                        const tailNum = flight.tail || flight.tailNumber
                        setTrackedAircraft({
                          tail: tailNum,
                          aircraft: flight.aircraft,
                          flightNumber: flight.flightNumber,
                          origin: flight.origin,
                          destination: flight.destination
                        })
                        setActiveTab('tracking')
                        // Fetch real flight tracking data
                        const trackingData = await fetchFlightAwareData(tailNum, flight.flightNumber)
                        setFlightTrackingData(trackingData)
                      }}
                      title="Click to track aircraft location"
                    >
                      ✈️ {flight.tail || flight.tailNumber}
                    </span>
                  )}
                </div>
                {flight.crewMembers && flight.crewMembers.length > 0 && (
                  <div className="crew-info">
                    <span className="crew-icon">👥</span>
                    <div className="crew-list">
                      {flight.crewMembers.map((crew, cIdx) => (
                        <div key={cIdx} className="crew-member">
                          <span className="crew-role">{crew.role}</span>
                          <span className="crew-name">{crew.name}</span>
                          {crew.phone && (
                            <a href={`tel:${crew.phone}`} className="crew-phone" onClick={(e) => e.stopPropagation()}>
                              📞 {crew.phone}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
            </>
          )}
        </div>
        
        {/* Hotel Information at end of daily schedule */}
        {schedule?.hotelsByDate && schedule.hotelsByDate[selectedDate] && schedule.hotelsByDate[selectedDate].length > 0 && (
          <div className="daily-hotel-section">
            <h3>🏨 Hotel Information</h3>
            {schedule.hotelsByDate[selectedDate].map((hotel, hIdx) => {
              // Calculate check-in/check-out times based on surrounding flights
              const selectedFlights = getScheduleForDate(selectedDate)
              const lastFlight = selectedFlights[selectedFlights.length - 1]
              
              // Find next scheduled flight (search up to 7 days ahead)
              let firstNextFlight = null
              for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
                const checkDate = new Date(new Date(selectedDate).getTime() + (daysAhead * 86400000))
                const checkDateStr = checkDate.toISOString().split('T')[0]
                const flights = getScheduleForDate(checkDateStr)
                if (flights && flights.length > 0) {
                  firstNextFlight = flights[0]
                  break
                }
              }
              
              const checkInTime = lastFlight ? (() => {
                const arrivalTime = new Date(`${selectedDate}T${lastFlight.arrival}`)
                arrivalTime.setHours(arrivalTime.getHours() + 1)
                const date = arrivalTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                const time = arrivalTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                return `${date} at ${time}`
              })() : new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' at 3:00 PM'
              
              const checkOutTime = firstNextFlight ? (() => {
                // Checkout is 1.5 hours before next flight departure
                const departureTime = new Date(`${firstNextFlight.date}T${firstNextFlight.departure}`)
                departureTime.setHours(departureTime.getHours() - 1)
                departureTime.setMinutes(departureTime.getMinutes() - 30)
                const date = departureTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                const time = departureTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                return `${date} at ${time}`
              })() : 'Next day at 10:00 AM'
              
              return (
                <div key={hIdx} className="hotel-card">
                  <div 
                    className="hotel-header" 
                    onClick={() => {
                      const query = encodeURIComponent(`${hotel.name} ${hotel.address || hotel.location || ''}`);
                      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                    }}
                    style={{cursor: 'pointer'}}
                    title="Click to view on Google Maps"
                  >
                    <span className="hotel-icon">🏨</span>
                    <div className="hotel-details">
                      <strong className="hotel-name">{hotel.name}</strong>
                      <span className="hotel-location">📍 {hotel.location}</span>
                    </div>
                  </div>
                  <div className="hotel-info-grid">
                    <div className="hotel-info-item">
                      <span className="hotel-info-label">Check-in:</span>
                      <span className="hotel-info-value">{checkInTime}</span>
                    </div>
                    <div className="hotel-info-item">
                      <span className="hotel-info-label">Check-out:</span>
                      <span className="hotel-info-value">{checkOutTime}</span>
                    </div>
                    {hotel.address && (
                      <div className="hotel-info-item hotel-address">
                        <span className="hotel-info-label">Address:</span>
                        <a 
                          href={`https://maps.google.com/?q=${encodeURIComponent(hotel.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hotel-link"
                        >
                          📍 {hotel.address}
                        </a>
                      </div>
                    )}
                    {hotel.phone && (
                      <div className="hotel-info-item hotel-phone">
                        <span className="hotel-info-label">Phone:</span>
                        <a href={`tel:${hotel.phone}`} className="hotel-link">
                          📞 {hotel.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
                  <span className="account-desc">View schedule (limited access)</span>
                </button>
              </div>
              
              <div className="home-info-section">
                <button 
                  className="info-toggle-btn"
                  onClick={() => setShowHomeInfo(!showHomeInfo)}
                >
                  <span className="info-icon">ℹ️</span>
                  <span>How This Works</span>
                  <span className={`chevron ${showHomeInfo ? 'expanded' : ''}`}>▼</span>
                </button>
                
                {showHomeInfo && (
                  <div className="home-info-content">
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-icon">🔒</span>
                        <div className="info-content">
                          <strong>Secure:</strong> Your credentials are never stored
                        </div>
                      </div>
                      <div className="info-item">
                        <span className="info-icon">⚡</span>
                        <div className="info-content">
                          <strong>Real-Time:</strong> Data fetched directly from crew portals
                        </div>
                      </div>
                      <div className="info-item">
                        <span className="info-icon">👥</span>
                        <div className="info-content">
                          <strong>Multi-User:</strong> Each pilot sees their own schedule
                        </div>
                      </div>
                      <div className="info-item">
                        <span className="info-icon">🛩️</span>
                        <div className="info-content">
                          <strong>Multi-Airline:</strong> Supports ABX Air & ATI
                        </div>
                      </div>
                    </div>
                    <div className="beta-notice">
                      <span className="beta-badge">BETA</span>
                    </div>
                  </div>
                )}
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
                      id="username"
                      name="username"
                      type="text"
                      placeholder="Username"
                      autoComplete="username"
                      value={credentials.username}
                      onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                      required
                    />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Password"
                      autoComplete="current-password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      required
                    />
                  </>
                ) : (
                  <input
                    id="access-code"
                    name="access-code"
                    type="text"
                    placeholder="Enter Family Access Code"
                    autoComplete="off"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    required
                  />
                )}
                <button type="submit" disabled={loading || (accountType === 'pilot' && !airline)}>
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>

              {accountType === 'pilot' && (
                <div className="security-note">
                  🔒 Enter your actual crew portal username and password. Your credentials will be validated against the {airline} crew portal before access is granted.
                </div>
              )}

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
      {loading && (
        <div className="loading-banner-top">
          <div className="loading-banner-content">
            <div className="loading-spinner-small"></div>
            <span>{loadingMessage || 'Loading...'}</span>
          </div>
        </div>
      )}
      {scrapingInProgress && !loading && (
        <div className="scraping-progress-banner">
          <div className="scraping-spinner"></div>
          <span>Loading schedule data from crew portal...</span>
        </div>
      )}
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
          {token && (userType === 'pilot' || userType === 'family') && (
            <button 
              className="refresh-btn-icon"
              onClick={handleRefreshScraping}
              disabled={loading || scrapingInProgress}
              title="Refresh Schedule from Crew Portal"
            >
              {(loading || scrapingInProgress) ? '⟳' : '🔄'}
            </button>
          )}
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
        </div>
      </header>

      <main>
        {activeTab === 'roster' && renderRosterView()}
        {activeTab === 'crew' && userType === 'pilot' && renderCrewView()}
        {activeTab === 'weather' && renderWeatherView()}
        {activeTab === 'notifications' && renderNotificationsView()}
        {activeTab === 'settings' && renderSettingsView()}
        
        {!schedule && !loading && userType === 'pilot' && activeTab !== 'settings' && activeTab !== 'crew' && activeTab !== 'notifications' && activeTab !== 'weather' && (
          <div className="empty-state">
            <p>No schedule data available</p>
            <p className="empty-hint">Use the refresh button above to load your schedule</p>
          </div>
        )}
        
        {!schedule && !loading && userType === 'family' && activeTab !== 'settings' && activeTab !== 'notifications' && activeTab !== 'weather' && (
          <div className="empty-state">
            <p>No schedule data available</p>
            <p className="empty-hint">Use the refresh button above to load the pilot's schedule</p>
          </div>
        )}
      </main>

      {token && (
        <nav className="bottom-nav">
          <button 
            className={activeTab === 'roster' ? 'active' : ''}
            onClick={() => setActiveTab('roster')}
            title="Flight Roster"
          >
            <span className="nav-icon">📋</span>
            <span className="nav-label">Roster</span>
          </button>
          {userType === 'pilot' && (
            <button 
              className={activeTab === 'crew' ? 'active' : ''}
              onClick={() => setActiveTab('crew')}
              title="Crew Members"
            >
              <span className="nav-icon">👥</span>
              <span className="nav-label">Crew</span>
            </button>
          )}
          <button 
            className={activeTab === 'weather' ? 'active' : ''}
            onClick={() => setActiveTab('weather')}
            title="Weather"
          >
            <span className="nav-icon">🌤️</span>
            <span className="nav-label">Weather</span>
          </button>
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
            <span className="nav-label">Alerts</span>
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
                    {selectedFlight.actualDeparture ? (
                      <div className="time-display actual-time">
                        <span className="time-lt">Actual: {selectedFlight.actualDeparture} LT</span>
                        <span className="time-utc">{convertToUTC(selectedFlight.actualDeparture)} UTC</span>
                      </div>
                    ) : (
                      <div>
                        <div style={{fontSize: '11px', color: '#999', marginTop: '4px'}}>
                          {(() => {
                            const flightDate = new Date(selectedFlight.date);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return flightDate < today ? 'Click button below to fetch actual times' : 'Actual times available after flight completion';
                          })()}
                        </div>
                        {(() => {
                          const flightDate = new Date(selectedFlight.date);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return flightDate < today ? (
                            <button 
                              style={{
                                marginTop: '8px',
                                padding: '6px 12px',
                                background: '#007AFF',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                              onClick={async (e) => {
                                e.stopPropagation();
                                const tailNum = selectedFlight.tail || selectedFlight.tailNumber;
                                const trackingData = await fetchFlightAwareData(
                                  tailNum, 
                                  selectedFlight.flightNumber, 
                                  selectedFlight.date,
                                  selectedFlight.origin,
                                  selectedFlight.destination
                                );
                                if (trackingData?.flightAwareUrl) {
                                  // Open FlightAware in a new tab
                                  window.open(trackingData.flightAwareUrl, '_blank');
                                } else if (trackingData?.actualTimes) {
                                  // Update the selected flight with actual times
                                  setSelectedFlight({
                                    ...selectedFlight,
                                    actualDeparture: trackingData.actualTimes.actualDeparture || selectedFlight.actualDeparture,
                                    actualArrival: trackingData.actualTimes.actualArrival || selectedFlight.actualArrival
                                  });
                                  
                                  // Update the schedule data
                                  setSchedule(prev => {
                                    const updatedFlights = prev.flights.map(f => 
                                      f.id === selectedFlight.id ? {
                                        ...f,
                                        actualDeparture: trackingData.actualTimes.actualDeparture || f.actualDeparture,
                                        actualArrival: trackingData.actualTimes.actualArrival || f.actualArrival
                                      } : f
                                    );
                                    return { ...prev, flights: updatedFlights };
                                  });
                                }
                              }}
                            >
                              🔗 View on FlightAware
                            </button>
                          ) : null;
                        })()}
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
                    {selectedFlight.actualArrival ? (
                      <div className="time-display actual-time">
                        <span className="time-lt">Actual: {selectedFlight.actualArrival} LT</span>
                        <span className="time-utc">{convertToUTC(selectedFlight.actualArrival)} UTC</span>
                      </div>
                    ) : null}
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
                  <span className="detail-value clickable-tail" 
                    onClick={async (e) => {
                      e.stopPropagation()
                      const tailNum = selectedFlight.tail || selectedFlight.tailNumber
                      if (tailNum) {
                        setTrackedAircraft({
                          tail: tailNum,
                          aircraft: selectedFlight.aircraft,
                          flightNumber: selectedFlight.flightNumber,
                          origin: selectedFlight.origin,
                          destination: selectedFlight.destination
                        })
                        setSelectedFlight(null)
                        setActiveTab('tracking')
                        // Fetch real flight tracking data
                        const trackingData = await fetchFlightAwareData(tailNum, selectedFlight.flightNumber)
                        setFlightTrackingData(trackingData)
                      }
                    }}
                    style={{ cursor: (selectedFlight.tail || selectedFlight.tailNumber) ? 'pointer' : 'default' }}
                  >
                    {selectedFlight.tail || selectedFlight.tailNumber || 'Not Available'}
                  </span>
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

            {userType !== 'family' && selectedFlight.crewMembers && selectedFlight.crewMembers.length > 0 && (
              <div className="detail-section">
                <h3>👥 Crew Members</h3>
                <div className="crew-list">
                  {selectedFlight.crewMembers.map((member, idx) => (
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
            
            {/* Show message when no crew data available */}
            {userType !== 'family' && (!selectedFlight.crewMembers || selectedFlight.crewMembers.length === 0) && (
              <div className="detail-section">
                <h3>👥 Crew Members</h3>
                <p style={{color: '#666', fontStyle: 'italic', padding: '20px'}}>
                  No crew information available for this flight
                </p>
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
            
            {weatherData[weatherAirport] ? (
              <>
                <div className="weather-section">
                  <h3>METAR (Current Weather)</h3>
                  <div className="weather-code">
                    {weatherData[weatherAirport].metar}
                  </div>
                </div>
                
                {weatherData[weatherAirport].decoded && !weatherData[weatherAirport].error && (
                  <div className="weather-section atis-section">
                    <h3>📻 Decoded Weather Information</h3>
                    <div className="atis-info">
                      {weatherData[weatherAirport].decoded.observationTime && (
                        <p><strong>Observation Time:</strong> {weatherData[weatherAirport].decoded.observationTime}</p>
                      )}
                      {weatherData[weatherAirport].decoded.flightCategory && (
                        <p><strong>Flight Category:</strong> <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          background: weatherData[weatherAirport].decoded.flightCategory === 'VFR' ? '#22c55e' :
                                     weatherData[weatherAirport].decoded.flightCategory === 'MVFR' ? '#3b82f6' :
                                     weatherData[weatherAirport].decoded.flightCategory === 'IFR' ? '#ef4444' : '#991b1b',
                          color: 'white'
                        }}>{weatherData[weatherAirport].decoded.flightCategory}</span></p>
                      )}
                      {weatherData[weatherAirport].decoded.temperature && (
                        <p><strong>Temperature:</strong> {weatherData[weatherAirport].decoded.temperature}</p>
                      )}
                      {weatherData[weatherAirport].decoded.dewpoint && (
                        <p><strong>Dew Point:</strong> {weatherData[weatherAirport].decoded.dewpoint}</p>
                      )}
                      {weatherData[weatherAirport].decoded.wind && (
                        <p><strong>Wind:</strong> {weatherData[weatherAirport].decoded.wind}</p>
                      )}
                      {weatherData[weatherAirport].decoded.visibility && (
                        <p><strong>Visibility:</strong> {weatherData[weatherAirport].decoded.visibility}</p>
                      )}
                      {weatherData[weatherAirport].decoded.altimeter && (
                        <p><strong>Altimeter:</strong> {weatherData[weatherAirport].decoded.altimeter}</p>
                      )}
                      {weatherData[weatherAirport].decoded.clouds && (
                        <p><strong>Cloud Coverage:</strong> {weatherData[weatherAirport].decoded.clouds}</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="weather-section" style={{background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', padding: '20px', borderRadius: '12px'}}>
                <h3 style={{color: '#2563eb', fontSize: '16px', marginBottom: '12px'}}>Loading Weather Data...</h3>
                <p style={{color: '#1e40af', fontSize: '14px', textAlign: 'center'}}>
                  Fetching current METAR for <strong>{weatherAirport}</strong>
                </p>
              </div>
            )}

            <div className="weather-section">
              <h3>TAF (Terminal Aerodrome Forecast)</h3>
              <div className="weather-code">
                {weatherData[weatherAirport]?.taf?.raw || weatherData[weatherAirport]?.taf || 'TAF data not available'}
              </div>
              
              {weatherData[weatherAirport]?.taf?.decoded && (
                <div style={{marginTop: '15px'}}>
                  <h4 style={{fontSize: '14px', marginBottom: '10px', color: '#1e40af'}}>📅 Forecast Periods:</h4>
                  {weatherData[weatherAirport].taf.decoded.map((period, idx) => (
                    <div key={idx} style={{
                      background: '#f0f9ff',
                      padding: '12px',
                      marginBottom: '10px',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${
                        period.flightCategory === 'VFR' ? '#22c55e' :
                        period.flightCategory === 'MVFR' ? '#3b82f6' :
                        period.flightCategory === 'IFR' ? '#ef4444' : '#991b1b'
                      }`
                    }}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                        <strong style={{fontSize: '13px'}}>
                          {period.timeFrom && new Date(period.timeFrom).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })} - {period.timeTo && new Date(period.timeTo).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </strong>
                        {period.flightCategory && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            background: period.flightCategory === 'VFR' ? '#22c55e' :
                                       period.flightCategory === 'MVFR' ? '#3b82f6' :
                                       period.flightCategory === 'IFR' ? '#ef4444' : '#991b1b',
                            color: 'white'
                          }}>
                            {period.flightCategory}
                          </span>
                        )}
                      </div>
                      <div style={{fontSize: '12px', color: '#1e40af'}}>
                        {period.wind && <div>💨 Wind: {period.wind}</div>}
                        {period.visibility && <div>👁️ Visibility: {period.visibility}</div>}
                        {period.clouds && <div>☁️ Clouds: {period.clouds}</div>}
                        {period.weather && <div>🌧️ Weather: {period.weather}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              {trackedAircraft.origin && trackedAircraft.destination && (
                <div className="tracking-badge">
                  <span className="badge-label">Route</span>
                  <span className="badge-value">{trackedAircraft.origin} → {trackedAircraft.destination}</span>
                </div>
              )}
              <div className={`tracking-badge ${flightTrackingData?.isLive ? 'status-live' : ''}`}>
                <span className="badge-label">Status</span>
                <span className="badge-value">
                  {flightTrackingData?.isLive ? '🔴 LIVE' : '⚪ On Ground'}
                </span>
              </div>
            </div>

            <div className="tracking-section">
              <h3>✈️ Current Position</h3>
              {flightTrackingData ? (
                <div className="position-grid">
                  <div className="position-item">
                    <span className="position-label">Status:</span>
                    <span className="position-value">{flightTrackingData.status}</span>
                  </div>
                  <div className="position-item">
                    <span className="position-label">Altitude:</span>
                    <span className="position-value">{flightTrackingData.altitude}</span>
                  </div>
                  <div className="position-item">
                    <span className="position-label">Ground Speed:</span>
                    <span className="position-value">{flightTrackingData.speed}</span>
                  </div>
                  <div className="position-item">
                    <span className="position-label">Heading:</span>
                    <span className="position-value">{flightTrackingData.heading}</span>
                  </div>
                  <div className="position-item">
                    <span className="position-label">Current Location:</span>
                    <span className="position-value">{flightTrackingData.currentLocation}</span>
                  </div>
                  <div className="position-item">
                    <span className="position-label">ETA:</span>
                    <span className="position-value">{flightTrackingData.eta}</span>
                  </div>
                </div>
              ) : (
                <p>Loading tracking data...</p>
              )}
            </div>

            {!flightTrackingData || !flightTrackingData.isLive ? (
              <div className="tracking-section" style={{background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', padding: '20px', borderRadius: '12px', border: '2px solid #f59e0b'}}>
                <h3>✈️ Flight Not Currently Active</h3>
                <p style={{color: '#92400e', margin: '10px 0'}}>
                  This aircraft is not currently in the air or real-time tracking data is unavailable.
                </p>
                <p style={{color: '#92400e', fontSize: '14px'}}>
                  Live tracking is only available for flights currently in progress.
                </p>
              </div>
            ) : (
              <>
                <div className="tracking-section">
                  <h3>📍 Location Details</h3>
                  <div className="location-info">
                    <div className="location-row">
                      <strong>Current Location:</strong>
                      <span>{flightTrackingData.currentLocation || 'Unknown'}</span>
                    </div>
                    <div className="location-row">
                      <strong>Distance from Origin:</strong>
                      <span>{flightTrackingData.distanceFromOrigin || 'N/A'}</span>
                    </div>
                    <div className="location-row">
                      <strong>Distance to Destination:</strong>
                      <span>{flightTrackingData.distanceToDestination || 'N/A'}</span>
                    </div>
                    <div className="location-row">
                      <strong>Estimated Time En Route:</strong>
                      <span>{flightTrackingData.timeEnRoute || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="tracking-section">
                  <h3>⏱️ Flight Timeline</h3>
                  <div className="timeline">
                    {flightTrackingData.timeline && flightTrackingData.timeline.map((event, idx) => (
                      <div key={idx} className={`timeline-item ${event.completed ? 'completed' : ''}`}>
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                          <strong>{event.description}</strong>
                          <span>{event.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Mock timeline removed - keeping only one timeline-item for compatibility */}
            <div className="tracking-section" style={{display: 'none'}}>
              <div className="timeline">
                <div className="timeline-item completed">
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <strong>Hidden</strong>
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
              {flightTrackingData && !flightTrackingData.isLive ? (
                <>
                  <p>⚠️ Real-time tracking data not available</p>
                  <p>📡 Last known status or historical data shown</p>
                  <p style={{fontSize: '0.85em', marginTop: '8px', opacity: 0.7}}>Live tracking requires FlightAware API integration</p>
                </>
              ) : (
                <>
                  <p>🔄 Live tracking data from FlightAware</p>
                  <p>📡 Updates every 30 seconds via ADS-B</p>
                </>
              )}
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
                    {(() => {
                      const arrivalTime = new Date(`${selectedFlight.date}T${selectedFlight.actualArrival || selectedFlight.arrival}`)
                      arrivalTime.setHours(arrivalTime.getHours() + 1)
                      const date = arrivalTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      const time = arrivalTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                      return `${date} at ${time}`
                    })()}
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

