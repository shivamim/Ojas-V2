import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Menu,
  Bell,
  User,
} from 'lucide-react'

interface TopBarProps {
  onMenuClick: () => void
}

const TopBar = ({ onMenuClick }: TopBarProps) => {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b">
      <div className="flex items-center justify-between h-14 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </Button>

          <div className="hidden sm:flex items-center text-sm text-muted-foreground">
            <span>Dashboard</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[hsl(var(--error-500))] rounded-full" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => navigate('/settings')}
          >
            <div className="w-7 h-7 bg-[hsl(var(--ojas-100))] rounded-full flex items-center justify-center">
              <User size={14} className="text-[hsl(var(--ojas-700))]" />
            </div>
            <span className="hidden sm:inline text-sm font-medium">{user?.full_name || user?.email}</span>
          </Button>
        </div>
      </div>
    </header>
  )
}

export default TopBar
