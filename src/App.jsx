import { useState, useEffect, useMemo } from 'react'
import localforage from 'localforage'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { API_BASE_URL, apiCall } from './config'
import { simpleScrape } from './scrapers/simpleDirectScraper'
import { 
  ThemeProvider, 
  createTheme, 
  Box, 
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Avatar,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Collapse,
  Paper,
  Fade,
  Zoom,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  AppBar,
  Toolbar,
  Tabs,
  Tab,
  BottomNavigation,
  BottomNavigationAction,
  Badge,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  MenuList,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Grid
} from '@mui/material'
import {
  Flight as FlightIcon,
  FamilyRestroom as FamilyIcon,
  ArrowBack as ArrowBackIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  People as PeopleIcon,
  ConnectingAirports as AirlinesIcon,
  ExpandMore as ExpandMoreIcon,
  Lock as LockIcon,
  AccessTime as AccessTimeIcon,
  CalendarMonth as CalendarIcon,
  Today as TodayIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Home as HomeIcon,
  ChatBubble as ChatIcon,
  Group as GroupIcon,
  BarChart as StatsIcon,
  FlightTakeoff as TakeoffIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  SettingsBrightness as SystemThemeIcon,
  Menu as MenuIcon,
  SwapHoriz as SwapIcon,
  EventAvailable as ReserveIcon
} from '@mui/icons-material'

// App Version - Update this with each build
const APP_VERSION = '1.0.3';

// API_BASE_URL and apiCall are now imported from config.js

localforage.config({
  name: 'FlightRosterIQ',
  storeName: 'schedules'
})

function App() {
  const [token, setToken] = useState(null)
  const [username, setUsername] = useState('')
  const [schedule, setSchedule] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [scrapingInProgress, setScrapingInProgress] = useState(false)
  const [serverStatus, setServerStatus] = useState('checking')
  const [error, setError] = useState(null)
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [weatherData, setWeatherData] = useState({})
  const [aircraftData, setAircraftData] = useState({})
  const [activeTab, setActiveTab] = useState('monthly')
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
  const [themePreference, setThemePreference] = useState('light') // 'light', 'dark', or 'system'
  const [showThemeDropdown, setShowThemeDropdown] = useState(false)
  
  // Detect and apply system theme preference
  useEffect(() => {
    const loadThemePreference = async () => {
      const savedPreference = await localforage.getItem('themePreference') || 'light'
      setThemePreference(savedPreference)
      
      if (savedPreference === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        setTheme(systemTheme)
      } else {
        setTheme(savedPreference)
      }
    }
    
    loadThemePreference()
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = (e) => {
      if (themePreference === 'system') {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    
    mediaQuery.addEventListener('change', handleSystemThemeChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [themePreference])
  
  // Material-UI Theme Configuration (Dynamic based on theme state)
  const muiTheme = useMemo(() => createTheme({
    palette: {
      mode: theme,
      primary: {
        main: theme === 'dark' ? '#6B7FFF' : '#4C5FD5',
        contrastText: '#ffffff',
      },
      secondary: {
        main: theme === 'dark' ? '#2A2A3E' : '#ececf0',
        contrastText: theme === 'dark' ? '#E8E8EC' : '#030213',
      },
      background: {
        default: theme === 'dark' ? '#1A1A2E' : '#F5F5F7',
        paper: theme === 'dark' ? '#252538' : '#FAFAFA',
      },
      text: {
        primary: theme === 'dark' ? '#E8E8EC' : '#1F1F2E',
        secondary: theme === 'dark' ? '#9494A8' : '#717182',
      },
      success: {
        main: '#22C55E',
        contrastText: '#ffffff',
      },
      error: {
        main: theme === 'dark' ? '#FF5555' : '#EF4444',
        contrastText: '#ffffff',
      },
      divider: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      h1: {
        fontSize: '1.5rem',
        fontWeight: 500,
        lineHeight: 1.5,
      },
      h2: {
        fontSize: '1.25rem',
        fontWeight: 500,
        lineHeight: 1.5,
      },
      h3: {
        fontSize: '1.125rem',
        fontWeight: 500,
        lineHeight: 1.5,
      },
      h4: {
        fontSize: '1rem',
        fontWeight: 500,
        lineHeight: 1.5,
      },
      h5: {
        fontSize: '0.875rem',
        fontWeight: 500,
        lineHeight: 1.5,
      },
      h6: {
        fontSize: '0.75rem',
        fontWeight: 500,
        lineHeight: 1.5,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: theme === 'dark' 
              ? '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)'
              : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            border: theme === 'dark' 
              ? '1px solid rgba(255, 255, 255, 0.1)' 
              : '1px solid rgba(0, 0, 0, 0.08)',
            transition: 'box-shadow 0.2s',
            '&:hover': {
              boxShadow: theme === 'dark'
                ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
                : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 500,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            fontWeight: 500,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            borderBottom: theme === 'dark' 
              ? '1px solid rgba(255, 255, 255, 0.1)' 
              : '1px solid rgba(0, 0, 0, 0.08)',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
          },
        },
      },
    },
  }), [theme])
  
  const [friendSearch, setFriendSearch] = useState('')
  const [selectedChat, setSelectedChat] = useState(null)
  const [messageInput, setMessageInput] = useState('')
  const [accountType, setAccountType] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [oldVersion, setOldVersion] = useState('')
  const [selectedFlight, setSelectedFlight] = useState(null)
  const [flightDetailTab, setFlightDetailTab] = useState('flight') // 'flight', 'weather', 'crew'
  const [contactMenuOpen, setContactMenuOpen] = useState(null)
  const [weatherAirport, setWeatherAirport] = useState(null)
  const [statsPeriod, setStatsPeriod] = useState('current') // current, previous, ytd
  const [nextDutyCheckIn, setNextDutyCheckIn] = useState(null)
  const [trackedAircraft, setTrackedAircraft] = useState(null)
  const [flightTrackingData, setFlightTrackingData] = useState(null)
  const [settingsTab, setSettingsTab] = useState('pilotInfo')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [chatEditMode, setChatEditMode] = useState(false)
  const [selectedChatsToDelete, setSelectedChatsToDelete] = useState([])
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  
  // Device detection states
  const [deviceType, setDeviceType] = useState('desktop') // 'desktop', 'android', 'ios'
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  
  // Crew Portal Scraper states
  const [scraperCredentials, setScraperCredentials] = useState({ username: '', password: '', airline: 'ABX Air' })
  const [scraperData, setScraperData] = useState(null)
  const [scraperLoading, setScraperLoading] = useState(false)
  const [scraperError, setScraperError] = useState(null)
  const [scrapingStatus, setScrapingStatus] = useState({
    isActive: false,
    currentMonth: null,
    progress: 0,
    totalMonths: 0,
    lastSuccess: null,
    lastError: null,
    retryCount: 0
  })
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
  
  // Mobile enhancement states
  const [touchStartX, setTouchStartX] = useState(0)
  const [showRegistrationPopup, setShowRegistrationPopup] = useState(false)
  const [nickname, setNickname] = useState('')
  const [trialStartDate, setTrialStartDate] = useState(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState('trial') // 'trial', 'active', 'expired'
  const [subscriptionPlan, setSubscriptionPlan] = useState(null) // 'monthly', 'yearly', null
  const [subscriptionExpiry, setSubscriptionExpiry] = useState(null)
  
  // Roster Updates API Integration (ABX Air NetLine/Crew)
  const [rosterUpdates, setRosterUpdates] = useState(null)
  const [lastRosterCheck, setLastRosterCheck] = useState(null)
  const [rosterUpdateAvailable, setRosterUpdateAvailable] = useState(false)
  const [userId, setUserId] = useState(null) // Employee ID from ABX Air system
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [daysRemaining, setDaysRemaining] = useState(30)
  const [familyMemberName, setFamilyMemberName] = useState('')
  const [pushSubscription, setPushSubscription] = useState(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [pilotAirline, setPilotAirline] = useState('')

  // Check for app version updates - both local and server
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const storedVersion = await localforage.getItem('appVersion')
        
        // Check local version mismatch first (after app update)
        if (storedVersion && storedVersion !== APP_VERSION) {
          setOldVersion(storedVersion)
          setShowUpdateModal(true)
          return
        }
        
        // Store current version if first time
        if (!storedVersion) {
          await localforage.setItem('appVersion', APP_VERSION)
        }
        
        // Check server for new deployed version
        const response = await fetch('/version.json?t=' + Date.now())
        if (response.ok) {
          const data = await response.json()
          if (data.version && data.version !== APP_VERSION) {
            console.log(`🔄 New version available: ${data.version} (current: ${APP_VERSION})`)
            setOldVersion(APP_VERSION)
            setShowUpdateModal(true)
          }
        }
      } catch (error) {
        console.log('Version check skipped:', error.message)
      }
    }
    
    // Check on mount
    checkVersion()
    
    // Check every 5 minutes for updates
    const interval = setInterval(checkVersion, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  // Server health check
  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(5000)
        })
        
        if (response.ok) {
          setServerStatus('online')
        } else {
          setServerStatus('offline')
        }
      } catch (error) {
        setServerStatus('offline')
      }
    }

    // Check immediately
    checkServerHealth()

    // Check every 30 seconds
    const interval = setInterval(checkServerHealth, 30000)

    return () => clearInterval(interval)
  }, [])

  // Trigger background scraping when coming back online
  useEffect(() => {
    const handleBackgroundScrape = async () => {
      if (!token) return
      
      // Check if user has credentials stored
      const storedUsername = await localforage.getItem('username')
      const storedPassword = await localforage.getItem('tempPassword')
      const storedAirline = await localforage.getItem('airline')
      const storedUserType = await localforage.getItem('userType')
      
      if (!storedUsername || !storedPassword) return
      
      console.log('🌐 Online status detected - starting background scraping...')
      setScrapingInProgress(true)
      setLoadingMessage('Refreshing schedule in background...')
      
      try {
        let employeeId = storedUsername
        let password = storedPassword
        let airline = storedAirline
        
        // For family accounts, get pilot credentials
        if (storedUserType === 'family') {
          const accessCode = await localforage.getItem('familyAccessCode')
          const codeMapping = await localforage.getItem('familyCodeMapping') || {}
          const memberInfo = codeMapping[accessCode]
          
          if (memberInfo) {
            employeeId = memberInfo.pilotEmployeeId
            password = memberInfo.password
            airline = memberInfo.airline
          }
        }
        
        // Use simple scraper for background refresh with status
        // Pass existing flights so we skip re-scraping months that already have data
        const existingBgFlights = schedule?.flights || []
        console.log(`📊 Background: Passing ${existingBgFlights.length} existing flights to skip cached months`)
        const result = await simpleScrape(employeeId, password, airline || 'abx', (status, progress) => {
          setLoadingMessage(status)
          console.log(`📊 Background: ${progress}% - ${status}`)
        }, (progressiveFlights) => {
          // Progressive update
          if (progressiveFlights && progressiveFlights.length > 0) {
            setSchedule({ flights: progressiveFlights, hotelsByDate: buildHotelsByDate(progressiveFlights) })
          }
        }, existingBgFlights)
        
        // Handle both old format (array) and new format (object with flights and news)
        const flights = Array.isArray(result) ? result : (result.flights || [])
        const news = Array.isArray(result) ? [] : (result.news || [])
        
        if (flights && flights.length > 0) {
          const refreshedSchedule = {
            flights,
            hotelsByDate: buildHotelsByDate(flights)
          }
          setSchedule(refreshedSchedule)
          await localforage.setItem('schedule', refreshedSchedule)
          console.log('✅ Background refresh complete:', flights.length, 'flights')
          
          // Add news to alerts
          if (news.length > 0) {
            const newsAlerts = news.map((item, idx) => ({
              id: `news-${Date.now()}-${idx}`,
              type: 'news',
              title: item.title || 'Crew Portal News',
              message: item.content || item.title || 'New update from crew portal',
              date: item.date || new Date().toISOString(),
              read: false,
              source: 'crew-portal'
            }))
            setScheduleChanges(prev => [...newsAlerts, ...prev])
          }
        }
      } catch (error) {
        console.error('❌ Background scraping error:', error)
      } finally {
        setScrapingInProgress(false)
        setLoadingMessage('')
      }
    }
    
    // Debounce the scraping to avoid multiple triggers
    const timeoutId = setTimeout(() => {
      handleBackgroundScrape()
    }, 2000)
    
    return () => clearTimeout(timeoutId)
  }, [token])

  // Handle auth session expiry
  useEffect(() => {
    const handleAuthRequired = (event) => {
      console.warn('⚠️ [AUTH] Session expired or authentication required')
      
      // Show error notification
      setError('Your session has expired. Please log in again.')
      
      // Clear local data
      setToken(null)
      setSchedule(null)
      setLoggedIn(false)
      
      // Force logout
      handleLogout()
    }
    
    window.addEventListener('netline-auth-required', handleAuthRequired)
    
    return () => {
      window.removeEventListener('netline-auth-required', handleAuthRequired)
    }
  }, [])

  // Close theme dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showThemeDropdown && !event.target.closest('.theme-dropdown-container')) {
        setShowThemeDropdown(false)
      }
    }
    
    if (showThemeDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showThemeDropdown])

  useEffect(() => {
    loadCachedData()
    initializePushNotifications()
    
    // Device Detection
    const detectDevice = () => {
      const ua = navigator.userAgent || navigator.vendor || window.opera
      
      // Detect iOS devices
      if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
        setDeviceType('ios')
        setIsMobile(/iPhone|iPod/.test(ua))
        setIsTablet(/iPad/.test(ua))
        document.documentElement.classList.add('ios-device')
        
        // Set iOS-specific viewport
        const viewport = document.querySelector('meta[name=viewport]')
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover')
        }
      }
      // Detect Android devices
      else if (/android/i.test(ua)) {
        setDeviceType('android')
        setIsMobile(!/tablet/i.test(ua))
        setIsTablet(/tablet/i.test(ua))
        document.documentElement.classList.add('android-device')
        
        // Set Android-specific viewport
        const viewport = document.querySelector('meta[name=viewport]')
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
        }
      }
      // Desktop
      else {
        setDeviceType('desktop')
        setIsMobile(false)
        setIsTablet(false)
        document.documentElement.classList.add('desktop-device')
      }
      
      // Detect mobile vs tablet by screen size if user agent is ambiguous
      const handleResize = () => {
        const width = window.innerWidth
        if (width <= 768) {
          setIsMobile(true)
          setIsTablet(false)
          document.documentElement.classList.add('mobile-view')
          document.documentElement.classList.remove('tablet-view', 'desktop-view')
        } else if (width <= 1024) {
          setIsMobile(false)
          setIsTablet(true)
          document.documentElement.classList.add('tablet-view')
          document.documentElement.classList.remove('mobile-view', 'desktop-view')
        } else {
          setIsMobile(false)
          setIsTablet(false)
          document.documentElement.classList.add('desktop-view')
          document.documentElement.classList.remove('mobile-view', 'tablet-view')
        }
      }
      
      handleResize()
      window.addEventListener('resize', handleResize)
      
      return () => window.removeEventListener('resize', handleResize)
    }
    
    detectDevice()
    
    // PWA Install Prompt Handler
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Disable mouse wheel scrolling for month navigation (use buttons only)
    const handleWheel = (e) => {
      // Only prevent scrolling on the monthly calendar view
      if (activeTab === 'monthly' && e.target.closest('.calendar-container')) {
        e.preventDefault()
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('wheel', handleWheel)
    }
  }, [])

  // Reset flight detail tab when modal opens
  useEffect(() => {
    if (selectedFlight) {
      setFlightDetailTab('flight')
    }
  }, [selectedFlight])

  // Check trial status and days remaining
  useEffect(() => {
    const checkTrialStatus = async () => {
      if (!token) return
      
      // Family accounts are free - skip subscription checks
      if (userType === 'family') {
        return
      }
      
      let trialStart = trialStartDate
      
      // If no trial start date, this is a new user - set it now
      if (!trialStart) {
        trialStart = new Date().toISOString()
        setTrialStartDate(trialStart)
        await localforage.setItem('trialStartDate', trialStart)
      }
      
      const startDate = new Date(trialStart)
      const now = new Date()
      const daysElapsed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24))
      const remaining = 30 - daysElapsed
      
      setDaysRemaining(remaining)
      
      // Check subscription status
      if (subscriptionStatus === 'active') {
        // User has paid subscription, check if expired
        if (subscriptionExpiry) {
          const expiryDate = new Date(subscriptionExpiry)
          if (now > expiryDate) {
            setSubscriptionStatus('expired')
            await localforage.setItem('subscriptionStatus', 'expired')
            setShowSubscriptionModal(true)
          }
        }
        return
      }
      
      if (remaining <= 0 && subscriptionStatus !== 'active') {
        // Trial expired, show subscription modal
        setSubscriptionStatus('expired')
        await localforage.setItem('subscriptionStatus', 'expired')
        setShowSubscriptionModal(true)
      } else if (remaining <= 3 && subscriptionStatus === 'trial') {
        // Show warning when 3 or fewer days remain
        console.log(`⚠️ Trial ending soon: ${remaining} days remaining`)
      }
    }
    
    checkTrialStatus()
  }, [token, trialStartDate, subscriptionStatus, subscriptionExpiry, userType])

  // Calculate next duty report time (when pilot needs to check in for duty)
  
  // Helper function to build hotelsByDate from flights array
  const buildHotelsByDate = (flights) => {
    const hotelsByDate = {}
    if (!flights || !Array.isArray(flights)) return hotelsByDate
    
    flights.forEach(flight => {
      if (flight.hotels && flight.hotels.length > 0) {
        const date = flight.date
        if (!hotelsByDate[date]) {
          hotelsByDate[date] = []
        }
        flight.hotels.forEach(hotel => {
          // Avoid duplicates
          const exists = hotelsByDate[date].some(h => h.name === hotel.name)
          if (!exists) {
            hotelsByDate[date].push({
              name: hotel.name || 'Unknown Hotel',
              phone: hotel.phone || null,
              address: hotel.address || null,
              location: hotel.address || hotel.location || flight.destination || ''
            })
          }
        })
      }
    })
    
    console.log('🏨 Built hotelsByDate:', Object.keys(hotelsByDate).length, 'dates with hotels')
    return hotelsByDate
  }
  
  useEffect(() => {
    if (!schedule?.flights || schedule.flights.length === 0) {
      setNextDutyCheckIn(null)
      return
    }

    const now = new Date()
    const upcomingFlights = schedule.flights
      .filter(f => {
        // Only consider flights with scheduled time report
        if (!f.timeReport) return false
        
        // Parse the flight date and time report
        const dateStr = f.date
        const timeReportStr = f.timeReport
        
        // Check if time report has LT time
        const ltMatch = timeReportStr.match(/LT:(\d{2})(\d{2})/)
        if (!ltMatch) return false
        
        const hours = parseInt(ltMatch[1])
        const minutes = parseInt(ltMatch[2])
        const reportDateTime = new Date(dateStr)
        reportDateTime.setHours(hours, minutes, 0, 0)
        
        return reportDateTime > now
      })
      .sort((a, b) => {
        const aTime = new Date(a.date)
        const aMatch = a.timeReport.match(/LT:(\d{2})(\d{2})/)
        if (aMatch) {
          aTime.setHours(parseInt(aMatch[1]), parseInt(aMatch[2]), 0, 0)
        }
        
        const bTime = new Date(b.date)
        const bMatch = b.timeReport.match(/LT:(\d{2})(\d{2})/)
        if (bMatch) {
          bTime.setHours(parseInt(bMatch[1]), parseInt(bMatch[2]), 0, 0)
        }
        
        return aTime - bTime
      })

    if (upcomingFlights.length > 0) {
      const nextFlight = upcomingFlights[0]
      const reportDateTime = new Date(nextFlight.date)
      const ltMatch = nextFlight.timeReport.match(/LT:(\d{2})(\d{2})/)
      if (ltMatch) {
        reportDateTime.setHours(parseInt(ltMatch[1]), parseInt(ltMatch[2]), 0, 0)
        setNextDutyCheckIn(reportDateTime)
      }
    } else {
      setNextDutyCheckIn(null)
    }
  }, [schedule])

  // Poll for roster updates every 5 minutes when logged in
  useEffect(() => {
    if (!token) return

    // Initial check
    checkRosterUpdates()

    // Set up polling interval (5 minutes)
    const interval = setInterval(() => {
      if (settings.autoRefresh) {
        checkRosterUpdates()
      }
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [token, settings.autoRefresh])

  const fetchSubscriptionStatus = async (employeeId) => {
    try {
      const response = await apiCall('/api/subscription/status', {
        method: 'POST',
        body: JSON.stringify({ employeeId })
      })
      
      // Only update if backend returns valid data
      if (response.ok) {
        const data = await response.json()
        if (data.subscription) {
          const { status, plan, expiryDate } = data.subscription
          setSubscriptionStatus(status)
          setSubscriptionPlan(plan)
          setSubscriptionExpiry(expiryDate)
          
          await localforage.setItem('subscriptionStatus', status)
          await localforage.setItem('subscriptionPlan', plan)
          await localforage.setItem('subscriptionExpiry', expiryDate)
        }
      }
    } catch (error) {
      // Silently fail - endpoint not implemented yet, using local storage only
      console.log('Subscription API not available, using local data')
    }
  }

  const loadCachedData = async () => {
    try {
      const cachedToken = await localforage.getItem('authToken')
      const cachedSchedule = await localforage.getItem('schedule')
      console.log('🔍 Loading cached data...')
      console.log('🔍 cachedSchedule from localforage:', cachedSchedule)
      console.log('🔍 cachedSchedule.flights:', cachedSchedule?.flights)
      console.log('🔍 cachedSchedule.flights length:', cachedSchedule?.flights?.length)
      const cachedFriends = await localforage.getItem('friends')
      const cachedSettings = await localforage.getItem('settings')
      const cachedThemePreference = await localforage.getItem('themePreference')
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
      const cachedTrialStart = await localforage.getItem('trialStartDate')
      const cachedSubscription = await localforage.getItem('subscriptionStatus')
      const cachedSubscriptionPlan = await localforage.getItem('subscriptionPlan')
      const cachedSubscriptionExpiry = await localforage.getItem('subscriptionExpiry')
      
      if (cachedToken) setToken(cachedToken)
      if (cachedSchedule) {
        console.log('✅ Setting schedule from cached data:', cachedSchedule)
        setSchedule(cachedSchedule)
      }
      if (cachedFriends) setFriends(cachedFriends)
      if (cachedSettings) setSettings(cachedSettings)
      if (cachedThemePreference) {
        setThemePreference(cachedThemePreference)
        if (cachedThemePreference === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
          setTheme(systemTheme)
        } else {
          setTheme(cachedThemePreference)
        }
      }
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
      if (cachedTrialStart) setTrialStartDate(cachedTrialStart)
      if (cachedSubscription) setSubscriptionStatus(cachedSubscription)
      if (cachedSubscriptionPlan) setSubscriptionPlan(cachedSubscriptionPlan)
      if (cachedSubscriptionExpiry) setSubscriptionExpiry(cachedSubscriptionExpiry)
      
      // Load userId for roster updates
      const cachedUserId = await localforage.getItem('userId')
      if (cachedUserId) {
        setUserId(cachedUserId)
        console.log(`👤 Restored user ID for roster updates: ${cachedUserId}`)
      }
      
      // Fetch subscription status from server on load
      if (cachedToken && cachedUsername) {
        fetchSubscriptionStatus(cachedUsername)
      }
      
      // Load pilot profile and geolocation
      const cachedProfile = await localforage.getItem('pilotProfile')
      const cachedLocation = await localforage.getItem('userLocation')
      if (cachedProfile) setPilotProfile(cachedProfile)
      if (cachedLocation) setUserLocation(cachedLocation)
      
      // Load family codes from server for pilot accounts
      if (cachedToken && cachedUserType === 'pilot' && cachedUsername) {
        try {
          console.log('📋 Loading family codes from server...')
          const response = await apiCall(`/api/family/get-codes/${encodeURIComponent(cachedUsername)}`, {
            method: 'GET'
          })
          
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.codes) {
              // Transform server format to local format
              const transformedCodes = result.codes.map(c => ({
                id: c.code, // Use code as id since server doesn't store id
                name: c.familyMemberName,
                code: c.code,
                createdAt: c.createdAt,
                pilotUsername: cachedUsername,
                pilotEmployeeId: cachedUsername,
                airline: c.airline
              }))
              setFamilyAccessCodes(transformedCodes)
              await localforage.setItem('familyAccessCodes', transformedCodes)
              console.log(`✅ Loaded ${transformedCodes.length} family codes from server`)
            }
          }
        } catch (error) {
          console.log('⚠️ Could not load family codes from server:', error.message)
        }
      }
      
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

  // Touch handler for month navigation (swipe left/right)
  const handleTouchStart = (e) => {
    if (activeTab === 'monthly') {
      setTouchStartX(e.touches[0].clientX)
    }
  }

  const handleTouchMove = (e) => {
    if (!touchStartX || activeTab !== 'monthly') return
    
    const touchX = e.touches[0].clientX
    const deltaX = touchX - touchStartX
    
    // Swipe for month navigation (horizontal swipe)
    if (Math.abs(deltaX) > 100) {
      if (deltaX > 0) {
        // Swipe right - go to previous month
        goToPreviousMonth()
        setTouchStartX(0)
      } else {
        // Swipe left - go to next month
        goToNextMonth()
        setTouchStartX(0)
      }
    }
  }

  const handleTouchEnd = () => {
    setTouchStartX(0)
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
          console.log('📡 Sending authentication request to:', '/api/authenticate')
          const authResponse = await apiCall('/api/authenticate', {
            method: 'POST',
            body: JSON.stringify({
              airline: airline || 'abx', // Default to ABX Air
              employeeId: username,
              password: password
            })
          })
          
          console.log('📥 Authentication response status:', authResponse.status)
          const authResult = await authResponse.json()
          console.log('📥 Authentication result:', { 
            success: authResult.success, 
            credentialsValid: authResult.credentialsValid,
            error: authResult.error,
            hasMessage: !!authResult.message 
          })
          
          // Check the validation response
          if (authResponse.status === 401) {
            // Credentials were definitely rejected
            console.error('❌ 401 Unauthorized - Invalid credentials')
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
            console.error('❌ Authentication failed:', authResult.error)
            setError(`Authentication failed: ${authResult.error}`)
            setLoading(false)
            return
          }
          
        } catch (authError) {
          console.error('Authentication error:', authError)
          console.error('Error details:', {
            message: authError.message,
            type: authError.name,
            stack: authError.stack
          })
          
          // Provide more specific error messages
          if (!navigator.onLine) {
            setError('No internet connection. Please check your network and try again.')
          } else if (authError.message && (authError.message.includes('fetch') || authError.message.includes('Failed to fetch'))) {
            setError(`Cannot connect to authentication server. Error: ${authError.message}`)
          } else if (authError.message && authError.message.includes('timeout')) {
            setError('Connection timeout. The crew portal is taking too long to respond. Please try again.')
          } else if (authError.name === 'TypeError') {
            setError(`Network error: ${authError.message}. The server may be temporarily unavailable.`)
          } else {
            setError(`Unable to validate credentials: ${authError.message || 'Unknown error'}. Please try again.`)
          }
          
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
        
        // Validate the family access code with the server
        console.log('🔐 Validating family access code...')
        setLoadingMessage('Validating family access code...')
        
        try {
          const authResponse = await apiCall('/api/family/validate-code', {
            method: 'POST',
            body: JSON.stringify({
              code: accessCode
            })
          })
          
          const authResult = await authResponse.json()
          
          if (!authResult.success) {
            console.error('❌ Invalid family access code')
            setError('Invalid family access code. Please check the code and try again.')
            setLoading(false)
            return
          }
          
          // Store the validated family member info from server
          // Response format: { success, pilotId, familyMemberName, airline, password }
          const codeMapping = await localforage.getItem('familyCodeMapping') || {}
          codeMapping[accessCode] = {
            name: authResult.familyMemberName,
            pilotName: authResult.pilotId,
            pilot: authResult.pilotId,
            airline: authResult.airline || 'abx',
            pilotEmployeeId: authResult.pilotId,
            password: authResult.password
          }
          await localforage.setItem('familyCodeMapping', codeMapping)
          
          console.log(`✅ Family code validated - Pilot: ${authResult.pilotId}, Member: ${authResult.familyMemberName}`)
          
          console.log('✅ Family access code validated successfully')
          
        } catch (authError) {
          console.error('Family code validation error:', authError)
          setError('Unable to validate family access code. Please check your internet connection and try again.')
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
      
      // Store userId (employee ID) for roster updates API
      if (accountType === 'pilot' && credentials.username.trim()) {
        const employeeId = credentials.username.trim()
        setUserId(employeeId)
        await localforage.setItem('userId', employeeId)
        console.log(`👤 User ID stored for roster updates: ${employeeId}`)
        
        // Note: Roster loading moved to after login success (see below)
      }
      
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
      
      // Stop loading immediately and show the app
      setLoading(false)
      setLoadingMessage('')
      
      // Set active tab to monthly view immediately
      setActiveTab('monthly')
      
      // ✅ SIMPLE SCRAPER: Puppeteer HTML scraping with detailed status
      if (accountType === 'pilot') {
        console.log('✅ [LOGIN] Pilot account - starting Puppeteer scraper...')
        setScrapingInProgress(true)
        setLoadingMessage('Connecting to crew portal...')
        
        try {
          const result = await simpleScrape(
            credentials.username.trim(),
            credentials.password,
            airline || 'abx',
            // Progress callback
            (status, progress) => {
              setLoadingMessage(status)
              console.log(`📊 Progress: ${progress}% - ${status}`)
            },
            // Progressive flights update callback - show flights as they come in
            (flights) => {
              console.log(`📤 [LOGIN] Progressive update: ${flights.length} flights`)
              const progressiveSchedule = {
                flights,
                hotelsByDate: buildHotelsByDate(flights)
              }
              setSchedule(progressiveSchedule)
            }
          )
          
          // Handle both old format (array) and new format (object with flights and news)
          const flights = Array.isArray(result) ? result : (result.flights || [])
          const news = Array.isArray(result) ? [] : (result.news || [])
          
          console.log('✅ [LOGIN] Received', flights.length, 'flights,', news.length, 'news items')
          
          // Add news to alerts
          if (news.length > 0) {
            const newsAlerts = news.map((item, idx) => ({
              id: `news-${Date.now()}-${idx}`,
              type: 'news',
              title: item.title || 'Crew Portal News',
              message: item.content || item.title || 'New update from crew portal',
              date: item.date || new Date().toISOString(),
              read: false,
              source: 'crew-portal'
            }))
            setScheduleChanges(prev => [...newsAlerts, ...prev])
            console.log('📰 Added', newsAlerts.length, 'news items to alerts')
          }
          
          if (!flights || flights.length === 0) {
            console.warn('⚠️ [LOGIN] No flights returned')
            setScrapingInProgress(false)
            setLoadingMessage('')
            setError('No schedule data found')
            return
          }
          
          // Backend returns flights directly, no transformation needed
          const transformedSchedule = {
            flights,
            hotelsByDate: buildHotelsByDate(flights)
          }
          
          console.log('✅ [LOGIN] Schedule ready with', flights.length, 'flights')
          setSchedule(transformedSchedule)
          setScrapingInProgress(false)
          setLoadingMessage('Schedule loaded successfully!')
          
          // Cache the schedule
          await localforage.setItem('schedule', transformedSchedule)
          console.log('✅ [LOGIN] Schedule cached successfully')
          
          // Clear success message after 2 seconds
          setTimeout(() => setLoadingMessage(''), 2000)
          
        } catch (err) {
          console.error('❌ [LOGIN] Scraping failed:', err)
          setScrapingInProgress(false)
          setLoadingMessage('')
          setError('Failed to load schedule: ' + err.message)
        }
      } else if (accountType === 'family' && memberInfo) {
        // ✅ SIMPLE SCRAPER: Load roster for family member
        console.log('✅ [LOGIN] Family account detected, starting roster load...')
        console.log('✅ [LOGIN] Pilot Employee ID:', memberInfo.pilotEmployeeId)
        setScrapingInProgress(true)
        
        // Use the new adapter to load roster with pilot's employee ID
        console.log('✅ [LOGIN] Calling getRosterWithBackgroundSync...')
        getRosterWithBackgroundSync(memberInfo.pilotEmployeeId, duties => {
          console.log('✅ [LOGIN] Adapter callback fired with duties:', duties.length)
          console.log('[FRIQ] Duties received for family member:', duties)
          
          // Transform duties to the format expected by the app
          // Each duty can have multiple legs, create a flight entry for each leg
          const flights = []
          duties.forEach(duty => {
            // For each leg in the duty, create a flight entry
            duty.legs.forEach((leg, legIndex) => {
              const legDate = leg.departUtc ? leg.departUtc.split('T')[0] : duty.startUtc.split('T')[0]
              flights.push({
                id: `${duty.logicalId}_leg${legIndex}`,
                flightNumber: leg.flightNumber || duty.pairing || 'Unknown',
                pairingId: duty.pairing,
                date: legDate,
                origin: leg.from || 'Unknown',
                destination: leg.to || 'Unknown',
                departure: leg.departUtc || duty.startUtc,
                arrival: leg.arriveUtc || duty.endUtc,
                aircraft: leg.aircraft || 'Unknown',
                aircraftType: leg.aircraft || 'Unknown',
                tailNumber: leg.tail || '',
                tail: leg.tail || '',
                status: 'Confirmed',
                rank: 'FO',
                crewMembers: duty.crew || [],
                hotels: duty.hotel ? [{ name: duty.hotel }] : [],
                isCodeshare: false,
                operatingAirline: null,
                actualDeparture: null,
                actualArrival: null,
                isDeadhead: leg.deadhead || false,
                isReserveDuty: duty.type === 'OTHER',
                isTraining: duty.type === 'TRAINING',
                dutyType: duty.type,
                legNumber: legIndex + 1,
                totalLegs: duty.legs.length
              })
            })
            
            // If no legs but duty exists (training/reserve), create a duty entry
            if (!duty.legs || duty.legs.length === 0) {
              flights.push({
                id: duty.logicalId,
                flightNumber: duty.pairing || 'Unknown',
                pairingId: duty.pairing,
                date: duty.startUtc.split('T')[0],
                origin: 'Base',
                destination: 'Base',
                departure: duty.startUtc,
                arrival: duty.endUtc,
                aircraft: 'N/A',
                aircraftType: 'N/A',
                tailNumber: '',
                tail: '',
                status: 'Confirmed',
                rank: 'FO',
                crewMembers: duty.crew || [],
                hotels: duty.hotel ? [{ name: duty.hotel }] : [],
                isCodeshare: false,
                operatingAirline: null,
                actualDeparture: null,
                actualArrival: null,
                isDeadhead: false,
                isReserveDuty: duty.type === 'OTHER',
                isTraining: duty.type === 'TRAINING',
                dutyType: duty.type
              })
            }
          })
          
          const transformedSchedule = {
            flights,
            hotelsByDate: buildHotelsByDate(flights)
          }
          
          setSchedule(transformedSchedule)
          setScrapingInProgress(false)
          
          // Cache the schedule
          const currentMonth = new Date().getMonth() + 1
          const currentYear = new Date().getFullYear()
          const cacheKey = `schedule_${currentYear}_${String(currentMonth).padStart(2, '0')}`
          localforage.setItem(cacheKey, transformedSchedule)
          console.log('✅ Family schedule loaded via NetLine API')
        })
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

  // Check for roster updates from ABX Air NetLine/Crew API
  const checkRosterUpdates = async () => {
    if (!token) {
      console.log('⏸️ Skipping roster update check - not logged in')
      return
    }

    try {
      console.log(`🔍 Checking roster updates for authenticated user`)
      
      const response = await apiCall('/api/roster-updates', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      
      if (data.success && data.result) {
        setRosterUpdates(data.result)
        setLastRosterCheck(new Date().toISOString())
        
        // Check if there are roster changes
        const hasRosterUpdate = data.result.roster === true
        const hasCheckIns = data.result.checkins && data.result.checkins.length > 0
        const lastChange = data.result.lastRosterChange
        
        if (hasRosterUpdate || hasCheckIns) {
          setRosterUpdateAvailable(true)
          console.log('✨ Roster update available:', {
            roster: hasRosterUpdate,
            checkIns: hasCheckIns,
            lastChange: lastChange
          })
          
          // Show notification if enabled
          if (settings.notifications && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Schedule Update Available', {
              body: hasRosterUpdate ? 'Your flight schedule has been updated' : 'New report time information available',
              icon: '/icons/android/android-launchericon-192-192.png',
              badge: '/icons/android/android-launchericon-96-96.png'
            })
          }
          
          // Add to schedule changes
          const changeMessage = hasRosterUpdate 
            ? `Roster updated on ${new Date(lastChange).toLocaleString()}`
            : `New report time information (${hasCheckIns} items)`
          
          setScheduleChanges(prev => [{
            type: 'schedule',
            message: changeMessage,
            date: new Date().toISOString(),
            read: false,
            flightNumber: null
          }, ...prev])
        } else {
          setRosterUpdateAvailable(false)
          console.log('✅ Roster is up to date')
        }
        
        // Store last check timestamps
        await localforage.setItem('lastRosterCheck', new Date().toISOString())
        await localforage.setItem('lastKnownRosterChange', lastChange)
        
      } else {
        console.error('❌ Failed to check roster updates:', data.error)
      }
    } catch (err) {
      console.error('❌ Error checking roster updates:', err)
      // Don't show error to user for background checks
    }
  }

  // Fetch full roster data when updates are detected
  const fetchRosterData = async () => {
    if (!token) {
      setError('Please login to fetch roster')
      return
    }

    setLoading(true)
    setLoadingMessage('Fetching updated roster from crew portal...')

    try {
      const response = await apiCall('/api/roster', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      
      if (data.success && data.roster) {
        // Update schedule with new roster data
        setSchedule(data.roster)
        await localforage.setItem('schedule', data.roster)
        
        // Clear update flag
        setRosterUpdateAvailable(false)
        
        // Mark schedule changes as read
        setScheduleChanges(prev => prev.map(change => ({ ...change, read: true })))
        
        console.log('✅ Roster data updated successfully')
      } else {
        setError(data.error || 'Failed to fetch roster data')
      }
    } catch (err) {
      setError('Failed to fetch roster data')
      console.error('Fetch roster error:', err)
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
      
      // Request with high accuracy and timeout
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: Date.now()
          }
          setUserLocation(location)
          localforage.setItem('userLocation', location)
          console.log('✅ Location permission granted:', location)
        },
        (error) => {
          console.error('Geolocation error:', error)
          let errorMessage = 'Unable to get location'
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location permission denied. Please enable location access in your browser settings."
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information unavailable."
              break
            case error.TIMEOUT:
              errorMessage = "Location request timed out."
              break
          }
          
          alert('📍 ' + errorMessage)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    } else {
      alert('📍 Geolocation is not supported by your browser')
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
        
        // Always update UI state regardless of backend response
        setIsRegisteredUser(false)
        await localforage.setItem('isRegisteredUser', false)
        setShowRegistrationPopup(false)
      } catch (err) {
        console.error('Unregister error:', err)
        // Still update UI even on error
        setIsRegisteredUser(false)
        await localforage.setItem('isRegisteredUser', false)
        setShowRegistrationPopup(false)
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

  const dismissScheduleChange = async (index) => {
    // Remove the notification from the list
    const notification = scheduleChanges[index]
    setScheduleChanges(prev => prev.filter((_, i) => i !== index))
    
    // Optionally send dismissal to backend
    try {
      await apiCall('/api/notifications/dismiss', {
        method: 'POST',
        body: JSON.stringify({ notificationId: notification.id || index })
      })
      console.log('✅ Notification dismissed and synced with server')
    } catch (error) {
      console.log('⚠️ Could not sync dismissal with server (offline or server unavailable)')
    }
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

  const handleUpdateApp = async () => {
    try {
      // Store new version
      await localforage.setItem('appVersion', APP_VERSION)
      
      // Clear cache and reload
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)))
      }
      
      // Force reload from server
      window.location.reload(true)
    } catch (error) {
      console.error('Error updating app:', error)
      // Fallback: just reload
      window.location.reload()
    }
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
    try {
      // Send acceptance to crew portal backend
      const response = await apiCall('/api/notifications/accept', {
        method: 'POST',
        body: JSON.stringify({ 
          notificationId: notification.id || index,
          message: notification.message,
          type: notification.type,
          date: notification.date
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Notification accepted and sent to crew portal:', result)
        
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

        // Show success message
        setScheduleChanges(prev => [
          {
            type: 'general',
            message: `✅ Notification accepted: ${notification.message}`,
            date: new Date().toISOString(),
            read: false
          },
          ...prev.filter((_, i) => i !== index)
        ])
      } else {
        throw new Error('Failed to accept notification')
      }
    } catch (error) {
      console.error('Error accepting notification:', error)
      alert(`⚠️ Could not send acceptance to crew portal.\nYou may be offline or the server is unavailable.\n\nThe notification has been accepted locally.`)
      
      // Still remove notification locally even if backend fails
      setScheduleChanges(prev => prev.filter((_, i) => i !== index))
    }
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
      const storedPassword = await localforage.getItem('tempPassword')
      
      if (!storedPassword) {
        alert('Unable to generate code. Please log out and log back in.')
        return
      }

      const response = await apiCall('/api/family/generate-code', {
        method: 'POST',
        body: JSON.stringify({
          pilotId: username,
          familyMemberName: newFamilyMemberName.trim(),
          airline: airline,
          password: storedPassword
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
        
        setNewFamilyMemberName('')
        
        // Save to local storage
        await localforage.setItem('familyAccessCodes', updatedCodes)
        
        console.log(`✅ Family code generated and stored on server: ${data.code}`)
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
      const trimmedName = editedName.trim()
      
      // Update pilot profile
      const updatedProfile = { ...pilotProfile, name: trimmedName }
      setPilotProfile(updatedProfile)
      await localforage.setItem('pilotProfile', updatedProfile)
      
      // Update nickname for header display
      setNickname(trimmedName)
      await localforage.setItem('nickname', trimmedName)
      
      // Update family code mappings so family members see the new name
      const codeMapping = await localforage.getItem('familyCodeMapping') || {}
      const currentEmployeeId = pilotProfile?.employeeId || username
      
      // Update all codes that belong to this pilot
      for (const code in codeMapping) {
        if (codeMapping[code].pilotEmployeeId === currentEmployeeId) {
          codeMapping[code].pilotName = trimmedName
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
          method: 'DELETE',
          body: JSON.stringify({ pilotId: username })
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
  // ❌ DEPRECATED: Old Puppeteer-based scraping - replaced by NetLine API adapter
  const handleMultiMonthScraping = async (employeeId, password, airline, isFirstLogin = false) => {
    console.warn('⚠️ DEPRECATED: handleMultiMonthScraping is no longer used. Use getRosterWithBackgroundSync instead.')
    return
    /* COMMENTED OUT - OLD SCRAPING CODE
    console.log('🚀 MULTI-MONTH SCRAPING: Starting crew portal scraping...')
    console.log(`📋 First login: ${isFirstLogin}`)
    
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    
    // Calculate previous month (properly handle year transition)
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonth = prevDate.getMonth() + 1
    const previousYear = prevDate.getFullYear()
    
    // Calculate next month (properly handle year transition)
    const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nextMonth = nextDate.getMonth() + 1
    const nextYear = nextDate.getFullYear()
    
    console.log(`📅 Scraping plan:`)
    console.log(`   - Previous: ${previousYear}-${String(previousMonth).padStart(2, '0')} ${isFirstLogin ? '(first login only)' : '(skip - should be cached)'}`)
    console.log(`   - Current: ${currentYear}-${String(currentMonth).padStart(2, '0')}`)
    console.log(`   - Next: ${nextYear}-${String(nextMonth).padStart(2, '0')}`)
    
    const monthsToScrape = []
    
    // Always scrape all 3 months (previous, current, next)
    monthsToScrape.push({ month: previousMonth, year: previousYear, label: 'Previous Month' })
    monthsToScrape.push({ month: currentMonth, year: currentYear, label: 'Current Month' })
    monthsToScrape.push({ month: nextMonth, year: nextYear, label: 'Next Month' })
    
    // Update scraping status
    setScrapingStatus(prev => ({
      ...prev,
      isActive: true,
      totalMonths: monthsToScrape.length,
      progress: 0,
      currentMonth: null
    }))
    
    for (const { month, year, label } of monthsToScrape) {
      try {
        console.log(`📅 Scraping ${label}: ${year}-${String(month).padStart(2, '0')}...`)
        setLoadingMessage(`Loading ${label} (${year}-${String(month).padStart(2, '0')})...`)
        
        // Update progress
        const currentIndex = monthsToScrape.findIndex(m => m.label === label)
        setScrapingStatus(prev => ({
          ...prev,
          currentMonth: `${year}-${String(month).padStart(2, '0')}`,
          progress: Math.round(((currentIndex + 1) / monthsToScrape.length) * 100)
        }))
        
        await handleAutomaticScraping(employeeId, password, airline, month, year, isFirstLogin && label === 'Current Month')
        
        console.log(`✅ Successfully scraped ${label}`)
        
        // Update last success
        setScrapingStatus(prev => ({
          ...prev,
          lastSuccess: new Date().toISOString(),
          lastError: null,
          retryCount: 0
        }))
        
        // Small delay between scrapes to avoid overwhelming the server
        if (label !== 'Next Month') {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (error) {
        console.error(`❌ Failed to scrape ${label}:`, error)
        
        // Update error status
        setScrapingStatus(prev => ({
          ...prev,
          lastError: `${label}: ${error.message}`,
          retryCount: prev.retryCount + 1
        }))
        
        // Continue with next month even if one fails
      }
    }
    
    // Mark scraping as complete
    setScrapingStatus(prev => ({
      ...prev,
      isActive: false,
      progress: 100
    }))
    
    setScrapingInProgress(false)
    setLoadingMessage('')
    console.log('✅ MULTI-MONTH SCRAPING: All months processed')
    */
  }

  // ❌ DEPRECATED: Old Puppeteer-based scraping - replaced by NetLine API adapter
  const handleAutomaticScraping = async (employeeId, password, airline, month = null, year = null, firstLogin = false, retryCount = 0) => {
    console.warn('⚠️ DEPRECATED: handleAutomaticScraping is no longer used. Use getRosterWithBackgroundSync instead.')
    return
    /* COMMENTED OUT - OLD SCRAPING CODE
    const maxRetries = 3
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000) // Exponential backoff: 1s, 2s, 4s, max 10s
    
    console.log(`🚀 AUTOMATIC SCRAPING: Starting real crew portal authentication... (Attempt ${retryCount + 1}/${maxRetries + 1})`)
    if (month && year) {
      console.log(`📅 Scraping for specific month: ${year}-${String(month).padStart(2, '0')}`)
    }
    setLoading(true)
    
    try {
      console.log(`📋 First login parameter: ${firstLogin} - ${firstLogin ? 'Will scrape full profile' : 'Schedule only'}`)
      
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
        
        // Check if we already have fresh data (scraped within last 5 minutes)
        const cacheKey = `schedule_${year}_${String(month).padStart(2, '0')}`
        const lastScraped = await localforage.getItem(`${cacheKey}_timestamp`)
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
        
        if (lastScraped && lastScraped > fiveMinutesAgo && !firstLogin) {
          console.log(`⚡ Using cached data for ${year}-${String(month).padStart(2, '0')} (scraped ${Math.round((Date.now() - lastScraped) / 1000)}s ago)`)
          const cachedSchedule = await localforage.getItem(cacheKey)
          if (cachedSchedule) {
            setSchedule(cachedSchedule)
            setLoading(false)
            setScrapingInProgress(false)
            return
          }
        }
      }
      
      console.log('📡 Sending scrape request to /api/scrape...')
      const response = await apiCall('/api/scrape', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })
      
      console.log(`📥 Scrape response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Server error ${response.status}:`, errorText)
        throw new Error(`Server error ${response.status}: ${errorText || 'Connection failed'}`)
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
                // Use LOCAL TIME for date determination, not Zulu time
                let legDate = pairing.startDate // fallback to pairing start date
                
                // Priority 1: Use local time from departure
                if (leg.departure?.localTime) {
                  const depDateStr = leg.departure.localTime; // e.g., "08Dec 15:30 LT"
                  const dayNum = depDateStr.match(/\d+/)?.[0];
                  const monthAbbr = depDateStr.match(/[A-Z][a-z]{2}/)?.[0];
                  const monthMap = {
                    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                    'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                  };
                  const monthNum = monthMap[monthAbbr] || '01';
                  let year = pairing.startDate.split('-')[0]; // Get year from pairing start date
                  
                  // Handle year rollover: if pairing starts in Dec and leg is in Jan/Feb, use next year
                  const pairingStartMonth = pairing.startDate.split('-')[1];
                  if (pairingStartMonth === '12' && (monthNum === '01' || monthNum === '02')) {
                    year = parseInt(year) + 1;
                  }
                  
                  legDate = `${year}-${monthNum}-${dayNum.padStart(2, '0')}`;
                }
                // Priority 2: Fall back to date field if localTime not available
                else if (leg.departure?.date) {
                  const depDateStr = leg.departure.date; // e.g., "08Dec"
                  const dayNum = depDateStr.match(/\d+/)?.[0];
                  const monthAbbr = depDateStr.match(/[A-Z][a-z]{2}/)?.[0];
                  const monthMap = {
                    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                    'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                  };
                  const monthNum = monthMap[monthAbbr] || '01';
                  let year = pairing.startDate.split('-')[0]; // Get year from pairing start date
                  
                  // Handle year rollover: if pairing starts in Dec and leg is in Jan/Feb, use next year
                  const pairingStartMonth = pairing.startDate.split('-')[1];
                  if (pairingStartMonth === '12' && (monthNum === '01' || monthNum === '02')) {
                    year = parseInt(year) + 1;
                  }
                  
                  legDate = `${year}-${monthNum}-${dayNum.padStart(2, '0')}`;
                }
                
                allFlights.push({
                  id: `${pairing.pairingCode}-${lIdx}`,
                  flightNumber: leg.flightNumber || `Flight ${lIdx + 1}`,
                  pairingId: pairing.pairingCode,
                  date: legDate,
                  origin: leg.departure?.airport || pairing.startLocation,
                  destination: leg.arrival?.airport || pairing.endLocation,
                  departure: leg.departure?.localTime || leg.departure?.time || pairing.startTime,
                  arrival: leg.arrival?.localTime || leg.arrival?.time || pairing.endTime,
                  departureZulu: leg.departure?.zuluTime || leg.departure?.time,
                  arrivalZulu: leg.arrival?.zuluTime || leg.arrival?.time,
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
              
              // Distribute hotels across their actual layover days
              // Each hotel should appear on the day AFTER its preceding flight
              if (pairing.hotels && pairing.hotels.length > 0 && pairing.legs.length > 0) {
                pairing.hotels.forEach((hotel, hotelIdx) => {
                  // Hotels typically occur after flights in the sequence
                  // Hotel index corresponds to the leg that precedes it
                  // Hotel 0 is after leg 0, Hotel 1 is after leg 1, etc.
                  
                  let hotelDate = pairing.startDate; // fallback
                  
                  if (hotelIdx < pairing.legs.length) {
                    // Get the leg that precedes this hotel
                    const precedingLeg = pairing.legs[hotelIdx];
                    
                    // Use the arrival local time to determine the hotel date
                    if (precedingLeg.arrival?.localTime) {
                      // Extract date from local time format like "19Dec 07:35 LT"
                      const arrDateStr = precedingLeg.arrival.localTime;
                      const dayNum = arrDateStr.match(/\d+/)?.[0];
                      const monthAbbr = arrDateStr.match(/[A-Z][a-z]{2}/)?.[0];
                      const monthMap = {
                        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                      };
                      const monthNum = monthMap[monthAbbr] || '01';
                      let year = pairing.startDate.split('-')[0];
                      
                      // Handle year rollover: if pairing starts in Dec and hotel is in Jan/Feb, use next year
                      const pairingStartMonth = pairing.startDate.split('-')[1];
                      if (pairingStartMonth === '12' && (monthNum === '01' || monthNum === '02')) {
                        year = parseInt(year) + 1;
                      }
                      
                      hotelDate = `${year}-${monthNum}-${dayNum.padStart(2, '0')}`;
                    } else if (precedingLeg.arrival?.date) {
                      // Fallback to date field if localTime not available
                      const arrDateStr = precedingLeg.arrival.date;
                      const dayNum = arrDateStr.match(/\d+/)?.[0];
                      const monthAbbr = arrDateStr.match(/[A-Z][a-z]{2}/)?.[0];
                      const monthMap = {
                        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                      };
                      const monthNum = monthMap[monthAbbr] || '01';
                      let year = pairing.startDate.split('-')[0];
                      
                      // Handle year rollover: if pairing starts in Dec and hotel is in Jan/Feb, use next year
                      const pairingStartMonth = pairing.startDate.split('-')[1];
                      if (pairingStartMonth === '12' && (monthNum === '01' || monthNum === '02')) {
                        year = parseInt(year) + 1;
                      }
                      
                      hotelDate = `${year}-${monthNum}-${dayNum.padStart(2, '0')}`;
                    }
                  } else {
                    // If hotel index exceeds leg count, use the last leg's arrival date
                    const lastLeg = pairing.legs[pairing.legs.length - 1];
                    if (lastLeg.arrival?.localTime) {
                      const arrDateStr = lastLeg.arrival.localTime;
                      const dayNum = arrDateStr.match(/\d+/)?.[0];
                      const monthAbbr = arrDateStr.match(/[A-Z][a-z]{2}/)?.[0];
                      const monthMap = {
                        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                      };
                      const monthNum = monthMap[monthAbbr] || '01';
                      let year = pairing.startDate.split('-')[0];
                      
                      const pairingStartMonth = pairing.startDate.split('-')[1];
                      if (pairingStartMonth === '12' && (monthNum === '01' || monthNum === '02')) {
                        year = parseInt(year) + 1;
                      }
                      
                      hotelDate = `${year}-${monthNum}-${dayNum.padStart(2, '0')}`;
                    }
                  }
                  
                  // Add this single hotel to its specific date
                  if (!hotelsByDate[hotelDate]) {
                    hotelsByDate[hotelDate] = [];
                  }
                  hotelsByDate[hotelDate].push(hotel);
                  
                  console.log(`  🏨 Hotel ${hotelIdx + 1} assigned to ${hotelDate}: ${hotel.name || hotel.city}`);
                });
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
          
          // Store timestamp for cache validation
          await localforage.setItem(`${cacheKey}_timestamp`, Date.now())
          
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
        // Don't show automatic scraping errors in notifications
      }
      
    } catch (error) {
      console.error('❌ AUTOMATIC SCRAPING ERROR:', error)
      
      // Retry logic with exponential backoff
      if (retryCount < maxRetries) {
        console.log(`⏳ Retrying in ${retryDelay}ms... (Attempt ${retryCount + 2}/${maxRetries + 1})`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return handleAutomaticScraping(employeeId, password, airline, month, year, firstLogin, retryCount + 1)
      }
      
      // All retries exhausted
      console.error(`❌ All ${maxRetries + 1} scraping attempts failed:`, error)
      setScheduleChanges(prev => [{
        type: 'error',
        message: `⚠️ Schedule update failed: ${error.message || 'Connection error'}. Please check your credentials and try again.`,
        date: new Date().toISOString(),
        read: false
      }, ...prev])
      
      // Show user-friendly error
      setError(`Unable to load schedule: ${error.message || 'Please check your internet connection and credentials.'}`)
      setTimeout(() => setError(null), 5000)
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
    
    console.log(`🔄 MANUAL REFRESH: Using Puppeteer scraper...`)
    
    setLoadingMessage('Connecting to crew portal...')
    setScrapingInProgress(true)
    setError(null)
    
    try {
      let storedUsername, storedPassword, storedAirline
      
      if (userType === 'family') {
        const accessCode = await localforage.getItem('familyAccessCode')
        const codeMapping = await localforage.getItem('familyCodeMapping') || {}
        const memberInfo = codeMapping[accessCode]
        
        if (!memberInfo) {
          setError('Family access code not found. Please log in again.')
          setScrapingInProgress(false)
          setLoadingMessage('')
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
        setError('Please log out and log back in to enable schedule refresh.')
        setScrapingInProgress(false)
        setLoadingMessage('')
        return
      }
      
      // Use simple scraper with detailed status updates
      // Pass existing flights so we skip re-scraping months that already have data
      setLoadingMessage('Connecting to crew portal...')
      console.log('🔄 Calling simple scraper with multi-month support...')
      const existingFlights = schedule?.flights || []
      console.log(`📊 Passing ${existingFlights.length} existing flights to skip cached months`)
      const result = await simpleScrape(storedUsername, storedPassword, storedAirline || 'abx', (status, progress) => {
        setLoadingMessage(status)
        console.log(`📊 Refresh: ${progress}% - ${status}`)
      }, (progressiveFlights) => {
        // Progressive update - show flights as they come in
        if (progressiveFlights && progressiveFlights.length > 0) {
          setSchedule({ flights: progressiveFlights, hotelsByDate: buildHotelsByDate(progressiveFlights) })
        }
      }, existingFlights)
      
      // Handle both old format (array) and new format (object with flights and news)
      const flights = Array.isArray(result) ? result : (result.flights || [])
      const news = Array.isArray(result) ? [] : (result.news || [])
      
      console.log('✅ Refresh complete:', flights.length, 'flights,', news.length, 'news items')
      
      // Add news items to alerts (scheduleChanges)
      if (news.length > 0) {
        const newsAlerts = news.map((item, idx) => ({
          id: `news-${Date.now()}-${idx}`,
          type: 'news',
          title: item.title || 'Crew Portal News',
          message: item.content || item.title || 'New update from crew portal',
          date: item.date || new Date().toISOString(),
          read: false,
          source: 'crew-portal'
        }))
        setScheduleChanges(prev => [...newsAlerts, ...prev])
        console.log('📰 Added', newsAlerts.length, 'news items to alerts')
      }
      
      if (!flights || flights.length === 0) {
        console.warn('⚠️ No flights returned from refresh')
        setError('No schedule data available')
        setScrapingInProgress(false)
        setLoadingMessage('')
        return
      }
      
      // Backend returns flights directly - build hotelsByDate from flights
      const refreshedSchedule = {
        flights,
        hotelsByDate: buildHotelsByDate(flights)
      }
      
      console.log('✅ Schedule refreshed:', flights.length, 'flights')
      setSchedule(refreshedSchedule)
      await localforage.setItem('schedule', refreshedSchedule)
      setScrapingInProgress(false)
      setLoadingMessage('Schedule updated successfully!')
      setError(null)
      
      // Clear success message after 2 seconds
      setTimeout(() => setLoadingMessage(''), 2000)
      
    } catch (error) {
      console.error('❌ Refresh error:', error)
      setError('Refresh failed: ' + error.message)
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
    */
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
    console.log('🔍 getScheduleForDate called with:', dateString)
    console.log('🔍 schedule object:', schedule)
    if (!schedule) {
      console.log('❌ getScheduleForDate: No schedule data')
      return null
    }
    
    try {
      const flights = []
      
      console.log('✅ getScheduleForDate: Looking for date', dateString)
      console.log('✅ getScheduleForDate: Schedule structure', schedule)
      console.log('✅ getScheduleForDate: schedule.flights exists?', !!schedule.flights)
      console.log('✅ getScheduleForDate: schedule.flights is array?', Array.isArray(schedule.flights))
      console.log('✅ getScheduleForDate: schedule.flights length:', schedule.flights?.length)
      
      // Handle new format from scraper: { flights: [...] }
      if (schedule.flights && Array.isArray(schedule.flights)) {
        console.log('✅ Processing schedule.flights array with', schedule.flights.length, 'flights')
        for (const flight of schedule.flights) {
          console.log('   Checking flight:', {date: flight.date, pairing: flight.pairingId, origin: flight.origin, dest: flight.destination})
          if (flight.date === dateString) {
            console.log('   ✅ MATCH! Adding flight to results')
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
      
      // Deduplicate flights by ID
      const uniqueFlights = []
      const seenIds = new Set()
      for (const flight of flights) {
        const flightKey = flight.id || `${flight.date}-${flight.flightNumber}-${flight.origin}-${flight.destination}`
        if (!seenIds.has(flightKey)) {
          seenIds.add(flightKey)
          uniqueFlights.push(flight)
        }
      }
      
      if (uniqueFlights.length !== flights.length) {
        console.log(`🔄 Deduplicated: ${flights.length} → ${uniqueFlights.length} flights`)
      }
      
      return uniqueFlights.length > 0 ? uniqueFlights : null
    } catch (error) {
      console.error('Error in getScheduleForDate:', error, error.stack)
      return null
    }
  }

  const getMonthlySchedule = () => {
    if (!schedule) return {}
    
    try {
      const monthData = {}
      
      // Helper function to check if arrival is next day based on local times
      const isNextDayArrival = (departure, arrival) => {
        const deptMatch = departure?.match(/(\d{2})(\d{2})/)
        const arrMatch = arrival?.match(/(\d{2})(\d{2})/)
        
        if (deptMatch && arrMatch) {
          const deptMinutes = parseInt(deptMatch[1]) * 60 + parseInt(deptMatch[2])
          const arrMinutes = parseInt(arrMatch[1]) * 60 + parseInt(arrMatch[2])
          return arrMinutes < deptMinutes
        }
        return false
      }
      
      // Handle new format from scraper: { flights: [...] }
      if (schedule.flights && Array.isArray(schedule.flights)) {
        schedule.flights.forEach(flight => {
          const dateKey = flight.date
          if (!monthData[dateKey]) {
            monthData[dateKey] = []
          }
          monthData[dateKey].push({ ...flight, pairingId: flight.pairingId || 'N/A' })
          
          // If flight lands next day (based on local times), add to next day too
          if (flight.departure && flight.arrival && isNextDayArrival(flight.departure, flight.arrival)) {
            const nextDate = new Date(flight.date)
            nextDate.setDate(nextDate.getDate() + 1)
            const nextDateKey = nextDate.toISOString().split('T')[0]
            
            if (!monthData[nextDateKey]) {
              monthData[nextDateKey] = []
            }
            // Mark this as a continuation from previous day
            monthData[nextDateKey].push({ 
              ...flight, 
              pairingId: flight.pairingId || 'N/A',
              isArrivalDay: true,
              originalDate: flight.date
            })
          }
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
              
              // If flight lands next day (based on local times), add to next day too
              if (flight.departure && flight.arrival && isNextDayArrival(flight.departure, flight.arrival)) {
                const nextDate = new Date(flight.date)
                nextDate.setDate(nextDate.getDate() + 1)
                const nextDateKey = nextDate.toISOString().split('T')[0]
                
                if (!monthData[nextDateKey]) {
                  monthData[nextDateKey] = []
                }
                monthData[nextDateKey].push({ 
                  ...flight, 
                  pairingId: pairing.pairingId,
                  isArrivalDay: true,
                  originalDate: flight.date
                })
              }
            })
          }
        })
      }
      
      // Deduplicate flights for each date
      Object.keys(monthData).forEach(dateKey => {
        const flights = monthData[dateKey]
        const seenIds = new Set()
        monthData[dateKey] = flights.filter(flight => {
          const flightKey = flight.id || `${flight.date}-${flight.flightNumber}-${flight.origin}-${flight.destination}`
          if (seenIds.has(flightKey)) {
            return false
          }
          seenIds.add(flightKey)
          return true
        })
      })
      
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
    
    // Calculate the earliest allowed month (1 month before today)
    const today = new Date()
    const earliestDate = new Date(today)
    earliestDate.setMonth(earliestDate.getMonth() - 1)
    earliestDate.setDate(1) // First day of previous month
    
    // Prevent going too far back
    if (newDate < earliestDate) {
      console.log('⚠️ Cannot navigate beyond previous month')
      setError('Schedule data only available for previous, current, and next month.')
      setTimeout(() => setError(null), 3000)
      return
    }
    
    console.log(`📅 Navigating to ${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`)
    
    // The schedule already contains all 3 months of data
    // Just change the view month - no need to reload
    setCurrentMonth(newDate)
    setError(null)
  }

  const goToNextMonth = async () => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newDate.getMonth() + 1)
    newDate.setDate(1) // Set to first day for accurate comparison
    
    // Calculate the latest allowed month (next month from today)
    const today = new Date()
    const latestDate = new Date(today)
    latestDate.setMonth(latestDate.getMonth() + 1)
    latestDate.setDate(1) // First day of next month
    
    // Prevent going beyond next month (compare year and month properly)
    if (newDate.getFullYear() > latestDate.getFullYear() || 
        (newDate.getFullYear() === latestDate.getFullYear() && newDate.getMonth() > latestDate.getMonth())) {
      console.log('⚠️ Cannot navigate beyond next month - no cached data')
      setError('Schedule data only available for previous, current, and next month.')
      setTimeout(() => setError(null), 3000)
      return
    }
    
    console.log(`📅 Navigating to ${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`)
    
    // The schedule already contains all 3 months of data
    // Just change the view month - no need to reload
    setCurrentMonth(newDate)
    setError(null)
  }

  const renderFriendsView = () => {
    return (
      <Box sx={{ px: 2 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>👥 Friends & Co-workers</Typography>
        
        <Tabs 
          value={friendsSubTab} 
          onChange={(e, newValue) => setFriendsSubTab(newValue)}
          variant="fullWidth"
          sx={{ mb: 3 }}
        >
          <Tab label="💬 Chats" value="chats" />
          <Tab label="📍 Nearby" value="nearby" />
          <Tab label="🔍 Find" value="find" />
        </Tabs>

        {friendsSubTab === 'chats' && (
          <Box>
            {selectedChat ? (
              <Box>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <IconButton onClick={() => setSelectedChat(null)}>
                    <ArrowBackIcon />
                  </IconButton>
                  <Typography variant="h6">
                    {selectedChat.name && selectedChat.name.trim() !== '' ? selectedChat.name : selectedChat.employeeId}
                  </Typography>
                </Stack>
                
                <Box sx={{ mb: 2, minHeight: 400, maxHeight: 500, overflowY: 'auto' }}>
                  {(chatMessages[selectedChat.id] || []).map((msg) => (
                    <Box 
                      key={msg.id} 
                      sx={{ 
                        display: 'flex',
                        justifyContent: msg.senderId === username ? 'flex-end' : 'flex-start',
                        mb: 1
                      }}
                    >
                      <Paper 
                        elevation={1}
                        sx={{ 
                          p: 1.5,
                          maxWidth: '70%',
                          bgcolor: msg.senderId === username ? 'primary.main' : 'background.paper',
                          color: msg.senderId === username ? 'primary.contrastText' : 'text.primary'
                        }}
                      >
                        <Typography variant="body2">{msg.text}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                          {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Paper>
                    </Box>
                  ))}
                  {(chatMessages[selectedChat.id] || []).length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <Typography variant="body1" color="text.secondary">
                        👋 Start a conversation!
                      </Typography>
                    </Box>
                  )}
                </Box>
                
                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth
                    size="small"
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
                  <Button 
                    variant="contained"
                    onClick={() => {
                      sendChatMessage(selectedChat.id, messageInput)
                      setMessageInput('')
                    }}
                  >
                    Send
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="h6">Conversations</Typography>
                  {friends.length > 0 && (
                    <Button 
                      size="small"
                      onClick={() => {
                        setChatEditMode(!chatEditMode)
                        setSelectedChatsToDelete([])
                      }}
                    >
                      {chatEditMode ? 'Done' : 'Edit'}
                    </Button>
                  )}
                </Stack>
                
                {chatEditMode && friends.length > 0 && (
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Button 
                      variant="outlined"
                      size="small"
                      onClick={selectAllChats}
                    >
                      {selectedChatsToDelete.length === friends.length ? '☑️ Deselect All' : '☐ Select All'}
                    </Button>
                    <Button 
                      variant="contained"
                      color="error"
                      size="small"
                      onClick={deleteSelectedChats}
                      disabled={selectedChatsToDelete.length === 0}
                    >
                      🗑️ Delete ({selectedChatsToDelete.length})
                    </Button>
                  </Stack>
                )}
                
                {friends.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="body1" gutterBottom>👋 No friends yet</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Search and add coworkers to start chatting
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {friends.map((friend, idx) => (
                      <ListItem 
                        key={idx}
                        button
                        selected={selectedChatsToDelete.includes(friend.id)}
                        onClick={() => {
                          if (chatEditMode) {
                            toggleChatSelection(friend.id)
                          } else {
                            setSelectedChat(friend)
                          }
                        }}
                      >
                        {chatEditMode && (
                          <ListItemIcon>
                            <input 
                              type="checkbox" 
                              checked={selectedChatsToDelete.includes(friend.id)}
                              onChange={() => toggleChatSelection(friend.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </ListItemIcon>
                        )}
                        <ListItemAvatar>
                          <Avatar>
                            {(friend.name && friend.name.trim() !== '' ? friend.name : friend.employeeId).charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={friend.name && friend.name.trim() !== '' ? friend.name : friend.employeeId}
                          secondary={
                            chatMessages[friend.id]?.length > 0 
                              ? chatMessages[friend.id][chatMessages[friend.id].length - 1].text 
                              : 'Start a conversation'
                          }
                        />
                        {!chatEditMode && chatMessages[friend.id]?.length > 0 && (
                          <Chip label={chatMessages[friend.id].length} size="small" color="primary" />
                        )}
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            )}
          </Box>
        )}

        {friendsSubTab === 'nearby' && (
          <Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>📍 Nearby Crewmates</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Friends in your current location
              </Typography>
              {!userLocation && (
                <Button 
                  variant="contained"
                  color="success"
                  onClick={requestGeolocation}
                  startIcon={<Box>📍</Box>}
                  sx={{ mt: 1 }}
                >
                  Enable Location
                </Button>
              )}
            </Box>
            
            {!window.location.protocol.startsWith('https') && window.location.hostname !== 'localhost' ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="body1" gutterBottom>🔒 Location services require HTTPS</Typography>
                <Typography variant="body2" color="text.secondary">
                  This feature is only available on secure connections
                </Typography>
              </Box>
            ) : !userLocation ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="body1" gutterBottom>📍 Location access not enabled</Typography>
                <Typography variant="body2" color="text.secondary">
                  Click "Enable Location" above to find nearby crewmates
                </Typography>
              </Box>
            ) : getNearbyCrewmates().length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="body1" gutterBottom>🌍 No nearby crewmates found</Typography>
                <Typography variant="body2" color="text.secondary">
                  Friends at your current base will appear here
                </Typography>
              </Box>
            ) : (
              <List>
                {getNearbyCrewmates().map((friend, idx) => (
                  <ListItem 
                    key={idx}
                    secondaryAction={
                      <Button 
                        size="small"
                        variant="contained"
                        onClick={() => {
                          setFriendsSubTab('chats')
                          setSelectedChat(friend)
                        }}
                      >
                        💬 Chat
                      </Button>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar>
                        {(friend.name && friend.name.trim() !== '' ? friend.name : friend.employeeId).charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={friend.name && friend.name.trim() !== '' ? friend.name : friend.employeeId}
                      secondary={`📍 ${friend.currentLocation}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}

        {friendsSubTab === 'find' && (
          <Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>🔍 Find Crew Members</Typography>
              <Typography variant="body2" color="text.secondary">
                Search registered app users by name or employee number
              </Typography>
            </Box>
            
            <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name (e.g., John Smith) or employee number (e.g., 152780)..."
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
              <Button 
                variant="contained"
                onClick={handleSearch}
                disabled={!searchQuery.trim() || searchLoading}
              >
                {searchLoading ? '⏳' : '🔍'}
              </Button>
            </Stack>

            {searchResults.length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Search Results ({searchResults.length})
                </Typography>
                <List>
                  {searchResults.map((person, idx) => (
                    <ListItem 
                      key={idx}
                      secondaryAction={
                        person.isCurrentUser ? (
                          <Chip label="👤 You" size="small" />
                        ) : friends.some(f => f.employeeId === person.employeeId) ? (
                          <Chip label="✓ Friends" size="small" color="success" />
                        ) : friendRequests.some(r => r.employeeId === person.employeeId) ? (
                          <Chip label="⏳ Pending" size="small" color="warning" />
                        ) : (
                          <Button 
                            size="small"
                            variant="contained"
                            onClick={() => handleSendRequest(person)}
                          >
                            ➕ Send Request
                          </Button>
                        )
                      }
                    >
                      <ListItemAvatar>
                        <Avatar>{person.name.charAt(0)}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={person.name}
                        secondary={
                          <Stack spacing={0.5}>
                            <Typography variant="caption">
                              {person.role} • #{person.employeeId}
                            </Typography>
                            {person.airline && (
                              <Typography variant="caption">✈️ {person.airline}</Typography>
                            )}
                            {person.base && (
                              <Typography variant="caption">📍 {person.base}</Typography>
                            )}
                          </Stack>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {searchQuery && searchResults.length === 0 && !searchLoading && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="body1" gutterBottom>😔 No registered users found</Typography>
                <Typography variant="body2" color="text.secondary">
                  Make sure they're registered in the app and try their full name or employee number
                </Typography>
              </Box>
            )}

            {!searchQuery && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>💡 Tips</Typography>
                <Box component="ul" sx={{ pl: 3 }}>
                  <Typography component="li" variant="body2">Search by first or last name</Typography>
                  <Typography component="li" variant="body2">Search by employee number (e.g., 12345)</Typography>
                  <Typography component="li" variant="body2">Searches both ABX and ATI registered users</Typography>
                  <Typography component="li" variant="body2">Only finds crew members who are registered on the app</Typography>
                  <Typography component="li" variant="body2">Send a friend request to start chatting</Typography>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>
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

  const calculateReportTime = (departureTime, origin, destination) => {
    // Calculate report time: 2.0 hours for MIA and international flights, 1 hour for domestic
    if (!departureTime) return { lt: '', utc: '' }
    try {
      const [hours, minutes] = departureTime.split(':').map(Number)
      const today = new Date()
      today.setHours(hours, minutes, 0, 0)
      
      // International airport codes (common destinations from US cargo carriers)
      const internationalAirports = [
        // Canada
        'YYZ', 'YVR', 'YUL', 'YYC', 'YOW', 'YHZ', 'YWG', 'YEG',
        // Mexico
        'MEX', 'GDL', 'MTY', 'CUN', 'TIJ', 'BJX', 'QRO', 'SLP',
        // Caribbean
        'SJU', 'STT', 'STX', 'NAS', 'GCM', 'MBJ', 'KIN', 'PLS',
        // Central America
        'GUA', 'SAL', 'PTY', 'MGA', 'SJO', 'LIR',
        // South America
        'BOG', 'UIO', 'LIM', 'GYE', 'SCL', 'GIG', 'GRU', 'EZE', 'CCS'
      ]
      
      const isInternational = internationalAirports.includes(origin) || 
                             internationalAirports.includes(destination)
      
      // Subtract 120 minutes for MIA/international, 60 minutes for domestic
      const minutesToSubtract = (origin === 'MIA' || isInternational) ? 120 : 60
      today.setMinutes(today.getMinutes() - minutesToSubtract)
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
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          🔔 Notifications
        </Typography>
        
        {/* Roster Update Banner */}
        {rosterUpdateAvailable && (
          <Card sx={{ mb: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ fontSize: '2rem' }}>✨</Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="div">
                    Roster Update Available
                  </Typography>
                  <Typography variant="body2">
                    Your schedule has been updated in the crew portal
                  </Typography>
                  {lastRosterCheck && (
                    <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.9 }}>
                      Last checked: {new Date(lastRosterCheck).toLocaleString()}
                    </Typography>
                  )}
                </Box>
                <Button 
                  variant="contained" 
                  color="secondary"
                  onClick={fetchRosterData}
                  disabled={loading}
                  startIcon={<Badge badgeContent="!" color="error">📅</Badge>}
                >
                  {loading ? 'Loading...' : 'Fetch Update'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}
        
        {/* Manual roster check button */}
        {token && !rosterUpdateAvailable && (
          <Box sx={{ mb: 2 }}>
            <Button 
              variant="outlined" 
              fullWidth
              onClick={checkRosterUpdates}
              disabled={loading}
              startIcon={<span>🔄</span>}
            >
              Check for Roster Updates
            </Button>
            {lastRosterCheck && (
              <Typography variant="caption" color="text.secondary" display="block" textAlign="center" sx={{ mt: 1 }}>
                Last checked: {new Date(lastRosterCheck).toLocaleString()}
              </Typography>
            )}
          </Box>
        )}
        
        {!hasNotifications && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h2" sx={{ mb: 2 }}>🔕</Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>No new notifications</Typography>
            <Typography variant="body2" color="text.secondary">Friend requests and schedule changes will appear here</Typography>
          </Box>
        )}

        {userType !== 'family' && friendRequests.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              👥 Friend Requests ({friendRequests.length})
            </Typography>
            <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
              {friendRequests.map((request, idx) => (
                <ListItem 
                  key={idx}
                  sx={{ 
                    borderBottom: idx < friendRequests.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                    py: 2
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {request.name.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {request.name} sent you a friend request
                      </Typography>
                    }
                    secondary={`${request.role} • #${request.employeeId} • 📍 ${request.base}`}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button 
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<span>✓</span>}
                      onClick={() => handleAcceptRequest(request)}
                    >
                      Accept
                    </Button>
                    <Button 
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<span>✕</span>}
                      onClick={() => handleDeclineRequest(request)}
                    >
                      Decline
                    </Button>
                  </Stack>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {scheduleChanges.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              📬 Crew Portal Updates ({scheduleChanges.length})
            </Typography>
            <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
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
                  <ListItem 
                    key={idx}
                    sx={{ 
                      borderBottom: idx < scheduleChanges.length - 1 ? 1 : 0,
                      borderColor: 'divider',
                      py: 2,
                      alignItems: 'flex-start'
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'secondary.main' }}>
                        {icon}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {title}
                          </Typography>
                          {change.accepted && (
                            <Chip label="Accepted" size="small" color="success" sx={{ height: 20 }} />
                          )}
                        </Stack>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="text.primary" sx={{ mt: 0.5 }}>
                            {change.message}
                          </Typography>
                          {change.date && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              {change.flightNumber ? `Flight ${change.flightNumber} • ` : ''}
                              {change.date}
                            </Typography>
                          )}
                        </>
                      }
                    />
                    <Stack direction="row" spacing={1} sx={{ ml: 2 }}>
                      {!change.accepted && (
                        <Button 
                          variant="contained"
                          color="primary"
                          size="small"
                          startIcon={<span>✓</span>}
                          onClick={() => acceptNotification(change, idx)}
                        >
                          Accept
                        </Button>
                      )}
                      <IconButton 
                        size="small"
                        color="error"
                        onClick={() => dismissScheduleChange(idx)}
                      >
                        <span>✕</span>
                      </IconButton>
                    </Stack>
                  </ListItem>
                )
              })}
            </List>
          </Box>
        )}
      </Box>
    )
  }

  const renderTripTradeView = () => {
    return (
      <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SwapIcon /> Trips
        </Typography>
        
        <Grid container spacing={2}>
          {/* Trip Trade Section */}
          <Grid item xs={12} md={4}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                '&:hover': { boxShadow: 4 },
                transition: 'box-shadow 0.2s'
              }}
              onClick={() => {
                // TODO: Add URL navigation
                console.log('Trip Trade clicked')
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <SwapIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Trip Trade
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Post trips for trade or browse available trips from other crew members.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          {/* RSV View Section */}
          <Grid item xs={12} md={4}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                '&:hover': { boxShadow: 4 },
                transition: 'box-shadow 0.2s'
              }}
              onClick={async () => {
                // Open the Will-Fly-List PDF - uses pilot's stored credentials
                const rsvViewUrl = 'https://www.myabx.com/flightweb/Secure/Flight%20Crew%20Scheduling/Will-Fly-List.pdf'
                try {
                  // Open in new tab - myabx.com may prompt for login
                  // The site should accept the same credentials
                  window.open(rsvViewUrl, '_blank')
                } catch (err) {
                  console.error('Error opening RSV View:', err)
                }
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <ReserveIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  RSV View
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  View reserve schedule and availability status.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Open Trips Section */}
          <Grid item xs={12} md={4}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                '&:hover': { boxShadow: 4 },
                transition: 'box-shadow 0.2s'
              }}
              onClick={async () => {
                // Open the CVG Open Time PDF - uses pilot's stored credentials
                const openTripsUrl = 'https://www.myabx.com/flightweb/Secure/Flight%20Crew%20Scheduling/CVG_OPEN_TIME.pdf'
                try {
                  // Open in new tab - myabx.com may prompt for login
                  // The site should accept the same credentials
                  window.open(openTripsUrl, '_blank')
                } catch (err) {
                  console.error('Error opening Open Trips:', err)
                }
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <FlightIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Open Trips
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Browse and pick up available open trips.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    )
  }

  const renderStatsView = () => {
    const calculateMonthStats = (period = 'current') => {
      if (!schedule?.flights || schedule.flights.length === 0) {
        return {
          flightHours: 0,
          dutyHours: 0,
          offDays: [],
          layovers: 0,
          landings: 0,
          daysInMonth: 0
        }
      }

      const now = new Date()
      let targetDate
      
      if (period === 'current') {
        targetDate = now
      } else if (period === 'previous') {
        targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      } else if (period === 'ytd') {
        // Year-to-date calculation will aggregate all months
        targetDate = now
      }

      const year = targetDate.getFullYear()
      const month = targetDate.getMonth()
      
      // Get days in month
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      
      let flights = []
      if (period === 'ytd') {
        // Get all flights from January 1st to now
        flights = schedule.flights.filter(f => {
          const flightDate = new Date(f.date)
          return flightDate.getFullYear() === year && flightDate <= now
        })
      } else {
        // Get flights for specific month
        flights = schedule.flights.filter(f => {
          const flightDate = new Date(f.date)
          return flightDate.getFullYear() === year && flightDate.getMonth() === month
        })
      }

      // Calculate flight hours
      let totalFlightMinutes = 0
      flights.forEach(f => {
        if (f.departure && f.arrival) {
          const [depHours, depMinutes] = f.departure.split(':').map(Number)
          const [arrHours, arrMinutes] = f.arrival.split(':').map(Number)
          
          const depTime = depHours * 60 + depMinutes
          let arrTime = arrHours * 60 + arrMinutes
          
          // Handle overnight flights
          if (arrTime < depTime) {
            arrTime += 24 * 60
          }
          
          totalFlightMinutes += (arrTime - depTime)
        }
      })

      const flightHours = (totalFlightMinutes / 60).toFixed(1)

      // Count landings (number of flights)
      const landings = flights.length

      // Count layovers (hotels)
      const layovers = flights.filter(f => f.type === 'hotel' || f.hotel).length

      // Calculate duty hours (rough estimate: flight time + 2 hours per duty day)
      const dutyDays = new Set(flights.map(f => new Date(f.date).toDateString())).size
      const dutyHours = (totalFlightMinutes / 60 + dutyDays * 2).toFixed(1)

      // Calculate off days
      const scheduledDays = new Set()
      flights.forEach(f => {
        const flightDate = new Date(f.date)
        scheduledDays.add(flightDate.getDate())
      })

      const offDays = []
      for (let day = 1; day <= daysInMonth; day++) {
        if (!scheduledDays.has(day)) {
          offDays.push(day)
        }
      }

      return {
        flightHours,
        dutyHours,
        offDays,
        layovers,
        landings,
        daysInMonth
      }
    }

    const currentStats = calculateMonthStats('current')
    const previousStats = calculateMonthStats('previous')
    const ytdStats = calculateMonthStats('ytd')

    const now = new Date()
    const currentMonthName = now.toLocaleString('default', { month: 'long', year: 'numeric' })
    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonthName = previousMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' })

    const displayStats = statsPeriod === 'current' ? currentStats : 
                         statsPeriod === 'previous' ? previousStats : ytdStats
    const displayPeriod = statsPeriod === 'current' ? currentMonthName :
                          statsPeriod === 'previous' ? previousMonthName : `Year to Date ${now.getFullYear()}`

    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" sx={{ mb: 3 }}>
          📊 Flight Statistics
        </Typography>
        
        <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button 
            variant={statsPeriod === 'current' ? 'contained' : 'outlined'}
            onClick={() => setStatsPeriod('current')}
            size="small"
          >
            Current Month
          </Button>
          <Button 
            variant={statsPeriod === 'previous' ? 'contained' : 'outlined'}
            onClick={() => setStatsPeriod('previous')}
            size="small"
          >
            Previous Month
          </Button>
          <Button 
            variant={statsPeriod === 'ytd' ? 'contained' : 'outlined'}
            onClick={() => setStatsPeriod('ytd')}
            size="small"
          >
            Year to Date
          </Button>
        </Box>

        <Typography variant="h6" sx={{ mb: 2 }}>
          {displayPeriod}
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h4">✈️</Typography>
                <Box>
                  <Typography variant="body2" color="text.secondary">Flight Hours</Typography>
                  <Typography variant="h5">{displayStats.flightHours}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h4">⏱️</Typography>
                <Box>
                  <Typography variant="body2" color="text.secondary">Duty Hours</Typography>
                  <Typography variant="h5">{displayStats.dutyHours}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h4">🛬</Typography>
                <Box>
                  <Typography variant="body2" color="text.secondary">Landings</Typography>
                  <Typography variant="h5">{displayStats.landings}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h4">🏨</Typography>
                <Box>
                  <Typography variant="body2" color="text.secondary">Layovers</Typography>
                  <Typography variant="h5">{displayStats.layovers}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {statsPeriod !== 'ytd' && (
          <Card elevation={1} sx={{ borderRadius: 3, mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                📅 Off Days ({displayStats.offDays.length} days)
              </Typography>
              {displayStats.offDays.length > 0 ? (
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))',
                  gap: 1.5
                }}>
                  {displayStats.offDays.map(day => (
                    <Chip
                      key={day}
                      label={day}
                      color="success"
                      variant="outlined"
                      sx={{ 
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        height: '40px',
                        justifyContent: 'center'
                      }}
                    />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No off days this month
                </Typography>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    )
  }

  const renderSettingsView = () => {
    return (
      <Box className="settings-view" sx={{ px: 2, pb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>⚙️ Settings</Typography>
        
        <Tabs 
          value={settingsTab} 
          onChange={(e, newValue) => setSettingsTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
        >
          <Tab label="👤 Pilot Info" value="pilotInfo" />
          <Tab label="🌟 Features" value="features" />
          {userType !== 'family' && (
            <Tab label="👨‍👩‍👧‍👦 Family" value="family" />
          )}
          <Tab label="❓ FAQs" value="faqs" />
          <Tab label="📧 Contact" value="contact" />
        </Tabs>

        {settingsTab === 'pilotInfo' && (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>👤 Pilot Information</Typography>
            <Card elevation={2}>
              <CardContent>
                {pilotProfile && (
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Name:</Typography>
                      {isEditingName ? (
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          <TextField
                            size="small"
                            fullWidth
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            placeholder="Enter your name"
                            autoFocus
                          />
                          <Button variant="contained" color="success" onClick={handleSaveProfileName}>Save</Button>
                          <Button variant="outlined" color="error" onClick={() => setIsEditingName(false)}>Cancel</Button>
                        </Stack>
                      ) : (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                          <Typography variant="body1">{pilotProfile.name || 'Not set'}</Typography>
                          {userType !== 'family' && (
                            <Button 
                              size="small"
                              variant="contained"
                              onClick={() => {
                                setIsEditingName(true)
                                setEditedName(pilotProfile.name || '')
                              }}
                            >
                              Edit
                            </Button>
                          )}
                        </Stack>
                      )}
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Employee ID:</Typography>
                      <Typography variant="body1" sx={{ mt: 0.5 }}>{pilotProfile.employeeId}</Typography>
                    </Box>
                    {pilotProfile.rank && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Rank:</Typography>
                        <Typography variant="body1" sx={{ mt: 0.5 }}>{pilotProfile.rank}</Typography>
                      </Box>
                    )}
                    {pilotProfile.base && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Base:</Typography>
                        <Typography variant="body1" sx={{ mt: 0.5 }}>{pilotProfile.base}</Typography>
                      </Box>
                    )}
                  </Stack>
                )}
                {!pilotProfile && userType !== 'family' && (
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Name:</Typography>
                      {isEditingName ? (
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          <TextField
                            size="small"
                            fullWidth
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            placeholder="Enter your name"
                            autoFocus
                          />
                          <Button variant="contained" color="success" onClick={handleSaveProfileName}>Save</Button>
                          <Button variant="outlined" color="error" onClick={() => setIsEditingName(false)}>Cancel</Button>
                        </Stack>
                      ) : (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                          <Typography variant="body1">{username || 'Not set'}</Typography>
                          <Button 
                            size="small"
                            variant="contained"
                            onClick={() => {
                              setIsEditingName(true)
                              setEditedName(username || '')
                            }}
                          >
                            Edit
                          </Button>
                        </Stack>
                      )}
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Username:</Typography>
                      <Typography variant="body1" sx={{ mt: 0.5 }}>{username || 'Not logged in'}</Typography>
                    </Box>
                  </Stack>
                )}
                {userType === 'family' && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Your Name:</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>{familyMemberName || 'Family Member'}</Typography>
                  </Box>
                )}
                {userType === 'family' && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Pilot Name:</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>{username || 'Unknown'}</Typography>
                  </Box>
                )}
                {userType !== 'family' && !pilotProfile?.rank && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Rank:</Typography>
                    <Select
                      size="small"
                      fullWidth
                      sx={{ mt: 0.5 }} 
                      value={pilotRank}
                      onChange={(e) => {
                        setPilotRank(e.target.value)
                        localforage.setItem('pilotRank', e.target.value)
                      }}
                    >
                      <MenuItem value="Captain">Captain</MenuItem>
                      <MenuItem value="First Officer">First Officer</MenuItem>
                    </Select>
                  </Box>
                )}
                {userType !== 'family' && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Home Airport:</Typography>
                    <Select
                      size="small"
                      fullWidth
                      sx={{ mt: 0.5 }}
                      value={homeAirport}
                      onChange={(e) => {
                        setHomeAirport(e.target.value)
                        localforage.setItem('homeAirport', e.target.value)
                      }}
                    >
                      <MenuItem value="">Select Home Airport</MenuItem>
                      <MenuItem value="ANC">ANC</MenuItem>
                      <MenuItem value="ATL">ATL</MenuItem>
                      <MenuItem value="BOS">BOS</MenuItem>
                      <MenuItem value="BWI">BWI</MenuItem>
                      <MenuItem value="CLT">CLT</MenuItem>
                      <MenuItem value="CVG">CVG</MenuItem>
                      <MenuItem value="DCA">DCA</MenuItem>
                      <MenuItem value="DEN">DEN</MenuItem>
                      <MenuItem value="DFW">DFW</MenuItem>
                      <MenuItem value="DTW">DTW</MenuItem>
                      <MenuItem value="EWR">EWR</MenuItem>
                      <MenuItem value="HNL">HNL</MenuItem>
                      <MenuItem value="HOU">HOU</MenuItem>
                      <MenuItem value="IAD">IAD</MenuItem>
                      <MenuItem value="IAH">IAH</MenuItem>
                      <MenuItem value="JFK">JFK</MenuItem>
                      <MenuItem value="LAS">LAS</MenuItem>
                      <MenuItem value="LAX">LAX</MenuItem>
                      <MenuItem value="LGA">LGA</MenuItem>
                      <MenuItem value="MCO">MCO</MenuItem>
                      <MenuItem value="MDW">MDW</MenuItem>
                      <MenuItem value="MEM">MEM</MenuItem>
                      <MenuItem value="MIA">MIA</MenuItem>
                      <MenuItem value="MSP">MSP</MenuItem>
                      <MenuItem value="ORD">ORD</MenuItem>
                      <MenuItem value="PHL">PHL</MenuItem>
                      <MenuItem value="PHX">PHX</MenuItem>
                      <MenuItem value="SAN">SAN</MenuItem>
                      <MenuItem value="SEA">SEA</MenuItem>
                      <MenuItem value="SFO">SFO</MenuItem>
                      <MenuItem value="SJU">SJU</MenuItem>
                      <MenuItem value="SLC">SLC</MenuItem>
                      <MenuItem value="STL">STL</MenuItem>
                      <MenuItem value="TPA">TPA</MenuItem>
                    </Select>
                  </Box>
                )}
                {userType !== 'family' && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Domicile:</Typography>
                    <Select
                      size="small"
                      fullWidth
                      sx={{ mt: 0.5 }}
                      value={domicile}
                      onChange={(e) => {
                        setDomicile(e.target.value)
                        localforage.setItem('domicile', e.target.value)
                      }}
                    >
                      <MenuItem value="">Select Domicile</MenuItem>
                      <MenuItem value="ANC">ANC</MenuItem>
                      <MenuItem value="ATL">ATL</MenuItem>
                      <MenuItem value="BOS">BOS</MenuItem>
                      <MenuItem value="BWI">BWI</MenuItem>
                      <MenuItem value="CLT">CLT</MenuItem>
                      <MenuItem value="CVG">CVG</MenuItem>
                      <MenuItem value="DCA">DCA</MenuItem>
                      <MenuItem value="DEN">DEN</MenuItem>
                      <MenuItem value="DFW">DFW</MenuItem>
                      <MenuItem value="DTW">DTW</MenuItem>
                      <MenuItem value="EWR">EWR</MenuItem>
                      <MenuItem value="HNL">HNL</MenuItem>
                      <MenuItem value="HOU">HOU</MenuItem>
                      <MenuItem value="IAD">IAD</MenuItem>
                      <MenuItem value="IAH">IAH</MenuItem>
                      <MenuItem value="JFK">JFK</MenuItem>
                      <MenuItem value="LAS">LAS</MenuItem>
                      <MenuItem value="LAX">LAX</MenuItem>
                      <MenuItem value="LGA">LGA</MenuItem>
                      <MenuItem value="MCO">MCO</MenuItem>
                      <MenuItem value="MDW">MDW</MenuItem>
                      <MenuItem value="MEM">MEM</MenuItem>
                      <MenuItem value="MIA">MIA</MenuItem>
                      <MenuItem value="MSP">MSP</MenuItem>
                      <MenuItem value="ORD">ORD</MenuItem>
                      <MenuItem value="PHL">PHL</MenuItem>
                      <MenuItem value="PHX">PHX</MenuItem>
                      <MenuItem value="SAN">SAN</MenuItem>
                      <MenuItem value="SEA">SEA</MenuItem>
                      <MenuItem value="SFO">SFO</MenuItem>
                      <MenuItem value="SJU">SJU</MenuItem>
                      <MenuItem value="SLC">SLC</MenuItem>
                      <MenuItem value="STL">STL</MenuItem>
                      <MenuItem value="TPA">TPA</MenuItem>
                    </Select>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary">Company:</Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {(() => {
                      const airlineToDisplay = userType === 'family' ? pilotAirline : airline
                      return airlineToDisplay === 'abx' ? 'ABX AIR (GB)' : airlineToDisplay === 'ati' ? 'AIR TRANSPORT INTERNATIONAL (8C)' : airlineToDisplay ? airlineToDisplay.toUpperCase() : 'Unknown'
                    })()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
              
              {userType !== 'family' && (
                <Card elevation={2} sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>👥 Friend Discovery</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Allow other pilots to find and friend request you in the app
                    </Typography>
                {!isRegisteredUser ? (
                  <Button 
                    variant="contained" 
                    color="success" 
                    fullWidth
                    onClick={handleRegisterUser}
                  >
                    ✅ Click to Register as User
                  </Button>
                ) : (
                  <Box>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      ✔️ Registered - Other pilots can find you
                    </Alert>
                    <Button 
                      variant="outlined"
                      color="error"
                      fullWidth
                      onClick={handleUnregisterUser}
                    >
                      ↶ Undo Registration
                    </Button>
                  </Box>
                )}
                  </CardContent>
                </Card>
              )}
          </Box>
        )}

        {settingsTab === 'features' && (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>🌟 App Features</Typography>
            
            {/* Scraping Status Dashboard */}
            <Card elevation={2} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>📊 Schedule Sync Status</Typography>
                
                {(loading || scrapingInProgress) ? (
                  <Box>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      🔄 {loadingMessage || 'Syncing schedule data from crew portal...'}
                    </Alert>
                    <Box sx={{ mb: 2 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          Current: {scrapingStatus.currentMonth || 'Processing...'}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {scrapingStatus.progress}%
                        </Typography>
                      </Stack>
                      <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, height: 8 }}>
                        <Box 
                          sx={{ 
                            width: `${scrapingStatus.progress}%`, 
                            bgcolor: 'primary.main', 
                            height: '100%',
                            borderRadius: 1,
                            transition: 'width 0.3s ease'
                          }} 
                        />
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    {schedule && schedule.length > 0 ? (
                      <Alert severity="success" sx={{ mb: 2 }}>
                        ✅ Schedule synced successfully ({schedule.length} flight{schedule.length !== 1 ? 's' : ''} loaded)
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          Last update: {lastFetchTime ? new Date(lastFetchTime).toLocaleString() : 'Just now'}
                        </Typography>
                      </Alert>
                    ) : schedule && schedule.length === 0 ? (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        ⚠️ No flights found in crew portal
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          {lastFetchTime ? `Last checked: ${new Date(lastFetchTime).toLocaleString()}` : 'Schedule may be empty or unavailable'}
                        </Typography>
                      </Alert>
                    ) : (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        ℹ️ Schedule will sync automatically on next login
                      </Alert>
                    )}
                    
                    {scrapingStatus.lastError && !scrapingInProgress && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        ❌ {scrapingStatus.lastError}
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          Retry attempts: {scrapingStatus.retryCount || 0}
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                )}
                
                <Stack spacing={1} sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Status:</Typography>
                    <Chip 
                      label={(loading || scrapingInProgress) ? 'Syncing' : schedule && schedule.length > 0 ? 'Ready' : 'Waiting'} 
                      color={(loading || scrapingInProgress) ? 'primary' : schedule && schedule.length > 0 ? 'success' : 'default'} 
                      size="small" 
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Current Message:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {loadingMessage || 'Idle'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Flights Loaded:</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {schedule ? schedule.length : 0}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
            
            {!window.matchMedia('(display-mode: standalone)').matches && (
              <Card elevation={2} sx={{ mb: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ fontSize: 40 }}>📱</Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6">Install FlightRosterIQ</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Add to your home screen for quick access and offline use
                      </Typography>
                    </Box>
                    <Button variant="contained" onClick={handleInstallApp}>
                      ⬇️ Install
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            )}
            
            <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>✨ Key Features</Typography>
            <Stack spacing={2}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{ fontSize: 24 }}>📅</Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">Monthly & Daily Schedule Views</Typography>
                      <Typography variant="body2" color="text.secondary">
                        View your flight schedule by month or day with detailed flight information
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
              
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{ fontSize: 24 }}>✈️</Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">Flight Details</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Click any flight to see crew members, aircraft info, gate details, and more
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
              
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{ fontSize: 24 }}>🌤️</Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">Weather Information</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Click airport codes to view ATIS, METAR, and TAF weather data
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
              
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{ fontSize: 24 }}>👥</Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">Crew Contact</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Call or text crew members directly from the app (when available)
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
              
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{ fontSize: 24 }}>🟢</Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">Server Status Monitoring</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Real-time server connection indicator - green when online, red when offline
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
              
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{ fontSize: 24 }}>📱</Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">Offline Support</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Access your schedule even without internet connection
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
              
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{ fontSize: 24 }}>💬</Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">Friends & Chat</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Connect with coworkers, send messages, and see who's nearby at your base
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
              
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{ fontSize: 24 }}>🔔</Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">Notifications</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Get alerts for friend requests, schedule changes, and aircraft swaps
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
              
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{ fontSize: 24 }}>👪</Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">Family Access Codes</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Generate unique codes to share your schedule with family members (view-only)
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
            
            <Alert severity="warning" sx={{ mt: 3 }}>
              <Typography variant="body2" fontWeight="bold">⚠️ Important Notice:</Typography>
              <Typography variant="body2">
                This is a third-party app and, as with all third-party apps, this is not intended to replace your company app. Please verify all duties on the official company app. Please verify report times on all flights as some cities are different.
              </Typography>
            </Alert>
          </Box>
        )}

        {settingsTab === 'family' && (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>👪 Family Access</Typography>
            <Card elevation={2} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Share your flight schedule with family members! Generate a unique access code 
                  that allows your loved ones to view your schedule in real-time.
                </Typography>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <strong>🔒 View-Only Access:</strong> Family members will only see your flight schedule. 
                  They won't be able to access crew member details, Friends tab, or any other personal features.
                </Alert>
              </CardContent>
            </Card>

            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>➕ Add Family Member</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Enter the name of the family member you want to share your schedule with
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Family member name"
                    placeholder="e.g., Sarah (Wife), John (Son), Mom, etc."
                    value={newFamilyMemberName}
                    onChange={(e) => setNewFamilyMemberName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newFamilyMemberName.trim()) {
                        generateFamilyAccessCode()
                      }
                    }}
                  />
                  <Button 
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    onClick={generateFamilyAccessCode}
                    disabled={!newFamilyMemberName.trim()}
                  >
                    🎉 Generate Code
                  </Button>
                </Stack>
              </CardContent>
            </Card>

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
          </Box>
        )}

        {settingsTab === 'faqs' && (
          <Box sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>❓ Frequently Asked Questions</Typography>
            
            <Card elevation={2} sx={{ mb: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.dark', mb: 1 }}>
                  ⚠️ BETA VERSION
                </Typography>
                <Typography variant="body2" color="text.primary">
                  This app is currently in BETA testing. If you experience any bugs or issues, please report them to <a href="mailto:FlightRosterIQ@Gmail.com" style={{ color: '#4C5FD5' }}>FlightRosterIQ@Gmail.com</a> so we can improve the app!
                </Typography>
              </CardContent>
            </Card>

            <Card elevation={1} sx={{ mb: 2, borderRadius: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Q: How do I add friends?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  A: Go to Friends tab and search by name or employee number
                </Typography>
              </CardContent>
            </Card>

            <Card elevation={1} sx={{ mb: 2, borderRadius: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Q: Can I request new features?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  A: Absolutely! We love hearing your ideas. Feel free to request any cool features via email.
                </Typography>
              </CardContent>
            </Card>

            <Card elevation={1} sx={{ mb: 2, borderRadius: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Q: How do I view weather information?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  A: Click on any airport code (like CVG or LAX) in the daily schedule to see current weather
                </Typography>
              </CardContent>
            </Card>

            <Card elevation={1} sx={{ mb: 2, borderRadius: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Q: How do I track an aircraft?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  A: Click on any tail number (like #N123AB) to see live tracking information
                </Typography>
              </CardContent>
            </Card>

            <Card elevation={1} sx={{ mb: 2, borderRadius: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Q: Does this work offline?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  A: Yes! Your schedule is cached locally so you can access it without internet
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}

        {settingsTab === 'contact' && (
          <Box className="settings-content">
            <Typography variant="h6" gutterBottom>📧 Contact Us</Typography>
            <Stack spacing={2}>
              <Card elevation={1} sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{ fontSize: 24 }}>📧</Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">Email Support</Typography>
                      <Typography variant="body2">
                        <a href="mailto:FlightRosterIQ@Gmail.com" style={{ color: 'inherit', textDecoration: 'underline' }}>
                          FlightRosterIQ@Gmail.com
                        </a>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        For general inquiries, feature requests, and support
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
              
              <Card elevation={1} sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{ fontSize: 24 }}>💡</Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">Feature Requests</Typography>
                      <Typography variant="body2">Have an idea to improve the app? We'd love to hear it!</Typography>
                      <Typography variant="body2" color="text.secondary">Email us with your suggestions</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
              
              <Card elevation={1} sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{ fontSize: 24 }}>🐛</Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">Report Issues</Typography>
                      <Typography variant="body2">Found a bug? Let us know so we can fix it</Typography>
                      <Typography variant="body2" color="text.secondary">Include details about what went wrong</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Box>
        )}

        <Box className="settings-footer" sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
            Made with ❤️ for airline crew members
          </Typography>
          <Typography variant="caption" color="text.secondary" align="center" display="block" gutterBottom>
            Supported by ABX AIR pilot
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
            <Button 
              href="https://cash.app/$FlightRosterIQ"
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              size="small"
            >
              💰 Donate
            </Button>
            <Button 
              onClick={handleLogout} 
              variant="outlined" 
              color="error"
              startIcon={<LogoutIcon />}
              size="small"
            >
              Logout
            </Button>
          </Stack>
        </Box>
      </Box>
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
      // Stop adding weeks once we've rendered all days
      if (day > daysInMonth) {
        break
      }
      
      const week = []
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < firstDay) {
          week.push(
            <Box key={`empty-${j}`} sx={{ minHeight: 80, border: 1, borderColor: 'divider' }} />
          )
        } else if (day > daysInMonth) {
          week.push(
            <Box key={`empty-${j}`} sx={{ minHeight: 80, border: 1, borderColor: 'divider' }} />
          )
        } else {
          const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
          const dateKey = date.toISOString().split('T')[0]
          const daySchedule = monthData[dateKey]
          const hasFlights = daySchedule?.length > 0
          const hasArrivalFlights = hasFlights && daySchedule.some(f => f.isArrivalDay)
          const hasDepartureFlights = hasFlights && daySchedule.some(f => !f.isArrivalDay)
          const isTraining = hasFlights && daySchedule[0]?.isTraining
          const isReserve = hasFlights && daySchedule[0]?.isReserveDuty
          const dutyType = isTraining || isReserve ? (daySchedule[0]?.title || daySchedule[0]?.dutyType || daySchedule[0]?.pairingId) : null
          const isToday = day === today.getDate() && 
                          viewMonth.getMonth() === today.getMonth() && 
                          viewMonth.getFullYear() === today.getFullYear()
          
          // Determine colors and styles
          let bgColor = 'background.paper'
          let borderColor = 'divider'
          let dayColor = 'text.primary'
          
          if (isToday) {
            borderColor = 'primary.main'
          }
          
          if (hasFlights) {
            if (isTraining) {
              bgColor = 'rgba(33, 150, 243, 0.08)'
              dayColor = 'primary.main'
            } else if (isReserve) {
              bgColor = 'rgba(3, 169, 244, 0.08)'
              dayColor = 'info.main'
            } else if (hasArrivalFlights && !hasDepartureFlights) {
              bgColor = 'rgba(255, 152, 0, 0.08)'
              dayColor = 'warning.main'
            } else {
              bgColor = 'rgba(76, 175, 80, 0.08)'
              dayColor = 'success.main'
            }
          }
          
          week.push(
            <Box 
              key={day}
              onClick={() => {
                setSelectedDate(dateKey)
                setActiveTab('daily')
              }}
              sx={{ 
                minHeight: 80,
                p: 1,
                border: 1,
                borderColor: borderColor,
                borderWidth: isToday ? 2 : 1,
                bgcolor: bgColor,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: hasFlights ? bgColor : 'action.hover',
                  boxShadow: 1
                }
              }}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: isToday ? 700 : 600,
                  color: dayColor,
                  mb: 0.5
                }}
              >
                {day}
              </Typography>
              {hasFlights && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'block',
                    fontSize: '0.7rem',
                    color: dayColor,
                    fontWeight: 500
                  }}
                >
                  {(isTraining || isReserve) ? dutyType : 
                   hasArrivalFlights && !hasDepartureFlights ? `${daySchedule.length} arrival${daySchedule.length > 1 ? 's' : ''}` :
                   `${daySchedule.length} flight${daySchedule.length > 1 ? 's' : ''}`}
                </Typography>
              )}
            </Box>
          );
          day++;
        }
      }
      calendar.push(
        <Box key={i} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
          {week}
        </Box>
      )
    }
    
    const nextMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1)
    const prevMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1)
    const hasNextMonthSchedule = hasScheduleForMonth(nextMonth.getFullYear(), nextMonth.getMonth())
    const isCurrentMonth = viewMonth.getMonth() === today.getMonth() && viewMonth.getFullYear() === today.getFullYear()
    
    // Check if we're at the earliest allowed month (previous month from today)
    const earliestDate = new Date(today)
    earliestDate.setMonth(earliestDate.getMonth() - 1)
    earliestDate.setDate(1)
    const isAtEarliestMonth = viewMonth.getFullYear() === earliestDate.getFullYear() && 
                              viewMonth.getMonth() === earliestDate.getMonth()
    
    // Check if we're at the latest allowed month (next month from today)
    const latestDate = new Date(today)
    latestDate.setMonth(latestDate.getMonth() + 1)
    latestDate.setDate(1)
    const isAtLatestMonth = viewMonth.getFullYear() === latestDate.getFullYear() && 
                            viewMonth.getMonth() === latestDate.getMonth()
    
    return (
      <Box className="monthly-view" sx={{ px: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          {!isAtEarliestMonth ? (
            <Button 
              variant="outlined" 
              size="small"
              onClick={goToPreviousMonth}
              startIcon={<Box>←</Box>}
            >
              Previous
            </Button>
          ) : (
            <Box sx={{ width: 100 }} />
          )}
          <Typography variant="h6" component="h2">
            {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Typography>
          {!isAtLatestMonth ? (
            <Button 
              variant="outlined" 
              size="small"
              onClick={goToNextMonth}
              endIcon={<Box>→</Box>}
            >
              Next
            </Button>
          ) : (
            <Box sx={{ width: 100 }} />
          )}
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, mb: 2 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Box key={day} sx={{ textAlign: 'center', py: 1, fontWeight: 600, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="body2">{day}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>{calendar}</Box>
      </Box>
    )
  }

  const renderDailyView = () => {
    console.log('🔍 renderDailyView called')
    console.log('🔍 selectedDate:', selectedDate)
    console.log('🔍 schedule state:', schedule)
    console.log('🔍 schedule.flights:', schedule?.flights)
    const flights = getScheduleForDate(selectedDate)
    console.log('🔍 getScheduleForDate returned:', flights)
    const selectedDateObj = new Date(selectedDate + 'T00:00:00')
    const formattedDate = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    
    const goToPreviousDay = () => {
      const prevDate = new Date(selectedDateObj)
      prevDate.setDate(prevDate.getDate() - 1)
      const dateString = prevDate.toISOString().split('T')[0]
      setSelectedDate(dateString)
      setActiveTab('daily')
    }

    const goToNextDay = () => {
      const nextDate = new Date(selectedDateObj)
      nextDate.setDate(nextDate.getDate() + 1)
      const dateString = nextDate.toISOString().split('T')[0]
      setSelectedDate(dateString)
      setActiveTab('daily')
    }

    if (!flights) {
      return (
        <Box className="daily-view" sx={{ px: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <IconButton onClick={goToPreviousDay} size="large">
              <Box>←</Box>
            </IconButton>
            <Typography variant="h6" component="h2">
              📋 {formattedDate}
            </Typography>
            <IconButton onClick={goToNextDay} size="large">
              <Box>→</Box>
            </IconButton>
          </Stack>
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              No flights scheduled for this day
            </Typography>
          </Box>
        </Box>
      )
    }

    return (
      <Box className="daily-view" sx={{ px: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <IconButton onClick={goToPreviousDay} size="large">
            <Box>←</Box>
          </IconButton>
          <Typography variant="h6" component="h2">
            📋 {formattedDate}
          </Typography>
          <IconButton onClick={goToNextDay} size="large">
            <Box>→</Box>
          </IconButton>
        </Stack>
        <Box>
          {/* Check if this is a training duty */}
          {flights[0]?.isTraining ? (
            <Card sx={{ mb: 2 }} elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box>🎓</Box>
                  Training: {flights[0]?.dutyType || flights[0]?.pairingId}
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Start:</Typography>
                    <Typography variant="body1">{flights[0]?.departure || flights[0]?.startTime}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">End:</Typography>
                    <Typography variant="body1">{flights[0]?.arrival || flights[0]?.endTime}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Location:</Typography>
                    <Typography variant="body1">{flights[0]?.origin || flights[0]?.startLocation || 'Training Facility'}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ) : flights[0]?.isReserveDuty ? (
            <Card sx={{ mb: 2 }} elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: 'info.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box>📅</Box>
                  Reserve Duty: {flights[0]?.title || flights[0]?.dutyType || 'RSV'}
                </Typography>
                <Stack spacing={2}>
                  {flights[0]?.pairingId && flights[0]?.pairingId !== flights[0]?.title && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">Pairing:</Typography>
                      <Typography variant="body1">{flights[0]?.pairingId}</Typography>
                    </Box>
                  )}
                  <Box>
                    <Typography variant="body2" color="text.secondary">Start:</Typography>
                    <Typography variant="body1">{flights[0]?.departure || flights[0]?.startTime}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">End:</Typography>
                    <Typography variant="body1">{flights[0]?.arrival || flights[0]?.endTime}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Location:</Typography>
                    <Typography variant="body1">{flights[0]?.origin || flights[0]?.startLocation || 'Base'}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <>
              <Typography variant="h6" sx={{ mb: 2 }}>Pairing: {flights[0]?.pairingId || 'N/A'}</Typography>
              {flights.map((flight, idx) => (
            <Card 
              key={idx} 
              sx={{ mb: 2, cursor: 'pointer', '&:hover': { boxShadow: 4 } }} 
              onClick={() => {
                console.log('Flight data:', flight);
                console.log('Actual Departure:', flight.actualDeparture);
                console.log('Actual Arrival:', flight.actualArrival);
                console.log('Crew Members:', flight.crewMembers);
                setSelectedFlight({...flight, originalDate: selectedDate});
              }}
              elevation={2}
            >
              <CardContent>
                <Stack spacing={2}>
                  {flight.isDeadhead && (
                    <Chip label="DH - Deadhead Flight" size="small" color="warning" />
                  )}
                  {flight.isGroundTransport && (
                    <Chip label="🚗 Ground Transportation" size="small" color="info" />
                  )}
                  
                  {/* Flight Header */}
                  <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" component="strong">
                        {flight.flightNumber}
                      </Typography>
                      {flight.operatingAirline && flight.isCodeshare && (
                        <Chip 
                          label={flight.operatingAirline} 
                          size="small" 
                          variant="outlined"
                          title={`Operated by ${flight.operatingAirline}`}
                        />
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography 
                        component="span"
                        sx={{ 
                          cursor: 'pointer',
                          fontWeight: 600,
                          color: 'primary.main',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                        onClick={async (e) => {
                          e.stopPropagation()
                          setWeatherAirport(flight.origin)
                          const weather = await fetchRealWeather(flight.origin)
                          setWeatherData(prev => ({ ...prev, [flight.origin]: weather }))
                        }}
                      >
                        {flight.origin}
                      </Typography>
                      <Typography>→</Typography>
                      <Typography 
                        component="span"
                        sx={{ 
                          cursor: 'pointer',
                          fontWeight: 600,
                          color: 'primary.main',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                        onClick={async (e) => {
                          e.stopPropagation()
                          setWeatherAirport(flight.destination)
                          const weather = await fetchRealWeather(flight.destination)
                          setWeatherData(prev => ({ ...prev, [flight.destination]: weather }))
                        }}
                      >
                        {flight.destination}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Report Time - Always based on scheduled departure */}
                  <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Report Time:
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {calculateReportTime(flight.departure, flight.origin, flight.destination).lt} LT
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {calculateReportTime(flight.departure, flight.origin, flight.destination).utc} UTC
                      </Typography>
                    </Stack>
                  </Box>

                  {/* Flight Times - Show "Actual" for past flights, "Scheduled" for future */}
                  <Stack spacing={1.5}>
                    {(() => {
                      const flightDate = new Date(flight.date + 'T23:59:59')
                      const today = new Date()
                      const isPastFlight = flightDate < today
                      
                      return (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {isPastFlight ? 'Actual:' : 'Scheduled:'}
                          </Typography>
                          <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                            <Typography variant="body2">
                              {flight.departure} - {flight.arrival} LT
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {convertToUTC(flight.departure)} - {convertToUTC(flight.arrival)} UTC
                            </Typography>
                          </Stack>
                        </Box>
                      )
                    })()}
                  </Stack>

                  {/* Aircraft Info */}
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {flight.aircraft}
                    </Typography>
                    {(flight.tail || flight.tailNumber) && (
                      <Chip
                        label={`✈️ ${flight.tail || flight.tailNumber}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                  </Stack>

                  {/* Crew Members */}
                  {flight.crewMembers && flight.crewMembers.length > 0 && (
                    <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Typography>👥</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Crew Members
                        </Typography>
                      </Stack>
                      <Stack spacing={1}>
                        {flight.crewMembers.map((crew, cIdx) => (
                          <Stack key={cIdx} direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                            <Chip label={crew.role} size="small" color="primary" variant="outlined" />
                            <Typography variant="body2">{crew.name}</Typography>
                            {crew.phone && (
                              <Typography
                                component="a"
                                href={`tel:${crew.phone}`}
                                variant="body2"
                                onClick={(e) => e.stopPropagation()}
                                sx={{ 
                                  color: 'primary.main',
                                  textDecoration: 'none',
                                  '&:hover': { textDecoration: 'underline' }
                                }}
                              >
                                📞 {crew.phone}
                              </Typography>
                            )}
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ textAlign: 'center', fontStyle: 'italic' }}
                  >
                    Click for details →
                  </Typography>
                </Stack>

                {/* Layover/Hotel Info */}
                {flight.layover && flight.layover.hotel && (
                  <Box 
                    sx={{ 
                      mt: 2, 
                      p: 1.5, 
                      bgcolor: 'info.light', 
                      borderRadius: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'info.main', '& *': { color: 'white' } }
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedFlight({...flight, showHotelDetails: true, originalDate: selectedDate})
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography>🏨</Typography>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {flight.layover.hotel.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Click for details
                        </Typography>
                        <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                          <Typography variant="caption">
                            ✅ Check-in: {calculateCheckinTime(flight.actualArrival || flight.arrival)}
                          </Typography>
                          {flights[idx + 1] && (
                            <Typography variant="caption">
                              🚪 Check-out: {calculateCheckoutTime(flights[idx + 1].departure)}
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    </Stack>
                  </Box>
                )}
              </CardContent>
          </Card>
          ))}
            
            {/* Hotel Information - shown right after flights */}
            {schedule?.hotelsByDate && schedule.hotelsByDate[selectedDate] && schedule.hotelsByDate[selectedDate].length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>🏨 Hotel Information</Typography>
                <Stack spacing={2}>
                  {schedule.hotelsByDate[selectedDate].map((hotel, hIdx) => {
                  // Calculate check-in/check-out times based on surrounding flights
                  const lastFlight = flights[flights.length - 1]
                  
                  // Find next scheduled flight (search up to 7 days ahead)
                  let firstNextFlight = null
                  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
                    const checkDate = new Date(new Date(selectedDate).getTime() + (daysAhead * 86400000))
                    const checkDateStr = checkDate.toISOString().split('T')[0]
                    const nextFlights = getScheduleForDate(checkDateStr)
                    if (nextFlights && nextFlights.length > 0) {
                      firstNextFlight = nextFlights[0]
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
                    <Card key={hIdx} elevation={2}>
                      <CardContent 
                        sx={{ cursor: 'pointer' }}
                        onClick={() => {
                          const query = encodeURIComponent(`${hotel.name} ${hotel.address || hotel.location || ''}`);
                          window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                        }}
                        title="Click to view on Google Maps"
                      >
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                          <Typography variant="h5">🏨</Typography>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {hotel.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              📍 {hotel.location}
                            </Typography>
                          </Box>
                        </Stack>

                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Check-in:</Typography>
                            <Typography variant="body2">{checkInTime}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="text.secondary">Check-out:</Typography>
                            <Typography variant="body2">{checkOutTime}</Typography>
                          </Grid>
                          {hotel.address && (
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">Address:</Typography>
                              <Typography 
                                component="a"
                                href={`https://maps.google.com/?q=${encodeURIComponent(hotel.address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="body2"
                                sx={{ 
                                  color: 'primary.main',
                                  textDecoration: 'none',
                                  '&:hover': { textDecoration: 'underline' }
                                }}
                              >
                                {hotel.address}
                              </Typography>
                            </Grid>
                          )}
                          {hotel.phone && (
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">Phone:</Typography>
                              <Typography 
                                component="a"
                                href={`tel:${hotel.phone}`}
                                variant="body2"
                                sx={{ 
                                  color: 'primary.main',
                                  textDecoration: 'none',
                                  '&:hover': { textDecoration: 'underline' }
                                }}
                              >
                                📞 {hotel.phone}
                              </Typography>
                            </Grid>
                          )}
                        </Grid>

                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ mt: 2, display: 'block', fontStyle: 'italic' }}
                        >
                          Click to open in Google Maps
                        </Typography>
                      </CardContent>
                    </Card>
                  );
                })}
                </Stack>
              </Box>
            )}
            
            </>
          )}
        </Box>
        
      </Box>
    )
  }

  if (!token) {
    return (
      <ThemeProvider theme={muiTheme}>
        <Box 
          className="app" 
          onTouchStart={handleTouchStart} 
          onTouchMove={handleTouchMove} 
          onTouchEnd={handleTouchEnd}
          sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 2
          }}
        >
          <Container maxWidth="sm">
            <Zoom in={true} timeout={500}>
              <Card 
                elevation={8}
                sx={{
                  borderRadius: 4,
                  overflow: 'visible',
                  position: 'relative'
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  {/* Logo Section */}
                  <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Avatar 
                      sx={{ 
                        width: 80, 
                        height: 80, 
                        margin: '0 auto 16px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        fontSize: '2.5rem'
                      }}
                    >
                      ✈️
                    </Avatar>
                    <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#1e3a8a' }}>
                      FlightRosterIQ
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Smart Crew Scheduling Platform
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      v{APP_VERSION}
                    </Typography>
                  </Box>

                  {!accountType ? (
                    <Fade in={true} timeout={600}>
                      <Box>
                        <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
                          Select Account Type
                        </Typography>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                          <Button
                            variant="contained"
                            size="large"
                            startIcon={<FlightIcon />}
                            onClick={() => setAccountType('pilot')}
                            sx={{
                              py: 2,
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              '&:hover': {
                                background: 'linear-gradient(135deg, #5568d3 0%, #6b4193 100%)',
                              },
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 0.5
                            }}
                          >
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              Pilot Account
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.9 }}>
                              Full access to schedule, friends & more
                            </Typography>
                          </Button>
                          
                          <Button
                            variant="outlined"
                            size="large"
                            startIcon={<FamilyIcon />}
                            onClick={() => setAccountType('family')}
                            sx={{
                              py: 2,
                              borderWidth: 2,
                              '&:hover': {
                                borderWidth: 2,
                                bgcolor: 'rgba(30, 58, 138, 0.04)',
                              },
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 0.5
                            }}
                          >
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              Family Account
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: 'text.secondary',
                                fontWeight: 500
                              }}
                            >
                              View schedule (limited access)
                            </Typography>
                          </Button>
                        </Box>

                        {/* Info Section */}
                        <Paper 
                          elevation={0} 
                          sx={{ 
                            bgcolor: '#f8fafc', 
                            p: 2, 
                            borderRadius: 2,
                            cursor: 'pointer'
                          }}
                          onClick={() => setShowHomeInfo(!showHomeInfo)}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <InfoIcon color="primary" />
                              <Typography variant="body2" fontWeight={600}>
                                How This Works
                              </Typography>
                            </Box>
                            <ExpandMoreIcon 
                              sx={{ 
                                transform: showHomeInfo ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.3s'
                              }} 
                            />
                          </Box>
                          
                          <Collapse in={showHomeInfo}>
                            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                <SecurityIcon color="primary" fontSize="small" />
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>Secure</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Your credentials are never stored
                                  </Typography>
                                </Box>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                <SpeedIcon color="primary" fontSize="small" />
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>Real-Time</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Data fetched directly from crew portals
                                  </Typography>
                                </Box>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                <PeopleIcon color="primary" fontSize="small" />
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>Multi-User</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Each pilot sees their own schedule
                                  </Typography>
                                </Box>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                <AirlinesIcon color="primary" fontSize="small" />
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>Multi-Airline</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Supports ABX Air & ATI
                                  </Typography>
                                </Box>
                              </Box>
                              <Chip 
                                label="BETA" 
                                size="small" 
                                color="secondary" 
                                sx={{ alignSelf: 'flex-start', mt: 1 }}
                              />
                            </Box>
                          </Collapse>
                        </Paper>
                      </Box>
                    </Fade>
                  ) : (
                    <Fade in={true} timeout={600}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                          <IconButton onClick={() => setAccountType(null)} color="primary">
                            <ArrowBackIcon />
                          </IconButton>
                          <Chip 
                            icon={accountType === 'pilot' ? <FlightIcon /> : <FamilyIcon />}
                            label={accountType === 'pilot' ? 'Pilot Login' : 'Family Login'}
                            color="primary"
                            sx={{ px: 1 }}
                          />
                          <Box sx={{ width: 40 }} />
                        </Box>

                        {accountType === 'pilot' && (
                          <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel>Select Airline</InputLabel>
                            <Select
                              value={airline || ''}
                              onChange={(e) => setAirline(e.target.value)}
                              label="Select Airline"
                              required
                            >
                              <MenuItem value="abx">ABX AIR (GB)</MenuItem>
                              <MenuItem value="ati">Air Transport International (8C)</MenuItem>
                            </Select>
                          </FormControl>
                        )}

                        <Box component="form" onSubmit={(e) => handleLogin(e, accountType)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {accountType === 'pilot' ? (
                            <>
                              <TextField
                                id="username"
                                name="username"
                                label="Username"
                                type="text"
                                autoComplete="username"
                                value={credentials.username}
                                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                                required
                                fullWidth
                                variant="outlined"
                              />
                              <TextField
                                id="password"
                                name="password"
                                label="Password"
                                type="password"
                                autoComplete="current-password"
                                value={credentials.password}
                                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                required
                                fullWidth
                                variant="outlined"
                              />
                            </>
                          ) : (
                            <TextField
                              id="access-code"
                              name="access-code"
                              label="Family Access Code"
                              type="text"
                              autoComplete="off"
                              value={credentials.username}
                              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                              required
                              fullWidth
                              variant="outlined"
                              placeholder="Enter code provided by pilot"
                            />
                          )}
                          
                          <Button 
                            type="submit" 
                            variant="contained" 
                            size="large"
                            disabled={loading || (accountType === 'pilot' && !airline)}
                            sx={{
                              py: 1.5,
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              '&:hover': {
                                background: 'linear-gradient(135deg, #5568d3 0%, #6b4193 100%)',
                              }
                            }}
                          >
                            {loading ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={20} sx={{ color: 'white' }} />
                                <span>Logging in...</span>
                              </Box>
                            ) : (
                              'Login'
                            )}
                          </Button>
                        </Box>

                        {accountType === 'pilot' && (
                          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Alert severity="info" icon={<LockIcon />} sx={{ fontSize: '0.875rem' }}>
                              Enter your crew portal credentials. They will be validated against {airline?.toUpperCase()} crew portal.
                            </Alert>
                            <Alert severity="warning" icon={<AccessTimeIcon />} sx={{ fontSize: '0.875rem' }}>
                              First login may take 30-60 seconds while syncing your schedule.
                            </Alert>
                          </Box>
                        )}

                        {accountType === 'family' && (
                          <Alert severity="info" sx={{ mt: 3, fontSize: '0.875rem' }}>
                            Family accounts use codes provided by pilots. Enter the code to view the schedule.
                          </Alert>
                        )}
                      </Box>
                    </Fade>
                  )}
                  
                  {error && (
                    <Fade in={true}>
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                      </Alert>
                    </Fade>
                  )}
                </CardContent>
              </Card>
            </Zoom>
            
            {/* Install PWA Button */}
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleInstallApp}
                sx={{
                  py: 1.5,
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#667eea',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 1)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                  }
                }}
                startIcon={<Box sx={{ fontSize: '1.5rem' }}>⬇️</Box>}
              >
                Install App
              </Button>
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'rgba(255,255,255,0.9)' }}>
                Install FlightRosterIQ for offline access & notifications
              </Typography>
            </Box>
          </Container>
        </Box>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={muiTheme}>
    <div 
      className={`app ${theme === 'dark' ? 'dark-theme' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      
      {/* Trial Expiration Modal */}
      {showSubscriptionModal && subscriptionStatus === 'expired' && userType !== 'family' && (
        <Dialog
          open={showSubscriptionModal && subscriptionStatus === 'expired' && userType !== 'family'}
          onClose={() => setShowSubscriptionModal(false)}
          maxWidth="md"
          fullWidth
          disableEscapeKeyDown
        >
          <DialogTitle>
            <Typography variant="h5" align="center">
              ⏰ {trialStartDate ? 'Trial Period Ended' : 'Subscription Required'}
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" align="center" gutterBottom>
              Continue using FlightRosterIQ with a subscription
            </Typography>
            
            <div className="subscription-plans">
              <div className="plan-card monthly">
                <div className="plan-header">
                  <h3>Monthly</h3>
                  <div className="plan-price">
                    <span className="price">$4.99</span>
                    <span className="period">/month</span>
                  </div>
                </div>
                <div className="subscription-features">
                  <div className="feature-item">✓ Unlimited schedule access</div>
                  <div className="feature-item">✓ Real-time crew portal sync</div>
                  <div className="feature-item">✓ Weather & flight tracking</div>
                  <div className="feature-item">✓ Crew messaging & friends</div>
                  <div className="feature-item">✓ Flight statistics</div>
                </div>
                <button 
                  className="subscribe-btn"
                  onClick={() => {
                    alert('PayPal integration ready! You will create subscription plans in your PayPal Business account and add the Plan IDs here.')
                    // TODO: Add PayPal Monthly Plan ID from PayPal Dashboard
                  }}
                >
                  Subscribe with PayPal
                </button>
              </div>
              
              <div className="plan-card yearly popular">
                <div className="popular-badge">BEST VALUE</div>
                <div className="plan-header">
                  <h3>Yearly</h3>
                  <div className="plan-price">
                    <span className="price">$49.99</span>
                    <span className="period">/year</span>
                  </div>
                  <div className="savings">Save $10/year!</div>
                </div>
                <div className="subscription-features">
                  <div className="feature-item">✓ Everything in Monthly</div>
                  <div className="feature-item">✓ Save 17% annually</div>
                  <div className="feature-item">✓ Priority support</div>
                  <div className="feature-item">✓ Early access to new features</div>
                </div>
                <button 
                  className="subscribe-btn yearly-btn"
                  onClick={() => {
                    alert('PayPal integration ready! You will create subscription plans in your PayPal Business account and add the Plan IDs here.')
                    // TODO: Add PayPal Yearly Plan ID from PayPal Dashboard
                  }}
                >
                  Subscribe with PayPal
                </button>
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setShowSubscriptionModal(false)}
              fullWidth
              variant="outlined"
            >
              Maybe Later
            </Button>
          </DialogActions>
        </Dialog>
      )}
      
      {/* Trial Warning Banner */}
      {token && userType !== 'family' && subscriptionStatus === 'trial' && daysRemaining <= 7 && daysRemaining > 0 && (
        <div className="trial-warning-banner">
          <span>⏰ {daysRemaining} days left in your free trial</span>
          <button 
            className="trial-subscribe-btn"
            onClick={() => setShowSubscriptionModal(true)}
          >
            Subscribe
          </button>
        </div>
      )}
      
      <AppBar position="sticky" elevation={1} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ flexGrow: 1 }}>
            {(loading || scrapingInProgress) && (
              <Card
                elevation={3}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  backgroundColor: theme === 'dark' ? 'rgba(37, 37, 56, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(8px)',
                  border: theme === 'dark' 
                    ? '1px solid rgba(255, 255, 255, 0.1)' 
                    : '1px solid rgba(0, 0, 0, 0.08)',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={14} />
                  <Typography variant="caption" fontWeight={500} sx={{ fontSize: '0.75rem' }}>
                    {loadingMessage || (scrapingInProgress ? 'Loading...' : 'Loading...')}
                  </Typography>
                </Stack>
              </Card>
            )}
            <FlightIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h6" component="h1" sx={{ fontWeight: 700, color: 'primary.main' }}>
              FlightRosterIQ
            </Typography>
            {token && (
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                Welcome {userType === 'family' && familyMemberName 
                  ? familyMemberName 
                  : pilotProfile?.name || username || 'Pilot'}!
              </Typography>
            )}
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: serverStatus === 'online' ? '#22c55e' : serverStatus === 'offline' ? '#ef4444' : '#fbbf24',
                boxShadow: serverStatus === 'online' ? '0 0 8px #22c55e' : serverStatus === 'offline' ? '0 0 8px #ef4444' : '0 0 8px #fbbf24',
                animation: serverStatus === 'checking' ? 'pulse 2s infinite' : 'none',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 }
                }
              }}
              title={serverStatus === 'online' ? 'Server Online' : serverStatus === 'offline' ? 'Server Offline' : 'Checking Server...'}
            />
          </Stack>
          
          {token && (
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ display: { xs: 'none', md: 'none' } }}>
                <Typography variant="body2" color="text.secondary">
                  {userType === 'family' && familyMemberName 
                    ? `Welcome ${familyMemberName}!` 
                    : `Welcome ${pilotProfile?.name || username || 'Pilot'}!`}
                </Typography>
                {nextDutyCheckIn && userType === 'pilot' && (
                  <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
                    Next Report: {(() => {
                      const now = new Date()
                      const diff = nextDutyCheckIn - now
                      
                      if (diff < 0) return 'Check schedule'
                      
                      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                      
                      if (days > 0) {
                        return `${days}d ${hours}h ${minutes}m`
                      } else if (hours > 0) {
                        return `${hours}h ${minutes}m`
                      } else {
                        return `${minutes}m`
                      }
                    })()}
                  </Typography>
                )}
              </Box>
              
              {(userType === 'pilot' || userType === 'family') && (
                <IconButton
                  onClick={(e) => handleRefreshScraping(e)}
                  disabled={loading || scrapingInProgress}
                  title="Refresh Schedule from Crew Portal"
                  color="primary"
                  size="small"
                >
                  <CircularProgress size={20} sx={{ display: loading || scrapingInProgress ? 'block' : 'none' }} />
                  <Box sx={{ display: loading || scrapingInProgress ? 'none' : 'block' }}>🔄</Box>
                </IconButton>
              )}
              
              <Box className="theme-dropdown-container" sx={{ position: 'relative' }}>
                <IconButton
                  onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                  size="small"
                  color="primary"
                >
                  {themePreference === 'system' ? <SystemThemeIcon /> : 
                   themePreference === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
                </IconButton>
                
                {showThemeDropdown && (
                  <Paper
                    sx={{
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      mt: 1,
                      minWidth: 120,
                      zIndex: 1300,
                      boxShadow: 3
                    }}
                  >
                    <MenuList>
                      <MenuItem
                        onClick={async () => {
                          setThemePreference('light')
                          setTheme('light')
                          await localforage.setItem('themePreference', 'light')
                          setShowThemeDropdown(false)
                        }}
                        selected={themePreference === 'light'}
                      >
                        <ListItemIcon>
                          <LightModeIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Light</ListItemText>
                      </MenuItem>
                      
                      <MenuItem
                        onClick={async () => {
                          setThemePreference('dark')
                          setTheme('dark')
                          await localforage.setItem('themePreference', 'dark')
                          setShowThemeDropdown(false)
                        }}
                        selected={themePreference === 'dark'}
                      >
                        <ListItemIcon>
                          <DarkModeIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Dark</ListItemText>
                      </MenuItem>
                      
                      <MenuItem
                        onClick={async () => {
                          setThemePreference('system')
                          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
                          setTheme(systemTheme)
                          await localforage.setItem('themePreference', 'system')
                          setShowThemeDropdown(false)
                        }}
                        selected={themePreference === 'system'}
                      >
                        <ListItemIcon>
                          <SystemThemeIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>System</ListItemText>
                      </MenuItem>
                    </MenuList>
                  </Paper>
                )}
              </Box>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ pb: 8 }}>
        {activeTab === 'monthly' && renderMonthlyView()}
        {activeTab === 'daily' && renderDailyView()}
        {activeTab === 'friends' && renderFriendsView()}
        {activeTab === 'notifications' && renderNotificationsView()}
        {activeTab === 'settings' && renderSettingsView()}
        {activeTab === 'stats' && renderStatsView()}
        {activeTab === 'tripTrade' && airline === 'abx' && userType === 'pilot' && renderTripTradeView()}
        
        {!schedule && !loading && userType === 'pilot' && activeTab !== 'settings' && activeTab !== 'friends' && activeTab !== 'notifications' && activeTab !== 'stats' && activeTab !== 'tripTrade' && (
          <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No schedule data available
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Use the refresh button above to load your schedule
            </Typography>
          </Box>
        )}
        
        {!schedule && !loading && userType === 'family' && activeTab !== 'settings' && activeTab !== 'notifications' && activeTab !== 'stats' && (
          <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No schedule data available
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Use the refresh button above to load the pilot's schedule
            </Typography>
          </Box>
        )}
      </Box>

      {token && (
        <Paper 
          elevation={3} 
          sx={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            zIndex: 1100 
          }}
        >
          <BottomNavigation
            value={activeTab}
            onChange={(event, newValue) => setActiveTab(newValue)}
            showLabels
            sx={{
              width: '100%',
              overflowX: 'auto',
              overflowY: 'hidden',
              pl: 2,
              pr: 1,
              scrollSnapType: 'x mandatory',
              borderBottomLeftRadius: '20px',
              borderBottomRightRadius: '20px',
              '&::-webkit-scrollbar': {
                height: '4px'
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '4px'
              }
            }}
          >
            <BottomNavigationAction
              label="Month"
              value="monthly"
              icon={<CalendarIcon />}
              sx={{ minWidth: { xs: 80, sm: 'auto' } }}
            />
            <BottomNavigationAction
              label="Daily"
              value="daily"
              icon={<TodayIcon />}
              sx={{ minWidth: { xs: 80, sm: 'auto' } }}
            />
            {userType === 'pilot' && (
              <BottomNavigationAction
                label="Friends"
                value="friends"
                icon={<GroupIcon />}
                sx={{ minWidth: { xs: 80, sm: 'auto' } }}
              />
            )}
            <BottomNavigationAction
              label="Alerts"
              value="notifications"
              icon={
                <Badge badgeContent={getNotificationCount()} color="error">
                  <NotificationsIcon />
                </Badge>
              }
              sx={{ minWidth: { xs: 80, sm: 'auto' } }}
            />
            <BottomNavigationAction
              label="Stats"
              value="stats"
              icon={<StatsIcon />}
              sx={{ minWidth: { xs: 80, sm: 'auto' } }}
            />
            {airline === 'abx' && userType === 'pilot' && (
              <BottomNavigationAction
                label="Trips"
                value="tripTrade"
                icon={<SwapIcon />}
                sx={{ minWidth: { xs: 80, sm: 'auto' } }}
              />
            )}
            <BottomNavigationAction
              label="Settings"
              value="settings"
              icon={<SettingsIcon />}
              sx={{ minWidth: { xs: 80, sm: 'auto' } }}
            />
          </BottomNavigation>
        </Paper>
      )}

      {selectedFlight && (
        <Dialog
          open={Boolean(selectedFlight)}
          onClose={() => setSelectedFlight(null)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { maxHeight: '90vh' }
          }}
        >
          <DialogTitle>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center">
                <TakeoffIcon />
                <Typography variant="h6">Flight Details</Typography>
              </Stack>
              <IconButton onClick={() => setSelectedFlight(null)} size="small">
                ✕
              </IconButton>
            </Stack>
          </DialogTitle>
          
          <Tabs 
            value={flightDetailTab} 
            onChange={(e, newValue) => setFlightDetailTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}
          >
            <Tab label="Flight" value="flight" icon={<TakeoffIcon />} iconPosition="start" />
            {userType !== 'family' && (
              <Tab label="Crew" value="crew" icon={<GroupIcon />} iconPosition="start" />
            )}
            <Tab 
              label="Weather" 
              value="weather" 
              icon={<Box>🌤️</Box>} 
              iconPosition="start"
              onClick={async () => {
                setFlightDetailTab('weather');
                // Auto-load weather for origin and destination
                if (selectedFlight.origin && !weatherData[selectedFlight.origin]) {
                  const originWeather = await fetchRealWeather(selectedFlight.origin);
                  setWeatherData(prev => ({ ...prev, [selectedFlight.origin]: originWeather }));
                }
                if (selectedFlight.destination && !weatherData[selectedFlight.destination]) {
                  const destWeather = await fetchRealWeather(selectedFlight.destination);
                  setWeatherData(prev => ({ ...prev, [selectedFlight.destination]: destWeather }));
                }
              }}
            />
          </Tabs>
          
          <DialogContent dividers>
            {/* Flight Tab Content */}
            {flightDetailTab === 'flight' && (
            <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Flight Information</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Flight Number</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedFlight.flightNumber}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Route</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedFlight.origin} → {selectedFlight.destination}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Departure</Typography>
                  <Box>
                    <Typography variant="body2">
                      {(() => {
                        // Use originalDate (the clicked date) if available, otherwise fall back to flight.date
                        const dateToDisplay = selectedFlight.originalDate || selectedFlight.date;
                        const parsedDate = new Date(dateToDisplay + 'T00:00:00'); // Add time to avoid timezone issues
                        return parsedDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                      })()} - {selectedFlight.departure} LT
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{convertToUTC(selectedFlight.departure)} UTC</Typography>
                    {selectedFlight.actualDeparture && (
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                          Actual: {selectedFlight.actualDeparture.includes('LT') ? selectedFlight.actualDeparture.split('LT')[0].trim().split(' ').pop() : selectedFlight.actualDeparture} LT
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {selectedFlight.actualDeparture.includes('UTC)') ? selectedFlight.actualDeparture.match(/\(([^)]+)\)/)?.[1]?.replace('UTC', '').trim() : convertToUTC(selectedFlight.actualDeparture)} UTC
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Arrival</Typography>
                  <Box>
                    {(() => {
                      // Use originalDate (the clicked date) if available, otherwise fall back to flight.date
                      const dateToDisplay = selectedFlight.originalDate || selectedFlight.date;
                      const departureDate = new Date(dateToDisplay + 'T00:00:00'); // Add time to avoid timezone issues
                      const deptMatch = selectedFlight.departure.match(/(\d{2}):?(\d{2})/)
                      const arrMatch = selectedFlight.arrival.match(/(\d{2}):?(\d{2})/)
                      
                      if (deptMatch && arrMatch) {
                        const deptMinutes = parseInt(deptMatch[1]) * 60 + parseInt(deptMatch[2])
                        const arrMinutes = parseInt(arrMatch[1]) * 60 + parseInt(arrMatch[2])
                        
                        if (arrMinutes < deptMinutes) {
                          const arrivalDate = new Date(departureDate)
                          arrivalDate.setDate(arrivalDate.getDate() + 1)
                          return (
                            <>
                              <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 600 }}>
                                {arrivalDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} - {selectedFlight.arrival} LT (Next Day)
                              </Typography>
                              <Typography variant="caption" color="text.secondary">{convertToUTC(selectedFlight.arrival)} UTC</Typography>
                            </>
                          )
                        }
                      }
                      
                      return (
                        <>
                          <Typography variant="body2">
                            {departureDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} - {selectedFlight.arrival} LT
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{convertToUTC(selectedFlight.arrival)} UTC</Typography>
                        </>
                      )
                    })()}
                    {selectedFlight.actualArrival && (
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                          Actual: {selectedFlight.actualArrival.includes('LT') ? selectedFlight.actualArrival.split('LT')[0].trim().split(' ').pop() : selectedFlight.actualArrival} LT
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {selectedFlight.actualArrival.includes('UTC)') ? selectedFlight.actualArrival.match(/\(([^)]+)\)/)?.[1]?.replace('UTC', '').trim() : convertToUTC(selectedFlight.actualArrival)} UTC
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Aircraft Information</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Aircraft Type</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedFlight.aircraft}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Tail Number</Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: 600,
                      color: (selectedFlight.tail || selectedFlight.tailNumber) ? 'primary.main' : 'text.primary',
                      cursor: (selectedFlight.tail || selectedFlight.tailNumber) ? 'pointer' : 'default',
                      '&:hover': {
                        textDecoration: (selectedFlight.tail || selectedFlight.tailNumber) ? 'underline' : 'none'
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      const tailNum = selectedFlight.tail || selectedFlight.tailNumber
                      if (tailNum) {
                        // Open FlightAware directly in new tab
                        window.open(`https://www.flightaware.com/live/flight/${tailNum}`, '_blank')
                      }
                    }}
                  >
                    {selectedFlight.tail || selectedFlight.tailNumber || 'Not Available'}
                  </Typography>
                </Grid>
                {selectedFlight.gate && (
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Gate</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedFlight.gate}</Typography>
                  </Grid>
                )}
                {selectedFlight.terminal && (
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Terminal</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedFlight.terminal}</Typography>
                  </Grid>
                )}
                {selectedFlight.aircraftLocation && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Aircraft Location</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedFlight.aircraftLocation}</Typography>
                  </Grid>
                )}
                {selectedFlight.aircraftStatus && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Status</Typography>
                    <Chip label={selectedFlight.aircraftStatus} color="primary" size="small" />
                  </Grid>
                )}
              </Grid>
            </Box>
            </>
            )}
            
            {/* Crew Tab Content */}
            {flightDetailTab === 'crew' && userType !== 'family' && (
              <Box>
                {selectedFlight.crewMembers && selectedFlight.crewMembers.length > 0 ? (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>👥 Crew Members</Typography>
                    <List>
                      {selectedFlight.crewMembers.map((member, idx) => (
                        <ListItem key={idx} alignItems="flex-start">
                          <ListItemAvatar>
                            <Avatar>{member.name.charAt(0)}</Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={<Typography variant="body1" sx={{ fontWeight: 600 }}>{member.name}</Typography>}
                            secondary={
                              <Stack spacing={0.5}>
                                <Typography variant="body2" color="text.secondary">{member.role}</Typography>
                                <Typography variant="caption" color="text.secondary">ID: {member.employeeId}</Typography>
                                {member.phone && (
                                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                    <Button
                                      component="a"
                                      href={`tel:${member.phone.replace(/\D/g, '')}`}
                                      size="small"
                                      variant="outlined"
                                      startIcon={<Box>📞</Box>}
                                    >
                                      Call
                                    </Button>
                                    <Button
                                      component="a"
                                      href={`sms:${member.phone.replace(/\D/g, '')}`}
                                      size="small"
                                      variant="outlined"
                                      startIcon={<Box>💬</Box>}
                                    >
                                      Text
                                    </Button>
                                  </Stack>
                                )}
                              </Stack>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h6" gutterBottom>👥 Crew Members</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No crew information available for this flight
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
            
            {/* Weather Tab Content */}
            {flightDetailTab === 'weather' && (
              <div className="flight-weather-container">
                {/* Departure Airport Weather */}
                <div className="airport-weather-section">
                  <h3>🛫 Departure: {selectedFlight.origin}</h3>
                  {weatherData[selectedFlight.origin] ? (
                    <>
                      <div className="weather-section">
                        <h4>METAR (Current Weather)</h4>
                        <div className="weather-code">
                          {weatherData[selectedFlight.origin].metar}
                        </div>
                      </div>
                      
                      {weatherData[selectedFlight.origin].decoded && !weatherData[selectedFlight.origin].error && (
                        <div className="weather-section atis-section">
                          <h4>📻 Decoded</h4>
                          <div className="atis-info">
                            {(weatherData[selectedFlight.origin].decoded.observationTime || weatherData[selectedFlight.origin].decoded.time) && (
                              <p><strong>Time:</strong> {weatherData[selectedFlight.origin].decoded.observationTime || weatherData[selectedFlight.origin].decoded.time}</p>
                            )}
                            {weatherData[selectedFlight.origin].decoded.flightCategory && (
                              <p><strong>Category:</strong> <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                background: weatherData[selectedFlight.origin].decoded.flightCategory === 'VFR' ? '#22c55e' :
                                           weatherData[selectedFlight.origin].decoded.flightCategory === 'MVFR' ? '#3b82f6' :
                                           weatherData[selectedFlight.origin].decoded.flightCategory === 'IFR' ? '#ef4444' : '#991b1b',
                                color: 'white'
                              }}>{weatherData[selectedFlight.origin].decoded.flightCategory}</span></p>
                            )}
                            {weatherData[selectedFlight.origin].decoded.temperature && (
                              <p><strong>Temp:</strong> {weatherData[selectedFlight.origin].decoded.temperature}</p>
                            )}
                            {weatherData[selectedFlight.origin].decoded.dewpoint && (
                              <p><strong>Dewpoint:</strong> {weatherData[selectedFlight.origin].decoded.dewpoint}</p>
                            )}
                            {weatherData[selectedFlight.origin].decoded.wind && (
                              <p><strong>Wind:</strong> {weatherData[selectedFlight.origin].decoded.wind}</p>
                            )}
                            {weatherData[selectedFlight.origin].decoded.visibility && (
                              <p><strong>Visibility:</strong> {weatherData[selectedFlight.origin].decoded.visibility}</p>
                            )}
                            {weatherData[selectedFlight.origin].decoded.sky && (
                              <p><strong>Sky:</strong> {weatherData[selectedFlight.origin].decoded.sky}</p>
                            )}
                            {weatherData[selectedFlight.origin].decoded.altimeter && (
                              <p><strong>Altimeter:</strong> {weatherData[selectedFlight.origin].decoded.altimeter}</p>
                            )}
                            {weatherData[selectedFlight.origin].decoded.wxString && (
                              <p><strong>Weather:</strong> {weatherData[selectedFlight.origin].decoded.wxString}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="weather-section" style={{background: '#dbeafe', padding: '20px', borderRadius: '8px'}}>
                      <p style={{color: '#1e40af', fontSize: '14px'}}>Loading weather data...</p>
                    </div>
                  )}
                </div>

                {/* Arrival Airport Weather */}
                <div className="airport-weather-section">
                  <h3>🛬 Arrival: {selectedFlight.destination}</h3>
                  {weatherData[selectedFlight.destination] ? (
                    <>
                      <div className="weather-section">
                        <h4>METAR (Current Weather)</h4>
                        <div className="weather-code">
                          {weatherData[selectedFlight.destination].metar}
                        </div>
                      </div>
                      
                      {weatherData[selectedFlight.destination].decoded && !weatherData[selectedFlight.destination].error && (
                        <div className="weather-section atis-section">
                          <h4>📻 Decoded</h4>
                          <div className="atis-info">
                            {(weatherData[selectedFlight.destination].decoded.observationTime || weatherData[selectedFlight.destination].decoded.time) && (
                              <p><strong>Time:</strong> {weatherData[selectedFlight.destination].decoded.observationTime || weatherData[selectedFlight.destination].decoded.time}</p>
                            )}
                            {weatherData[selectedFlight.destination].decoded.flightCategory && (
                              <p><strong>Category:</strong> <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                background: weatherData[selectedFlight.destination].decoded.flightCategory === 'VFR' ? '#22c55e' :
                                           weatherData[selectedFlight.destination].decoded.flightCategory === 'MVFR' ? '#3b82f6' :
                                           weatherData[selectedFlight.destination].decoded.flightCategory === 'IFR' ? '#ef4444' : '#991b1b',
                                color: 'white'
                              }}>{weatherData[selectedFlight.destination].decoded.flightCategory}</span></p>
                            )}
                            {weatherData[selectedFlight.destination].decoded.temperature && (
                              <p><strong>Temp:</strong> {weatherData[selectedFlight.destination].decoded.temperature}</p>
                            )}
                            {weatherData[selectedFlight.destination].decoded.dewpoint && (
                              <p><strong>Dewpoint:</strong> {weatherData[selectedFlight.destination].decoded.dewpoint}</p>
                            )}
                            {weatherData[selectedFlight.destination].decoded.wind && (
                              <p><strong>Wind:</strong> {weatherData[selectedFlight.destination].decoded.wind}</p>
                            )}
                            {weatherData[selectedFlight.destination].decoded.visibility && (
                              <p><strong>Visibility:</strong> {weatherData[selectedFlight.destination].decoded.visibility}</p>
                            )}
                            {weatherData[selectedFlight.destination].decoded.sky && (
                              <p><strong>Sky:</strong> {weatherData[selectedFlight.destination].decoded.sky}</p>
                            )}
                            {weatherData[selectedFlight.destination].decoded.altimeter && (
                              <p><strong>Altimeter:</strong> {weatherData[selectedFlight.destination].decoded.altimeter}</p>
                            )}
                            {weatherData[selectedFlight.destination].decoded.wxString && (
                              <p><strong>Weather:</strong> {weatherData[selectedFlight.destination].decoded.wxString}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="weather-section" style={{background: '#dbeafe', padding: '20px', borderRadius: '8px'}}>
                      <p style={{color: '#1e40af', fontSize: '14px'}}>Loading weather data...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {weatherAirport && (
        <Dialog
          open={Boolean(weatherAirport)}
          onClose={() => setWeatherAirport(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">🌤️ Weather for {weatherAirport}</Typography>
              <IconButton onClick={() => setWeatherAirport(null)} size="small">✕</IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent dividers>
            
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
          </DialogContent>
        </Dialog>
      )}

      {trackedAircraft && (
        <Dialog
          open={Boolean(trackedAircraft)}
          onClose={() => setTrackedAircraft(null)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">📡 Aircraft Tracking: {trackedAircraft.tail}</Typography>
              <IconButton onClick={() => setTrackedAircraft(null)} size="small">✕</IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent dividers>
            
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
          </DialogContent>
        </Dialog>
      )}

      {selectedFlight && selectedFlight.showHotelDetails && selectedFlight.layover?.hotel && (
        <Dialog
          open={Boolean(selectedFlight?.showHotelDetails)}
          onClose={() => setSelectedFlight(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">🏨 Hotel Information</Typography>
              <IconButton onClick={() => setSelectedFlight(null)} size="small">✕</IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent dividers>
            
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
          </DialogContent>
        </Dialog>
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

      {/* Update Available Modal */}
      {showUpdateModal && (
        <Dialog
          open={showUpdateModal}
          maxWidth="xs"
          fullWidth
          disableEscapeKeyDown
        >
          <Card sx={{ maxWidth: 400, margin: 'auto', mt: 10 }}>
            <CardContent>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
                  🎉 Update Available!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  A new version of FlightRosterIQ is available
                </Typography>
              </Box>

              <Box sx={{ 
                bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)', 
                p: 2, 
                borderRadius: 2, 
                mb: 3,
                border: 1,
                borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Current Version:
                  </Typography>
                  <Chip label={oldVersion || 'Unknown'} size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    New Version:
                  </Typography>
                  <Chip label={APP_VERSION} size="small" color="primary" />
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  ✨ What's New in v{APP_VERSION}:
                </Typography>
                <Stack spacing={0.5}>
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    🎭 Bubble UI styling with rounded corners
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    • Tail numbers non-clickable in daily view
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    • Updated disclaimer with report time warning
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    • Scheduled vs Actual times clarity
                  </Typography>
                </Stack>
              </Box>

              <Alert severity="info" sx={{ mb: 3, fontSize: '0.875rem' }}>
                📱 The app will reload automatically after updating. Your data will be preserved.
              </Alert>

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleUpdateApp}
                sx={{
                  py: 1.5,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6b4193 100%)',
                  }
                }}
              >
                Update Now
              </Button>
            </CardContent>
          </Card>
        </Dialog>
      )}

      {/* Version Display at Bottom */}
      {token && (
        <Box
          sx={{
            position: 'fixed',
            bottom: { xs: 60, sm: 20 },
            left: 0,
            right: 0,
            textAlign: 'center',
            py: 0.5,
            zIndex: 1200,
            pointerEvents: 'none'
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.7rem',
              opacity: 0.6,
              fontWeight: 500,
              textShadow: theme === 'dark' ? '0 1px 2px rgba(0,0,0,0.8)' : '0 1px 2px rgba(255,255,255,0.8)',
              backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
              px: 1.5,
              py: 0.25,
              borderRadius: 1
            }}
          >
            v{APP_VERSION}
          </Typography>
        </Box>
      )}
    </div>
    </ThemeProvider>
  )
}

export default App
