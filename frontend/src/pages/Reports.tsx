import { useState } from 'react'
import api from '@/api/client'
import { Button } from '@/components/ui/button'
import { FileText, Download, Calendar, AlertCircle, Loader2 } from 'lucide-react'

const Reports = () => {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generateReport = async () => {
    setError('')
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)

      const response = await api.get(`/reports/nabh?${params.toString()}`, {
        responseType: 'blob',
      })

      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `nabh_report_${startDate || 'all'}_to_${endDate || 'now'}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status: number; data?: { detail?: string } } }
      if (axiosErr.response?.status === 422) {
        setError('Invalid date format. Use YYYY-MM-DD.')
      } else if (axiosErr.response?.status && axiosErr.response.status >= 500) {
        setError('Server error. Please try again.')
      } else {
        setError('Failed to generate report.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">NABH Compliance Reports</h1>
        <p className="text-muted-foreground mt-0.5">Generate post-discharge monitoring compliance PDFs</p>
      </div>

      {error && (
        <div className="alert-error flex items-start gap-2.5" role="alert">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      <div className="card-default space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 flex items-center gap-2">
              <Calendar size={14} /> Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 flex items-center gap-2">
              <Calendar size={14} /> End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        <div className="p-4 bg-[hsl(var(--ojas-50))] rounded-xl border border-[hsl(var(--ojas-100))]">
          <div className="flex items-start gap-3">
            <FileText className="text-[hsl(var(--ojas-600))] mt-0.5" size={20} />
            <div>
              <h4 className="font-medium text-[hsl(var(--ojas-900))]">Report Contents</h4>
              <ul className="text-sm text-[hsl(var(--ojas-700))] mt-2 space-y-1">
                <li className="flex items-center gap-2"><span className="w-1 h-1 bg-[hsl(var(--ojas-500))] rounded-full" /> COP 7.3 — Post-discharge follow-up</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 bg-[hsl(var(--ojas-500))] rounded-full" /> COP 7.3.1 — 24-48 hour early follow-up</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 bg-[hsl(var(--ojas-500))] rounded-full" /> COP 7.4 — Patient feedback tracking</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 bg-[hsl(var(--ojas-500))] rounded-full" /> COP 5.6 — Continuity of care</li>
              </ul>
            </div>
          </div>
        </div>

        <Button
          onClick={generateReport}
          disabled={loading}
          className="w-full bg-[hsl(var(--ojas-600))] hover:bg-[hsl(var(--ojas-700))] py-3"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin mr-2" />
          ) : (
            <Download size={18} className="mr-2" />
          )}
          {loading ? 'Generating...' : 'Generate & Download PDF'}
        </Button>
      </div>
    </div>
  )
}

export default Reports
