import React from 'react'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStatusStyles = () => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-[hsl(var(--success-50))] text-[hsl(var(--success-700))] border-[hsl(var(--success-200))]'
      case 'COMPLETED':
        return 'bg-[hsl(142 71% 95%)] text-[hsl(142 71% 35%)] border-[hsl(142 71% 80%)]'
      case 'ESCALATED':
        return 'bg-[hsl(var(--error-50))] text-[hsl(var(--error-700))] border-[hsl(var(--error-200))]'
      case 'NO_REPLY':
        return 'bg-[hsl(var(--warning-50))] text-[hsl(var(--warning-700))] border-[hsl(var(--warning-200))]'
      case 'PENDING':
        return 'bg-gray-50 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getStatusLabel = () => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'Active'
      case 'COMPLETED':
        return 'Completed'
      case 'ESCALATED':
        return 'Escalated'
      case 'NO_REPLY':
        return 'No Reply'
      case 'PENDING':
        return 'Pending'
      default:
        return status
    }
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  }

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${getStatusStyles()} ${sizeClasses[size]}`}>
      {getStatusLabel()}
    </span>
  )
}

export default StatusBadge
