import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  User,
  Stethoscope,
  FileText,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  HelpCircle,
  Save,
} from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Personal Info', icon: User },
  { id: 2, label: 'Medical Details', icon: Stethoscope },
  { id: 3, label: 'Discharge Info', icon: FileText },
  { id: 4, label: 'Review', icon: CheckCircle2 },
]

const STORAGE_KEY = 'ojas_enrollment_draft'

const Enrollment = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : {
      fullName: '',
      phone: '',
      email: '',
      uhid: '',
      age: '',
      gender: '',
      surgeryType: '',
      surgeonName: '',
      comorbidities: '',
      medications: '',
      dischargeDate: '',
      dischargeSummary: '',
      followUpDays: '14',
      preferredLanguage: 'en',
      emergencyContact: '',
    }
  })

  // Auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
    }, 1000)
    return () => clearTimeout(timer)
  }, [form])

  const updateField = (field: string, value: string) => {
    setForm((prev: any) => ({ ...prev, [field]: value }))
  }

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!form.fullName || !form.phone || !form.uhid) {
          toast.error('Please fill in all required fields')
          return false
        }
        return true
      case 2:
        if (!form.surgeryType || !form.surgeonName) {
          toast.error('Please fill in all required fields')
          return false
        }
        return true
      case 3:
        if (!form.dischargeDate || !form.dischargeSummary) {
          toast.error('Please fill in all required fields')
          return false
        }
        return true
      default:
        return true
    }
  }

  const nextStep = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, 4))
  }

  const prevStep = () => setStep((s) => Math.max(s - 1, 1))

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // await api.post('/patients', form)
      await new Promise((r) => setTimeout(r, 1500)) // Mock
      toast.success('Patient enrolled successfully!')
      localStorage.removeItem(STORAGE_KEY)
      navigate('/patients')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to enroll patient')
    } finally {
      setIsSubmitting(false)
    }
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  const Tooltip = ({ text }: { text: string }) => (
    <div className="group relative inline-flex ml-1">
      <HelpCircle size={14} className="text-slate-400 cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 z-50">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Enroll New Patient</h1>
          <p className="text-muted-foreground mt-0.5 flex items-center gap-2">
            <Save size={14} />
            Auto-saved to draft
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex justify-between mb-4">
          {STEPS.map((s) => (
            <div key={s.id} className="flex flex-col items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  s.id < step
                    ? 'bg-[hsl(var(--ojas-600))] text-white'
                    : s.id === step
                    ? 'bg-[hsl(var(--ojas-100))] text-[hsl(var(--ojas-700))] ring-2 ring-[hsl(var(--ojas-500))]'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <s.icon size={18} />
              </div>
              <span className={`text-xs font-medium ${s.id <= step ? 'text-slate-700' : 'text-slate-400'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[hsl(var(--ojas-500))] rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Form Steps */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-5"
        >
          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="form-label">Full Name *</Label>
                  <Input
                    value={form.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    placeholder="John Doe"
                    className="form-input h-11"
                  />
                </div>
                <div>
                  <Label className="form-label">Phone Number *</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="form-input h-11"
                  />
                </div>
                <div>
                  <Label className="form-label">Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="patient@email.com"
                    className="form-input h-11"
                  />
                </div>
                <div>
                  <Label className="form-label">
                    UHID *
                    <Tooltip text="Unique Hospital Identification Number assigned at admission" />
                  </Label>
                  <Input
                    value={form.uhid}
                    onChange={(e) => updateField('uhid', e.target.value)}
                    placeholder="UHID-2024-001"
                    className="form-input h-11"
                  />
                </div>
                <div>
                  <Label className="form-label">Age</Label>
                  <Input
                    type="number"
                    value={form.age}
                    onChange={(e) => updateField('age', e.target.value)}
                    placeholder="45"
                    className="form-input h-11"
                  />
                </div>
                <div>
                  <Label className="form-label">Gender</Label>
                  <select
                    value={form.gender}
                    onChange={(e) => updateField('gender', e.target.value)}
                    className="form-input h-11"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-lg font-semibold mb-4">Medical Details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="form-label">Surgery Type *</Label>
                  <Input
                    value={form.surgeryType}
                    onChange={(e) => updateField('surgeryType', e.target.value)}
                    placeholder="e.g., Total Knee Replacement"
                    className="form-input h-11"
                  />
                </div>
                <div>
                  <Label className="form-label">Surgeon Name *</Label>
                  <Input
                    value={form.surgeonName}
                    onChange={(e) => updateField('surgeonName', e.target.value)}
                    placeholder="Dr. Smith"
                    className="form-input h-11"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="form-label">Comorbidities</Label>
                  <Textarea
                    value={form.comorbidities}
                    onChange={(e) => updateField('comorbidities', e.target.value)}
                    placeholder="Diabetes, Hypertension, etc."
                    rows={3}
                    className="form-input"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="form-label">Current Medications</Label>
                  <Textarea
                    value={form.medications}
                    onChange={(e) => updateField('medications', e.target.value)}
                    placeholder="List all current medications..."
                    rows={3}
                    className="form-input"
                  />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-lg font-semibold mb-4">Discharge Information</h2>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="form-label">Discharge Date *</Label>
                    <Input
                      type="date"
                      value={form.dischargeDate}
                      onChange={(e) => updateField('dischargeDate', e.target.value)}
                      className="form-input h-11"
                    />
                  </div>
                  <div>
                    <Label className="form-label">Follow-up Duration (days)</Label>
                    <Input
                      type="number"
                      value={form.followUpDays}
                      onChange={(e) => updateField('followUpDays', e.target.value)}
                      placeholder="14"
                      className="form-input h-11"
                    />
                  </div>
                </div>
                <div>
                  <Label className="form-label">Post-Discharge Instructions *</Label>
                  <Textarea
                    value={form.dischargeSummary}
                    onChange={(e) => updateField('dischargeSummary', e.target.value)}
                    placeholder="Enter detailed post-discharge care instructions..."
                    rows={6}
                    className="form-input"
                  />
                </div>
                <div>
                  <Label className="form-label">Emergency Contact</Label>
                  <Input
                    value={form.emergencyContact}
                    onChange={(e) => updateField('emergencyContact', e.target.value)}
                    placeholder="Name and phone number"
                    className="form-input h-11"
                  />
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="text-lg font-semibold mb-4">Review & Submit</h2>
              <div className="space-y-4">
                <ReviewItem label="Patient Name" value={form.fullName} />
                <ReviewItem label="UHID" value={form.uhid} />
                <ReviewItem label="Phone" value={form.phone} />
                <ReviewItem label="Surgery" value={form.surgeryType} />
                <ReviewItem label="Surgeon" value={form.surgeonName} />
                <ReviewItem label="Discharge Date" value={form.dischargeDate} />
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <Label className="text-xs text-slate-500 uppercase tracking-wide">Instructions</Label>
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{form.dischargeSummary}</p>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={step === 1}
          className="h-11 px-6 gap-2"
        >
          <ChevronLeft size={16} />
          Back
        </Button>
        {step < 4 ? (
          <Button onClick={nextStep} className="h-11 px-6 btn-primary gap-2">
            Next
            <ChevronRight size={16} />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-11 px-6 btn-primary gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Enrolling...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Confirm & Enroll
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

const ReviewItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between py-2 border-b border-slate-50">
    <span className="text-sm text-slate-500">{label}</span>
    <span className="text-sm font-medium text-slate-800">{value || '-'}</span>
  </div>
)

export default Enrollment
