import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { AlertCircle, Shield, Eye, Clock, Mail } from 'lucide-react'

interface ConsentStepProps {
  onConsentGiven: (consent: boolean) => void
  dpoEmail: string
}

const ConsentStep = ({ onConsentGiven, dpoEmail }: ConsentStepProps) => {
  const [checked, setChecked] = useState(false)

  const handleContinue = () => {
    if (checked) {
      onConsentGiven(true)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="card-default p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-[hsl(var(--ojas-600))]" />
          <h2 className="text-xl font-bold">Your Data Privacy Rights</h2>
        </div>

        <p className="text-sm text-muted-foreground">
          Under India's Digital Personal Data Protection Act (DPDPA) 2023, 
          we need your explicit consent before collecting and processing your health information.
        </p>

        <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-[hsl(var(--ojas-600))] mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">What We Collect</h3>
              <p className="text-xs text-muted-foreground">
                Name, mobile number, age, surgery type, discharge date, doctor details, 
                daily health responses (pain level, symptoms), and recovery progress.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-[hsl(var(--ojas-600))] mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Why We Need It</h3>
              <p className="text-xs text-muted-foreground">
                To monitor your post-discharge recovery, detect complications early, 
                alert your care team if risks are detected, and improve outcomes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-[hsl(var(--ojas-600))] mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Who Can See Your Data</h3>
              <p className="text-xs text-muted-foreground">
                Only your hospital's assigned care coordinator and treating doctors. 
                Your data is never sold or shared with third parties.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-[hsl(var(--ojas-600))] mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">How Long We Keep It</h3>
              <p className="text-xs text-muted-foreground">
                For the duration of your 14-day monitoring program plus any period 
                required by medical record retention laws (typically 3-7 years).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-[hsl(var(--ojas-600))] mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Your Rights</h3>
              <p className="text-xs text-muted-foreground">
                You can access your data anytime, request corrections, withdraw consent, 
                and request erasure (subject to legal retention requirements).
                Contact: <a href={`mailto:${dpoEmail}`} className="text-[hsl(var(--ojas-600))] underline">{dpoEmail}</a>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-[hsl(var(--ojas-50))] border border-[hsl(var(--ojas-200))] rounded-lg">
          <AlertCircle className="w-5 h-5 text-[hsl(var(--ojas-600))] mt-0.5 shrink-0" />
          <div className="space-y-2">
            <p className="text-sm font-medium">Important Notice</p>
            <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
              <li>Your consent is voluntary and can be withdrawn at any time</li>
              <li>Withdrawing consent will stop monitoring but may affect your care</li>
              <li>All data is encrypted and stored securely in India</li>
              <li>This system is for monitoring only, not emergency care</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t">
          <Checkbox
            id="consent"
            checked={checked}
            onCheckedChange={(c) => setChecked(c as boolean)}
          />
          <label
            htmlFor="consent"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I have read and agree to the collection and processing of my health data 
            for post-discharge monitoring purposes
          </label>
        </div>

        <Button
          onClick={handleContinue}
          disabled={!checked}
          className="w-full bg-[hsl(var(--ojas-600))] hover:bg-[hsl(var(--ojas-700))]"
        >
          Continue to Enrollment
        </Button>
      </div>
    </div>
  )
}

export default ConsentStep
