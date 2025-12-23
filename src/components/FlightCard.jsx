import { Plane, Clock, MapPin } from 'lucide-react'

export const FlightCard = ({ flight, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-card rounded-xl shadow-sm p-5 border border-border hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Plane className="w-6 h-6 text-primary" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-foreground">
                {flight.origin}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="text-lg font-semibold text-foreground">
                {flight.destination}
              </span>
            </div>
            
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>Flight {flight.flightNumber}</span>
              {flight.aircraftType && (
                <>
                  <span>•</span>
                  <span>{flight.aircraftType}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm font-medium text-foreground">
            {new Date(flight.departure).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-1 justify-end mt-1">
            <Clock className="w-3.5 h-3.5" />
            {new Date(flight.departure).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>
      
      {flight.crew && flight.crew.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {flight.crew.slice(0, 3).map((member, idx) => (
                <div 
                  key={idx}
                  className="w-8 h-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-medium"
                >
                  {member.name?.[0]}
                </div>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {flight.crew.length} crew member{flight.crew.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
