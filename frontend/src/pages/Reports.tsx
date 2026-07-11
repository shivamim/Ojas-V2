import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Download,
  Calendar,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Mail,
  Clock,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/api/client'  // ← ADD THIS

interface ReportRecord {
  id: string
  date: string
  type: string
  status: 'completed' | 'processing' | 'failed'
  downloadUrl?: string
  blobUrl?: string  // ← ADD THIS for actual PDF blob
}

const Reports = () => {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [preset, setPreset] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [latestPdfBlob, setLatestPdfBlob] = useState<Blob | null>(null)  // ← ADD THIS
  const [latestPdfUrl, setLatestPdfUrl] = useState<string | null>(null)  // ← ADD THIS

  const [history, setHistory] = useState<ReportRecord[]>([
    { id: '1', date: '2024-07-01', type: 'NABH Compliance', status: 'completed' },
    { id: '2', date: '2024-06-15', type: 'Patient Outcomes', status: 'completed' },
    { id: '3', date: '2024-06-01', type: 'NABH Compliance', status: 'completed' },
  ])

  const presets = [
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'This Month', days: -1 },
    { label: 'Last Month', days: -2 },
  ]

  const applyPreset = (p: typeof presets[0]) => {
    const now = new Date()
    let start: Date, end: Date = now

    if (p.days === -1) {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (p.days === -2) {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      end = new Date(now.getFullYear(), now.getMonth(), 0)
    } else {
      start = new Date(now.getTime() - p.days * 24 * 60 * 60 * 1000)
    }

    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
    setPreset(p.label)
    setShowPresets(false)
  }

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select a date range')
      return
    }
    setIsGenerating(true)
    try {
      // ← CALL ACTUAL BACKEND API
      const response = await api.get('/reports/nabh', {
        params: { start_date: startDate, end_date: endDate },
        responseType: 'blob',  // Important: receive as blob
      })

      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)

      setLatestPdfBlob(blob)
      setLatestPdfUrl(url)

      // Auto-download
      const link = document.createElement('a')
      link.href = url
      link.download = `nabh_report_${startDate}_to_${endDate}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setShowSuccessModal(true)
      setHistory((prev) => [
        {
          id: Date.now().toString(),
          date: new Date().toISOString().split('T')[0],
          type: 'NABH Compliance',
          status: 'completed',
          blobUrl: url,
        },
        ...prev,
      ])
      toast.success('Report generated and downloaded!')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to generate report')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadLatest = () => {
    if (latestPdfUrl) {
      const link = document.createElement('a')
      link.href = latestPdfUrl
      link.download = `nabh_report_${startDate}_to_${endDate}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      toast.error('No report available. Generate one first.')
    }
  }

  const handleEmailReport = () => {
    toast.info('Email functionality coming soon!')
    // TODO: Implement email sending via backend endpoint
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">NABH Reports</h1>
        <p className="text-muted-foreground mt-0.5">Generate compliance and outcome reports</p>
      </div>

      {/* Date Range Picker */}
      <div className="card-default space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <Label className="form-label">Start Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPreset(null) }}
                className="form-input pl-10 h-11"
              />
            </div>
          </div>
          <div className="flex-1 w-full">
            <Label className="form-label">End Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPreset(null) }}
                className="form-input pl-10 h-11"
              />
            </div>
          </div>
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowPresets(!showPresets)}
              className="h-11 gap-2"
            >
              <Filter size={16} />
              {preset || 'Presets'}
              <ChevronDown size={14} />
            </Button>
            <AnimatePresence>
              {showPresets && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden"
                >
                  {presets.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => applyPreset(p)}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`h-12 px-6 btn-primary gap-2 text-base ${!isGenerating && startDate && endDate ? 'animate-pulse' : ''}`}
        >
          {isGenerating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <FileText size={18} />
              Generate & Download PDF
            </>
          )}
        </Button>
      </div>

      {/* Report History */}
      <div className="card-default">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Clock size={18} className="text-slate-400" />
          Report History
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-4 font-medium text-slate-500">Date</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Type</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Status</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {history.map((report) => (
                <tr key={report.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4">{report.date}</td>
                  <td className="py-3 px-4 font-medium">{report.type}</td>
                  <td className="py-3 px-4">
                    <Badge
                      className={
                        report.status === 'completed'
                          ? 'bg-green-100 text-green-700 hover:bg-green-100'
                          : report.status === 'processing'
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                          : 'bg-red-100 text-red-700 hover:bg-red-100'
                      }
                    >
                      {report.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {report.blobUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-[hsl(var(--ojas-600))]"
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = report.blobUrl!
                          link.download = `nabh_report_${report.date}.pdf`
                          document.body.appendChild(link)
                          link.click()
                          document.body.removeChild(link)
                        }}
                      >
                        <Download size={14} />
                        Download
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowSuccessModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center z-10"
            >
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-green-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">Report Generated!</h3>
              <p className="text-sm text-slate-600 mb-6">Your NABH compliance report is ready.</p>

              <Button
                onClick={handleDownloadLatest}
                className="w-full h-11 bg-[hsl(var(--ojas-600))] hover:bg-[hsl(var(--ojas-700))] text-white rounded-xl mb-3 gap-2"
              >
                <Download size={18} />
                Download PDF
              </Button>

              <Button
                variant="outline"
                onClick={handleEmailReport}
                className="w-full h-11 rounded-xl gap-2"
              >
                <Mail size={18} />
                Email Report
              </Button>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="mt-4 text-sm text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Simple Label component since it was missing in original
const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <label className={`block text-sm font-medium mb-1.5 ${className || ''}`}>{children}</label>
)

export default Reports
