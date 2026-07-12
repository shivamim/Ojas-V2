import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useEscalations } from '@/api/hooks'
import { Button } from '@/components/ui/button'
import { Bell, LogOut, Menu, Settings, User, AlertTriangle, Info, X, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface NotificationItem {
  id: string
  type: 'critical' | 'warning' | 'info'
  message: string
  timestamp: string
  read: boolean
}

const Header = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { data: escalationsData } = useEscalations('OPEN')
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  // Build notifications from real escalations data
  const escalationNotifs: NotificationItem[] = (escalationsData || []).slice(0, 5).map((e: any) => ({
    id: e.id,
    type: e.level === 'CRITICAL' || e.level === 'HIGH' ? 'critical' : 'warning',
    message: `Escalation: ${e.patient_name || 'Patient'} — ${e.trigger_detail || e.description || 'Needs attention'}`,
    timestamp: e.created_at,
    read: false,
  }))

  const [notifications, setNotifications] = useState<NotificationItem[]>(escalationNotifs)

  // Sync when escalations load
  useEffect(() => {
    if (escalationNotifs.length > 0) {
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((p) => p.id))
        const newItems = escalationNotifs.filter((n) => !existingIds.has(n.id))
        return [...newItems, ...prev].slice(0, 10)
      })
    }
  }, [escalationsData])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    toast.success('All notifications marked as read')
  }

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const clearNotifications = () => {
    setNotifications([])
    toast.success('Notifications cleared')
  }

  // Click outside to close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const getIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle size={16} className="text-red-500" />
      case 'warning':
        return <Clock size={16} className="text-amber-500" />
      default:
        return <Info size={16} className="text-blue-500" />
    }
  }

  const getBg = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-100'
      case 'warning':
        return 'bg-amber-50 border-amber-100'
      default:
        return 'bg-blue-50 border-blue-100'
    }
  }

  const formatTime = (ts: string) => {
    const date = new Date(ts)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000)
    if (diff < 1) return 'Just now'
    if (diff < 60) return `${diff}m ago`
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
    return `${Math.floor(diff / 1440)}d ago`
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md dark:bg-background/95">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
            <Menu size={20} />
          </Button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-ojas-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">O</span>
            </div>
            <span className="font-bold text-lg hidden sm:inline text-foreground">Ojas</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-xl hover:bg-accent transition-colors"
            >
              <Bell size={20} className="text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                    onClick={() => setNotifOpen(false)}
                  />
                  {/* Dropdown */}
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-card rounded-2xl shadow-2xl border border-border z-50 overflow-hidden dark:bg-card"
                  >
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
                      <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs text-ojas-600 hover:underline font-medium dark:text-ojas-400">
                            Mark all read
                          </button>
                        )}
                        <button onClick={clearNotifications} className="p-1 hover:bg-accent rounded-lg transition-colors">
                          <X size={14} className="text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Bell size={32} className="mx-auto mb-2 opacity-40" />
                          <p className="text-sm">No notifications</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => {
                              markRead(n.id)
                              navigate('/escalations')
                              setNotifOpen(false)
                            }}
                            className={`w-full text-left p-3 border-b border-border/50 hover:bg-accent/50 transition-colors flex gap-3 ${n.read ? 'opacity-60' : ''}`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getBg(n.type)}`}>
                              {getIcon(n.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground leading-snug">{n.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">{formatTime(n.timestamp)}</p>
                            </div>
                            {!n.read && <div className="w-2 h-2 bg-ojas-500 rounded-full mt-2 shrink-0" />}
                          </button>
                        ))
                      )}
                    </div>
                    <div className="p-3 border-t border-border bg-accent/30">
                      <Link
                        to="/escalations"
                        onClick={() => setNotifOpen(false)}
                        className="block text-center text-xs text-ojas-600 font-medium hover:underline dark:text-ojas-400"
                      >
                        View all escalations
                      </Link>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-accent transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-ojas-100 dark:bg-ojas-900/30 flex items-center justify-center text-xs font-bold text-ojas-700 dark:text-ojas-300">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium leading-tight text-foreground">{user?.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground leading-tight">{user?.role || 'Staff'}</p>
              </div>
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-56 bg-card rounded-2xl shadow-xl border border-border z-50 overflow-hidden"
                >
                  <div className="p-3 border-b border-border">
                    <p className="text-sm font-medium text-foreground">{user?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => { navigate('/settings'); setProfileOpen(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                    >
                      <Settings size={16} />
                      Settings
                    </button>
                    <button
                      onClick={() => { navigate('/profile'); setProfileOpen(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                    >
                      <User size={16} />
                      Profile
                    </button>
                  </div>
                  <div className="p-2 border-t border-border">
                    <button
                      onClick={() => { logout(); setProfileOpen(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
