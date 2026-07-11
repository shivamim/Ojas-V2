import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Link, useNavigate } from 'react-router-dom'
import { Stethoscope, HeartPulse, Eye, EyeOff, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

const Login = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both email and password')
      setShake(true)
      setTimeout(() => setShake(false), 400)
      return
    }

    setIsLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!')
      if (rememberMe) {
        localStorage.setItem('ojas_remember_email', email)
      } else {
        localStorage.removeItem('ojas_remember_email')
      }
      navigate('/dashboard')
    } catch (err: any) {
      setShake(true)
      setTimeout(() => setShake(false), 400)
      toast.error(err?.response?.data?.detail || 'Invalid credentials. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Floating icons for background animation
  const floatingIcons = [
    { Icon: Stethoscope, x: '10%', y: '20%', delay: 0, duration: 6 },
    { Icon: HeartPulse, x: '85%', y: '15%', delay: 1, duration: 8 },
    { Icon: Stethoscope, x: '75%', y: '75%', delay: 2, duration: 7 },
    { Icon: HeartPulse, x: '15%', y: '80%', delay: 0.5, duration: 9 },
  ]

  return (
    <div className="min-h-screen flex bg-slate-50 relative overflow-hidden">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[hsl(var(--ojas-700))] to-[hsl(var(--ojas-500))] relative items-center justify-center p-12">
        {/* Floating background icons */}
        {floatingIcons.map((item, i) => (
          <motion.div
            key={i}
            className="absolute text-white/10"
            style={{ left: item.x, top: item.y }}
            animate={{ y: [0, -20, 0], rotate: [0, 5, -5, 0] }}
            transition={{ duration: item.duration, repeat: Infinity, delay: item.delay, ease: 'easeInOut' }}
          >
            <item.Icon size={64} strokeWidth={1} />
          </motion.div>
        ))}

        <div className="relative z-10 text-center text-white max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-8 backdrop-blur-sm">
              <Stethoscope size={40} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Ojas</h1>
            <p className="text-lg text-white/90 leading-relaxed">
              Intelligent Post-Discharge Care Management for better patient outcomes and reduced readmissions.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 mt-1">Sign in to your account</p>
          </div>

          <AnimatePresence>
            <motion.form
              onSubmit={handleSubmit}
              animate={shake ? { x: [0, -8, 8, -8, 8, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="space-y-5"
            >
              <div>
                <Label htmlFor="email" className="form-label">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input h-12"
                  autoComplete="email"
                />
              </div>

              <div>
                <Label htmlFor="password" className="form-label">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input h-12 pr-12"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className="border-slate-300 data-[state=checked]:bg-[hsl(var(--ojas-600))] data-[state=checked]:border-[hsl(var(--ojas-600))]"
                  />
                  <Label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer">Remember me</Label>
                </div>
                <Link to="/forgot-password" className="text-sm text-[hsl(var(--ojas-600))] hover:text-[hsl(var(--ojas-700))] font-medium">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 btn-primary text-base"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>
            </motion.form>
          </AnimatePresence>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/contact" className="text-[hsl(var(--ojas-600))] hover:text-[hsl(var(--ojas-700))] font-medium">
              Contact Sales
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default Login
