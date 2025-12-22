import { useState, useEffect } from 'react'
import localforage from 'localforage'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import './App.css'

const APP_VERSION = '1.0.2'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

localforage.config({ name: 'FlightRosterIQ', storeName: 'schedules' })

function App() {
  // All state from App_OLD.jsx lines 11-32 + new ones from current App.jsx
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

  // New state from current App.jsx
  const [username, setUsername] = useState('')
  const [accountType, setAccountType] = useState(null)
  const [loginStep, setLoginStep] = useState(1)
  const [pilotRank, setPilotRank] = useState('Captain')
  const [homeAirport, setHomeAirport] = useState('')
  const [domicile, setDomicile] = useState('')
  const [nickname, setNickname] = useState('')
  const [isRegisteredUser, setIsRegisteredUser] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedFlight, setSelectedFlight] = useState(null)
  const [theme, setTheme] = useState('light')
  const [loadingMessage, setLoadingMessage] = useState('')
  const [serverStatus, setServerStatus] = useState('checking')
  const [selectedChat, setSelectedChat] = useState(null)
  const [messageInput, setMessageInput] = useState('')
  const [friendSearch, setFriendSearch] = useState('')
  const [familyAccessCodes, setFamilyAccessCodes] = useState([])
  const [newFamilyMemberName, setNewFamilyMemberName] = useState('')
  const [familyMemberName, setFamilyMemberName] = useState('')
  const [statsPeriod, setStatsPeriod] = useState('current')
  const [settingsTab, setSettingsTab] = useState('account')

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    loadCachedData()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Apply theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  const loadCachedData = async () => {
    try {
      const cachedToken = await localforage.getItem('authToken')
      const cachedSchedule = await localforage.getItem('schedule')
      const cachedFriends = await localforage.getItem('friends')
      const cachedSettings = await localforage.getItem('settings')
      const cachedUserType = await localforage.getItem('userType')
      const cachedAirline = await localforage.getItem('airline')
      const cachedUsername = await localforage.getItem('username')
      const cachedTheme = await localforage.getItem('theme')
      const cachedNickname = await localforage.getItem('nickname')
      const cachedFamilyCodes = await localforage.getItem('familyAccessCodes')
      const cachedChatMessages = await localforage.getItem('chatMessages')
      
      if (cachedToken) setToken(cachedToken)
      if (cachedSchedule) setSchedule(cachedSchedule)
      if (cachedFriends) setFriends(cachedFriends)
      if (cachedSettings) setSettings(cachedSettings)
      if (cachedUserType) setUserType(cachedUserType)
      if (cachedAirline) setAirline(cachedAirline)
      if (cachedUsername) setUsername(cachedUsername)
      if (cachedTheme) setTheme(cachedTheme)
      if (cachedNickname) setNickname(cachedNickname)
      if (cachedFamilyCodes) setFamilyAccessCodes(cachedFamilyCodes)
      if (cachedChatMessages) setChatMessages(cachedChatMessages)
    } catch (err) {
      console.error('Error loading cached data:', err)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employeeId: credentials.username,
          password: credentials.password,
          accountType: accountType,
          airline: airline
        })
      })

      const data = await response.json()

      if (data.success) {
        setToken(data.token)
        setUserType(data.accountType || accountType)
        setUsername(data.user?.employeeId || credentials.username)
        await localforage.setItem('authToken', data.token)
        await localforage.setItem('userType', data.accountType || accountType)
        await localforage.setItem('username', data.user?.employeeId || credentials.username)
        await localforage.setItem('airline', airline)
        await fetchSchedule(data.token)
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const fetchSchedule = async (authToken = token) => {
    if (!authToken) return
    
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/schedule`, {
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
      }
    } catch (error) {
      console.error('Failed to fetch schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      if (isOnline && token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      }
      setToken(null)
      setUserType('pilot')
      setAirline(null)
      setAccountType(null)
      await localforage.removeItem('authToken')
      await localforage.removeItem('userType')
      await localforage.removeItem('airline')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    setSettings({...settings, theme: newTheme})
    await localforage.setItem('theme', newTheme)
    await localforage.setItem('settings', {...settings, theme: newTheme})
  }

  const getMonthlySchedule = () => {
    if (!schedule || !schedule.flights) return {}
    
    const monthData = {}
    schedule.flights.forEach(flight => {
      const dateKey = flight.date
      if (!monthData[dateKey]) {
        monthData[dateKey] = []
      }
      monthData[dateKey].push(flight)
    })
    
    return monthData
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
          week.push(<div key={`empty-${j}`} className="aspect-square p-1"></div>)
        } else if (day > daysInMonth) {
          week.push(<div key={`empty-${j}`} className="aspect-square p-1"></div>)
        } else {
          const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
          const dateKey = date.toISOString().split('T')[0]
          const hasFlights = monthData[dateKey]?.length > 0
          const isToday = day === today.getDate() && 
                          viewMonth.getMonth() === today.getMonth() && 
                          viewMonth.getFullYear() === today.getFullYear()
          
          week.push(
            <button
              key={day}
              onClick={() => {
                if (hasFlights) {
                  setSelectedDate(dateKey)
                  setActiveTab('daily')
                }
              }}
              className={`
                aspect-square p-1 rounded-lg border text-sm transition-colors
                ${isToday ? 'border-primary bg-primary/10 font-bold' : 'border-border'}
                ${hasFlights ? 'bg-primary/5 hover:bg-primary/20 text-primary font-medium' : 'hover:bg-muted'}
              `}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <span>{day}</span>
                {hasFlights && (
                  <span className="text-[10px] mt-0.5">✈️ {monthData[dateKey].length}</span>
                )}
              </div>
            </button>
          )
          day++
        }
      }
      calendar.push(<div key={i} className="grid grid-cols-7 gap-1">{week}</div>)
    }
    
    return (
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
          <div className="space-y-2">
            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            {calendar}
            
            {/* Legend */}
            <div className="flex items-center gap-4 justify-center text-xs text-muted-foreground pt-4 border-t mt-4">
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
        </CardContent>
      </Card>
    )
  }

  const renderDailyView = () => {
    const dayFlights = schedule?.flights?.filter(f => f.date === selectedDate) || []
    
    return (
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
          {dayFlights.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No flights scheduled</p>
              <p className="text-sm">This is an off day</p>
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>
    )
  }

  const renderFriendsView = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Friends & Crew</CardTitle>
          <CardDescription>Connect with your crewmates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Friends List */}
            <div>
              <h3 className="text-sm font-medium mb-3">Your Friends ({friends.length})</h3>
              {friends.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No friends yet</p>
                  <p className="text-sm mt-2">Search for crew members to connect</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend, idx) => (
                    <Card key={idx}>
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
                              {friend.role || 'Pilot'} • {friend.base || 'Base'}
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedChat(friend)}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Search Friends */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-3">Find Crew Members</h3>
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
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderStatsView = () => {
    return (
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
                  <div className="text-3xl font-bold">{schedule?.flights?.length || 0}</div>
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
                    {schedule?.flights?.filter(f => f.hotel).length || 0}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Hotel stays</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderFamilyView = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Family Access</CardTitle>
          <CardDescription>Share your schedule with family members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Generate Access Code */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Create New Access Code</h3>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Family member name"
                  value={newFamilyMemberName}
                  onChange={(e) => setNewFamilyMemberName(e.target.value)}
                />
                <Button onClick={() => {
                  if (newFamilyMemberName.trim()) {
                    const newCode = {
                      id: Date.now(),
                      name: newFamilyMemberName,
                      code: Math.random().toString(36).substring(2, 10).toUpperCase(),
                      created: new Date().toISOString()
                    }
                    setFamilyAccessCodes([...familyAccessCodes, newCode])
                    setNewFamilyMemberName('')
                  }
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate
                </Button>
              </div>
            </div>

            {/* Active Codes */}
            {familyAccessCodes.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <h3 className="text-sm font-medium mb-3">Active Access Codes ({familyAccessCodes.length})</h3>
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
    )
  }

  const renderSettingsView = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Manage your account and preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Account Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Account Information</h3>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Account Type</p>
                  <p className="text-sm text-muted-foreground">{userType === 'pilot' ? 'Pilot Account' : 'Family Account'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Airline</p>
                  <p className="text-sm text-muted-foreground">{airline?.toUpperCase()}</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Username</p>
                  <p className="text-sm text-muted-foreground">{username}</p>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-medium">Preferences</h3>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                </div>
                <Button variant="outline" size="icon" onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive schedule updates</p>
                </div>
                <Button variant="outline" size="sm">
                  {settings.notifications ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Auto Refresh</p>
                  <p className="text-sm text-muted-foreground">Automatically refresh schedule</p>
                </div>
                <Button variant="outline" size="sm">
                  {settings.autoRefresh ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </div>

            {/* About */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-medium">About</h3>
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p className="font-medium">Version {APP_VERSION}</p>
                <p className="text-sm text-muted-foreground">
                  Your intelligent crew scheduling companion. Built for ABX and ATI pilots.
                </p>
              </div>
            </div>

            {/* Logout */}
            <Button variant="destructive" className="w-full" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Login Screen - replicate exact structure from App_OLD.jsx
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
            {/* Online/Offline Status */}
            <div className={`text-center text-sm font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? '🟢 Online' : '🔴 Offline'}
            </div>

            {/* Step 1: Airline Selection */}
            {!airline ? (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-2">Select Airline</h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="airline">Choose your airline</Label>
                  <Select onValueChange={(value) => setAirline(value)}>
                    <SelectTrigger id="airline">
                      <SelectValue placeholder="Choose your airline..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="abx">ABX AIR (GB)</SelectItem>
                      <SelectItem value="ati">Air Transport International (8C)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            ) : !accountType ? (
              /* Step 2: Account Type Selection */
              <>
                <div className="flex items-center justify-center p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <span className="text-sm font-medium">✈️ {airline.toUpperCase()}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setAirline(null)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Change Airline
                </Button>
                <div className="space-y-3">
                  <div className="text-center">
                    <h2 className="text-xl font-semibold mb-2">Select Account Type</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline"
                      className="h-auto flex flex-col items-center gap-2 p-4"
                      onClick={() => setAccountType('pilot')}
                    >
                      <Plane className="w-8 h-8" />
                      <div className="text-center">
                        <div className="font-semibold">Pilot</div>
                        <div className="text-xs text-muted-foreground">Full access</div>
                      </div>
                    </Button>
                    <Button 
                      variant="outline"
                      className="h-auto flex flex-col items-center gap-2 p-4"
                      onClick={() => setAccountType('family')}
                    >
                      <Users className="w-8 h-8" />
                      <div className="text-center">
                        <div className="font-semibold">Family</div>
                        <div className="text-xs text-muted-foreground">View only</div>
                      </div>
                    </Button>
                  </div>
                </div>
              </>

            ) : (
              /* Step 3: Login Form */
              <>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <div className="flex items-center px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-sm">
                    ✈️ {airline.toUpperCase()}
                  </div>
                  <div className="flex items-center px-3 py-1.5 bg-secondary/10 border border-secondary/20 rounded-lg text-sm">
                    {accountType === 'pilot' ? '✈️ Pilot Login' : '👨‍👩‍👧‍👦 Family Login'}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setAccountType(null)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Change Account Type
                </Button>
                <form onSubmit={handleLogin} className="space-y-4">
                  {accountType === 'pilot' ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="username">Employee Number or Username</Label>
                        <Input
                          id="username"
                          type="text"
                          placeholder="Enter your employee number"
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
                          placeholder="Enter your password"
                          value={credentials.password}
                          onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="username">Access Code</Label>
                        <Input
                          id="username"
                          type="text"
                          placeholder="Access Code (provided by pilot)"
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
                          placeholder="Enter your password"
                          value={credentials.password}
                          onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                          required
                        />
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300 text-sm">
                        <Info className="w-4 h-4 flex-shrink-0" />
                        <span>Family accounts have limited access - no crew info or friends list</span>
                      </div>
                    </>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{error}</span>
                    </div>
                  )}

                  {!isOnline && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-300 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>You must be online to login</span>
                    </div>
                  )}

                  <Button type="submit" className="w-full" size="lg" disabled={loading || !isOnline}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      'Login'
                    )}
                  </Button>
                </form>
              </>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-2 text-center text-xs text-muted-foreground">
            <p>Your credentials are encrypted and never stored on our servers</p>
            <p className="font-medium">v{APP_VERSION}</p>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Main App - replicate structure from App_OLD.jsx
  return (
    <div className={`min-h-screen bg-background ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Header from App_OLD.jsx lines 1083-1094 */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Plane className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">FlightRosterIQ</h1>
              <p className="text-xs text-muted-foreground">{airline?.toUpperCase()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`text-sm ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? '🟢' : '🔴'}
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => fetchSchedule()}
              disabled={loading || !isOnline}
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area - conditional rendering based on activeTab from App_OLD.jsx lines 1096-1305 */}
      <main className="container mx-auto px-4 py-6 pb-24">
        {activeTab === 'monthly' && renderMonthlyView()}
        {activeTab === 'daily' && renderDailyView()}
        {activeTab === 'friends' && renderFriendsView()}
        {activeTab === 'stats' && renderStatsView()}
        {activeTab === 'family' && renderFamilyView()}
        {activeTab === 'settings' && renderSettingsView()}
      </main>

      {/* Bottom Navigation from App_OLD.jsx lines 1309-1340 */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => setActiveTab('monthly')}
              className={`flex flex-col items-center justify-center py-3 px-2 transition-colors ${
                activeTab === 'monthly'
                  ? 'text-primary border-t-2 border-primary -mt-[2px]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Monthly</span>
            </button>
            <button
              onClick={() => setActiveTab('daily')}
              className={`flex flex-col items-center justify-center py-3 px-2 transition-colors ${
                activeTab === 'daily'
                  ? 'text-primary border-t-2 border-primary -mt-[2px]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarDays className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Daily</span>
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex flex-col items-center justify-center py-3 px-2 transition-colors ${
                activeTab === 'friends'
                  ? 'text-primary border-t-2 border-primary -mt-[2px]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Friends</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center justify-center py-3 px-2 transition-colors ${
                activeTab === 'settings'
                  ? 'text-primary border-t-2 border-primary -mt-[2px]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <SettingsIcon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Settings</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  )
}

export default App
