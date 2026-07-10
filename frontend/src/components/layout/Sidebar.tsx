import { useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  AlertTriangle,
  FileText,
  Building2,
  ClipboardList,
  LogOut,
  X,
  Stethoscope,
  Settings,
  ChevronRight,
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'COORDINATOR', 'DOCTOR'] },
    { path: '/patients', label: 'Patients', icon: Users, roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'COORDINATOR', 'DOCTOR'] },
    { path: '/patients/new', label: 'New Patient', icon: UserPlus, roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'COORDINATOR'] },
    { path: '/escalations', label: 'Escalations', icon: AlertTriangle, roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'COORDINATOR', 'DOCTOR'] },
    { path: '/reports', label: 'NABH Reports', icon: FileText, roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR'] },
    { path: '/settings', label: 'Settings', icon: Settings, roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'COORDINATOR', 'DOCTOR'] },
    { path: '/superadmin/hospitals', label: 'Hospitals', icon: Building2, roles: ['SUPER_ADMIN'] },
    { path: '/superadmin/audit', label: 'Audit Logs', icon: ClipboardList, roles: ['SUPER_ADMIN'] },
  ]

  const visibleNav = navItems.filter((item) => item.roles.includes(user?.role || ''))

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(path)
  }

  const renderNavContent = () => (
    <>
      <div className="p-5">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[hsl(var(--ojas-600))] rounded-xl flex items-center justify-center">
            <Stethoscope className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-foreground leading-tight">Ojas</h1>
            <p className="text-[10px] text-muted-foreground leading-none">Post-Discharge Care</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto" aria-label="Main navigation">
        {visibleNav.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                active
                  ? 'bg-[hsl(var(--ojas-50))] text-[hsl(var(--ojas-700))] border border-[hsl(var(--ojas-200))]'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={18} className={active ? 'text-[hsl(var(--ojas-600))]' : 'text-muted-foreground group-hover:text-foreground'} />
              {item.label}
              {active && <ChevronRight size={14} className="ml-auto opacity-50" />}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t mt-auto">
        <div className="px-3 py-2.5 bg-muted/60 rounded-lg mb-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Signed in as</p>
          <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
          <span className="inline-block mt-1 text-[10px] uppercase tracking-wider font-bold text-[hsl(var(--ojas-600))] bg-[hsl(var(--ojas-50))] px-2 py-0.5 rounded">
            {(user?.role || '').replace('_', ' ')}
          </span>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-[hsl(var(--error-700))] hover:bg-[hsl(var(--error-50))] rounded-lg transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-card border-r flex-col z-40">
        {renderNavContent()}
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-card border-r flex-col z-50 transform transition-transform lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
            <div className="w-8 h-8 bg-[hsl(var(--ojas-600))] rounded-lg flex items-center justify-center">
              <Stethoscope className="text-white w-4 h-4" />
            </div>
            <span className="font-bold">Ojas</span>
          </Link>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-muted rounded-lg" aria-label="Close menu">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          {renderNavContent()}
        </div>
      </aside>
    </>
  )
}

export default Sidebar
