# Enhanced Crew Scraper - Complete Data Extraction

## What's New

The enhanced scraper (`crew-scraper-enhanced.cjs`) now extracts **ALL** schedule data:

### ✅ Complete Features

1. **Accurate Flight Dates**
   - Parses actual departure/arrival dates from portal
   - Handles date format: "06Dec" → "2025-12-06T00:00:00.000Z"
   - Separate departure and arrival dates
   - Correct date assignment per flight (not just pairing start date)

2. **Hotel/Layover Information**
   - Hotel name, phone, address
   - Automatically matched to layover location
   - Extracted from hotel sections in portal

3. **Complete Crew Details**
   - Crew member names and positions
   - Captain (CA), First Officer (FO), Flight Attendants
   - Parsed from flight detail modals
   - Structured: `{firstName, lastName, position, fullName}`

4. **Aircraft Information**
   - Tail number (e.g., N1489A)
   - Aircraft type (e.g., 763 for 767-300)
   - Per-flight details

5. **Full Flight Data**
   - Flight number (e.g., GB3130)
   - Origin/Destination airports
   - Departure/Arrival times (Local Time)
   - Pairing numbers
   - Rank (Captain/First Officer)

## Testing the Enhanced Scraper

### Step 1: Test with Your Credentials

```powershell
# Set your credentials
$env:CREW_USERNAME="your_username"
$env:CREW_PASSWORD="your_password"
$env:CREW_AIRLINE="ABX Air"  # or "ATI"

# Run the enhanced scraper
node crew-scraper-enhanced.cjs
```

### Step 2: Check the Output

The scraper creates these files:

1. **schedule-complete.json** - Main output with all data
2. **portal-full-content.txt** - Raw text from portal (for debugging)

### Step 3: Verify Data Structure

```json
{
  "pilot": {
    "name": "JOHN SMITH",
    "employeeNumber": "152780",
    "airline": "ABX Air"
  },
  "pairings": [
    {
      "pairingNumber": "C6208",
      "startDate": "2025-12-06T00:00:00.000Z",
      "rank": "FO",
      "layover": "SDF",
      "hotel": {
        "name": "Hilton Garden Inn",
        "phone": "(502) 555-1234",
        "address": "123 Airport Rd, Louisville, KY"
      },
      "flights": [
        {
          "flightNumber": "GB3130",
          "aircraftType": "763",
          "tailNumber": "N1489A",
          "origin": "CVG",
          "destination": "SDF",
          "departureDate": "2025-12-06T00:00:00.000Z",
          "arrivalDate": "2025-12-07T00:00:00.000Z",
          "departureTime": "22:30",
          "arrivalTime": "00:04",
          "date": "2025-12-06T00:00:00.000Z",
          "crew": [
            {
              "firstName": "JOHN",
              "lastName": "SMITH",
              "position": "CA",
              "fullName": "JOHN SMITH"
            },
            {
              "firstName": "JANE",
              "lastName": "DOE",
              "position": "FO",
              "fullName": "JANE DOE"
            }
          ]
        }
      ]
    }
  ],
  "scrapedAt": "2025-12-21T17:30:00.000Z"
}
```

## Integration with Your App

### Replace Old Scraper

Once tested and working, replace the old scraper:

```powershell
# Backup old scraper
Copy-Item crew-scraper.cjs crew-scraper-OLD.cjs

# Use enhanced version
Copy-Item crew-scraper-enhanced.cjs crew-scraper.cjs

# Test integration
node crew-scraper.cjs
```

### Update App to Use New Data Structure

Your App.jsx already expects this data structure:
- ✅ `flight.date` - For calendar display
- ✅ `flight.departureTime` / `flight.arrivalTime`
- ✅ `pairing.hotel` - Hotel details
- ✅ `flight.crew` - Crew member array
- ✅ `pairing.layover` - Layover location

The enhanced scraper provides all of this!

## Daily Multi-Pilot Usage

### For Production Deployment

1. **Store User Credentials Securely**
   - Never store passwords in plain text
   - Use encrypted storage or secure vault
   - Each pilot has their own credentials

2. **Schedule Regular Scraping**
   - Run scraper 2-4 times per day
   - Check for schedule updates
   - Cache results for 5 minutes (already implemented in v1.0.1)

3. **Error Handling**
   - Retry logic already in place (v1.0.1)
   - Exponential backoff on failures
   - Notification on persistent failures

### Multi-Pilot Architecture

```javascript
// Example: Scrape for multiple pilots
async function scrapeForAllPilots(pilots) {
  const results = [];
  
  for (const pilot of pilots) {
    try {
      console.log(`🔄 Scraping for ${pilot.name}...`);
      
      const data = await scrapeCompleteSchedule({
        username: pilot.username,
        password: decrypt(pilot.encryptedPassword),
        airline: pilot.airline
      });
      
      results.push({
        pilotId: pilot.id,
        success: true,
        data
      });
      
    } catch (error) {
      console.error(`❌ Failed for ${pilot.name}:`, error);
      results.push({
        pilotId: pilot.id,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}
```

## Troubleshooting

### Missing Data

**Problem**: Hotel information not appearing
**Solution**: 
- Hotels might not be listed in current view
- Check if you need to navigate to a "Hotels" or "Layover" tab
- Update `extractHotelInfo()` function with correct selectors

**Problem**: Crew members empty
**Solution**:
- Crew details require clicking into each flight
- Check if detail buttons selector is correct: `[data-test-id="details-page-button"]`
- Verify crew member element selectors in portal

**Problem**: Wrong flight dates
**Solution**:
- Check date parsing logic in `parseCrewDate()`
- Verify date format in portal (e.g., "06Dec" vs "Dec 06")
- Ensure year handling is correct for year-end rollovers

### Performance Issues

**Problem**: Scraping too slow
**Solution**:
- Limit crew extraction: Set `maxFlights` lower (currently 20)
- Skip crew details: Set `extractCrewDetails: false`
- Increase timeouts if portal is slow

**Problem**: Timeouts
**Solution**:
- Increase `timeout` values in `waitForSelector` calls
- Add more `sleep()` delays between actions
- Check internet connection stability

## Comparison: Old vs Enhanced

| Feature | Old Scraper | Enhanced Scraper |
|---------|-------------|------------------|
| Flight dates | ❌ Inaccurate (pairing date only) | ✅ Accurate per-flight dates |
| Hotels | ❌ Not extracted | ✅ Full hotel details |
| Crew members | ⚠️ Limited | ✅ Complete with positions |
| Departure/Arrival dates | ❌ Same date | ✅ Separate dates |
| Layover info | ❌ Missing | ✅ Extracted |
| Date parsing | ⚠️ Manual | ✅ Automatic |
| Data structure | ⚠️ Inconsistent | ✅ Standardized |

## Next Steps

1. **Test the Enhanced Scraper**
   ```powershell
   node crew-scraper-enhanced.cjs
   ```

2. **Verify Output**
   - Check `schedule-complete.json`
   - Confirm all data is present
   - Verify dates are correct

3. **Replace Old Scraper**
   ```powershell
   Copy-Item crew-scraper-enhanced.cjs crew-scraper.cjs
   ```

4. **Update Version**
   - Change to v1.0.2
   - Deploy with complete data extraction

5. **Test Multi-Pilot**
   - Test with multiple pilot credentials
   - Verify concurrent scraping works
   - Check data isolation per pilot

## Support

If the enhanced scraper doesn't extract certain data:
1. Save the `portal-full-content.txt` file
2. Check the HTML structure in browser DevTools
3. Update selectors in the scraper code
4. Test iteratively until all data extracts correctly

---

**Ready to test!** Run the enhanced scraper and verify it captures all your schedule data. 🚀
