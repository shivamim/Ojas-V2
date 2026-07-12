import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  FileText,
  Settings,
  Building2,
  ClipboardList,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const Sidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { user } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/patients', icon: Users, label: 'Patients' },
    { to: '/escalations', icon: AlertTriangle, label: 'Escalations' },
    { to: '/reports', icon: FileText, label: 'Reports' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]

  const superAdminItems = [
    { to: '/superadmin/hospitals', icon: Building2, label: 'Hospitals' },
    { to: '/superadmin/audit-logs', icon: ClipboardList, label: 'Audit Logs' },
  ]

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

  const NavLink = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    const active = isActive(to)
    return (
      <Link
        to={to}
        onClick={onClose}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group ${
          active
            ? 'bg-[hsl(var(--ojas-50))] text-[hsl(var(--ojas-700))] font-medium dark:bg-[hsl(var(--ojas-900))] dark:text-[hsl(var(--ojas-100))]'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        {active && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[hsl(var(--ojas-500))] rounded-r-full"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
        <Icon size={20} className={active ? 'text-[hsl(var(--ojas-600))] dark:text-[hsl(var(--ojas-400))]' : 'text-muted-foreground group-hover:text-foreground'} />
        {!collapsed && <span className="text-sm">{label}</span>}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`fixed top-0 left-0 z-50 h-screen bg-card border-r border-border flex flex-col transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--ojas-600))] flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">O</span>
            </div>
            {!collapsed && <span className="font-bold text-lg">Ojas</span>}
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            <button onClick={onClose} className="lg:hidden p-1 hover:bg-slate-100 rounded-lg">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.to} {...item} />
          ))}

          {user?.role === 'SUPER_ADMIN' && (
            <>
              {!collapsed && <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4">Super Admin</div>}
              {collapsed && <div className="my-4 border-t border-border" />}
              {superAdminItems.map((item) => (
                <NavLink key={item.to} {...item} />
              ))}
            </>
          )}
        </nav>

        {/* User Mini Profile */}
        {!collapsed && (
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[hsl(var(--ojas-100))] flex items-center justify-center text-xs font-bold text-[hsl(var(--ojas-700))] dark:bg-[hsl(var(--ojas-800))] dark:text-[hsl(var(--ojas-200))]">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        )}
      </motion.aside>
    </>
  )
}

export default Sidebar
