import { useState, useEffect } from 'react'
import localforage from 'localforage'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { 
  Plane, Users, ArrowLeft, Info, Shield, Zap, UserPlus, Map, ChevronDown, Lock, Clock, 
  Calendar, CalendarDays, Bell, Settings as SettingsIcon, LogOut, Home, MessageCircle, 
  UsersRound, BarChart3, PlaneTakeoff, Moon, Sun, Menu, Check, X, Send, Search, 
  Plus, Trash2, Edit2, Cloud, Wind, Droplets, Eye, ChevronLeft, ChevronRight,
  User, Mail, Phone, MapPin, Building, Briefcase, Star, TrendingUp, CloudRain,
  RefreshCw, Download, Share2, Copy, ExternalLink, AlertCircle, CheckCircle2,
  XCircle, Loader2, MoreVertical, Filter, SortAsc, Heart, UserCheck, UserX
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import './App.css'

const APP_VERSION = '1.0.2'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`
  const defaultOptions = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  }
  try {
    const response = await fetch(url, defaultOptions)
    return response
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error)
    throw error
  }
}

localforage.config({ name: 'FlightRosterIQ', storeName: 'schedules' })

function App() {
  // Authentication & User State
  const [token, setToken] = useState(null)
  const [username, setUsername] = useState('')
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [userType, setUserType] = useState('pilot')
  const [airline, setAirline] = useState('abx')
  const [pilotRank, setPilotRank] = useState('Captain')
  const [homeAirport, setHomeAirport] = useState('')
  const [domicile, setDomicile] = useState('')
  const [nickname, setNickname] = useState('')
  const [isRegisteredUser, setIsRegisteredUser] = useState(false)

  // Schedule & Flight Data
  const [schedule, setSchedule] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedFlight, setSelectedFlight] = useState(null)
  const [weatherData, setWeatherData] = useState({})
  const [aircraftData, setAircraftData] = useState({})

  // UI State
  const [theme, setTheme] = useState('light')
  const [activeTab, setActiveTab] = useState('monthly')
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [error, setError] = useState(null)
  const [serverStatus, setServerStatus] = useState('checking')

  // Friends & Messaging
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [friendsSubTab, setFriendsSubTab] = useState('friends')
  const [chatMessages, setChatMessages] = useState({})
  const [selectedChat, setSelectedChat] = useState(null)
  const [messageInput, setMessageInput] = useState('')
  const [friendSearch, setFriendSearch] = useState('')

  // Family Sharing
  const [familyAccessCodes, setFamilyAccessCodes] = useState([])
  const [newFamilyMemberName, setNewFamilyMemberName] = useState('')
  const [familyMemberName, setFamilyMemberName] = useState('')

  // Statistics
  const [statsPeriod, setStatsPeriod] = useState('current')

  // Settings
  const [settings, setSettings] = useState({
    notifications: true,
    autoRefresh: true,
    theme: 'light'
  })
  const [settingsTab, setSettingsTab] = useState('account')
  
  // PWA/App Mode Detection
  const [isStandalone, setIsStandalone] = useState(
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )

  // Subscription
  const [subscriptionStatus, setSubscriptionStatus] = useState('trial')
  const [subscriptionPlan, setSubscriptionPlan] = useState(null)
  const [trialStartDate, setTrialStartDate] = useState(null)
  const [daysRemaining, setDaysRemaining] = useState(30)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)

  // Push Notifications
  const [pushSubscription, setPushSubscription] = useState(null)

  // Mobile
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  // Load cached data on mount
  useEffect(() => {
    loadCachedData()
    checkDevice()
  }, [])

  // Apply theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])
  
  // Monitor standalone mode changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleChange = (e) => {
      setIsStandalone(e.matches || window.navigator.standalone === true)
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const checkDevice = () => {
    const mobile = window.innerWidth <= 768
    setIsMobile(mobile)
    window.addEventListener('resize', () => setIsMobile(window.innerWidth <= 768))
  }

  const loadCachedData = async () => {
    try {
      const cached = {
        token: await localforage.getItem('authToken'),
        schedule: await localforage.getItem('schedule'),
        friends: await localforage.getItem('friends'),
        settings: await localforage.getItem('settings'),
        userType: await localforage.getItem('userType'),
        airline: await localforage.getItem('airline'),
        username: await localforage.getItem('username'),
        theme: await localforage.getItem('theme'),
        nickname: await localforage.getItem('nickname'),
        familyCodes: await localforage.getItem('familyAccessCodes'),
        chatMessages: await localforage.getItem('chatMessages'),
      }
      
      if (cached.token) setToken(cached.token)
      if (cached.schedule) setSchedule(cached.schedule)
      if (cached.friends) setFriends(cached.friends)
      if (cached.settings) setSettings(cached.settings)
      if (cached.userType) setUserType(cached.userType)
      if (cached.airline) setAirline(cached.airline)
      if (cached.username) setUsername(cached.username)
      if (cached.theme) setTheme(cached.theme)
      if (cached.nickname) setNickname(cached.nickname)
      if (cached.familyCodes) setFamilyAccessCodes(cached.familyCodes)
      if (cached.chatMessages) setChatMessages(cached.chatMessages)
    } catch (error) {
      console.error('Failed to load cached data:', error)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiCall('/api/authenticate', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: credentials.username,
          password: credentials.password,
          airline: airline
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setToken(data.token)
        setUsername(data.user.employeeId)
        setPilotRank(data.user.rank)
        setDomicile(data.user.base)
        setNickname(data.user.nickname)
        
        await localforage.setItem('authToken', data.token)
        await localforage.setItem('username', data.user.employeeId)
        await localforage.setItem('airline', airline)
        await localforage.setItem('pilotRank', data.user.rank)
        await localforage.setItem('domicile', data.user.base)
        
        // Fetch schedule
        await fetchSchedule(data.token)
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Failed to connect to server. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const fetchSchedule = async (authToken = token) => {
    if (!authToken) return
    
    setLoading(true)
    try {
      const response = await apiCall('/api/schedule', {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      if (response.ok) {
        setSchedule(data)
        await localforage.setItem('schedule', data)
      } else {
        console.error('Failed to fetch schedule:', data.error)
      }
    } catch (error) {
      console.error('Failed to fetch schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await localforage.clear()
    setToken(null)
    setUsername('')
    setSchedule(null)
    setCredentials({ username: '', password: '' })
  }

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    await localforage.setItem('theme', newTheme)
  }

  // Login Screen
  if (!token) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-purple-800 p-4 ${theme === 'dark' ? 'dark' : ''}`}>
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="space-y-1 text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4">
              <Plane className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl font-bold">FlightRosterIQ</CardTitle>
            <CardDescription className="text-base">
              Your intelligent crew scheduling companion
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="airline">Airline</Label>
                <Select value={airline} onValueChange={setAirline}>
                  <SelectTrigger id="airline">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abx">ABX Air</SelectItem>
                    <SelectItem value="ati">ATI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Employee ID</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your employee ID"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your crew portal password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue as
                </span>
              </div>
            </div>

            <Button variant="outline" className="w-full" size="lg">
              <Users className="w-4 h-4 mr-2" />
              Family Member Access
            </Button>
          </CardContent>

          <CardFooter className="flex flex-col space-y-2 text-center text-xs text-muted-foreground">
            <p>Your credentials are encrypted and never stored on our servers</p>
            <p className="font-medium">v{APP_VERSION}</p>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Main App
  return (
    <div className={`min-h-screen bg-background ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Loading Banner */}
      {loading && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary/90 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-3 flex items-center justify-center gap-3 text-primary-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">{loadingMessage || 'Loading...'}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Plane className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold">FlightRosterIQ</h1>
              <p className="text-xs text-muted-foreground">Welcome, {nickname || username}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setActiveTab('settings')}>
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Schedule
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="monthly" className="gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Monthly</span>
            </TabsTrigger>
            <TabsTrigger value="daily" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">Daily</span>
            </TabsTrigger>
            <TabsTrigger value="friends" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Friends</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="family" className="gap-2">
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">Family</span>
            </TabsTrigger>
          </TabsList>

          {/* Monthly View */}
          <TabsContent value="monthly" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Monthly Schedule</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => {
                      const newMonth = new Date(currentMonth)
                      newMonth.setMonth(newMonth.getMonth() - 1)
                      setCurrentMonth(newMonth)
                    }}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[140px] text-center">
                      {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <Button variant="outline" size="icon" onClick={() => {
                      const newMonth = new Date(currentMonth)
                      newMonth.setMonth(newMonth.getMonth() + 1)
                      setCurrentMonth(newMonth)
                    }}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {schedule && schedule.flights && schedule.flights.length > 0 ? (
                  <div className="space-y-2">
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 mb-4">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                          {day}
                        </div>
                      ))}
                      {(() => {
                        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
                        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
                        const startDay = firstDay.getDay()
                        const daysInMonth = lastDay.getDate()
                        const days = []

                        // Empty cells before month starts
                        for (let i = 0; i < startDay; i++) {
                          days.push(<div key={`empty-${i}`} className="aspect-square p-1" />)
                        }

                        // Days of the month
                        for (let day = 1; day <= daysInMonth; day++) {
                          const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                          const dayFlights = schedule.flights.filter(f => f.date === dateStr)
                          const hasFlights = dayFlights.length > 0
                          const isToday = dateStr === new Date().toISOString().split('T')[0]

                          days.push(
                            <button
                              key={day}
                              onClick={() => {
                                setSelectedDate(dateStr)
                                setActiveTab('daily')
                              }}
                              className={`
                                aspect-square p-1 rounded-lg border text-sm transition-colors
                                ${isToday ? 'border-primary bg-primary/10 font-bold' : 'border-border'}
                                ${hasFlights ? 'bg-primary/5 hover:bg-primary/20' : 'hover:bg-muted'}
                                ${hasFlights ? 'text-primary font-medium' : ''}
                              `}
                            >
                              <div className="flex flex-col items-center justify-center h-full">
                                <span>{day}</span>
                                {hasFlights && (
                                  <span className="text-[10px] mt-0.5">✈️ {dayFlights.length}</span>
                                )}
                              </div>
                            </button>
                          )
                        }

                        return days
                      })()}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 justify-center text-xs text-muted-foreground pt-4 border-t">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded border border-primary bg-primary/10" />
                        <span>Today</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded border bg-primary/5" />
                        <span>Flight Day</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded border" />
                        <span>Off Day</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No schedule data available</p>
                    <Button className="mt-4" onClick={fetchSchedule}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Fetch Schedule
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Daily View */}
          <TabsContent value="daily" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Daily Schedule</CardTitle>
                    <CardDescription>
                      {new Date(selectedDate).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </CardDescription>
                  </div>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {schedule && schedule.flights ? (
                  (() => {
                    const dayFlights = schedule.flights.filter(f => f.date === selectedDate)
                    
                    if (dayFlights.length === 0) {
                      return (
                        <div className="text-center text-muted-foreground py-12">
                          <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium">No flights scheduled</p>
                          <p className="text-sm">This is an off day</p>
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-3">
                        {dayFlights.map((flight, idx) => (
                          <Card 
                            key={idx}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setSelectedFlight(flight)}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Plane className="w-4 h-4 text-primary" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-base">
                                      {flight.flightNumber || 'Flight'}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                      {flight.aircraft || 'Aircraft TBD'}
                                    </CardDescription>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-muted-foreground">
                                    {flight.departure || '--:--'} → {flight.arrival || '--:--'}
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium">{flight.origin || 'Origin'}</span>
                                </div>
                                <div className="flex-1 mx-4 border-t border-dashed" />
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{flight.destination || 'Destination'}</span>
                                  <MapPin className="w-4 h-4 text-muted-foreground" />
                                </div>
                              </div>
                              {flight.hotel && (
                                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                                  <Building className="w-3 h-3" />
                                  <span>Layover: {flight.hotel}</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )
                  })()
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No schedule data loaded</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Flight Detail Dialog */}
            {selectedFlight && (
              <Dialog open={!!selectedFlight} onOpenChange={() => setSelectedFlight(null)}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Plane className="w-5 h-5" />
                      {selectedFlight.flightNumber || 'Flight Details'}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedFlight.date}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* Flight Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Origin</Label>
                        <p className="text-lg font-semibold">{selectedFlight.origin}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Destination</Label>
                        <p className="text-lg font-semibold">{selectedFlight.destination}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Departure</Label>
                        <p className="font-medium">{selectedFlight.departure || '--:--'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Arrival</Label>
                        <p className="font-medium">{selectedFlight.arrival || '--:--'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Aircraft</Label>
                        <p className="font-medium">{selectedFlight.aircraft || 'TBD'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Flight Time</Label>
                        <p className="font-medium">{selectedFlight.flightTime || '--:--'}</p>
                      </div>
                    </div>

                    {/* Hotel Info */}
                    {selectedFlight.hotel && (
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Building className="w-4 h-4 text-primary" />
                          <Label className="text-sm font-medium">Layover Hotel</Label>
                        </div>
                        <p className="text-sm">{selectedFlight.hotel}</p>
                      </div>
                    )}

                    {/* Crew Info */}
                    {selectedFlight.crew && (
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Crew</Label>
                        <div className="space-y-1">
                          {selectedFlight.crew.map((member, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span>{member}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSelectedFlight(null)}>
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          {/* Friends View */}
          <TabsContent value="friends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Friends & Messaging</CardTitle>
                <CardDescription>Connect with your crew</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={friendsSubTab} onValueChange={setFriendsSubTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="friends">Friends</TabsTrigger>
                    <TabsTrigger value="chats">Chats</TabsTrigger>
                    <TabsTrigger value="search">Find</TabsTrigger>
                  </TabsList>

                  {/* Friends List */}
                  <TabsContent value="friends" className="space-y-4">
                    {friends.length === 0 ? (
                      <div className="text-center text-muted-foreground py-12">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No friends yet</p>
                        <p className="text-sm mb-4">Search for crew members to connect</p>
                        <Button onClick={() => setFriendsSubTab('search')}>
                          <Search className="w-4 h-4 mr-2" />
                          Find Friends
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {friends.map((friend, idx) => (
                          <Card key={idx} className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-lg font-bold text-primary">
                                      {(friend.name || friend.employeeId).charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium">{friend.name || friend.employeeId}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {friend.role} • {friend.base}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedChat(friend)
                                      setFriendsSubTab('chats')
                                    }}
                                  >
                                    <MessageCircle className="w-4 h-4 mr-1" />
                                    Chat
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button size="sm" variant="ghost">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem className="text-destructive">
                                        <UserX className="w-4 h-4 mr-2" />
                                        Remove Friend
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Friend Requests */}
                    {friendRequests.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-sm font-medium mb-3">Friend Requests ({friendRequests.length})</h3>
                        <div className="space-y-2">
                          {friendRequests.map((request, idx) => (
                            <Card key={idx}>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                                      <span className="text-lg font-bold">
                                        {request.name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="font-medium">{request.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {request.role} • #{request.employeeId}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      size="sm" 
                                      variant="default"
                                      onClick={() => {
                                        setFriends([...friends, { ...request, id: Date.now() }])
                                        setFriendRequests(friendRequests.filter((_, i) => i !== idx))
                                      }}
                                    >
                                      <Check className="w-4 h-4 mr-1" />
                                      Accept
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => setFriendRequests(friendRequests.filter((_, i) => i !== idx))}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Chats */}
                  <TabsContent value="chats" className="space-y-4">
                    {selectedChat ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 pb-3 border-b">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setSelectedChat(null)}
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </Button>
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">
                              {(selectedChat.name || selectedChat.employeeId).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{selectedChat.name || selectedChat.employeeId}</p>
                            <p className="text-xs text-muted-foreground">{selectedChat.role}</p>
                          </div>
                        </div>

                        <div className="space-y-3 min-h-[300px] max-h-[400px] overflow-y-auto p-4 bg-muted/20 rounded-lg">
                          {(chatMessages[selectedChat.id] || []).length === 0 ? (
                            <div className="text-center text-muted-foreground py-12">
                              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                              <p>Start a conversation</p>
                            </div>
                          ) : (
                            (chatMessages[selectedChat.id] || []).map((msg) => (
                              <div 
                                key={msg.id}
                                className={`flex ${msg.senderId === username ? 'justify-end' : 'justify-start'}`}
                              >
                                <div 
                                  className={`max-w-[70%] px-4 py-2 rounded-lg ${
                                    msg.senderId === username 
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'bg-card border'
                                  }`}
                                >
                                  <p className="text-sm">{msg.text}</p>
                                  <p className="text-xs opacity-70 mt-1">
                                    {new Date(msg.timestamp).toLocaleTimeString('en-US', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Type a message..."
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && messageInput.trim()) {
                                const newMsg = {
                                  id: Date.now(),
                                  senderId: username,
                                  text: messageInput,
                                  timestamp: new Date().toISOString()
                                }
                                setChatMessages({
                                  ...chatMessages,
                                  [selectedChat.id]: [...(chatMessages[selectedChat.id] || []), newMsg]
                                })
                                setMessageInput('')
                              }
                            }}
                          />
                          <Button 
                            onClick={() => {
                              if (messageInput.trim()) {
                                const newMsg = {
                                  id: Date.now(),
                                  senderId: username,
                                  text: messageInput,
                                  timestamp: new Date().toISOString()
                                }
                                setChatMessages({
                                  ...chatMessages,
                                  [selectedChat.id]: [...(chatMessages[selectedChat.id] || []), newMsg]
                                })
                                setMessageInput('')
                              }
                            }}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {friends.length === 0 ? (
                          <div className="text-center text-muted-foreground py-12">
                            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No conversations yet</p>
                          </div>
                        ) : (
                          friends.map((friend, idx) => (
                            <Card 
                              key={idx}
                              className="cursor-pointer hover:shadow-sm transition-shadow"
                              onClick={() => setSelectedChat(friend)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-lg font-bold text-primary">
                                      {(friend.name || friend.employeeId).charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium">{friend.name || friend.employeeId}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {(chatMessages[friend.id] || []).length > 0
                                        ? (chatMessages[friend.id][chatMessages[friend.id].length - 1].text)
                                        : 'Start a conversation'}
                                    </p>
                                  </div>
                                  {(chatMessages[friend.id] || []).length > 0 && (
                                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                                      {chatMessages[friend.id].length}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* Search */}
                  <TabsContent value="search" className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Search by name or employee ID..."
                        value={friendSearch}
                        onChange={(e) => setFriendSearch(e.target.value)}
                      />
                      <Button>
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="text-center text-muted-foreground py-12">
                      <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Search for crew members</p>
                      <p className="text-sm mt-2">Enter a name or employee ID to find registered users</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats View */}
          <TabsContent value="stats" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Flight Statistics</CardTitle>
                    <CardDescription>Your performance metrics</CardDescription>
                  </div>
                  <Select value={statsPeriod} onValueChange={setStatsPeriod}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Current Month</SelectItem>
                      <SelectItem value="previous">Previous Month</SelectItem>
                      <SelectItem value="ytd">Year to Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {schedule && schedule.flights && schedule.flights.length > 0 ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Flight Hours</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2">
                            <Plane className="w-5 h-5 text-primary" />
                            <div className="text-3xl font-bold">85.5</div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">+12.5 from last month</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Duty Hours</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            <div className="text-3xl font-bold">124</div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">+18 from last month</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Landings</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2">
                            <PlaneTakeoff className="w-5 h-5 text-primary" />
                            <div className="text-3xl font-bold">{schedule.flights.length}</div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Total flights</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Layovers</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2">
                            <Building className="w-5 h-5 text-primary" />
                            <div className="text-3xl font-bold">
                              {schedule.flights.filter(f => f.hotel).length}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Hotel stays</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Off Days This Month</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const today = new Date()
                            const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
                            const scheduledDays = new Set(
                              schedule.flights
                                .filter(f => new Date(f.date).getMonth() === today.getMonth())
                                .map(f => new Date(f.date).getDate())
                            )
                            const offDays = []
                            for (let day = 1; day <= daysInMonth; day++) {
                              if (!scheduledDays.has(day)) offDays.push(day)
                            }
                            
                            return offDays.length > 0 ? (
                              offDays.map(day => (
                                <div key={day} className="w-10 h-10 rounded-lg border bg-muted flex items-center justify-center text-sm font-medium">
                                  {day}
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No off days this month</p>
                            )
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No flight data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Family View */}
          <TabsContent value="family" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Family Sharing</CardTitle>
                <CardDescription>Share your schedule with loved ones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Generate Access Code */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="family-name" className="text-base font-medium">Create Access Code</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Generate a secure code for family members to view your schedule
                      </p>
                    </div>
                    
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="family-name">Family Member Name</Label>
                        <Input
                          id="family-name"
                          placeholder="e.g., Spouse, Parent, etc."
                          value={newFamilyMemberName}
                          onChange={(e) => setNewFamilyMemberName(e.target.value)}
                        />
                      </div>
                      <Button 
                        onClick={() => {
                          if (newFamilyMemberName.trim()) {
                            const code = Math.random().toString(36).substr(2, 8).toUpperCase()
                            setFamilyAccessCodes([
                              ...familyAccessCodes,
                              {
                                id: Date.now(),
                                name: newFamilyMemberName,
                                code: code,
                                created: new Date().toISOString(),
                                active: true
                              }
                            ])
                            setNewFamilyMemberName('')
                          }
                        }}
                        disabled={!newFamilyMemberName.trim()}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Generate Code
                      </Button>
                    </div>
                  </div>

                  {/* Active Access Codes */}
                  {familyAccessCodes.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Active Access Codes</Label>
                      <div className="space-y-2">
                        {familyAccessCodes.map((item) => (
                          <Card key={item.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Heart className="w-4 h-4 text-primary" />
                                    <p className="font-medium">{item.name}</p>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Lock className="w-3 h-3" />
                                      <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono font-bold">
                                        {item.code}
                                      </code>
                                    </div>
                                    <span>•</span>
                                    <span>
                                      Created {new Date(item.created).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.code)
                                      alert('Access code copied!')
                                    }}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      if (confirm(`Revoke access for ${item.name}?`)) {
                                        setFamilyAccessCodes(
                                          familyAccessCodes.filter(code => code.id !== item.id)
                                        )
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 mt-0.5 text-primary" />
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">How it works:</p>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>• Generate a unique access code for each family member</li>
                          <li>• Share the code securely (via text, email, etc.)</li>
                          <li>• They can view your schedule using the code</li>
                          <li>• Revoke access anytime by deleting the code</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Settings Dialog */}
      <Dialog open={activeTab === 'settings'} onOpenChange={(open) => !open && setActiveTab('monthly')}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Manage your account and application preferences</DialogDescription>
          </DialogHeader>

          <Tabs value={settingsTab} onValueChange={setSettingsTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="about">About</TabsTrigger>
            </TabsList>

            {/* Account Settings */}
            <TabsContent value="account" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pilot Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={username} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Rank</Label>
                      <Input value={pilotRank} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Base</Label>
                      <Input value={domicile || 'Not set'} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Airline</Label>
                      <Input value={airline.toUpperCase()} readOnly />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Nickname</CardTitle>
                  <CardDescription>Choose how friends see your name</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter nickname"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                    />
                    <Button>Save</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Push Notifications</CardTitle>
                  <CardDescription>Get alerts about schedule changes and important updates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Schedule Changes</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify when your schedule is updated
                      </p>
                    </div>
                    <Button
                      variant={settings.notifications ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings({ ...settings, notifications: !settings.notifications })}
                    >
                      {settings.notifications ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Friend Requests</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify when someone wants to be friends
                      </p>
                    </div>
                    <Button variant="default" size="sm">
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Messages</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify when you receive a message
                      </p>
                    </div>
                    <Button variant="default" size="sm">
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>

                  {'Notification' in window && Notification.permission !== 'granted' && (
                    <Button
                      className="w-full"
                      onClick={async () => {
                        try {
                          const permission = await Notification.requestPermission()
                          if (permission === 'granted') {
                            alert('Notifications enabled!')
                          }
                        } catch (error) {
                          console.error('Notification permission error:', error)
                        }
                      }}
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Enable Push Notifications
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences */}
            <TabsContent value="preferences" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">App Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto Refresh</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically check for schedule updates
                      </p>
                    </div>
                    <Button
                      variant={settings.autoRefresh ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings({ ...settings, autoRefresh: !settings.autoRefresh })}
                    >
                      {settings.autoRefresh ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Switch between light and dark themes
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleTheme}
                    >
                      {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Data & Storage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Download Schedule Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Cached Data
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* About */}
            <TabsContent value="about" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">FlightRosterIQ</CardTitle>
                  <CardDescription>Version {APP_VERSION}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Your intelligent crew scheduling companion. Built for ABX and ATI pilots to easily manage schedules, connect with crew members, and stay organized.
                    </p>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-2">Features:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>✈️ Monthly and daily schedule views</li>
                      <li>👥 Connect with crewmates</li>
                      <li>📊 Track flight statistics</li>
                      <li>❤️ Share schedule with family</li>
                      <li>🔔 Real-time push notifications</li>
                      <li>🌙 Dark mode support</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Support</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Mail className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Documentation
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Info className="w-4 h-4 mr-2" />
                    Report an Issue
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Legal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="link" className="h-auto p-0 text-sm">Privacy Policy</Button>
                  <span className="text-muted-foreground"> • </span>
                  <Button variant="link" className="h-auto p-0 text-sm">Terms of Service</Button>
                  <span className="text-muted-foreground"> • </span>
                  <Button variant="link" className="h-auto p-0 text-sm">Licenses</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Version Badge */}
      <div className="fixed bottom-4 left-0 right-0 text-center pointer-events-none">
        <span className="inline-block text-xs text-muted-foreground opacity-60 font-medium px-3 py-1 rounded-md bg-black/20 dark:bg-white/10">
          v{APP_VERSION}
        </span>
      </div>
    </div>
  )
}

export default App
