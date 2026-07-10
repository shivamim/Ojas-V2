import { useState } from 'react'
import { useHospitals, useCreateHospital } from '@/api/hooks'
import { Button } from '@/components/ui/button'
import { Building2, Plus, Users, BedDouble, Loader2 } from 'lucide-react'

const Hospitals = () => {
  const { data: hospitals, isLoading, refetch } = useHospitals()
  const createMutation = useCreateHospital()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    city: '',
    state: '',
    bed_count: 100,
    nabh_level: 'Entry Level',
    contact_email: '',
    contact_phone: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMutation.mutateAsync(form)
      setShowForm(false)
      setForm({ name: '', city: '', state: '', bed_count: 100, nabh_level: 'Entry Level', contact_email: '', contact_phone: '' })
      refetch()
    } catch {
      // Error handled by mutation
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.name === 'bed_count' ? parseInt(e.target.value) || 0 : e.target.value
    setForm((f) => ({ ...f, [e.target.name]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hospitals</h1>
          <p className="text-muted-foreground mt-0.5">Manage hospitals and generate invites</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-[hsl(var(--ojas-600))] hover:bg-[hsl(var(--ojas-700))] self-start"
        >
          <Plus size={16} className="mr-1" />
          Add Hospital
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card-default space-y-4">
          <h3 className="font-semibold">New Hospital</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="name" placeholder="Hospital Name *" required value={form.name} onChange={handleChange} className="input-field" />
            <input name="city" placeholder="City *" required value={form.city} onChange={handleChange} className="input-field" />
            <input name="state" placeholder="State *" required value={form.state} onChange={handleChange} className="input-field" />
            <input name="contact_email" type="email" placeholder="Contact Email *" required value={form.contact_email} onChange={handleChange} className="input-field" />
            <input name="contact_phone" placeholder="Contact Phone *" required value={form.contact_phone} onChange={handleChange} className="input-field" />
            <input name="bed_count" type="number" placeholder="Beds" value={form.bed_count} onChange={handleChange} className="input-field" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending} className="bg-[hsl(var(--ojas-600))] hover:bg-[hsl(var(--ojas-700))]">
              {createMutation.isPending && <Loader2 size={16} className="animate-spin mr-1" />}
              Create Hospital
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="card-default text-center py-12">
          <Loader2 size={24} className="animate-spin mx-auto text-[hsl(var(--ojas-600))]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hospitals?.map((h: { id: string; name: string; city: string; state: string; bed_count: number; nabh_level: string; patient_count?: number }) => (
            <div key={h.id} className="card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-[hsl(var(--ojas-100))] rounded-lg flex items-center justify-center">
                  <Building2 className="text-[hsl(var(--ojas-700))]" size={20} />
                </div>
                <span className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground font-medium">{h.nabh_level}</span>
              </div>
              <h3 className="font-semibold mb-1">{h.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{h.city}, {h.state}</p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users size={14} />
                  <span>{h.patient_count || 0} patients</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BedDouble size={14} />
                  <span>{h.bed_count} beds</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Hospitals
