import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { useLogout } from '@/api/hooks'
import {
  User,
  Shield,
  Bell,
  Stethoscope,
  Loader2,
  LogOut,
  CheckCircle,
} from 'lucide-react'

const Settings = () => {
  const { user } = useAuth()
  const logoutMutation = useLogout()

  const handleLogout = () => {
    logoutMutation.mutate()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-0.5">Manage your account preferences</p>
      </div>

      {/* Profile */}
      <div className="card-default space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[hsl(var(--ojas-100))] rounded-lg flex items-center justify-center">
            <User size={20} className="text-[hsl(var(--ojas-700))]" />
          </div>
          <div>
            <h3 className="font-semibold">Profile</h3>
            <p className="text-xs text-muted-foreground">Your account information</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between py-3 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Full Name</span>
            <span className="text-sm font-medium">{user?.full_name || '—'}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Role</span>
            <span className="text-sm font-medium">{(user?.role || '').replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-sm text-muted-foreground">Hospital ID</span>
            <span className="text-sm font-mono">{user?.hospital_id?.slice(0, 8) || '—'}...</span>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="card-default space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[hsl(var(--ojas-100))] rounded-lg flex items-center justify-center">
            <Shield size={20} className="text-[hsl(var(--ojas-700))]" />
          </div>
          <div>
            <h3 className="font-semibold">Security</h3>
            <p className="text-xs text-muted-foreground">Authentication and access</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-[hsl(var(--success-500))]" />
              <span className="text-sm">Two-Factor Authentication</span>
            </div>
            <span className="text-xs text-muted-foreground">Coming soon</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-[hsl(var(--success-500))]" />
              <span className="text-sm">Session Management</span>
            </div>
            <span className="text-xs text-[hsl(var(--success-700))] bg-[hsl(var(--success-50))] px-2 py-0.5 rounded-full font-medium">Active</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card-default space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[hsl(var(--ojas-100))] rounded-lg flex items-center justify-center">
            <Bell size={20} className="text-[hsl(var(--ojas-700))]" />
          </div>
          <div>
            <h3 className="font-semibold">Notifications</h3>
            <p className="text-xs text-muted-foreground">Configure alert preferences</p>
          </div>
        </div>

        <div className="space-y-3">
          {['Critical Escalations', 'Daily Summary', 'Patient Non-Response'].map((item) => (
            <div key={item} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
              <span className="text-sm">{item}</span>
              <div className="w-10 h-6 bg-[hsl(var(--ojas-500))] rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="card-default space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[hsl(var(--ojas-100))] rounded-lg flex items-center justify-center">
            <Stethoscope size={20} className="text-[hsl(var(--ojas-700))]" />
          </div>
          <div>
            <h3 className="font-semibold">About Ojas</h3>
            <p className="text-xs text-muted-foreground">Version and system info</p>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium">3.0.0</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Environment</span>
            <span className="font-medium">Production</span>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <div className="card-default border-[hsl(var(--error-200))]">
        <Button
          variant="outline"
          className="w-full text-[hsl(var(--error-700))] border-[hsl(var(--error-200))] hover:bg-[hsl(var(--error-50))]"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : <LogOut size={16} className="mr-2" />}
          Sign Out
        </Button>
      </div>
    </div>
  )
}

export default Settings
