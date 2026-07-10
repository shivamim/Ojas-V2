import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Stethoscope, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import api from '@/api/client'

const AcceptInvite = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [valid, setValid] = useState(false)
  const [inviteData, setInviteData] = useState<{ email: string; role: string } | null>(null)
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('Invalid invite link. No token provided.')
      return
    }

    api.post('/auth/verify-invite', { token })
      .then((res) => {
        setValid(res.data.valid)
        setInviteData({ email: res.data.email, role: res.data.role })
      })
      .catch(() => {
        setError('Invalid or expired invite link.')
      })
      .finally(() => setLoading(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await api.post('/auth/accept-invite', { token, full_name: fullName, password })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      setError(axiosErr.response?.data?.detail || 'Failed to accept invite.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-[hsl(var(--ojas-50))] to-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[hsl(var(--ojas-600))]" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-[hsl(var(--ojas-50))] to-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center card-default py-12">
          <div className="w-16 h-16 bg-[hsl(var(--success-50))] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-[hsl(var(--success-500))]" />
          </div>
          <h2 className="text-xl font-bold mb-2">Account Created</h2>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-[hsl(var(--ojas-50))] to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[hsl(var(--ojas-600))] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[hsl(var(--ojas-200))]">
            <Stethoscope className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold">Accept Invite</h1>
          <p className="text-muted-foreground mt-1">Join your hospital on Ojas</p>
        </div>

        <div className="card-default">
          {error && (
            <div className="alert-error mb-4 flex items-start gap-2" role="alert">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div>{error}</div>
            </div>
          )}

          {valid && inviteData && (
            <div className="mb-4 p-3 bg-[hsl(var(--ojas-50))] rounded-lg border border-[hsl(var(--ojas-100))]">
              <p className="text-sm"><span className="font-medium">Email:</span> {inviteData.email}</p>
              <p className="text-sm"><span className="font-medium">Role:</span> {inviteData.role.replace('_', ' ')}</p>
            </div>
          )}

          {valid && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium mb-1.5">Full Name</label>
                <input
                  id="fullName"
                  required
                  minLength={2}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="Min 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[hsl(var(--ojas-600))] hover:bg-[hsl(var(--ojas-700))]"
              >
                {submitting && <Loader2 size={16} className="animate-spin mr-2" />}
                Create Account
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default AcceptInvite
