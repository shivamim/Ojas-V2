import { useAuditLogs } from '@/api/hooks'
import { ClipboardList, Shield, Loader2 } from 'lucide-react'

const AuditLogs = () => {
  const { data: logs, isLoading } = useAuditLogs(100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield size={24} className="text-[hsl(var(--ojas-600))]" />
          Audit Logs
        </h1>
        <p className="text-muted-foreground mt-0.5">Security and compliance event trail</p>
      </div>

      <div className="card-default overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 size={24} className="animate-spin mx-auto mb-3 text-[hsl(var(--ojas-600))]" />
            <p className="text-muted-foreground">Loading logs...</p>
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Action</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Resource</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden lg:table-cell">IP Address</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Time</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: { id: string; action: string; resource: string; user_id?: string; ip_address?: string; timestamp: string; success: boolean }) => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium">{log.action}</td>
                    <td className="py-3 px-4 text-muted-foreground">{log.resource}</td>
                    <td className="py-3 px-4 text-muted-foreground font-mono text-xs hidden md:table-cell">
                      {log.user_id?.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs hidden lg:table-cell">
                      {log.ip_address || '—'}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${
                          log.success ? 'bg-[hsl(var(--success-500))]' : 'bg-[hsl(var(--error-500))]'
                        }`}
                        title={log.success ? 'Success' : 'Failed'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuditLogs
