import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreatePatient } from '@/api/hooks'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle, UserPlus, AlertCircle } from 'lucide-react'

const Enrollment = () => {
  const navigate = useNavigate()
  const createMutation = useCreatePatient()
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    mobile: '',
    family_mobile: '',
    age: '',
    surgery_type: '',
    discharge_date: '',
    doctor_name: '',
    doctor_specialty: '',
    bed_number: '',
    uhid: '',
    instructions: 'Keep wound dry. Take prescribed medicines. Walk daily.',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await createMutation.mutateAsync({
        ...form,
        age: parseInt(form.age),
      })
      setSuccess(true)
      setTimeout(() => navigate('/patients'), 1500)
    } catch {
      // Error handled by mutation
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-12 card-default text-center py-12">
        <div className="w-16 h-16 bg-[hsl(var(--success-50))] rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-[hsl(var(--success-500))]" />
        </div>
        <h2 className="text-xl font-bold mb-2">Patient Enrolled Successfully</h2>
        <p className="text-muted-foreground">14 check-ins have been scheduled. Redirecting...</p>
      </div>
    )
  }

  const fields = [
    { name: 'full_name', label: 'Full Name *', type: 'text', placeholder: 'Patient full name', required: true },
    { name: 'age', label: 'Age *', type: 'number', placeholder: 'Years', required: true, min: 0, max: 150 },
    { name: 'mobile', label: 'Mobile *', type: 'tel', placeholder: '+91...', required: true, minLength: 10 },
    { name: 'family_mobile', label: 'Family Mobile *', type: 'tel', placeholder: '+91...', required: true, minLength: 10 },
    { name: 'surgery_type', label: 'Surgery Type *', type: 'text', placeholder: 'e.g. Knee Replacement', required: true },
    { name: 'discharge_date', label: 'Discharge Date *', type: 'date', required: true },
    { name: 'doctor_name', label: 'Doctor Name *', type: 'text', placeholder: 'Attending doctor', required: true },
    { name: 'doctor_specialty', label: 'Specialty *', type: 'text', placeholder: 'e.g. Orthopedics', required: true },
    { name: 'bed_number', label: 'Bed Number *', type: 'text', placeholder: 'e.g. ICU-12', required: true },
    { name: 'uhid', label: 'UHID *', type: 'text', placeholder: 'Hospital UHID', required: true },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft size={16} className="mr-1" /> Back
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Enroll New Patient</h1>
        <p className="text-muted-foreground mt-0.5">Create a new post-discharge monitoring record</p>
      </div>

      <form onSubmit={handleSubmit} className="card-default space-y-6">
        {createMutation.isError && (
          <div className="alert-error flex items-start gap-2.5" role="alert">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              {(createMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to enroll patient. Please check all fields.'}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label htmlFor={field.name} className="block text-sm font-medium mb-1.5">
                {field.label}
              </label>
              <input
                id={field.name}
                name={field.name}
                type={field.type}
                required={field.required}
                min={field.min}
                max={field.max}
                minLength={field.minLength}
                value={form[field.name as keyof typeof form]}
                onChange={handleChange}
                className="input-field"
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>

        <div>
          <label htmlFor="instructions" className="block text-sm font-medium mb-1.5">
            Post-Discharge Instructions
          </label>
          <textarea
            id="instructions"
            name="instructions"
            rows={3}
            value={form.instructions}
            onChange={handleChange}
            className="input-field"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-[hsl(var(--ojas-600))] hover:bg-[hsl(var(--ojas-700))]"
          >
            <UserPlus size={16} className="mr-1" />
            {createMutation.isPending ? 'Enrolling...' : 'Enroll Patient'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/patients')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

export default Enrollment
