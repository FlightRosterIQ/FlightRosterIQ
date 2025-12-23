import { Calendar } from 'lucide-react'
import { FlightCard } from './FlightCard'

export const MonthlyView = ({ schedule, currentMonth, onFlightClick }) => {
  const flights = schedule?.flights || []
  
  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Monthly Schedule</h2>
            <p className="text-sm text-muted-foreground">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
      
      {/* Flight Cards */}
      {flights.length > 0 ? (
        <div className="space-y-3">
          {flights.slice(0, 20).map((flight, idx) => (
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
          <p className="text-muted-foreground">No flights scheduled this month</p>
        </div>
      )}
    </div>
  )
}
