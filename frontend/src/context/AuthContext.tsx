import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/api/client'

interface User {
  id: string
  email: string
  full_name: string
  role: string
  hospital_id: string | null
}

interface AuthContextType {
  user: User | null
  login: (responseOrUser: { access_token?: string; refresh_token?: string; user?: User } | User) => void
  logout: () => Promise<void>
  loading: boolean
  isLoggedIn: boolean
  isSuperAdmin: boolean
  isHospitalAdmin: boolean
  isCoordinator: boolean
  isDoctor: boolean
  hasRole: (role: string) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback((responseOrUser: { access_token?: string; refresh_token?: string; user?: User } | User) => {
    let userData: User | undefined
    let accessToken: string | undefined
    let refreshToken: string | undefined

    if (responseOrUser && typeof responseOrUser === 'object') {
      if ('access_token' in responseOrUser && responseOrUser.access_token) {
        accessToken = responseOrUser.access_token
        refreshToken = responseOrUser.refresh_token
        userData = responseOrUser.user
      } else {
        userData = responseOrUser as User
      }
    }

    if (accessToken) localStorage.setItem('access_token', accessToken)
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken)
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignore - logout locally regardless
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      setUser(null)
      navigate('/login')
    }
  }, [navigate])

  const contextValue = useMemo(
    () => ({
      user,
      login,
      logout,
      loading,
      isLoggedIn: !!user,
      isSuperAdmin: user?.role === 'SUPER_ADMIN',
      isHospitalAdmin: user?.role === 'HOSPITAL_ADMIN',
      isCoordinator: user?.role === 'COORDINATOR',
      isDoctor: user?.role === 'DOCTOR',
      hasRole: (role: string) => user?.role === role,
    }),
    [user, loading, login, logout]
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
