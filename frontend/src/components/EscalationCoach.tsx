import { useState } from 'react'
import { Lightbulb, Copy, Check } from 'lucide-react'

interface EscalationCoachProps {
  suggestions: string[]
}

const EscalationCoach = ({ suggestions }: EscalationCoachProps) => {
  const [copied, setCopied] = useState<number | null>(null)

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!suggestions?.length) return null

  return (
    <div className="card-default mt-4 border-l-4 border-l-[hsl(var(--ojas-500))] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb size={18} className="text-[hsl(var(--ojas-600))]" />
        <h3 className="font-semibold text-sm">AI Suggested Actions</h3>
      </div>
      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <div key={i} className="flex items-start gap-2 p-3 bg-[hsl(var(--ojas-50))] rounded-lg border border-[hsl(var(--ojas-100))]">
            <span className="text-[hsl(var(--ojas-600))] font-bold text-xs mt-0.5">{i + 1}.</span>
            <p className="text-sm text-muted-foreground flex-1">{s}</p>
            <button
              onClick={() => handleCopy(s, i)}
              className="text-muted-foreground hover:text-[hsl(var(--ojas-600))] transition-colors shrink-0"
              title="Copy"
              aria-label="Copy suggestion"
            >
              {copied === i ? <Check size={14} className="text-[hsl(var(--success-500))]" /> : <Copy size={14} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default EscalationCoach
