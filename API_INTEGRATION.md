# ABX Air NetLine/Crew API Integration

## Overview

FlightRosterIQ v1.0.7+ includes direct integration with the ABX Air crew management system API (NetLine/Crew by Lufthansa Systems). This integration enables real-time roster update detection and automatic synchronization of flight schedules.

## API Endpoints

### 1. Roster Updates Check

**Endpoint:** `GET /api/roster-updates`

**Purpose:** Check for roster changes without fetching full data

**Authentication:** Session-based via Bearer token. Backend extracts username from authenticated session.

**Request:**
```
GET /api/roster-updates
Authorization: Bearer {token}
Accept: application/json
```

**Backend Flow:**
1. Validate Bearer token
2. Extract username (employee ID) from session
3. Call ABX Air API: `https://crew.abxair.com/api/netline/crew/pems/rest/pems/idp/user/roster/{username}/updates`
4. Return result to client

**Response:**
```json
{
  "success": true,
  "result": {
    "roster": false,
    "checkins": [],
    "lastDailyRemarkTimestamp": "2025-10-20T12:31:07+0000",
    "lastRosterChange": "2025-12-17T02:50:06+0000",
    "lastNewsTimestamp": "2025-12-16T19:34:19+0000"
  }
}
```

**Fields:**
- `roster` (boolean): True if full roster data has changed
- `checkins` (array): New check-in information items
- `lastDailyRemarkTimestamp` (ISO 8601): Last daily remark update
- `lastRosterChange` (ISO 8601): Timestamp of last roster modification
- `lastNewsTimestamp` (ISO 8601): Last news/bulletin update

**Performance:**
- Average response time: ~124ms
- Polling interval: 5 minutes (configurable)

---

### 2. Full Roster Data Fetch

**Endpoint:** `GET /api/roster`

**Purpose:** Fetch complete roster data when updates are detected

**Authentication:** Session-based via Bearer token. Backend extracts username from authenticated session.

**Request:**
```
GET /api/roster
Authorization: Bearer {token}
Accept: application/json
```

**Backend Flow:**
1. Validate Bearer token
2. Extract username (employee ID) from session
3. Call ABX Air API: `https://crew.abxair.com/api/netline/crew/pems/rest/pems/idp/user/roster/{username}`
4. Return complete roster to client

**Response:** Complete roster object with flights, duties, and reserve assignments

---

## Implementation Details

### State Management

```javascript
// New state variables (App.jsx)
const [rosterUpdates, setRosterUpdates] = useState(null)
const [lastRosterCheck, setLastRosterCheck] = useState(null)
const [rosterUpdateAvailable, setRosterUpdateAvailable] = useState(false)
const [userId, setUserId] = useState(null) // Employee ID from ABX Air system
```

### Core Functions

#### `checkRosterUpdates()`
Polls the roster updates endpoint to detect changes without fetching full data.

**Features:**
- Lightweight API call (~124ms)
- Session-based authentication (no userId in URL)
- Detects roster changes via `lastRosterChange` timestamp
- Identifies new check-in information
- Triggers notifications when updates are found
- Runs every 5 minutes when `settings.autoRefresh` is enabled

**Flow:**
1. Check if token is available
2. Call `/api/roster-updates` with Bearer token
3. Backend extracts username from session
4. Compare `lastRosterChange` with cached timestamp
5. If changed, set `rosterUpdateAvailable = true`
6. Show notification banner and send push notification
7. Add entry to schedule changes

#### `fetchRosterData()`
Fetches complete roster data when user clicks "Fetch Update" button.

**Features:**
- Full roster synchronization
- Updates schedule state and localStorage
- Clears update flags after successful fetch
- Marks schedule change notifications as read

---

## User Experience

### Automatic Update Detection

1. **Background Polling:** App checks for roster updates every 5 minutes
2. **Update Banner:** When changes detected, prominent banner appears in Notifications tab
3. **Push Notifications:** Browser notification sent (if permission granted)
4. **Manual Check:** Users can trigger check via "Check for Roster Updates" button

### Notifications Tab UI

```jsx
{/* Roster Update Banner */}
{rosterUpdateAvailable && (
  <Card sx={{ mb: 2, bgcolor: 'primary.light' }}>
    <CardContent>
      <Typography variant="h6">Roster Update Available</Typography>
      <Typography variant="body2">
        Your schedule has been updated in the crew portal
      </Typography>
      <Button onClick={fetchRosterData}>Fetch Update</Button>
    </CardContent>
  </Card>
)}

{/* Manual Check Button */}
{userId && !rosterUpdateAvailable && (
  <Button onClick={checkRosterUpdates}>
    Check for Roster Updates
  </Button>
)}
```

---

## Authentication Flow

### Login Process

1. User enters ABX Air employee ID and password
2. Credentials validated against crew portal API
3. On success, `userId` (employee ID) stored in state and localStorage
4. Session token generated and stored
5. Automatic roster checking begins

### Session Persistence

```javascript
// Save userId on login
await localforage.setItem('userId', employeeId)

// Restore userId on app load
const cachedUserId = await localforage.getItem('userId')
if (cachedUserId) {
  setUserId(cachedUserId)
}
```

---

## Backend Proxy Requirements

### Vercel Configuration

The app uses relative URLs (`/api/...`) which Vercel proxies to the VPS backend. The backend server must implement session-based authentication.

### Session Management

The backend must:
1. Store username (employee ID) in session during `/api/authenticate`
2. Retrieve username from session for roster API calls
3. Use username to construct ABX Air API URLs

#### `/api/roster-updates` Handler

```javascript
app.get('/api/roster-updates', async (req, res) => {
  const authToken = req.headers.authorization
  
  // Extract username from session (implementation depends on your session strategy)
  const username = req.session?.username || req.user?.employeeId
  
  if (!username) {
    return res.status(401).json({ 
      success: false, 
      error: 'Not authenticated' 
    })
  }
  
  try {
    const response = await fetch(
      `https://crew.abxair.com/api/netline/crew/pems/rest/pems/idp/user/roster/${username}/updates`,
      {
        headers: {
          'Authorization': authToken,
          'Accept': 'application/json'
        }
      }
    )
    
    const data = await response.json()
    res.json({ success: true, result: data })
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check roster updates' 
    })
  }
})
```

#### `/api/roster` Handler

```javascript
app.get('/api/roster', async (req, res) => {
  const authToken = req.headers.authorization
  
  // Extract username from session
  const username = req.session?.username || req.user?.employeeId
  
  if (!username) {
    return res.status(401).json({ 
      success: false, 
      error: 'Not authenticated' 
    })
  }
  
  try {
    const response = await fetch(
      `https://crew.abxair.com/api/netline/crew/pems/rest/pems/idp/user/roster/${username}`,
      {
        headers: {
          'Authorization': authToken,
          'Accept': 'application/json'
        }
      }
    )
    
    const roster = await response.json()
    res.json({ success: true, roster })
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch roster data' 
    })
  }
})
```

#### `/api/authenticate` Handler Update

Ensure the authentication endpoint stores username in session:

```javascript
app.post('/api/authenticate', async (req, res) => {
  const { employeeId, password, airline } = req.body
  
  // Validate credentials against ABX Air API
  // ... authentication logic ...
  
  if (authSuccess) {
    // Store username in session for roster API calls
    req.session.username = employeeId
    req.session.airline = airline
    
    res.json({ 
      success: true, 
      credentialsValid: true,
      token: sessionToken 
    })
  }
})
```

---

## Error Handling

### Network Errors
- Roster check failures are logged but don't display errors to users
- Existing schedule data remains available offline
- Polling continues on next interval

### Authentication Errors
- 401 responses trigger re-authentication flow
- Expired tokens cleared and user prompted to login

### API Unavailability
- Graceful degradation to existing cached schedule
- User can manually retry via "Check for Roster Updates" button

---

## Performance Considerations

### Polling Optimization

**Interval:** 5 minutes (configurable)
- Balances freshness vs. API load
- Only polls when user is logged in and online
- Respects `settings.autoRefresh` preference

**Request Size:** ~1-2 KB per check
- Lightweight update check endpoint
- Full roster only fetched when changes detected

### Caching Strategy

```javascript
// Store timestamps to detect changes
await localforage.setItem('lastRosterCheck', new Date().toISOString())
await localforage.setItem('lastKnownRosterChange', lastChange)
```

---

## Testing

### Manual Testing

1. **Login:** Use real ABX Air credentials
2. **Check Updates:** Click "Check for Roster Updates" button
3. **View Response:** Check browser console for API response
4. **Verify Polling:** Leave app open for 5+ minutes, observe automatic checks
5. **Test Update Flow:** When update detected, click "Fetch Update"

### Console Logs

```javascript
// Expected logs:
👤 User ID stored for roster updates: {employeeId}
🔍 Checking roster updates for user {userId}
✅ Roster is up to date
// OR
✨ Roster update available: { roster: true, checkIns: false, lastChange: "..." }
```

---

## Future Enhancements

### Planned Features

1. **WebSocket Integration:** Real-time push instead of polling
2. **Differential Updates:** Only fetch changed flights
3. **Roster Comparison View:** Show what changed (before/after)
4. **Update History:** Track all roster changes over time
5. **Smart Notifications:** Filter important vs. minor changes

### API Expansion

- Daily remarks endpoint integration
- News/bulletins fetching
- Crew swap notifications
- Aircraft change alerts

---

## Security Considerations

### Authentication
- Authorization tokens passed via headers
- Tokens stored securely in IndexedDB (LocalForage)
- No passwords stored in plain text

### Privacy
- User ID only used for authorized API calls
- Data cached locally on device
- No third-party data sharing

### CORS
- Backend proxy handles CORS to crew portal
- App never makes direct cross-origin requests

---

## Version History

### v1.0.7 (December 17, 2025)
- ✨ Added roster updates API integration
- 🔔 Automatic polling every 5 minutes
- 🎯 Update detection and notification system
- 📥 One-click roster data synchronization
- 💾 Persistent userId storage and restoration

---

## Support

For issues or questions about the API integration:

**Email:** FlightRosterIQ@Gmail.com

**GitHub:** https://github.com/FlightRosterIQ/FlightRosterIQ

**API Documentation:** This file (API_INTEGRATION.md)
