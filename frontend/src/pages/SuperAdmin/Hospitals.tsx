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
  address: string
  phone: string
  email: string
  admin_name: string
  admin_email: string
  is_active: boolean
  created_at: string
  patient_count?: number
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
    h.admin_email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hospitals</h1>
          <p className="text-muted-foreground mt-0.5">Manage all registered hospitals</p>
        </div>
        <Button className="btn-primary gap-2">
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
                      <span className="flex items-center gap-1"><MapPin size={12} /> {hospital.address}</span>
                      <span className="flex items-center gap-1"><Phone size={12} /> {hospital.phone}</span>
                      <span className="flex items-center gap-1"><Mail size={12} /> {hospital.email}</span>
                      <span className="flex items-center gap-1"><Users size={12} /> {hospital.patient_count || 0} patients</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Admin: {hospital.admin_name} ({hospital.admin_email})</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">Edit</Button>
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
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Removing...
                    </span>
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
    </div>
  )
}

export default Hospitals
