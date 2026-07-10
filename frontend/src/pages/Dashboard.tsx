import { useAuth } from '@/context/AuthContext'
import { usePatients, useEscalations } from '@/api/hooks'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import RiskBadge from '@/components/RiskBadge'
import {
  Users,
  AlertTriangle,
  Activity,
  TrendingUp,
  ArrowRight,
  UserPlus,
  FileText,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

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

  const riskDistribution = [
    { name: 'Low', count: patients.filter((p: { risk_level?: string }) => p.risk_level === 'LOW').length, color: 'hsl(142 71% 45%)' },
    { name: 'Medium', count: patients.filter((p: { risk_level?: string }) => p.risk_level === 'MEDIUM').length, color: 'hsl(38 92% 50%)' },
    { name: 'High', count: patients.filter((p: { risk_level?: string }) => p.risk_level === 'HIGH').length, color: 'hsl(24 95% 53%)' },
    { name: 'Critical', count: patients.filter((p: { risk_level?: string }) => p.risk_level === 'CRITICAL').length, color: 'hsl(0 84% 60%)' },
  ]

  const recentPatients = [...patients]
    .sort((a: { discharge_date?: string }, b: { discharge_date?: string }) => {
      return new Date(b.discharge_date || 0).getTime() - new Date(a.discharge_date || 0).getTime()
    })
    .slice(0, 5)

  const stats = [
    { label: 'Total Patients', value: totalPatients, icon: Users, color: 'bg-[hsl(var(--ojas-100))] text-[hsl(var(--ojas-700))]' },
    { label: 'Open Escalations', value: activeEscalations, icon: AlertTriangle, color: 'bg-[hsl(var(--error-50))] text-[hsl(var(--error-700))]' },
    { label: 'Avg Response Rate', value: `${avgResponse}%`, icon: Activity, color: 'bg-[hsl(var(--success-50))] text-[hsl(var(--success-700))]' },
    { label: 'Active Monitoring', value: patients.filter((p: { status?: string }) => p.status === 'ACTIVE').length, icon: TrendingUp, color: 'bg-purple-50 text-purple-700' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-0.5">Welcome back, {user?.full_name || user?.email}</p>
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
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
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
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
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

        {/* Recent Patients */}
        <div className="card-default lg:col-span-2">
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden sm:table-cell">Surgery</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Day</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Risk</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPatients.map((p: { id: string; full_name: string; surgery_type: string; current_day: number; risk_level: string; risk_score: number }) => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2 font-medium">{p.full_name}</td>
                      <td className="py-3 px-2 text-muted-foreground hidden sm:table-cell">{p.surgery_type}</td>
                      <td className="py-3 px-2 text-muted-foreground">Day {p.current_day}/14</td>
                      <td className="py-3 px-2">
                        <RiskBadge level={p.risk_level} score={p.risk_score} size="sm" />
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Link to={`/patients/${p.id}`} className="text-[hsl(var(--ojas-600))] hover:text-[hsl(var(--ojas-700))] font-medium text-xs">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Escalations Preview */}
      {activeEscalations > 0 && (
        <div className="card-default border-l-4 border-l-[hsl(var(--error-500))]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-[hsl(var(--error-500))]" />
              <h3 className="font-semibold">Active Escalations</h3>
              <span className="bg-[hsl(var(--error-50))] text-[hsl(var(--error-700))] text-xs font-bold px-2 py-0.5 rounded-full">
                {activeEscalations}
              </span>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/escalations">View All</Link>
            </Button>
          </div>
          <div className="space-y-2">
            {escalations.slice(0, 3).map((e: { id: string; patient_name: string; level: string; trigger_type: string; created_at: string }) => (
              <div key={e.id} className="flex items-center justify-between p-3 bg-[hsl(var(--error-50))] rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{e.patient_name}</span>
                  <RiskBadge level={e.level} size="sm" />
                  <span className="text-xs text-muted-foreground hidden sm:inline">{e.trigger_type}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
