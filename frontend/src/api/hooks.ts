import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './client'

const isAuthenticated = () => !!localStorage.getItem('access_token')

export const useMeQuery = () => {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me')
      return data
    },
    retry: false,
    staleTime: Infinity,
    enabled: isAuthenticated(),
  })
}

export const useLogin = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { data } = await api.post('/auth/login', credentials)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth'] }),
  })
}

export const useLogout = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout')
    },
    onSuccess: () => {
      qc.clear()
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    },
    onError: () => {
      qc.clear()
      localStorage.clear()
      window.location.href = '/login'
    },
  })
}

export const useHospitals = () => {
  return useQuery({
    queryKey: ['hospitals'],
    queryFn: async () => {
      const { data } = await api.get('/superadmin/hospitals')
      return data
    },
    enabled: true,
  })
}

export const useCreateHospital = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/superadmin/hospitals', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hospitals'] }),
  })
}

export const usePatients = (status = '', page = 1, limit = 20) => {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  params.append('page', page.toString())
  params.append('limit', limit.toString())

  return useQuery({
    queryKey: ['patients', status, page],
    queryFn: async () => {
      const { data } = await api.get(`/patients?${params.toString()}`)
      return data
    },
  })
}

export const usePatient = (id: string | undefined) => {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      const { data } = await api.get(`/patients/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export const useCreatePatient = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/patients', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}

export const useEscalations = (status = 'OPEN') => {
  return useQuery({
    queryKey: ['escalations', status],
    queryFn: async () => {
      const { data } = await api.get(`/escalations?status=${status}`)
      return data
    },
  })
}

export const useResolveEscalation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.post(`/escalations/${id}/resolve`, { resolution_note: note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['escalations'] }),
  })
}

export const useAuditLogs = (limit = 100) => {
  return useQuery({
    queryKey: ['audit-logs', limit],
    queryFn: async () => {
      const { data } = await api.get(`/superadmin/audit-logs?limit=${limit}`)
      return data
    },
  })
}
