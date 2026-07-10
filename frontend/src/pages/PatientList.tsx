import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePatients } from '@/api/hooks'
import { Button } from '@/components/ui/button'
import RiskBadge from '@/components/RiskBadge'
import { Search, UserPlus, ChevronLeft, ChevronRight, Filter } from 'lucide-react'

const PatientList = () => {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = usePatients(status, page)

  const patients = data?.data || []
  const total = data?.total || 0
  const limit = data?.limit || 20
  const totalPages = Math.ceil(total / limit)

  const filteredPatients = patients.filter((p: { full_name?: string; surgery_type?: string; doctor_name?: string }) =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.surgery_type?.toLowerCase().includes(search.toLowerCase()) ||
    p.doctor_name?.toLowerCase().includes(search.toLowerCase())
  )

  const tabs = [
    { label: 'All', value: '' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Escalated', value: 'ESCALATED' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground mt-0.5">Manage and monitor enrolled patients</p>
        </div>
        <Button asChild className="bg-[hsl(var(--ojas-600))] hover:bg-[hsl(var(--ojas-700))] self-start">
          <Link to="/patients/new" className="flex items-center gap-2">
            <UserPlus size={16} />
            Enroll Patient
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search patients, surgery, doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
            aria-label="Search patients"
          />
        </div>
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatus(tab.value); setPage(1) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                status === tab.value
                  ? 'bg-[hsl(var(--ojas-600))] text-white shadow-sm'
                  : 'bg-card border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card-default overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-[hsl(var(--ojas-600))] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Loading patients...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Filter className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No patients found</p>
            {search && (
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Patient</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">Surgery</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden sm:table-cell">Doctor</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Progress</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Risk</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((p: { id: string; full_name: string; age: number; uhid: string; surgery_type: string; doctor_name: string; current_day: number; risk_level: string; risk_score: number }) => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{p.full_name}</p>
                          <p className="text-xs text-muted-foreground">Age {p.age} • {p.uhid}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{p.surgery_type}</td>
                      <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{p.doctor_name}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[hsl(var(--ojas-500))] rounded-full transition-all"
                              style={{ width: `${(p.current_day / 14) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{p.current_day}/14</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <RiskBadge level={p.risk_level} score={p.risk_score} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/patients/${p.id}`}
                          className="text-[hsl(var(--ojas-600))] hover:text-[hsl(var(--ojas-700))] font-medium text-xs"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default PatientList
