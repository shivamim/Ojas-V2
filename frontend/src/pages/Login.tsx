import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useLogin } from '@/api/hooks'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Stethoscope,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Shield,
  Lock,
  Zap,
} from 'lucide-react'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const loginMutation = useLogin()
  const { login } = useAuth()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const data = await loginMutation.mutateAsync({ email, password })
      login(data)
      navigate('/dashboard')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status: number; data?: { detail?: string } }; code?: string; message?: string }
      const isNetworkError = !axiosErr.response && (axiosErr.code === 'ECONNABORTED' || axiosErr.code === 'ERR_NETWORK')
      const isTimeout = axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')

      if (isNetworkError && !isTimeout) {
        setError('Cannot reach backend. Check your internet or backend status.')
      } else if (isTimeout) {
        setError('Request timed out. Please try again in a few seconds.')
      } else if (axiosErr.response?.status && axiosErr.response.status >= 500) {
        setError(`Server error (${axiosErr.response.status}). Please try again.`)
      } else {
        setError(axiosErr.response?.data?.detail || 'Invalid credentials. Please try again.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-[hsl(var(--ojas-50))] to-background flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[hsl(var(--ojas-700))] to-[hsl(var(--ojas-900))] relative overflow-hidden items-center justify-center">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[hsl(var(--ojas-600))] rounded-full blur-3xl opacity-20" />

        <div className="relative z-10 max-w-md mx-auto text-center text-white px-8">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 border border-white/20">
            <Stethoscope className="text-white w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Ojas HealthTech</h2>
          <p className="text-[hsl(var(--ojas-200))] text-lg leading-relaxed mb-10">
            NABH-compliant post-discharge patient recovery monitoring trusted by leading hospitals across India.
          </p>

          <div className="grid grid-cols-1 gap-4 text-left">
            {[
              { icon: Shield, title: 'Enterprise Security', desc: 'AES-256 encryption, RBAC, audit trails' },
              { icon: Zap, title: 'AI-Powered', desc: 'Real-time risk scoring and smart escalations' },
              { icon: Lock, title: 'NABH Compliant', desc: 'Automated compliance reporting' },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                  <item.icon size={18} className="text-[hsl(var(--ojas-300))]" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-xs text-[hsl(var(--ojas-300))]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - login form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
              <ArrowLeft size={16} />
              Back to home
            </Link>

            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[hsl(var(--ojas-600))] rounded-xl flex items-center justify-center">
                <Stethoscope className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">Ojas</h1>
                <p className="text-xs text-muted-foreground">HealthTech</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to your dashboard</p>
          </div>

          <div className="card-default">
            {error && (
              <div className="alert-error mb-4 flex items-start gap-2.5" role="alert">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div className="flex-1">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="you@hospital.com"
                  aria-label="Email address"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="Enter your password"
                    aria-label="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-[hsl(var(--ojas-600))] hover:bg-[hsl(var(--ojas-700))] py-2.5"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Protected by enterprise-grade security.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
