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
  
  const API_URL = API_BASE_URL

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
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
          airline: airline.toUpperCase()
        })
      })

      const data = await response.json()

      if (response.ok) {
        setToken(data.token)
        setUsername(credentials.username)
        await localforage.setItem('crewToken', data.token)
        await localforage.setItem('crewUsername', credentials.username)
        await localforage.setItem('crewAirline', airline)
        
        // Fetch schedule
        await fetchSchedule(data.token)
      } else {
        setError(data.message || 'Login failed')
      }
    } catch (err) {
      setError('Connection error. Please check your internet connection.')
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
      const response = await fetch(`${API_URL}/api/schedule`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok) {
        setSchedule(data)
        await localforage.setItem('crewSchedule', data)
      } else {
        setError(data.message || 'Failed to fetch schedule')
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
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-slide-up">
          <CardHeader>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                <Plane className="w-8 h-8 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Flight Roster IQ</h1>
              <p className="text-gray-600 mt-2">Crew Schedule Management</p>
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

            <div className="mt-6 text-center text-sm text-gray-600">
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
    <div className={cn('min-h-screen', theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50')}>
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <Plane className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Flight Roster IQ</h1>
              <p className="text-sm text-gray-500">{username} • {airline.toUpperCase()}</p>
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
            <span className="ml-3 text-gray-600">{loadingMessage}</span>
          </div>
        )}

        {/* Monthly View */}
        {activeTab === 'monthly' && !loading && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Monthly Schedule</h2>
                <p className="text-gray-500">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              </CardHeader>
              <CardContent>
                {schedule?.flights?.length > 0 ? (
                  <div className="space-y-3">
                    {schedule.flights.slice(0, 10).map((flight, idx) => (
                      <Card key={idx} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedFlight(flight)}>
                        <CardContent className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                                <Plane className="w-6 h-6 text-primary-600" />
                              </div>
                              <div>
                                <div className="font-semibold text-lg">{flight.origin} → {flight.destination}</div>
                                <div className="text-sm text-gray-500">Flight {flight.flightNumber}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">{new Date(flight.departure).toLocaleDateString()}</div>
                              <div className="text-sm text-gray-500">{new Date(flight.departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Plane className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No flights scheduled</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Daily View */}
        {activeTab === 'daily' && !loading && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Daily Schedule</h2>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-2"
                />
              </CardHeader>
              <CardContent>
                {dailyFlights.length > 0 ? (
                  <div className="space-y-4">
                    {dailyFlights.map((flight, idx) => (
                      <Card key={idx} className="hover:shadow-lg transition-shadow">
                        <CardContent>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-lg font-semibold">{flight.origin} → {flight.destination}</div>
                              <div className="text-sm text-gray-500 mt-1">Flight {flight.flightNumber}</div>
                              <div className="flex items-center gap-2 mt-2 text-sm">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span>{new Date(flight.departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                            <Badge variant="primary">{flight.aircraftType || 'B767'}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No flights on this date</p>
                  </div>
                )}

                {hotels.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Hotel className="w-5 h-5 text-primary-600" />
                      Layover Hotels
                    </h3>
                    {hotels.map((hotel, idx) => (
                      <Card key={idx}>
                        <CardContent>
                          <div className="font-medium">{hotel.name}</div>
                          <div className="text-sm text-gray-500">{hotel.location}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Friends View */}
        {activeTab === 'friends' && !loading && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Friends & Crew</h2>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No friends added yet</p>
                <Button className="mt-4">Add Friends</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings View */}
        {activeTab === 'settings' && !loading && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Settings</h2>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Pilot Information</h3>
                <div className="space-y-3">
                  <Input label="Full Name" defaultValue={username} />
                  <Input label="Employee ID" placeholder="Enter ID" />
                  <Select label="Base">
                    <option>CVG - Cincinnati</option>
                    <option>ILN - Wilmington</option>
                  </Select>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Notifications</h3>
                <div className="flex items-center justify-between">
                  <span>Schedule Changes</span>
                  <input type="checkbox" className="w-4 h-4" defaultChecked />
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Preferences</h3>
                <Select label="Timezone">
                  <option>UTC</option>
                  <option>Local</option>
                </Select>
              </div>

              <Button variant="danger" className="w-full">Delete Account</Button>
            </CardContent>
          </Card>
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
              <div>
                <div className="text-2xl font-bold">
                  {selectedFlight.origin} → {selectedFlight.destination}
                </div>
                <div className="text-gray-500">Flight {selectedFlight.flightNumber}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Departure</div>
                  <div className="font-semibold">
                    {new Date(selectedFlight.departure).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Arrival</div>
                  <div className="font-semibold">
                    {new Date(selectedFlight.arrival).toLocaleString()}
                  </div>
                </div>
              </div>

              {selectedFlight.crew && selectedFlight.crew.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Crew</h3>
                  <div className="space-y-2">
                    {selectedFlight.crew.map((member, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <Avatar size="sm">{member.name?.[0]}</Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-gray-500">{member.role}</div>
                        </div>
                      </div>
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
