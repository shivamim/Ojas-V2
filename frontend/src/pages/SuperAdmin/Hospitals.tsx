import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Search,
  Trash2,
  AlertTriangle,
  X,
  Loader2,
  Users,
  Phone,
  Mail,
  MapPin,
  Plus,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface Hospital {
  id: string
  name: string
  city: string
  state: string
  bed_count: number
  nabh_level: string
  plan_type: string
  patient_count: number
  created_at: string
}

const Hospitals = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [deleteModal, setDeleteModal] = useState<Hospital | null>(null)

  const { data: hospitals, isLoading } = useQuery({
    queryKey: ['hospitals'],
    queryFn: async () => {
      const res = await api.get('/superadmin/hospitals')
      return res.data as Hospital[]
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/superadmin/hospitals/${id}`)
    },
    onSuccess: () => {
      toast.success('Hospital removed successfully')
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
      setDeleteModal(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to remove hospital')
    },
  })

  const filtered = (hospitals || []).filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.city.toLowerCase().includes(search.toLowerCase())
  )

  const addHospitalMutation = useCreateHospital()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null)
  const [newHospitalForm, setNewHospitalForm] = useState({
    name: '',
    city: '',
    state: '',
    bed_count: 100,
    nabh_level: 'Entry Level',
    contact_email: '',
    contact_phone: '',
  })

  const handleAddHospital = async () => {
    try {
      await addHospitalMutation.mutateAsync(newHospitalForm)
      toast.success('Hospital created successfully')
      setAddDialogOpen(false)
      setNewHospitalForm({
        name: '',
        city: '',
        state: '',
        bed_count: 100,
        nabh_level: 'Entry Level',
        contact_email: '',
        contact_phone: '',
      })
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create hospital')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hospitals</h1>
          <p className="text-muted-foreground mt-0.5">Manage all registered hospitals</p>
        </div>
        <Button className="btn-primary gap-2" onClick={() => setAddDialogOpen(true)}>
          <Plus size={16} />
          Add Hospital
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <Input
          placeholder="Search hospitals by name or admin email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input pl-10 h-11"
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Building2 size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No hospitals found</p>
          <p className="text-sm">Try adjusting your search or add a new hospital.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {filtered.map((hospital) => (
              <motion.div
                key={hospital.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                layout
                className="card-default flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[hsl(var(--ojas-100))] flex items-center justify-center shrink-0">
                    <Building2 size={24} className="text-[hsl(var(--ojas-700))]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{hospital.name}</h3>
                      <Badge variant={hospital.is_active ? 'default' : 'secondary'} className={hospital.is_active ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                        {hospital.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><MapPin size={12} /> {hospital.city}, {hospital.state}</span>
                      <span className="flex items-center gap-1"><Users size={12} /> {hospital.patient_count || 0} patients</span>
                      <span className="flex items-center gap-1">NABH: {hospital.nabh_level}</span>
                      <span className="flex items-center gap-1">Beds: {hospital.bed_count}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Plan: {hospital.plan_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingHospital(hospital); setEditDialogOpen(true) }}>Edit</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setDeleteModal(hospital)}
                  >
                    <Trash2 size={14} className="mr-1" />
                    Remove
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setDeleteModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-center mb-2">Remove Hospital?</h3>
              <p className="text-sm text-slate-600 text-center mb-1">
                Are you sure you want to remove <strong>{deleteModal.name}</strong>?
              </p>
              <p className="text-xs text-red-500 text-center mb-6">
                This will delete all patient data associated with this hospital. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-11" onClick={() => setDeleteModal(null)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => deleteMutation.mutate(deleteModal.id)}
                  disabled={deleteMutation.isPending || deleteModal.patient_count > 0}
                >
                  {deleteMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Removing...
                    </span>
                  ) : deleteModal.patient_count > 0 ? (
                    'Cannot Delete (Has Patients)'
                  ) : (
                    'Remove Hospital'
                  )}
                </Button>
              </div>
              <button
                onClick={() => setDeleteModal(null)}
                className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Hospital Dialog */}
      <AnimatePresence>
        {addDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setAddDialogOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10"
            >
              <h3 className="text-lg font-bold mb-4">Add Hospital</h3>
              <div className="space-y-4">
                <div>
                  <Label className="form-label">Hospital Name *</Label>
                  <Input
                    value={newHospitalForm.name}
                    onChange={(e) => setNewHospitalForm({ ...newHospitalForm, name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="form-label">City *</Label>
                    <Input
                      value={newHospitalForm.city}
                      onChange={(e) => setNewHospitalForm({ ...newHospitalForm, city: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <Label className="form-label">State *</Label>
                    <Input
                      value={newHospitalForm.state}
                      onChange={(e) => setNewHospitalForm({ ...newHospitalForm, state: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="form-label">Bed Count</Label>
                    <Input
                      type="number"
                      value={newHospitalForm.bed_count}
                      onChange={(e) => setNewHospitalForm({ ...newHospitalForm, bed_count: parseInt(e.target.value) || 100 })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <Label className="form-label">NABH Level</Label>
                    <select
                      value={newHospitalForm.nabh_level}
                      onChange={(e) => setNewHospitalForm({ ...newHospitalForm, nabh_level: e.target.value })}
                      className="form-input"
                    >
                      <option value="Entry Level">Entry Level</option>
                      <option value="NABH">NABH</option>
                      <option value="NABL">NABL</option>
                      <option value="JCI">JCI</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="form-label">Contact Email *</Label>
                    <Input
                      type="email"
                      value={newHospitalForm.contact_email}
                      onChange={(e) => setNewHospitalForm({ ...newHospitalForm, contact_email: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <Label className="form-label">Contact Phone *</Label>
                    <Input
                      value={newHospitalForm.contact_phone}
                      onChange={(e) => setNewHospitalForm({ ...newHospitalForm, contact_phone: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1 h-11" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-11 btn-primary"
                  onClick={handleAddHospital}
                  disabled={addHospitalMutation.isPending || !newHospitalForm.name || !newHospitalForm.city || !newHospitalForm.state}
                >
                  {addHospitalMutation.isPending ? 'Creating...' : 'Create Hospital'}
                </Button>
              </div>
              <button
                onClick={() => setAddDialogOpen(false)}
                className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Hospital Dialog */}
      <AnimatePresence>
        {editDialogOpen && editingHospital && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setEditDialogOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10"
            >
              <h3 className="text-lg font-bold mb-4">Edit Hospital</h3>
              <div className="space-y-4">
                <div>
                  <Label className="form-label">Hospital Name</Label>
                  <Input
                    value={editingHospital.name}
                    disabled
                    className="form-input bg-muted"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="form-label">City</Label>
                    <Input value={editingHospital.city} disabled className="form-input bg-muted" />
                  </div>
                  <div>
                    <Label className="form-label">State</Label>
                    <Input value={editingHospital.state} disabled className="form-input bg-muted" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="form-label">Bed Count</Label>
                    <Input value={editingHospital.bed_count} disabled className="form-input bg-muted" />
                  </div>
                  <div>
                    <Label className="form-label">NABH Level</Label>
                    <Input value={editingHospital.nabh_level} disabled className="form-input bg-muted" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Contact superadmin to modify hospital details.
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1 h-11" onClick={() => setEditDialogOpen(false)}>
                  Close
                </Button>
              </div>
              <button
                onClick={() => setEditDialogOpen(false)}
                className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Hospitals
