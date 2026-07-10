import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import DashboardLayout from './components/layout/DashboardLayout'

// Lazy load pages for code splitting
const LandingPage = lazy(() => import('./pages/LandingPage'))
const Login = lazy(() => import('./pages/Login'))
const AcceptInvite = lazy(() => import('./pages/AcceptInvite'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const PatientList = lazy(() => import('./pages/PatientList'))
const PatientDetail = lazy(() => import('./pages/PatientDetail'))
const Enrollment = lazy(() => import('./pages/Enrollment'))
const Escalations = lazy(() => import('./pages/Escalations'))
const Reports = lazy(() => import('./pages/Reports'))
const Hospitals = lazy(() => import('./pages/SuperAdmin/Hospitals'))
const AuditLogs = lazy(() => import('./pages/SuperAdmin/AuditLogs'))
const Settings = lazy(() => import('./pages/Settings'))
const NotFound = lazy(() => import('./pages/NotFound'))

// Production-grade skeleton loader
const PageSkeleton = () => (
  <div className="min-h-screen bg-background animate-in fade-in duration-300">
    <div className="h-16 border-b bg-card skeleton" />
    <div className="max-w-7xl mx-auto p-6 space-y-4">
      <div className="h-8 skeleton w-1/4" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-32 skeleton" />
        <div className="h-32 skeleton" />
        <div className="h-32 skeleton" />
      </div>
      <div className="h-64 skeleton" />
    </div>
  </div>
)

const ProtectedRoute = ({ children, allowedRoles = [] }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { user, loading } = useAuth()

  if (loading) return <PageSkeleton />
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }
  return <DashboardLayout>{children}</DashboardLayout>
}

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />

        {/* Protected dashboard routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/patients" element={<ProtectedRoute><PatientList /></ProtectedRoute>} />
        <Route path="/patients/new" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'COORDINATOR']}>
            <Enrollment />
          </ProtectedRoute>
        } />
        <Route path="/patients/:id" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
        <Route path="/escalations" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'COORDINATOR', 'DOCTOR']}>
            <Escalations />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR']}>
            <Reports />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        {/* Super Admin routes */}
        <Route path="/superadmin/hospitals" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}><Hospitals /></ProtectedRoute>
        } />
        <Route path="/superadmin/audit" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AuditLogs /></ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

const App = () => (
  <AuthProvider>
    <AppRoutes />
  </AuthProvider>
)

export default App
