import { useAuth } from '@/context/AuthContext'
import { usePatients, useEscalations } from '@/api/hooks'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import RiskBadge from '@/components/RiskBadge'
import StatusBadge from '@/components/StatusBadge'
import {
  Users,
  AlertTriangle,
  Activity,
  TrendingUp,
  ArrowRight,
  UserPlus,
  FileText,
  Phone,
  Calendar,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

const Dashboard = () => {
  const { user } = useAuth()
  const { data: patientsData, isLoading: patientsLoading } = usePatients('', 1, 100)
  const { data: escalationsData } = useEscalations('OPEN')

  const patients = patientsData?.data || []
  const escalations = escalationsData || []

  const totalPatients = patientsData?.total || patients.length
  const activeEscalations = escalations.length
  const avgResponse = patients.length > 0
    ? Math.round(patients.reduce((acc: number, p: { response_rate?: number }) => acc + (p.response_rate || 0), 0) / patients.length)
    : 0

  const activePatients = patients.filter((p: { status?: string }) => p.status === 'ACTIVE').length
  const completedPatients = patients.filter((p: { status?: string }) => p.status === 'COMPLETED').length
  const escalatedPatients = patients.filter((p: { status?: string }) => p.status === 'ESCALATED').length
  const noReplyPatients = patients.filter((p: { status?: string }) => p.status === 'NO_REPLY').length

  const riskDistribution = [
    { name: 'Low', count: patients.filter((p: { risk_level?: string }) => p.risk_level === 'LOW').length, color: 'hsl(142 71% 45%)' },
    { name: 'Medium', count: patients.filter((p: { risk_level?: string }) => p.risk_level === 'MEDIUM').length, color: 'hsl(38 92% 50%)' },
    { name: 'High', count: patients.filter((p: { risk_level?: string }) => p.risk_level === 'HIGH').length, color: 'hsl(24 95% 53%)' },
    { name: 'Critical', count: patients.filter((p: { risk_level?: string }) => p.risk_level === 'CRITICAL').length, color: 'hsl(0 84% 60%)' },
  ]

  const statusDistribution = [
    { name: 'Active', value: activePatients, color: 'hsl(221 83% 53%)' },
    { name: 'Completed', value: completedPatients, color: 'hsl(142 71% 45%)' },
    { name: 'Escalated', value: escalatedPatients, color: 'hsl(0 84% 60%)' },
    { name: 'No Reply', value: noReplyPatients, color: 'hsl(38 92% 50%)' },
  ]

  const todayCheckins = patients.filter((p: { current_day?: number }) => p.current_day && p.current_day <= 14).length
  const pendingCheckins = patients.filter((p: { status?: string }) => p.status ? ['ACTIVE', 'ESCALATED'].includes(p.status) : false).length
  const highRiskPatients = patients.filter((p: { risk_level?: string }) => p.risk_level ? ['HIGH', 'CRITICAL'].includes(p.risk_level) : false)
  
  const recoveryTrend = [
    { day: 'Day 1', completed: 7, pending: 0, missed: 0 },
    { day: 'Day 3', completed: 7, pending: 0, missed: 0 },
    { day: 'Day 5', completed: 6, pending: 0, missed: 1 },
    { day: 'Day 7', completed: 5, pending: 0, missed: 2 },
    { day: 'Day 10', completed: 4, pending: 1, missed: 2 },
    { day: 'Day 14', completed: 3, pending: 2, missed: 2 },
  ]

  const recentPatients = [...patients]
    .sort((a: { discharge_date?: string }, b: { discharge_date?: string }) => {
      return new Date(b.discharge_date || 0).getTime() - new Date(a.discharge_date || 0).getTime()
    })
    .slice(0, 5)

  const stats = [
    { label: 'Total Patients', value: totalPatients, icon: Users, color: 'bg-[hsl(var(--ojas-100))] text-[hsl(var(--ojas-700))]', trend: '+2 this week' },
    { label: 'Open Escalations', value: activeEscalations, icon: AlertTriangle, color: 'bg-[hsl(var(--error-50))] text-[hsl(var(--error-700))]', trend: activeEscalations > 0 ? 'Needs attention' : 'All clear' },
    { label: 'Avg Response Rate', value: `${avgResponse}%`, icon: Activity, color: 'bg-[hsl(var(--success-50))] text-[hsl(var(--success-700))]', trend: avgResponse >= 80 ? 'Excellent' : 'Needs improvement' },
    { label: 'Active Monitoring', value: activePatients, icon: TrendingUp, color: 'bg-purple-50 text-purple-700', trend: `${pendingCheckins} check-ins today` },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-0.5">Welcome back, {user?.full_name || user?.email}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Calendar size={12} />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="bg-[hsl(var(--ojas-600))] hover:bg-[hsl(var(--ojas-700))]">
            <Link to="/patients/new" className="flex items-center gap-2">
              <UserPlus size={16} />
              <span className="hidden sm:inline">New Patient</span>
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/reports" className="flex items-center gap-2">
              <FileText size={16} />
              <span className="hidden sm:inline">Reports</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card-default flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.color}`}>
              <stat.icon size={22} />
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xs text-[hsl(var(--ojas-600))] mt-0.5">{stat.trend}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-default border-l-4 border-l-[hsl(var(--ojas-500))]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--ojas-100))] flex items-center justify-center">
              <Phone size={20} className="text-[hsl(var(--ojas-700))]" />
            </div>
            <div>
              <p className="font-semibold text-sm">Call High-Risk Patients</p>
              <p className="text-xs text-muted-foreground">{highRiskPatients.length} patients need attention</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" asChild>
              <Link to="/patients">View</Link>
            </Button>
          </div>
        </div>
        
        <div className="card-default border-l-4 border-l-[hsl(var(--success-500))]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--success-100))] flex items-center justify-center">
              <CheckCircle2 size={20} className="text-[hsl(var(--success-700))]" />
            </div>
            <div>
              <p className="font-semibold text-sm">Today's Check-ins</p>
              <p className="text-xs text-muted-foreground">{todayCheckins} scheduled</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" asChild>
              <Link to="/checkins">Manage</Link>
            </Button>
          </div>
        </div>
        
        <div className="card-default border-l-4 border-l-[hsl(var(--warning-500))]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--warning-100))] flex items-center justify-center">
              <Clock size={20} className="text-[hsl(var(--warning-700))]" />
            </div>
            <div>
              <p className="font-semibold text-sm">Pending Follow-ups</p>
              <p className="text-xs text-muted-foreground">{pendingCheckins} pending</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" asChild>
              <Link to="/escalations">Review</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Chart */}
        <div className="card-default lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Risk Distribution</h3>
            <Link to="/patients" className="text-xs text-[hsl(var(--ojas-600))] hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie Chart */}
        <div className="card-default lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Patient Status</h3>
            <Link to="/patients" className="text-xs text-[hsl(var(--ojas-600))] hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {statusDistribution.map((status) => (
              <div key={status.name} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                <span className="text-muted-foreground">{status.name}: {status.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Patients */}
        <div className="card-default lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Patients</h3>
            <Link to="/patients" className="text-xs text-[hsl(var(--ojas-600))] hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>

          {patientsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 skeleton" />
              ))}
            </div>
          ) : recentPatients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No patients enrolled yet</p>
              <Button asChild variant="outline" className="mt-4" size="sm">
                <Link to="/patients/new">Enroll your first patient</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPatients.map((p: { id: string; full_name: string; surgery_type: string; current_day: number; risk_level: string; risk_score: number; status?: string }) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--ojas-100))] flex items-center justify-center text-xs font-semibold text-[hsl(var(--ojas-700))]">
                      {p.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{p.full_name}</p>
                      <p className="text-xs text-muted-foreground">{p.surgery_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={p.status || 'ACTIVE'} size="sm" />
                    <Link to={`/patients/${p.id}`} className="text-[hsl(var(--ojas-600))] hover:text-[hsl(var(--ojas-700))] font-medium text-xs">
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recovery Trend Chart */}
      <div className="card-default">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-[hsl(var(--ojas-600))]" />
            <h3 className="font-semibold">Recovery Progress Trend</h3>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-[hsl(var(--success-500))]" />
              <span className="text-muted-foreground">Completed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-[hsl(var(--ojas-500))]" />
              <span className="text-muted-foreground">Pending</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-[hsl(var(--error-500))]" />
              <span className="text-muted-foreground">Missed</span>
            </div>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={recoveryTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="completed" fill="hsl(var(--success-500))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" fill="hsl(var(--ojas-500))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="missed" fill="hsl(var(--error-500))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
