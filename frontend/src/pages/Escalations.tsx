import { useState } from 'react'
import { useEscalations, useResolveEscalation } from '@/api/hooks'
import { Button } from '@/components/ui/button'
import RiskBadge from '@/components/RiskBadge'
import EscalationCoach from '@/components/EscalationCoach'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  X,
  Loader2,
} from 'lucide-react'

const Escalations = () => {
  const [status, setStatus] = useState('OPEN')
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolutionNote, setResolutionNote] = useState('')

  const { data: escalations, isLoading } = useEscalations(status)
  const resolveMutation = useResolveEscalation()

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolvingId || !resolutionNote.trim()) return
    try {
      await resolveMutation.mutateAsync({ id: resolvingId, note: resolutionNote })
      setResolvingId(null)
      setResolutionNote('')
    } catch {
      // Error handled by mutation
    }
  }

  const tabs = [
    { label: 'Open', value: 'OPEN', color: 'text-[hsl(var(--error-600))] bg-[hsl(var(--error-50))]' },
    { label: 'Resolved', value: 'RESOLVED', color: 'text-[hsl(var(--success-600))] bg-[hsl(var(--success-50))]' },
    { label: 'All', value: '', color: 'text-muted-foreground bg-muted' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Escalation Triage</h1>
        <p className="text-muted-foreground mt-0.5">Review and resolve AI-triggered patient alerts</p>
      </div>

      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              status === tab.value ? tab.color + ' ring-1 ring-black/5' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="card-default text-center py-12">
          <Loader2 size={24} className="animate-spin mx-auto mb-3 text-[hsl(var(--ojas-600))]" />
          <p className="text-muted-foreground">Loading escalations...</p>
        </div>
      ) : !escalations || escalations.length === 0 ? (
        <div className="card-default text-center py-12">
          <Filter className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No {status.toLowerCase() || 'active'} escalations</p>
        </div>
      ) : (
        <div className="space-y-4">
          {escalations.map((e: { id: string; patient_name: string; level: string; status: string; trigger_type: string; trigger_detail: string; description: string; created_at: string; suggestions?: string[] }) => (
            <div
              key={e.id}
              className={`card-default border-l-4 ${
                e.level === 'CRITICAL' ? 'border-l-[hsl(var(--error-500))]' : 'border-l-orange-400'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-semibold">{e.patient_name}</h3>
                    <RiskBadge level={e.level} size="sm" />
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                      {e.trigger_type}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{e.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(e.created_at).toLocaleString()}</span>
                    <span className="flex items-center gap-1"><AlertTriangle size={12} /> {e.trigger_detail}</span>
                  </div>

                  <EscalationCoach suggestions={e.suggestions || []} />
                </div>

                <div className="flex flex-col gap-2 lg:items-end">
                  {e.status === 'OPEN' ? (
                    <>
                      {resolvingId === e.id ? (
                        <form onSubmit={handleResolve} className="w-full lg:w-80 space-y-2">
                          <textarea
                            autoFocus
                            placeholder="Resolution notes..."
                            value={resolutionNote}
                            onChange={(ev) => setResolutionNote(ev.target.value)}
                            className="input-field text-sm"
                            rows={2}
                            required
                          />
                          <div className="flex gap-2">
                            <Button
                              type="submit"
                              disabled={resolveMutation.isPending}
                              className="flex-1 bg-[hsl(var(--success-500))] hover:bg-[hsl(var(--success-700))]"
                              size="sm"
                            >
                              {resolveMutation.isPending ? 'Saving...' : 'Confirm Resolve'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setResolvingId(null)}
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <Button
                          onClick={() => setResolvingId(e.id)}
                          className="bg-[hsl(var(--success-500))] hover:bg-[hsl(var(--success-700))]"
                          size="sm"
                        >
                          <CheckCircle size={16} className="mr-1" />
                          Resolve
                        </Button>
                      )}
                    </>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-[hsl(var(--success-600))] font-medium">
                      <CheckCircle size={16} /> Resolved
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Escalations
