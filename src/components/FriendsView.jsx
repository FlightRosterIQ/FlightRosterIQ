import { Users, UserPlus, MessageSquare } from 'lucide-react'

export const FriendsView = ({ friends, onAddFriend }) => {
  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Friends & Crew</h2>
              <p className="text-sm text-muted-foreground">
                {friends.length} connection{friends.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <button
            onClick={onAddFriend}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span className="font-medium">Add Friend</span>
          </button>
        </div>
      </div>
      
      {/* Friends List */}
      {friends.length > 0 ? (
        <div className="grid gap-3">
          {friends.map((friend, idx) => (
            <div 
              key={idx}
              className="bg-card rounded-xl shadow-sm p-5 border border-border hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">
                      {friend.name?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-foreground">{friend.name}</h3>
                    <p className="text-sm text-muted-foreground">{friend.role || 'Crew Member'}</p>
                  </div>
                </div>
                
                <button className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm p-12 border border-border text-center">
          <Users className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No friends added yet</p>
          <button
            onClick={onAddFriend}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Add Your First Friend
          </button>
        </div>
      )}
    </div>
  )
}
