import { useParams, Link } from 'react-router-dom'
import { usePatient } from '@/api/hooks'
import { Button } from '@/components/ui/button'
import RiskBadge from '@/components/RiskBadge'
import {
  ArrowLeft,
  Calendar,
  Phone,
  Stethoscope,
  BedDouble,
  Clock,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  FileText,
} from 'lucide-react'

const PatientDetail = () => {
  const { id } = useParams<{ id: string }>()
  const { data: patient, isLoading } = usePatient(id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-[hsl(var(--ojas-600))] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="card-default text-center py-12">
        <p className="text-muted-foreground">Patient not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/patients">Back to list</Link>
        </Button>
      </div>
    )
  }

  const getCheckinIcon = (status: string) => {
    if (status === 'COMPLETED') return <CheckCircle size={14} className="text-[hsl(var(--success-500))]" />
    if (status === 'MISSED') return <XCircle size={14} className="text-[hsl(var(--error-500))]" />
    return <HelpCircle size={14} className="text-muted-foreground" />
  }

  const getCheckinClass = (status: string, risk?: string) => {
    if (status === 'COMPLETED' && risk === 'CRITICAL') return 'bg-[hsl(var(--error-50))] border-[hsl(var(--error-200))] text-[hsl(var(--error-700))]'
    if (status === 'COMPLETED' && risk === 'HIGH') return 'bg-orange-50 border-orange-200 text-orange-700'
    if (status === 'COMPLETED') return 'bg-[hsl(var(--success-50))] border-[hsl(var(--success-200))] text-[hsl(var(--success-700))]'
    if (status === 'MISSED') return 'bg-[hsl(var(--error-50))] border-[hsl(var(--error-100))] text-[hsl(var(--error-600))]'
    return 'bg-muted border-border text-muted-foreground'
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/patients" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back to Patients
        </Link>
      </Button>

      {/* Header */}
      <div className="card-default">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold">{patient.full_name}</h1>
              <RiskBadge level={patient.risk_level} score={patient.risk_score} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar size={14} /> {patient.discharge_date?.split('T')[0]}</span>
              <span className="flex items-center gap-1"><Phone size={14} /> {patient.mobile}</span>
              <span className="flex items-center gap-1"><BedDouble size={14} /> Bed {patient.bed_number}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="px-4 py-3 bg-[hsl(var(--ojas-50))] rounded-xl text-center min-w-[80px]">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Day</p>
              <p className="text-xl font-bold text-[hsl(var(--ojas-700))]">{patient.current_day}<span className="text-sm font-normal text-muted-foreground">/14</span></p>
            </div>
            <div className="px-4 py-3 bg-muted rounded-xl text-center min-w-[80px]">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Response</p>
              <p className="text-xl font-bold">{Math.round(patient.response_rate)}%</p>
            </div>
            <div className="px-4 py-3 bg-muted rounded-xl text-center min-w-[80px]">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Readmission</p>
              <p className={`text-xl font-bold ${patient.readmission_risk === 'HIGH' ? 'text-[hsl(var(--error-500))]' : patient.readmission_risk === 'MEDIUM' ? 'text-orange-500' : 'text-[hsl(var(--success-500))]'}`}>
                {patient.readmission_risk}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Info */}
        <div className="space-y-6">
          <div className="card-default">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Stethoscope size={18} className="text-[hsl(var(--ojas-600))]" />
              Medical Information
            </h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Surgery', value: patient.surgery_type },
                { label: 'Doctor', value: `${patient.doctor_name} (${patient.doctor_specialty})` },
                { label: 'Age', value: patient.age },
                { label: 'UHID', value: patient.uhid },
                { label: 'Family Contact', value: patient.family_mobile },
              ].map((item) => (
                <div key={item.label} className="flex justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-default">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <MessageSquare size={18} className="text-[hsl(var(--ojas-600))]" />
              Instructions
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed bg-[hsl(var(--ojas-50))] p-4 rounded-lg border border-[hsl(var(--ojas-100))]">
              {patient.instructions}
            </p>
          </div>

          {patient.escalations?.length > 0 && (
            <div className="card-default border-l-4 border-l-[hsl(var(--error-500))]">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-[hsl(var(--error-700))]">
                <AlertTriangle size={18} />
                Escalations
              </h3>
              <div className="space-y-2">
                {patient.escalations.map((e: { id: string; level: string; status: string; trigger_type: string }) => (
                  <div key={e.id} className="p-3 bg-[hsl(var(--error-50))] rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--error-800))]">{e.trigger_type} • {e.level}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      e.status === 'OPEN' ? 'bg-[hsl(var(--error-200))] text-[hsl(var(--error-800))]' : 'bg-[hsl(var(--success-100))] text-[hsl(var(--success-700))]'
                    }`}>
                      {e.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Check-ins & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Check-in Grid */}
          <div className="card-default">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock size={18} className="text-[hsl(var(--ojas-600))]" />
              14-Day Check-in Timeline
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {patient.checkins?.map((c: { day: number; status: string; risk_level?: string }) => (
                <div
                  key={c.day}
                  className={`p-2 rounded-lg border text-center transition-all ${getCheckinClass(c.status, c.risk_level)}`}
                  title={`Day ${c.day}: ${c.status}${c.risk_level ? ` • ${c.risk_level}` : ''}`}
                >
                  <div className="flex justify-center mb-1">{getCheckinIcon(c.status)}</div>
                  <p className="text-xs font-bold">D{c.day}</p>
                  {c.status === 'COMPLETED' && c.risk_level !== 'LOW' && (
                    <p className="text-[10px] mt-0.5 font-medium">{c.risk_level}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="card-default">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileText size={18} className="text-[hsl(var(--ojas-600))]" />
              Activity Timeline
            </h3>
            <div className="space-y-0">
              {patient.timeline?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No activity recorded yet</p>
              )}
              {patient.timeline?.map((t: { day: number; type: string; title: string; description: string }, i: number, arr: unknown[]) => (
                <div key={i} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 bg-[hsl(var(--ojas-500))] rounded-full mt-1.5 ring-4 ring-[hsl(var(--ojas-50))]" />
                    {i !== (arr as Array<unknown>).length - 1 && <div className="w-px flex-1 bg-border my-1 group-hover:bg-[hsl(var(--ojas-200))] transition-colors" />}
                  </div>
                  <div className="pb-5">
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">Day {t.day}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PatientDetail
