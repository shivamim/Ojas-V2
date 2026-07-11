# Ojas V2 - Production Deployment Guide

## Overview
This guide covers deploying the DPDPA-compliant, NABH-ready Ojas HealthTech SaaS platform.

---

## P0-P5 COMPLETED CHANGES

### P0: Critical Security Fixes ✅
1. **Rate Limiting** - Added to `/auth/login` (5/min) and `/auth/refresh` (10/min)
2. **Removed Dangerous Endpoint** - Deleted `/superadmin/reset-database` HTTP endpoint
3. **Fixed Invite Links** - Now uses `settings.FRONTEND_URL` instead of hardcoded domain
4. **Email Invites** - Added Resend integration for hospital invites
5. **Model Imports** - Fixed missing imports in main.py

### P1: WhatsApp Webhook & Multi-language ✅
1. **Webhook GET Handler** - Meta verification handshake implemented
2. **Webhook POST Handler** - Processes patient responses, matches by phone, updates check-ins
3. **HELP/SOS Detection** - Creates CRITICAL escalation on keywords regardless of risk score
4. **Multi-language Templates** - Created `whatsapp_templates.py` with English + placeholder Hindi
5. **Template Messaging** - Added `send_template_message()` for business-initiated outreach

### P2: DPDPA Compliance ✅
1. **Patient Model Updates**:
   - `consent_given` (Boolean)
   - `consent_given_at` (DateTime)
   - `consent_version` (String)
   - `preferred_language` (String, default "en")
   - `erasure_requested_at` (DateTime)

2. **New API Endpoints**:
   - `POST /patients/{id}/export` - Right to Access (full data export)
   - `POST /patients/{id}/erasure-request` - Request erasure
   - `POST /patients/{id}/erasure-approve` - Anonymize PII (preserves clinical data)

3. **Consent Enforcement**:
   - Updated `PatientCreate` requires `consent_given: true`
   - Rejects enrollment without consent

### P3: Frontend Consent Screen ✅
Created `ConsentStep.tsx` component with:
- Plain language explanations (what, why, who, how long, rights)
- Unchecked-by-default checkbox
- DPO contact information
- Cannot proceed without checking

### P4: Infrastructure Hardening ✅
1. **Sentry SDK** - Added to requirements.txt for both frontend/backend
2. **Redis Cache** - Drop-in replacement with fallback to in-memory
3. **Environment Variables** - Updated `.env.example` files

### Files Modified/Created:
```
backend/app/models/patient.py          - Added DPDPA fields
backend/app/routers/patients.py        - Consent enforcement, export, erasure endpoints
backend/app/routers/whatsapp.py        - Full webhook implementation
backend/app/services/whatsapp.py       - Template messaging
backend/app/services/whatsapp_templates.py - NEW: Multi-language templates
backend/app/services/email.py          - Resend integration
backend/app/core/redis.py              - Redis wrapper with fallback
frontend/src/components/ConsentStep.tsx - NEW: DPDPA consent screen
backend/requirements.txt               - Added redis, sentry-sdk, resend
backend/.env.example                   - Updated with all vars
frontend/.env.example                  - Created with Sentry var
```

---

## DEPLOYMENT STEPS

### 1. Backend (Render/Railway/AWS)

#### Environment Variables Required:
```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/ojas?sslmode=require

# Security (generate with: openssl rand -hex 32)
SECRET_KEY=<32-char-random-string>
ENCRYPTION_KEY=<16-char-random-string>
ENCRYPTION_SALT=ojas-salt-2026

# URLs
FRONTEND_URL=https://your-domain.com
ENVIRONMENT=production

# WhatsApp (360dialog/Meta)
WHATSAPP_API_KEY=<your-api-key>
WHATSAPP_API_URL=https://waba.360dialog.io/v1/messages
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<your-secret-token>

# Email (Resend)
RESEND_API_KEY=<your-resend-key>

# Cache (Redis - optional but recommended)
REDIS_URL=redis://your-redis-host:6379

# Monitoring (Sentry)
SENTRY_DSN=https://xxx@ingest.sentry.io/yyy

# Compliance
DPO_EMAIL=dpo@your-hospital.com
```

#### Deploy Commands:
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run migrations (if using Alembic)
alembic upgrade head

# Start server (production)
uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 4
```

#### Docker (Optional):
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2. Frontend (Vercel/Netlify)

#### Environment Variables:
```bash
VITE_API_URL=https://your-backend-url.com
VITE_DPO_EMAIL=dpo@your-hospital.com
VITE_SENTRY_DSN=https://xxx@ingest.sentry.io/yyy
```

#### Deploy Commands:
```bash
cd frontend

# Install dependencies
npm ci

# Build
npm run build

# Preview locally
npm run preview
```

#### Vercel Deployment:
1. Connect GitHub repo to Vercel
2. Set root directory to `frontend`
3. Add environment variables
4. Deploy

### 3. WhatsApp Webhook Configuration

1. In Meta Developer Dashboard → WhatsApp → App Settings
2. Set Webhook URL to: `https://your-backend-url.com/whatsapp/webhook`
3. Set Verify Token to match `WHATSAPP_WEBHOOK_VERIFY_TOKEN` env var
4. Subscribe to `messages` event

Test with curl:
```bash
# Test GET handshake
curl "https://your-backend.com/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=12345"
# Should return: 12345

# Test POST with mock payload
curl -X POST https://your-backend.com/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "field": "messages",
        "value": {
          "messages": [{
            "from": "919876543210",
            "type": "text",
            "text": {"body": "HELP"}
          }]
        }
      }]
    }]
  }'
# Should create CRITICAL escalation
```

### 4. Database Migration

Since we added new columns to Patient model:

```bash
# Option A: Using Alembic (recommended)
cd backend
alembic revision --autogenerate -m "Add DPDPA fields to Patient"
alembic upgrade head

# Option B: Manual migration (if not using Alembic)
psql $DATABASE_URL << EOF
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMP;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_version VARCHAR;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS preferred_language VARCHAR DEFAULT 'en';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS erasure_requested_at TIMESTAMP;
EOF
```

### 5. Update Frontend Enrollment Page

You need to integrate the ConsentStep component into Enrollment.tsx:

```tsx
// Add to frontend/src/pages/Enrollment.tsx
import ConsentStep from '@/components/ConsentStep'

// Inside component:
const [showConsent, setShowConsent] = useState(true)
const [consentGiven, setConsentGiven] = useState(false)

if (showConsent) {
  return (
    <ConsentStep 
      onConsentGiven={() => setShowConsent(false)}
      dpoEmail={import.meta.env.VITE_DPO_EMAIL || 'dpo@ojas.care'}
    />
  )
}

// Add to PatientCreate payload:
await createMutation.mutateAsync({
  ...form,
  age: parseInt(form.age),
  consent_given: true, // Must be true after consent screen
  preferred_language: form.preferred_language || 'en'
})
```

---

## VERIFICATION CHECKLIST

### Backend Tests:
- [ ] Login rate limiting works (try 6 rapid logins)
- [ ] `/superadmin/reset-database` returns 404
- [ ] Invite emails are sent (check Resend dashboard)
- [ ] Webhook GET returns challenge string
- [ ] Webhook POST with "HELP" creates CRITICAL escalation
- [ ] Patient export endpoint returns full decrypted data
- [ ] Erasure request + approve anonymizes PII fields

### Frontend Tests:
- [ ] Consent screen appears before enrollment form
- [ ] Cannot submit without checking consent box
- [ ] Mobile cards display at 375px viewport
- [ ] Dark mode toggle persists across reloads
- [ ] All icon buttons have aria-labels

### Compliance Checks:
- [ ] All patient data encrypted at rest (AES-256)
- [ ] Audit logs capture all access/modifications
- [ ] RBAC prevents cross-hospital data access
- [ ] Data retention policy documented
- [ ] DPO contact visible in consent screen

---

## MONITORING & ALERTS

### Sentry Setup:
1. Create project at sentry.io
2. Copy DSN to `SENTRY_DSN` and `VITE_SENTRY_DSN`
3. Configure alert rules for:
   - HTTP 5xx errors > 1%
   - Database connection failures
   - WhatsApp send failures

### Redis Monitoring:
```bash
# Check cache stats via API (add admin endpoint if needed)
curl https://your-backend.com/admin/cache-stats
```

### Log Aggregation:
Recommended: Send logs to Datadog/New Relic/CloudWatch
Key patterns to alert on:
- `[WEBHOOK] No patient found` - Possible configuration issue
- `WhatsApp send failed` - API key expired
- `Failed to send invite email` - Resend quota exceeded

---

## SECURITY HARDENING (Post-Deploy)

1. **Enable HTTPS Only** - Force SSL redirect in production
2. **CORS Strict Mode** - Remove localhost origins in production
3. **Database Backups** - Daily automated backups with encryption
4. **Secret Rotation** - Rotate ENCRYPTION_KEY every 90 days
5. **Penetration Testing** - Quarterly security audits
6. **DPDPA Documentation** - Maintain records of consent, processing activities

---

## TROUBLESHOOTING

### Common Issues:

**Issue**: Webhook not receiving messages
- Check Meta app subscription is active
- Verify webhook URL is publicly accessible (no localhost)
- Ensure `WHATSAPP_WEBHOOK_VERIFY_TOKEN` matches exactly

**Issue**: Patients can't be matched by phone
- Verify phone format includes country code (+91)
- Check encryption key is consistent across deployments
- Consider adding deterministic hash column for lookups

**Issue**: Consent screen not showing
- Ensure Enrollment.tsx imports and renders ConsentStep
- Verify state management for consent flow

**Issue**: Redis connection fails
- App falls back to in-memory cache automatically
- Check REDIS_URL format: `redis://host:port`
- For Redis Cloud: `rediss://user:pass@host:port`

---

## SUPPORT CONTACTS

- Technical Issues: tech@ojas.care
- Data Protection Officer: dpo@ojas.care
- Security Emergencies: security@ojas.care

---

## LEGAL COMPLIANCE SUMMARY

| Requirement | Implementation |
|-------------|----------------|
| DPDPA Consent | Explicit checkbox with plain language disclosure |
| DPDPA Access | `/patients/{id}/export` endpoint |
| DPDPA Erasure | Two-step request + approve with PII anonymization |
| DPDPA Portability | Export returns machine-readable JSON |
| Medical Records Retention | Clinical data preserved during erasure |
| NABH Data Security | AES-256 encryption, audit logs, RBAC |
| HIPAA (future) | Encryption + audit trail ready |

---

Last Updated: $(date)
Version: 2.0.0-production
