import { cn } from '../lib/utils'

export const Button = ({ children, variant = 'primary', size = 'md', className, ...props }) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:opacity-90 active:opacity-80 shadow-sm hover:shadow-md',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-muted active:bg-muted',
    outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground',
    ghost: 'text-foreground hover:bg-muted active:bg-muted',
    danger: 'bg-destructive text-destructive-foreground hover:opacity-90 active:opacity-80 shadow-sm hover:shadow-md',
    success: 'bg-success text-success-foreground hover:opacity-90 active:opacity-80 shadow-sm hover:shadow-md',
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }
  
  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  )
}

export const Card = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        'bg-card text-card-foreground rounded-xl shadow-sm overflow-hidden border border-border',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader = ({ children, className, ...props }) => {
  return (
    <div className={cn('px-6 py-4 border-b border-border', className)} {...props}>
      {children}
    </div>
  )
}

export const CardContent = ({ children, className, ...props }) => {
  return (
    <div className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  )
}

export const Input = ({ label, error, className, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full px-4 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all',
          error && 'border-destructive focus:ring-destructive',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}

export const Select = ({ label, error, children, className, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1">
          {label}
        </label>
      )}
      <select
        className={cn(
          'w-full px-4 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all',
          error && 'border-destructive focus:ring-destructive',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}

export const Badge = ({ children, variant = 'default', className, ...props }) => {
  const variants = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-destructive/10 text-destructive',
  }
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export const Alert = ({ children, variant = 'info', className, ...props }) => {
  const variants = {
    info: 'bg-primary/10 border-primary/20 text-primary',
    success: 'bg-success/10 border-success/20 text-success',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-destructive/10 border-destructive/20 text-destructive',
  }
  
  return (
    <div
      className={cn(
        'rounded-lg border-2 px-4 py-3',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const Spinner = ({ size = 'md', className }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }
  
  return (
    <div className={cn('inline-block animate-spin rounded-full border-4 border-muted border-t-primary', sizes[size], className)} />
  )
}

export const Dialog = ({ isOpen, onClose, children, className }) => {
  if (!isOpen) return null
  
  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={cn(
            'bg-card text-card-foreground rounded-xl shadow-md max-w-md w-full max-h-[90vh] overflow-auto animate-slide-up border border-border',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </>
  )
}

export const DialogHeader = ({ children, className, ...props }) => {
  return (
    <div className={cn('px-6 py-4 border-b border-border', className)} {...props}>
      {children}
    </div>
  )
}

export const DialogContent = ({ children, className, ...props }) => {
  return (
    <div className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  )
}

export const DialogFooter = ({ children, className, ...props }) => {
  return (
    <div className={cn('px-6 py-4 border-t border-border flex justify-end gap-2', className)} {...props}>
      {children}
    </div>
  )
}

export const Tabs = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div className={cn('border-b border-border', className)}>
      <nav className="flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            )}
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export const Avatar = ({ src, alt, size = 'md', className, children }) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  }
  
  return (
    <div className={cn('rounded-full overflow-hidden bg-muted flex items-center justify-center font-medium text-muted-foreground', sizes[size], className)}>
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        children || alt?.charAt(0).toUpperCase()
      )}
    </div>
  )
}

export const IconButton = ({ children, variant = 'default', size = 'md', className, ...props }) => {
  const variants = {
    default: 'text-foreground hover:bg-muted active:bg-muted',
    primary: 'text-primary hover:bg-primary/10 active:bg-primary/20',
  }
  
  const sizes = {
    sm: 'p-1',
    md: 'p-2',
    lg: 'p-3',
  }
  
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-all duration-200',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
