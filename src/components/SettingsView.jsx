import { Settings as SettingsIcon, User, Bell, Globe, Trash2 } from 'lucide-react'
import { Input, Select, Button } from './ui'

export const SettingsView = ({ username, settings, onSettingsChange, onDeleteAccount }) => {
  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Settings</h2>
            <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
          </div>
        </div>
      </div>
      
      {/* Pilot Information Card */}
      <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Pilot Information</h3>
        </div>
        
        <div className="space-y-4">
          <Input 
            label="Full Name" 
            defaultValue={username}
            className="bg-input-background"
          />
          <Input 
            label="Employee ID" 
            placeholder="Enter your employee ID"
            className="bg-input-background"
          />
          <Select 
            label="Base Airport"
            className="bg-input-background"
          >
            <option>CVG - Cincinnati</option>
            <option>ILN - Wilmington</option>
            <option>SDF - Louisville</option>
          </Select>
        </div>
      </div>
      
      {/* Notifications Card */}
      <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Notifications</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <div className="font-medium text-foreground">Schedule Changes</div>
              <div className="text-sm text-muted-foreground">Get notified about flight updates</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <div className="font-medium text-foreground">Weather Alerts</div>
              <div className="text-sm text-muted-foreground">Severe weather notifications</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>
      
      {/* Preferences Card */}
      <div className="bg-card rounded-xl shadow-sm p-5 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Preferences</h3>
        </div>
        
        <div className="space-y-4">
          <Select 
            label="Timezone"
            className="bg-input-background"
          >
            <option>UTC</option>
            <option>Local Time</option>
            <option>Base Time</option>
          </Select>
          
          <Select 
            label="Date Format"
            className="bg-input-background"
          >
            <option>MM/DD/YYYY</option>
            <option>DD/MM/YYYY</option>
            <option>YYYY-MM-DD</option>
          </Select>
        </div>
      </div>
      
      {/* Danger Zone Card */}
      <div className="bg-card rounded-xl shadow-sm p-5 border border-destructive/20">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="w-5 h-5 text-destructive" />
          <h3 className="font-semibold text-destructive">Danger Zone</h3>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        
        <Button 
          variant="danger" 
          onClick={onDeleteAccount}
          className="w-full"
        >
          Delete Account
        </Button>
      </div>
    </div>
  )
}
