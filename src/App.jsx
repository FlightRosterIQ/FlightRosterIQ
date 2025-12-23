import { useState, useEffect } from 'react'
import localforage from 'localforage'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import {
  Plane,
  Users,
  Settings,
  Bell,
  LogOut,
  Calendar,
  Clock,
  MapPin,
  Hotel,
  ArrowLeft,
  Sun,
  Moon,
  CloudRain,
  Wind,
  Eye,
  Droplets,
  User,
  Mail,
  Phone,
  MessageSquare,
  Search,
  X,
  Check,
  Download,
  RefreshCw
} from 'lucide-react'

import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Input,
  Select,
  Badge,
  Alert,
  Spinner,
  Dialog,
  DialogHeader,
  DialogContent,
  DialogFooter,
  Tabs,
  Avatar,
  IconButton
} from './components/ui'

import { FlightCard } from './components/FlightCard'
import { CrewCard } from './components/CrewCard'
import { MonthlyView } from './components/MonthlyView'
import { DailyView } from './components/DailyView'
import { FriendsView } from './components/FriendsView'
import { SettingsView } from './components/SettingsView'

import { cn } from './lib/utils'
import { API_BASE_URL } from './config'

function App() {
  // Authentication & User State
  const [token, setToken] = useState(null)
  const [username, setUsername] = useState('')
  const [userType, setUserType] = useState('pilot')
  const [airline, setAirline] = useState('abx')
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [accountType, setAccountType] = useState(null)
  
  // Schedule State
  const [schedule, setSchedule] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedFlight, setSelectedFlight] = useState(null)
  const [scheduleChanges, setScheduleChanges] = useState([])
  
  // UI State
  const [activeTab, setActiveTab] = useState('monthly')
  const [theme, setTheme] = useState('light')
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [error, setError] = useState(null)
  const [serverStatus, setServerStatus] = useState('checking')
  const [isMobile, setIsMobile] = useState(false)
  
  // Settings State
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    timezone: 'UTC'
  })
  const [settingsTab, setSettingsTab] = useState('pilotInfo')
  
  // Flight Details
  const [flightDetailTab, setFlightDetailTab] = useState('flight')
  const [weatherData, setWeatherData] = useState({})
  const [aircraftData, setAircraftData] = useState({})
  
  // Friends & Social
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [friendsSubTab, setFriendsSubTab] = useState('chats')
  const [chatMessages, setChatMessages] = useState({})
  const [selectedChat, setSelectedChat] = useState(null)
  const [messageInput, setMessageInput] = useState('')
  
  // Force production backend URL - ALWAYS use VPS directly
  const API_URL = 'http://157.245.126.24:8080'
  
  // CRITICAL: Log API URL configuration on mount
  useEffect(() => {
    console.log('%c🔧 API CONFIGURATION', 'background: #4C5FD5; color: white; padding: 4px 8px; font-weight: bold;')
    console.log('API_URL:', API_URL)
    console.log('API_BASE_URL:', API_BASE_URL)
    console.log('Current location:', window.location.href)
    console.log('Will call auth at:', `${API_URL}/api/authenticate`)
  }, [])
  
  // Log on every render to verify URL
  console.log('🔧 API Configuration (render ' + Date.now() + '):', { 
    API_BASE_URL_imported: API_BASE_URL,
    API_URL_used: API_URL,
    window_location: window.location.href
  })

  // Check for mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Check server status on mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch(`${API_URL}/`)
        if (response.ok) {
          setServerStatus('online')
        }
      } catch (err) {
        setServerStatus('offline')
      }
    }
    checkServer()
  }, [API_URL])

  // Load saved session
  useEffect(() => {
    const loadSession = async () => {
      try {
        const savedToken = await localforage.getItem('crewToken')
        const savedUsername = await localforage.getItem('crewUsername')
        const savedSchedule = await localforage.getItem('crewSchedule')
        const savedAirline = await localforage.getItem('crewAirline')
        
        if (savedToken && savedUsername) {
          setToken(savedToken)
          setUsername(savedUsername)
          if (savedSchedule) setSchedule(savedSchedule)
          if (savedAirline) setAirline(savedAirline)
        }
      } catch (err) {
        console.error('Failed to load session:', err)
      }
    }
    loadSession()
  }, [])

  // Login Handler
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setLoadingMessage('Authenticating...')

    try {
      // Build timestamp: 2025-12-23T16:21:00Z - Force cache bust
      const authUrl = `${API_URL}/api/authenticate`
      console.log('🔐 Attempting authentication at:', authUrl)
      console.log('📤 Request body:', {
        employeeId: credentials.username,
        airline: airline.toUpperCase()
      })
      
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: credentials.username,
          password: credentials.password,
          airline: airline.toUpperCase()
        })
      })

      console.log('Response status:', response.status, response.statusText)

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const text = await response.text()
        console.error('Server error response:', text)
        throw new Error(`Server error (${response.status}): ${text}`)
      }

      const data = await response.json()
      console.log('Authentication response:', data)

      if (data.success && data.authenticated) {
        // Mock token for now since backend doesn't provide one
        const mockToken = btoa(`${credentials.username}:${Date.now()}`)
        setToken(mockToken)
        setUsername(credentials.username)
        await localforage.setItem('crewToken', mockToken)
        await localforage.setItem('crewUsername', credentials.username)
        await localforage.setItem('crewAirline', airline)
        
        // Fetch schedule
        await fetchSchedule(mockToken)
      } else {
        setError(data.error || data.message || 'Authentication not available. Backend is in lightweight mode.')
      }
    } catch (err) {
      console.error('Authentication error:', err)
      setError(err.message || 'Connection error. Please check your internet connection.')
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  // Fetch Schedule
  const fetchSchedule = async (authToken = token) => {
    setLoading(true)
    setLoadingMessage('Fetching your schedule...')

    try {
      const response = await fetch(`${API_URL}/api/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeId: username,
          airline: airline.toUpperCase()
        })
      })

      const data = await response.json()

      if (data.success && data.schedule) {
        setSchedule(data.schedule)
        await localforage.setItem('crewSchedule', data.schedule)
      } else {
        // For now, show error that scraping is not available
        setError(data.message || 'Schedule scraping is not available in lightweight mode')
      }
    } catch (err) {
      setError('Failed to load schedule')
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  // Logout Handler
  const handleLogout = async () => {
    await localforage.removeItem('crewToken')
    await localforage.removeItem('crewUsername')
    await localforage.removeItem('crewSchedule')
    setToken(null)
    setUsername('')
    setSchedule(null)
    setActiveTab('monthly')
  }

  // Render Login Screen
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-accent flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-slide-up">
          <CardHeader>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <Plane className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Flight Roster IQ</h1>
              <p className="text-muted-foreground mt-2">Crew Schedule Management</p>
            </div>
          </CardHeader>
          
          <CardContent>
            {serverStatus === 'offline' && (
              <Alert variant="error" className="mb-4">
                Server is offline. Please try again later.
              </Alert>
            )}
            
            {error && (
              <Alert variant="error" className="mb-4">
                {error}
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <Select
                label="Airline"
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
              >
                <option value="abx">ABX Air</option>
                <option value="ati">ATI</option>
              </Select>

              <Input
                label="Username"
                type="text"
                placeholder="Enter your username"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                required
              />

              <Button
                type="submit"
                className="w-full"
                disabled={loading || serverStatus === 'offline'}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    {loadingMessage}
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Need help? Contact support</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main App Content
  const dailyFlights = schedule?.flights?.filter(f => f.departure?.startsWith(selectedDate)) || []
  const hotels = schedule?.hotelsByDate?.[selectedDate] || []

  const tabs = [
    { label: 'Monthly', value: 'monthly', icon: <Calendar className="w-4 h-4" /> },
    { label: 'Daily', value: 'daily', icon: <Clock className="w-4 h-4" /> },
    { label: 'Friends', value: 'friends', icon: <Users className="w-4 h-4" /> },
    { label: 'Settings', value: 'settings', icon: <Settings className="w-4 h-4" /> },
  ]

  return (
    <div className={cn('min-h-screen bg-background', theme === 'dark' && 'dark')}>
      {/* Header */}
      <header className="bg-card shadow-sm sticky top-0 z-30 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Plane className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Flight Roster IQ</h1>
              <p className="text-sm text-muted-foreground">{username} • {airline.toUpperCase()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <IconButton onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </IconButton>
            
            <IconButton>
              <Badge variant="danger" className="absolute -top-1 -right-1 px-1.5 min-w-[1.25rem] h-5">
                3
              </Badge>
              <Bell className="w-5 h-5" />
            </IconButton>

            <Button variant="ghost" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
            <span className="ml-3 text-muted-foreground">{loadingMessage}</span>
          </div>
        )}

        {/* Monthly View */}
        {activeTab === 'monthly' && !loading && (
          <MonthlyView 
            schedule={schedule}
            currentMonth={currentMonth}
            onFlightClick={(flight) => setSelectedFlight(flight)}
          />
        )}

        {/* Daily View */}
        {activeTab === 'daily' && !loading && (
          <DailyView 
            selectedDate={selectedDate}
            dailyFlights={dailyFlights}
            hotels={hotels}
            onDateChange={(date) => setSelectedDate(date)}
            onFlightClick={(flight) => setSelectedFlight(flight)}
          />
        )}

        {/* Friends View */}
        {activeTab === 'friends' && !loading && (
          <FriendsView 
            friends={[]}
            onAddFriend={() => console.log('Add friend functionality coming soon')}
          />
        )}

        {/* Settings View */}
        {activeTab === 'settings' && !loading && (
          <SettingsView 
            username={username}
            settings={{}}
            onSettingsChange={(settings) => console.log('Settings changed:', settings)}
            onDeleteAccount={() => console.log('Delete account functionality coming soon')}
          />
        )}
      </main>

      {/* Flight Details Dialog */}
      {selectedFlight && (
        <Dialog isOpen={!!selectedFlight} onClose={() => setSelectedFlight(null)}>
          <DialogHeader>
            <h2 className="text-xl font-semibold">Flight Details</h2>
          </DialogHeader>
          <DialogContent>
            <div className="space-y-4">
              {/* Flight Header */}
              <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
                <div className="text-2xl font-bold text-foreground">
                  {selectedFlight.origin} → {selectedFlight.destination}
                </div>
                <div className="text-muted-foreground mt-1">Flight {selectedFlight.flightNumber}</div>
                {selectedFlight.aircraftType && (
                  <Badge variant="primary" className="mt-3">{selectedFlight.aircraftType}</Badge>
                )}
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Departure</div>
                  <div className="font-semibold text-foreground">
                    {new Date(selectedFlight.departure).toLocaleString()}
                  </div>
                </div>
                <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Arrival</div>
                  <div className="font-semibold text-foreground">
                    {new Date(selectedFlight.arrival).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Crew */}
              {selectedFlight.crew && selectedFlight.crew.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-foreground">Crew Members</h3>
                  <div className="space-y-3">
                    {selectedFlight.crew.map((member, idx) => (
                      <CrewCard 
                        key={idx} 
                        member={member}
                        onContact={(type, member) => console.log(`Contact ${member.name} via ${type}`)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedFlight(null)}>Close</Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}

export default App
