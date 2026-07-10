import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'

interface RiskBadgeProps {
  score?: number
  level: string
  size?: 'sm' | 'md'
}

const RiskBadge = ({ score, level, size = 'md' }: RiskBadgeProps) => {
  const config: Record<string, { color: string; icon: typeof AlertTriangle }> = {
    CRITICAL: { color: 'badge-risk-critical', icon: AlertTriangle },
    HIGH: { color: 'badge-risk-high', icon: AlertTriangle },
    MEDIUM: { color: 'badge-risk-medium', icon: AlertCircle },
    LOW: { color: 'badge-risk-low', icon: CheckCircle },
  }

  const c = config[level] || config.LOW
  const Icon = c.icon

  return (
    <span className={`${c.color} ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}>
      <Icon size={size === 'sm' ? 10 : 12} />
      {level} {score !== undefined && score > 0 ? `(${score})` : ''}
    </span>
  )
}

export default RiskBadge
