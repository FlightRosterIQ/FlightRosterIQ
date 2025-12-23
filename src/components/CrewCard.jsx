import { User, Mail, Phone } from 'lucide-react'

export const CrewCard = ({ member, onContact }) => {
  return (
    <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-semibold text-primary">
            {member.name?.[0]?.toUpperCase()}
          </span>
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{member.name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{member.role}</p>
          
          {member.employeeId && (
            <p className="text-xs text-muted-foreground mt-2">
              ID: {member.employeeId}
            </p>
          )}
          
          <div className="flex items-center gap-3 mt-3">
            {onContact && (
              <>
                <button 
                  onClick={() => onContact('email', member)}
                  className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </button>
                <button 
                  onClick={() => onContact('phone', member)}
                  className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  <Phone className="w-4 h-4 text-muted-foreground" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
