import { Clock, Hotel, Calendar } from 'lucide-react'
import { FlightCard } from './FlightCard'

export const DailyView = ({ selectedDate, dailyFlights, hotels, onDateChange, onFlightClick }) => {
  return (
    <div className="space-y-4">
      {/* Date Picker Card */}
      <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Daily Schedule</h2>
            <p className="text-sm text-muted-foreground">View flights for a specific day</p>
          </div>
        </div>
        
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all"
        />
      </div>
      
      {/* Flights */}
      {dailyFlights.length > 0 ? (
        <div className="space-y-3">
          {dailyFlights.map((flight, idx) => (
            <FlightCard 
              key={idx} 
              flight={flight} 
              onClick={() => onFlightClick(flight)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm p-12 border border-border text-center">
          <Calendar className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted-foreground">No flights scheduled on this date</p>
        </div>
      )}
      
      {/* Hotels */}
      {hotels.length > 0 && (
        <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Hotel className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Layover Hotels</h3>
          </div>
          
          <div className="space-y-3">
            {hotels.map((hotel, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-muted/50">
                <div className="font-medium text-foreground">{hotel.name}</div>
                <div className="text-sm text-muted-foreground mt-1">{hotel.location}</div>
                {hotel.phone && (
                  <div className="text-sm text-muted-foreground mt-1">{hotel.phone}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
