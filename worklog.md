# Phase 1: Complete Architecture Map — Ojas-V2

**Task ID:** 1  
**Scope:** Every source file read. No files skipped.  
**Version audited:** Backend 3.0.0 / Frontend 3.0.0

---

## 1. Frontend Architecture

### Framework & Build
- **React 18** with **TypeScript** (strict mode, TS ~5.9.3)
- **Vite 5** build tool with `@vitejs/plugin-react`
- **Tailwind CSS 3** with `tailwindcss-animate` plugin + custom design tokens (CSS variables: `--ojas-*`, `--success-*`, `--warning-*`, `--error-*`)
- **Fonts:** Inter (sans) + Fraunces (display) via Google Fonts
- **Dark mode:** via `next-themes` (class-based), togglable
- **Build output:** `dist/` with code splitting — manual chunks for `vendor`, `charts`, `query`, `ui`, `utils`
- **Vercel deploy:** SPA rewrites via `vercel.json` (`/(.*)` → `/index.html`)

### Routing
- **React Router 6** (`BrowserRouter`)
- All pages **lazy-loaded** via `React.lazy()` + `Suspense`
- Routes:
  | Path | Component | Auth | Role Gate |
  |---|---|---|---|
  | `/` | `LandingPage` | No | — |
  | `/login` | `Login` | No | — |
  | `/accept-invite` | `AcceptInvite` | No | — |
  | `/dashboard` | `Dashboard` | Yes | — |
  | `/patients` | `PatientList` | Yes | — |
  | `/patients/new` | `Enrollment` | Yes | — |
  | `/patients/:id` | `PatientDetail` | Yes | — |
  | `/escalations` | `Escalations` | Yes | — |
  | `/reports` | `Reports` | Yes | — |
  | `/settings` | `Settings` | Yes | — |
  | `/superadmin/hospitals` | `Hospitals` | Yes | `SUPER_ADMIN` |
  | `/superadmin/audit-logs` | `AuditLogs` | Yes | `SUPER_ADMIN` |
  | `*` | `NotFound` | No | — |

### State Management
- **No global state store** (no Redux/Zustand)
- **TanStack Query v5** for server state (staleTime: 5min, retry: 1, no refetchOnWindowFocus)
- **React Context** only for auth (`AuthContext`)
- **localStorage** for token persistence (`access_token`, `refresh_token`, `user` JSON)
- Enrollment form has auto-save to localStorage via `ojas_enrollment_draft` key

### API Client (`src/api/client.ts`)
- **Axios** instance with `baseURL = VITE_API_URL || http://localhost:8000`, 30s timeout
- **Request interceptor:** injects `Bearer` token from localStorage
- **Response interceptor:** on 401 → queues concurrent requests, single in-flight refresh via `/auth/refresh`, redirects to `/login` on failure
- Refresh queue pattern: `isRefreshing` flag + `queue[]` array resolves/rejects all pending requests

### Data Fetching Hooks (`src/api/hooks.ts`)
- `useMeQuery()` — `GET /auth/me`, no retry, infinite staleTime, enabled only when authenticated
- `useLogin()` — `POST /auth/login`, invalidates `['auth']` queries on success
- `useLogout()` — `POST /auth/logout`, clears all state + localStorage, hard redirects
- `useHospitals()` — `GET /superadmin/hospitals`
- `useCreateHospital()` — `POST /superadmin/hospitals`
- `usePatients(status, page, limit)` — `GET /patients?status=&page=&limit=`
- `usePatient(id)` — `GET /patients/:id`
- `useCreatePatient()` — `POST /patients`
- `useEscalations(status)` — `GET /escalations?status=`
- `useResolveEscalation()` — `POST /escalations/:id/resolve`
- `useAuditLogs(limit)` — `GET /superadmin/audit-logs?limit=`

### Component Hierarchy
```
main.tsx
  └── BrowserRouter → QueryClientProvider → ThemeProvider → AuthProvider → App → Toaster (sonner)
       └── ErrorBoundary
            └── Suspense (spinner fallback)
                 └── Routes
                      ├── LandingPage (public)
                      ├── Login (public)
                      ├── AcceptInvite (public)
                      ├── ProtectedRoute
                      │    └── AppLayout (Sidebar + Header)
                      │         └── PageTransition (framer-motion AnimatePresence)
                      │              ├── Dashboard
                      │              ├── PatientList
                      │              ├── PatientDetail
                      │              ├── Enrollment
                      │              ├── Escalations
                      │              ├── Reports
                      │              ├── Settings
                      │              ├── Hospitals (SUPER_ADMIN)
                      │              └── AuditLogs (SUPER_ADMIN)
                      └── NotFound
```

### Custom Components (non-shadcn)
- `RiskBadge` — colored badge with icon for CRITICAL/HIGH/MEDIUM/LOW risk levels
- `StatusBadge` — colored badge for ACTIVE/COMPLETED/ESCALATED/NO_REPLY/PENDING
- `EscalationCoach` — renders AI-suggested actions with one-click copy
- `ConsentStep` — DPDPA 2023 consent screen with checkbox, DPO email link
- `DashboardLayout` — alternative layout (Sidebar + TopBar), not used in App.tsx (App uses inline AppLayout)

### UI Library
- **shadcn/ui** on **Radix UI** primitives — 40+ components in `src/components/ui/`
- Notable: accordion, alert-dialog, calendar, carousel, chart (Recharts wrapper), command (cmdk), dialog, drawer, input-otp, resizable, sidebar, sonner (toast), tabs, tooltip

### Frontend Dependencies
- **Runtime:** react 18, react-dom 18, react-router-dom 6, @tanstack/react-query 5, axios, recharts 2, framer-motion 11, zod 4, react-hook-form 7, sonner (toast), next-themes, lucide-react (icons), date-fns, input-otp, vaul (drawer), cmdk, embla-carousel-react, react-resizable-panels, react-day-picker, tailwind-merge, clsx, class-variance-authority
- **Dev:** typescript 5.9, vite 5, @vitejs/plugin-react, tailwindcss 3, postcss, autoprefixer, eslint 9, tailwindcss-animate

---

## 2. Backend Architecture

### Framework
- **FastAPI 0.115** (async) running on **Uvicorn** (standard, with uvloop)
- **Python 3.11** (per Dockerfile + render.yaml)
- **Pydantic v2** for request/response validation
- **pydantic-settings** for env-based config

### Middleware Stack (applied in order in main.py)
1. **CORSMiddleware** — origins from `FRONTEND_URL` (comma-separable), allows credentials, methods: GET/POST/PUT/DELETE/OPTIONS/PATCH, headers: Authorization/Content-Type/Accept/Origin/X-Requested-With
2. **GZipMiddleware** — minimum_size=1000 bytes
3. **SlowAPI** (rate limiter) — `RateLimitExceeded` handler registered, `get_remote_address` key function

### Application Lifespan (`main.py:lifespan`)
1. Checks if `users` table exists in DB
2. If missing → `Base.metadata.create_all()` to auto-create schema
3. If still missing → raises RuntimeError (manual intervention needed)
4. Auto-creates default superadmin (`admin@ojas.care` / `admin123`) if zero users exist
5. In non-production: seeds demo data via `seed_data.py` (background task, 2s delay)
6. On shutdown: disposes engine

### Routers (all registered in main.py)
| Router | Prefix | Tags |
|---|---|---|
| `auth.router` | `/auth` | Auth |
| `superadmin.router` | `/superadmin` | SuperAdmin |
| `hospitals.router` | `/hospitals` | Hospitals |
| `patients.router` | `/patients` | Patients |
| `grievance_router` | `/grievances` | Grievances |
| `escalations.router` | `/escalations` | Escalations |
| `reports.router` | `/reports` | Reports |
| `whatsapp.router` | `/whatsapp` | WhatsApp |
| `contact.router` | (none) | — |

### Health Endpoint
- `GET /health` — checks DB connectivity, returns version, environment, DB status, timestamp

### Demo Data Endpoint
- `POST /admin/seed-demo-data` — requires HOSPITAL_MANAGE permission, seeds if no patients exist, returns 409 if already seeded

### Python Dependencies
```
fastapi==0.115.0
uvicorn[standard]==0.32.0
sqlalchemy==2.0.36
asyncpg==0.29.0
pydantic==2.9.2
pydantic-settings==2.6.1
python-jose==3.3.0
passlib==1.7.4
bcrypt==4.0.1
python-multipart==0.0.17
httpx==0.27.2
reportlab==4.2.5
python-dateutil==2.9.0
email-validator==2.2.0
cryptography==42.0.0
python-dotenv==1.0.1
slowapi==0.1.9
alembic==1.13.0
redis==5.0.8
sentry-sdk[fastapi]==1.45.0
```

---

## 3. APIs — Complete Endpoint Catalog

### Auth (`/auth`)
| Method | Path | Auth | Request Body | Response | Notes |
|---|---|---|---|---|---|
| POST | `/auth/login` | No | `{email, password}` | `{access_token, refresh_token, token_type, user}` | Rate limited 5/min |
| POST | `/auth/refresh` | No | `{refresh_token}` | `{access_token}` | Rate limited 10/min; validates against DB-stored hash |
| POST | `/auth/logout` | Yes | — | `{message}` | Deletes all refresh tokens for user |
| POST | `/auth/verify-invite` | No | `{token}` (query? actually body via FastAPI default) | `{valid, email, role}` | Validates invite token |
| POST | `/auth/accept-invite` | No | `{token, full_name, password}` | `{access_token, refresh_token, user}` | Password: min 8, 1 upper, 1 lower, 1 digit |
| GET | `/auth/me` | Yes | — | `{user_id, email, role, hospital_id}` | Returns JWT payload data |

### Super Admin (`/superadmin`)
| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| POST | `/superadmin/hospitals` | SUPER_ADMIN | `{name, city, state, bed_count, nabh_level, contact_email, contact_phone}` | `{id, name, message}` | Encrypts contact_email/contact_phone |
| GET | `/superadmin/hospitals` | SUPER_ADMIN | — | `[{id, name, city, state, bed_count, nabh_level, plan_type, patient_count, created_at}]` | Active hospitals only |
| GET | `/superadmin/hospitals/{id}` | SUPER_ADMIN | — | `{id, name, city, state, bed_count, nabh_level, patient_count, user_count, settings}` | — |
| POST | `/superadmin/hospitals/{id}/invite` | SUPER_ADMIN | `{email, role}` | `{message, token, link}` | 48h expiry, sends email via Resend |

### Hospitals (`/hospitals`)
| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/hospitals/me` | Yes | — | Hospital object with decrypted contacts | SUPER_ADMIN gets first active hospital |
| PUT | `/hospitals/me` | HOSPITAL_MANAGE | `{name?, city?, state?, bed_count?, nabh_level?, logo_url?, settings?}` | Updated hospital | SUPER_ADMIN blocked (must use superadmin endpoints) |

### Patients (`/patients`)
| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| POST | `/patients` | PATIENT_CREATE | `PatientCreate` | `{id, message, checkins_created: 14}` | Encrypts PII, creates 14 CheckIn rows, sends WhatsApp welcome |
| GET | `/patients` | PATIENT_READ | `?status=&page=&limit=` | `{data, total, page, limit}` | Decrypts names on read, tenant-scoped |
| GET | `/patients/{id}` | PATIENT_READ | — | Full patient with checkins, timeline, escalations | Eager loads via selectinload |
| POST | `/patients/{id}/checkin/{day}` | PATIENT_UPDATE | `{responses}` (body) | `{message, risk_score, risk_level, readmission_risk, response_rate}` | Runs AI scoring, may auto-escalate |
| GET | `/patients/{id}/export` | PATIENT_READ | — | Full patient JSON with all decrypted data | DPDPA Right to Access |
| POST | `/patients/{id}/erasure-request` | PATIENT_UPDATE | — | `{message}` | Sets erasure_requested_at timestamp |
| POST | `/patients/{id}/erasure-approve` | HOSPITAL_MANAGE | — | `{message}` | Anonymizes PII, preserves clinical data |

**PatientCreate schema:** `full_name, mobile, family_mobile, age, surgery_type, discharge_date, doctor_name, doctor_specialty, bed_number, uhid, instructions, consent_given (default false), preferred_language (default "en")`. Indian mobile validation regex.

### Grievances (`/grievances`)
| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| POST | `/grievances` | No | `{contact_info, message}` | `{id, message}` | Public, sends email to DPO |

### Escalations (`/escalations`)
| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/escalations` | PATIENT_READ | `?status=OPEN&limit=50&offset=0` | `{data, total, limit, offset}` | Includes AI coach suggestions per escalation |
| POST | `/escalations/{id}/resolve` | PATIENT_UPDATE | `{resolution_note}` | `{message, patient_status}` | Resets patient to ACTIVE if no more OPEN escalations |

### Reports (`/reports`)
| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/reports/nabh` | REPORT_GENERATE | `?start_date=&end_date=&hospital_id=` | PDF binary (StreamingResponse) | ReportLab PDF, SHA-256 hash, NABH compliance metrics |

### WhatsApp (`/whatsapp`)
| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/whatsapp/webhook` | No | `?hub.mode=subscribe&hub.verify_token=X&hub.challenge=Y` | Y (int or string) | Meta verification handshake |
| POST | `/whatsapp/webhook` | No | Meta webhook JSON payload | `{status: "ok"}` | Matches patient by phone, parses text, runs AI |
| POST | `/whatsapp/send-checkin/{patient_id}/{day}` | PATIENT_UPDATE | — | `{message, whatsapp_response}` | Sends template message |
| GET | `/whatsapp/status/{patient_id}` | PATIENT_READ | — | Message log array | Delivery status history |

### Contact (`/contact`)
| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| POST | `/contact` | No | `{first_name, last_name, email, hospital_name, message}` | `{status, message}` | Logs only, no email sent yet (TODO) |

---

## 4. AI Services

### Risk Scoring (`services/ai_scoring.py`)
- **NOT an LLM call.** Pure deterministic heuristic scoring.
- **Input:** `checkin_data` dict with keys `pain`, `fever`, `swelling`, `bleeding`, `breathing`, `free_text`
- **Algorithm:** Additive point system:
  - Pain 3-4-5: +40 (severe), 2: +20 (moderate)
  - Fever: +30
  - Swelling: +20
  - Bleeding: +50 (CRITICAL)
  - Breathing difficulty: +60 (CRITICAL)
  - Free-text keyword scan: +25 per keyword found (English + Hindi: "severe", "bahut dard", "can't breathe", "fainting", "blood", "chakkar", "maut", "khoon", "bukhar")
  - Low engagement history (<50% response rate): +15
- **Output:** `{score: 0-100, level: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL", reasons: [string]}`
- **Thresholds:** CRITICAL ≥70, HIGH ≥50, MEDIUM ≥30, LOW <30

### Readmission Risk (`services/readmission_risk.py`)
- **Input:** Patient object, `missed_count`, `open_escalations`
- **Algorithm:** Additive risk:
  - Age >65: +20, Age >75: +15 (cumulative +35)
  - Cardiac surgery: +25
  - Ortho + age>60: +15
  - Missed >2: +30
  - Open escalations: +25
  - Response rate <40%: +20
- **Output:** `"HIGH"` (>60) / `"MEDIUM"` (>35) / `"LOW"`

### Coach Suggestions (`services/coach_suggestions.py`)
- Static dictionary mapping trigger types to 3 actionable suggestions each
- Trigger types: `severe_pain`, `fever`, `no_reply`, `bleeding`, `swelling`
- Doctor name interpolated via `{doctor}` placeholder
- **Not AI-generated.** Pre-written medical guidance text.

---

## 5. Authentication

### JWT Implementation
- **Library:** `python-jose` with HS256 algorithm
- **Access Token:** 15-minute expiry, payload: `{user_id, email, role, hospital_id, exp, type:"access", iat}`
- **Refresh Token:** 7-day expiry, payload: `{user_id, jti, exp, type:"refresh", iat}`
- **Password Hashing:** `passlib` + `bcrypt`, with pre-hash SHA-256 for passwords >72 bytes (bcrypt truncation bug workaround)

### Token Lifecycle
1. **Login:** Returns access_token + refresh_token. Refresh token hash (bcrypt) stored in `refresh_tokens` table.
2. **API calls:** Bearer access_token in Authorization header.
3. **401 → Refresh:** Frontend sends refresh_token to `/auth/refresh`. Backend validates DB-stored hash, returns new access_token. **Frontend queues concurrent 401s** during refresh.
4. **Logout:** Deletes ALL refresh tokens for user from DB.

### Invite-Based Onboarding
1. SUPER_ADMIN creates invite: `POST /superadmin/hospitals/{id}/invite` → generates `HospitalInvite` with 48h-expiring token
2. Email sent via Resend with link `{FRONTEND_URL}/accept-invite?token=XXX`
3. Invitee visits page, verifies token (`POST /auth/verify-invite`), sets name + password (`POST /auth/accept-invite`)
4. User created with pre-scoped `hospital_id` and assigned role

### Role-Based Access Control
- **4 roles:** `SUPER_ADMIN`, `HOSPITAL_ADMIN`, `COORDINATOR`, `DOCTOR`
- **7 permissions:** `PATIENT_CREATE`, `PATIENT_READ`, `PATIENT_UPDATE`, `PATIENT_DELETE`, `REPORT_GENERATE`, `USER_MANAGE`, `HOSPITAL_MANAGE`
- **Permission map:**
  - SUPER_ADMIN: all 7
  - HOSPITAL_ADMIN: CREATE, READ, UPDATE, REPORT_GENERATE, USER_MANAGE
  - COORDINATOR: CREATE, READ, UPDATE
  - DOCTOR: READ, REPORT_GENERATE
- **Enforcement:** `require_permission(Permission.X)` dependency injection on routes
- **Multi-tenancy:** `require_tenant()` resolves `hospital_id` from JWT claims; non-superadmin users without hospital_id get 403

---

## 6. Database

### ORM
- **SQLAlchemy 2.0** (async) with **asyncpg** driver for PostgreSQL
- Dev fallback: `sqlite+aiosqlite:///./ojas.db`
- Pool config: `pool_pre_ping=True`, `pool_recycle=1800s`, configurable `pool_size` (default 5) and `max_overflow` (default 0)

### Models (10 tables)

| Model | Table | Key Columns | Relationships |
|---|---|---|---|
| `User` | `users` | id (UUID PK), email (unique), hashed_password, full_name, role, hospital_id (FK), is_active (Boolean), created_at | → Hospital |
| `Hospital` | `hospitals` | id (UUID PK), name, city, state, bed_count, nabh_level, contact_email, contact_phone, plan_type, logo_url, nabh_certificate_number, settings (JSON), is_active, created_at | → Users, → Patients |
| `Patient` | `patients` | id, hospital_id (FK), full_name, mobile, family_mobile, age, surgery_type, discharge_date, doctor_name, doctor_specialty, bed_number, uhid, status, current_day, total_days, instructions, response_rate, risk_score, risk_level, readmission_risk, consent_given, consent_given_at, consent_version, preferred_language, erasure_requested_at, created_at | → Hospital, → CheckIns, → Escalations, → Timeline |
| `CheckIn` | `checkins` | id, patient_id (FK), day_number, status, sent_at, replied_at, responses (JSON), pain_level, risk_score, risk_level, risk_reasons (JSON), created_at | → Patient |
| `Escalation` | `escalations` | id, patient_id (FK), level, status, trigger_type, trigger_detail, description, assigned_to (FK users), resolved_by (FK users), resolved_at, resolution_note, created_at | → Patient, → User (assigned_to), → User (resolved_by) |
| `TimelineEvent` | `timeline_events` | id, patient_id (FK), event_type, title, description, day_number, created_at | → Patient |
| `AuditLog` | `audit_logs` | id, user_id (FK), hospital_id (FK), action, resource, resource_id, details (JSON), ip_address, user_agent, timestamp, success | → User, → Hospital |
| `HospitalInvite` | `hospital_invites` | id, hospital_id (FK), email, role, token (unique, indexed), expires_at, used_at, created_by (FK), created_at | → Hospital, → User |
| `RefreshToken` | `refresh_tokens` | id, user_id (FK CASCADE), token_hash, expires_at, created_at, revoked_at | → User |
| `WhatsAppMessageLog` | `whatsapp_message_logs` | id, patient_id (FK), message_type, sent_at, delivered_at, read_at, status, retry_count, error_detail | → Patient |
| `Grievance` | `grievances` | id, contact_info, message, status, resolved_at, resolution_notes, created_at, updated_at | None (standalone) |

### Encryption at Rest
- **PII fields encrypted:** Patient `full_name`, `mobile`, `family_mobile`, `doctor_name`, `bed_number`, `uhid`; Hospital `contact_email`, `contact_phone`
- **Algorithm:** Fernet (symmetric) with key derived via PBKDF2-HMAC-SHA256, 480,000 iterations
- **Critical:** `ENCRYPTION_SALT` must never change after go-live or all data becomes unreadable

### Migrations
- **Alembic** configured with async engine, batch mode for SQLite compatibility
- Single migration: `b63ce7c1109d` — initial schema with all models
- In practice: schema auto-created via `Base.metadata.create_all()` on first boot

---

## 7. Background Jobs

### WhatsApp Tasks (`app/tasks/whatsapp_tasks.py`)
- **Current state:** Async functions only (no real queue)
- Three functions: `queue_whatsapp_checkin()`, `queue_family_nudge()`, `queue_template_message()`
- **Production TODO:** Replace with Celery + Redis broker (comments in file describe the migration path)
- These functions are NOT currently called from any router. The routers call `send_whatsapp_message()` directly.

### Seed Data
- `seed_data.py` runs as background `asyncio.create_task()` on first boot (non-prod only)
- Seeds: 1 superadmin, 1 hospital (City Hospital), 1 coordinator, 1 doctor, 32 patients with full checkin/escalation/timeline data
- Idempotent: checks for existing patients before seeding

### Cache Cleanup
- `start_cache_cleanup_task()` in `redis.py` — periodic cleanup of expired in-memory cache entries (300s interval)
- **Not started** from anywhere in the codebase

---

## 8. WebSockets

**None.** No WebSocket implementation exists. The WhatsApp webhook is a standard HTTP POST endpoint, not WebSocket.

---

## 9. Environment Variables

### Backend
| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Prod | `sqlite+aiosqlite:///./ojas.db` | Async DB connection string |
| `SECRET_KEY` | Prod | Auto-generated (dev) | JWT signing secret |
| `ENCRYPTION_KEY` | Prod | Auto-generated (dev) | PII encryption base key |
| `ENCRYPTION_SALT` | Prod | Auto-generated (dev) | PBKDF2 salt — NEVER rotate |
| `FRONTEND_URL` | Yes | `http://localhost:5173` | CORS origins (comma-separated) |
| `ENVIRONMENT` | Yes | `development` | `development` or `production` |
| `RATE_LIMIT` | No | `100/minute` | SlowAPI rate limit |
| `DATABASE_POOL_SIZE` | No | `5` | SQLAlchemy pool size |
| `DATABASE_MAX_OVERFLOW` | No | `0` | SQLAlchemy max overflow |
| `DATABASE_USE_NULLPOOL` | No | `false` | Force NullPool |
| `WHATSAPP_API_KEY` | No | `""` | 360dialog API key |
| `WHATSAPP_API_URL` | No | `https://waba.360dialog.io/v1/messages` | WhatsApp API endpoint |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | No | `""` | Meta webhook verify token |
| `RESEND_API_KEY` | No | `""` | Resend email API key |
| `REDIS_URL` | No | `""` | Redis connection (falls back to in-memory) |
| `SENTRY_DSN` | No | `""` | Sentry error tracking DSN |
| `DPO_EMAIL` | No | `dpo@ojas.care` | Data Protection Officer email |
| `PORT` | No | `8000` | Uvicorn port (render_entrypoint.sh) |
| `RESET_KEY` | No | (in render.yaml) | Referenced but not used in code |
| `PYTHON_VERSION` | No | (in render.yaml) | `3.11.0` (render.yaml only) |

### Frontend
| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | Yes | `http://localhost:8000` | Backend API base URL |
| `VITE_DPO_EMAIL` | No | — | Referenced in DEPLOYMENT_GUIDE only |
| `VITE_SENTRY_DSN` | No | — | Referenced in DEPLOYMENT_GUIDE only |

---

## 10. External Integrations

### WhatsApp (360dialog/Meta)
- **Provider:** 360dialog Cloud API (`waba.360dialog.io/v1/messages`)
- **Functions:** `send_whatsapp_message()` (free-form, 24h window), `send_template_message()` (business-initiated, pre-approved templates), `send_family_nudge()`
- **Webhook:** `GET /whatsapp/webhook` (Meta verification), `POST /whatsapp/webhook` (inbound messages)
- **Webhook flow:** Receives text message → matches patient by decrypting ALL mobile numbers → finds PENDING checkin → parses pain/fever → runs AI scoring → may auto-escalate
- **Templates:** Multi-language support defined in `whatsapp_templates.py` (en, hi, ta, te, bn, mr — Hindi complete, others pending)
- **Graceful degradation:** If `WHATSAPP_API_KEY` not set, logs warning and returns `{status: "skipped"}`

### Email (Resend)
- **Provider:** Resend (`api.resend.com/emails`)
- **Functions:** `send_invite_email()` (hospital onboarding), `send_password_reset_email()` (unused — no reset flow), `send_breach_alert_email()` (security incidents), `send_email()` (generic)
- **Sender:** `Ojas HealthTech <noreply@ojas.care>` / `Ojas Security <security@ojas.care>`
- **Graceful degradation:** If `RESEND_API_KEY` not set, logs warning and returns `{status: "skipped"}`

### Contact Form
- `POST /contact` — accepts form data, logs to console only (TODO: email sending)

---

## 11. Payment Integrations

**None.** No payment, billing, or subscription management code exists. The `Hospital.plan_type` field exists ("trial", "professional") but has no associated payment logic.

---

## 12. Storage

**No file storage.** No S3, GCS, or local file uploads exist. The only "storage" is:
- SQLite file (`./ojas.db`) in dev via `docker-compose.yml` volume `./data:/app/data`
- PDF reports generated in-memory (io.BytesIO) and streamed as responses
- No file upload endpoints

---

## 13. Analytics

- **Frontend only:** Recharts charts in Dashboard (risk distribution bar chart, status pie chart, recovery trend bar chart)
- **No server-side analytics.** No Mixpanel, Amplitude, Google Analytics, or PostHog integration.
- `Grievance` model exists for DPDPA compliance but no analytics platform integration.

---

## 14. Monitoring

### Sentry
- `sentry-sdk[fastapi]==1.45.0` in requirements.txt
- `SENTRY_DSN` env var referenced in config
- **NOT initialized** anywhere in the codebase — `sentry_sdk.init()` is never called in `main.py` or any other file

### Logging
- Standard Python `logging` module throughout backend
- `logging.getLogger(__name__)` in services
- `print()` statements used in WhatsApp webhook handler (not proper logging)
- No structured logging (no JSON formatter, no correlation IDs in logs)

### Health Check
- `GET /health` — checks DB connectivity, returns JSON with version, environment, DB status
- Docker HEALTHCHECK: `python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"` every 30s

### Audit Logging
- Every privileged action writes to `audit_logs` table via `log_audit()`
- Captures: user_id, hospital_id, action, resource, resource_id, ip_address, user_agent, success, details (JSON)
- Viewable at `GET /superadmin/audit-logs`

### Rate Limiting
- SlowAPI with `get_remote_address` key function
- Login: 5/minute
- Refresh: 10/minute
- Global default: `100/minute` (from RATE_LIMIT env var, but global limiter in main.py is not applied to routes — only per-router limiters work)

---

## 15. Deployment

### Backend (Render)
- **render.yaml** defines single `web` service: `ojas-backend`
  - Runtime: Python, plan: starter
  - rootDir: `backend`, buildCommand: `pip install -r requirements.txt`
  - startCommand: `bash render_entrypoint.sh` → `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1`
  - healthCheckPath: `/health`
  - Environment: ENVIRONMENT=production, SECRET_KEY (auto-generated), DATABASE_POOL_SIZE=10, DATABASE_MAX_OVERFLOW=20, RATE_LIMIT=100/minute, WHATSAPP_API_URL=360dialog

### Frontend (Vercel)
- **vercel.json:** SPA rewrites only (`/(.*)` → `/index.html`)
- Root directory: `frontend/` (implied by Vercel config)
- Live at: `ojas-v2.vercel.app`

### Database (Supabase)
- PostgreSQL 15+ with session/transaction pooler URL
- SSL required in production (auto-detected for Supabase URLs)
- Format: `postgresql+asyncpg://...`

### Docker
- **Dockerfile:** `python:3.11-slim`, non-root user (`ojas:ojas`), HEALTHCHECK, exposes 8000
- **docker-compose.yml:** Single `api` service with SQLite, hardcoded dev secrets (NOT production-safe)

### GitHub Actions
- Referenced in README: `.github/workflows/keepalive.yml` — pings `/health` every 10 min to prevent Render cold starts
- **Not present in the repo** (README mentions it but file wasn't found in the directory listing)

---

## 16. Infrastructure

### Redis
- **Optional.** `redis==5.0.8` in requirements
- `REDIS_URL` env var to configure
- Graceful fallback to in-memory cache (dict + asyncio.Lock)
- `@cache_result(ttl_seconds=60)` decorator available but **not used** on any endpoint
- `invalidate_cache()` and `get_cache_stats()` available but **not called** from any router

### Database
- **Development:** SQLite via `aiosqlite`
- **Production:** PostgreSQL via Supabase (asyncpg driver, SSL required)
- Connection pooling with configurable pool_size/max_overflow
- Auto-schema creation on boot, Alembic available for migrations

### Communication Flow Diagram
```
Browser (Vercel) 
  → Axios (VITE_API_URL) 
  → FastAPI (Render, port 8000)
    → SQLAlchemy async (asyncpg → PostgreSQL/Supabase)
    → WhatsApp (360dialog API via httpx)
    → Email (Resend API via httpx)
    → Redis (optional, cache)
    → ReportLab (PDF generation)
```

---

## Critical Observations for Production Readiness

1. **Sentry not initialized** — DSN referenced but `sentry_sdk.init()` never called
2. **WhatsApp webhook patient matching** — decrypts ALL patients' mobile numbers on every webhook call (O(n) scan)
3. **Enrollment page submit is mocked** — `await new Promise((r) => setTimeout(r, 1500))` instead of API call
4. **ConsentStep component exists but is NOT integrated** into Enrollment.tsx
5. **No automated tests** — README explicitly states this is the top gap
6. **Missing password reset flow** — `send_password_reset_email()` exists in backend but no endpoint; frontend links to `/forgot-password` (404)
7. **Audit log writes use separate commits** — `log_audit()` commits independently, potentially causing partial commit issues
8. **Global rate limiter defined in main.py but routes use per-router limiters** — the app.state.limiter and global _rate_limit_exceeded_handler may not apply to router-scoped limiters
9. **`grievance_router` rate limiting** — imports Limiter locally but never actually calls `limiter.limit()` on the endpoint
10. **No CORS security headers** beyond the basics (no CSP, no HSTS, no X-Frame-Options, no X-Content-Type-Options) — README claims these exist but they're not in `main.py`
11. **Docker compose uses hardcoded dev secrets** in plaintext
12. **`useHospitals` hook is always enabled** (`enabled: true`) — non-superadmins will get 403 errors
13. **SuperAdmin Hospitals page calls `api.delete()`** on `/superadmin/hospitals/{id}` but no DELETE endpoint exists in backend
14. **Render entrypoint uses single worker** (`--workers 1`) which may be intentional but limits throughput
---

# Phase 2: Mock/Placeholder/Non-Production Code Audit — Ojas-V2

**Task ID:** 2
**Scope:** Grep/ripgrep across every file in `/home/z/ojas-audit`. 24 audit categories checked.
**Version audited:** Backend 3.0.0 / Frontend 3.0.0

---

## Summary

| Severity | Count |
|----------|-------|
| **Critical** | 4 |
| **High** | 7 |
| **Medium** | 14 |
| **Low** | 11 |
| **Total** | 36 |

---

## CRITICAL Findings

### C1. Patient Enrollment is Entirely Mocked
- **File:** `frontend/src/pages/Enrollment.tsx:101-102`
- **Text:**
  ```tsx
  // await api.post('/patients', form)
  await new Promise((r) => setTimeout(r, 1500)) // Mock
  ```
- **Impact:** The enrollment form collects all patient data across 4 steps, then **silently discards it**. No patient is ever created. The success toast is a lie.
- **Recommendation:** Replace with actual API call. Uncomment and fix line 101.

### C2. NABH Report Contains Fabricated Statistics
- **File:** `backend/app/routers/reports.py:72-75`
- **Text:**
  ```python
  "early_follow_up_rate": round(min(92.0, (completed / total * 100 * 0.95)) if total > 0 else 0, 1),
  "early_follow_ups": min(int(completed * 0.92), completed),
  "feedback_rate": round(min(78.0, (total * 0.78) / total * 100) if total > 0 else 0, 1),
  "feedback_count": min(int(total * 0.78), total)
  ```
- **Impact:** The `feedback_rate` is always 78% and `feedback_count` is always 78% of total — these are **hardcoded multipliers**, not real data. `early_follow_up_rate` is capped at 92% with a fake 0.95 multiplier. These appear in a **NABH compliance PDF report**. This is a regulatory integrity issue.
- **Recommendation:** Implement real feedback collection and rate calculation, or clearly mark these fields as "estimated" in the report.

### C3. Rate Limiting is Non-Functional (Fake Implementation)
- **File:** `backend/app/routers/auth.py:72,133`
- **Text:**
  ```python
  limiter.limit("5/minute")(lambda: None)()
  ```
- **Impact:** This creates a limiter decorator and immediately applies it to a no-op lambda — it does **not** protect the actual endpoint. Both `/login` and `/refresh` endpoints are **unprotected** against brute-force. The `/grievances` and `/contact` endpoints have zero rate limiting despite docstring claims.
- **Recommendation:** Apply `@limiter.limit()` as a proper decorator on the route handlers, e.g.:
  ```python
  @router.post("/login")
  @limiter.limit("5/minute")
  async def login(request: Request, ...):
  ```

### C4. Seed Demo Data Endpoint Active in Production
- **File:** `backend/app/main.py:169-206`
- **Text:** `@app.post("/admin/seed-demo-data")` — requires only `HOSPITAL_MANAGE` permission
- **Impact:** Any hospital admin can trigger seed data creation, which creates a second superadmin with hardcoded password `admin123` (seed_data.py:44), 32 fake patients, and 448 fake check-ins. No environment guard prevents this in production.
- **Recommendation:** Wrap in `if not _IS_PROD:` guard or remove entirely. The `_seed_if_needed()` already handles non-prod seeding.

---

## HIGH Findings

### H1. Production `print()` Statements (10 occurrences)
- **Files and Lines:**
  - `backend/app/routers/whatsapp.py:97` — `[WEBHOOK] No patient found for {from_number}`
  - `backend/app/routers/whatsapp.py:114` — `[WEBHOOK] CRITICAL escalation created`
  - `backend/app/routers/whatsapp.py:126` — `[WEBHOOK] No pending check-in`
  - `backend/app/routers/whatsapp.py:187` — `[WEBHOOK] Check-in completed`
  - `backend/app/routers/whatsapp.py:236` — `WhatsApp template send failed`
  - `backend/app/routers/patients.py:134` — `WhatsApp welcome failed (non-fatal)`
  - `backend/app/routers/patients.py:339` — `Family alert failed (non-fatal)`
  - `backend/app/routers/patients.py:584` — `DPO notification failed (non-fatal)`
- **Impact:** `print()` in production goes to stdout with no structured logging, no log levels, no correlation IDs. The WhatsApp webhook path is particularly sensitive (5 print calls on every inbound message).
- **Recommendation:** Replace all with `logger.info()` or `logger.error()`.

### H2. Hardcoded Default Admin Password
- **File:** `backend/app/main.py:44`
- **Text:** `hashed_password=get_password_hash("admin123")`
- **Also:** `backend/app/main.py:52` — logs the password to stdout: `admin@ojas.care / admin123`
- **Impact:** If no admin exists (e.g., fresh production deploy), the system creates a superadmin with `admin123`. This password is also **logged in plaintext**.
- **Recommendation:** Generate a random password and output via secure channel. Never log passwords.

### H3. Dead Module: `app/tasks/whatsapp_tasks.py`
- **File:** `backend/app/tasks/whatsapp_tasks.py` (entire file, 113 lines)
- **Impact:** This module is never imported by any application code (`from app.tasks` returns zero results). It was intended for a future Celery migration but currently serves no purpose. The `send_family_nudge` function is only called from within this dead module.
- **Recommendation:** Remove or integrate into an actual background task system.

### H4. Contact Form is a No-Op (TODO)
- **File:** `backend/app/routers/contact.py:17`
- **Text:** `# TODO: Email sending can be added later. For now, just accept and log.`
- **Impact:** The `/contact` form on the public landing page accepts submissions and silently discards them. Users see "We will contact you shortly" but nothing happens.
- **Recommendation:** Implement email sending or remove the form from the landing page.

### H5. Fabricated Report Statistics (follow-up to C2)
- **File:** `backend/app/routers/reports.py:73-74`
- **Text:** `min(92.0, ...)`, `min(78.0, ...)`
- **Impact:** The NABH report generates inflated compliance numbers. Early follow-up rate is artificially capped at 92%, feedback rate is always 78%. These are compliance fraud risks if submitted to auditors.
- **Recommendation:** Calculate real metrics or remove fabricated fields from the report.

### H6. Settings Page: Fake Interactive Elements
- **File:** `frontend/src/pages/Settings.tsx:104-110`
- **Text:** Notification toggle switches with `cursor-pointer` class but **zero onClick handlers** — they're static HTML that looks interactive
- **Impact:** Users will try to toggle notifications and nothing will happen. The toggles are always in the "on" position.
- **Recommendation:** Either implement real toggle functionality or remove the toggles.

### H7. Settings Page: Hardcoded "Production" Environment Label
- **File:** `frontend/src/pages/Settings.tsx:133`
- **Text:** `<span className="font-medium">Production</span>`
- **Impact:** Shows "Production" regardless of actual deployment environment. Misleading to users/admins in staging or development.
- **Recommendation:** Fetch environment from API or remove.

---

## MEDIUM Findings

### M1. Unused Python Imports (3)
| File | Line | Unused Import |
|------|------|---------------|
| `backend/app/main.py` | 2 | `import time` |
| `backend/app/routers/whatsapp.py` | 2 | `import hashlib` |
| `backend/app/routers/whatsapp.py` | 3 | `import hmac` |
| `backend/app/routers/reports.py` | 5 | `date` (from datetime) |
- **Recommendation:** Remove unused imports.

### M2. Bare `pass` Statements in Exception Handlers (9)
| File | Line | Context |
|------|------|---------|
| `backend/app/core/audit.py` | 38 | `except (ValueError, TypeError): pass` — silently drops invalid hospital_id |
| `backend/app/routers/whatsapp.py` | 140 | `except (ValueError, IndexError): pass` — silently drops pain parse failures |
| `backend/app/routers/whatsapp.py` | 145 | `except ValueError: pass` — silently drops digit parse failures |
| `backend/app/routers/auth.py` | 191 | `except ValueError: pass` — silently drops invalid UUID on logout |
| `backend/app/core/redis.py` | 57, 63, 75, 95, 121, 129, 161 | All in Redis fallback operations — silently swallows all Redis errors |
- **Impact:** Redis module is particularly concerning — every Redis operation silently swallows errors, making Redis failures completely invisible.
- **Recommendation:** Add `logger.debug()` or `logger.warning()` at minimum to at least the non-trivial ones.

### M3. Unused Backend Package: `python-dateutil`
- **File:** `backend/requirements.txt:13` — `python-dateutil==2.9.0`
- **Impact:** Never imported in any `backend/app/` file. Adds ~200KB to deploy.
- **Recommendation:** Remove from requirements.txt.

### M4. Unused Frontend Files (2)
| File | Reason |
|------|--------|
| `frontend/src/components/layout/DashboardLayout.tsx` | Never imported — App.tsx uses its own `AppLayout` |
| `frontend/src/components/layout/TopBar.tsx` | Only imported by the unused `DashboardLayout.tsx` |
- **Recommendation:** Remove both files.

### M5. Unused Frontend UI Components (~35 files)
The following shadcn/ui component files exist but are **never imported by any application page or layout component** (only cross-referenced by other unused UI components):
`accordion`, `alert-dialog`, `aspect-ratio`, `avatar`, `breadcrumb`, `calendar`, `card`, `carousel`, `chart`, `collapsible`, `command`, `context-menu`, `drawer`, `dropdown-menu`, `empty`, `field`, `form`, `hover-card`, `input-group`, `input-otp`, `kbd`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `slider`, `spinner`, `switch`, `table`, `tabs`, `toggle-group`, `item`, `button-group`
- **Impact:** ~35 unused component files add ~15-20KB to the source tree and confuse developers about available components.
- **Recommendation:** Remove all unused UI components. Keep only: `button`, `input`, `label`, `textarea`, `checkbox`, `badge`, `sonner`, `alert`, `dialog`, `separator`, `skeleton`, `sheet`, `tooltip`, `toggle` (used by sidebar internally).

### M6. Unused Frontend Packages (indirectly via dead components)
The following npm packages are only used within unused UI component files:
- `@radix-ui/react-aspect-ratio`, `@radix-ui/react-hover-card`, `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-collapsible`, `@radix-ui/react-context-menu`, `@radix-ui/react-slider`, `@radix-ui/react-toggle`, `@radix-ui/react-toggle-group`, `@radix-ui/react-radio-group`, `@radix-ui/react-progress`, `@radix-ui/react-scroll-area`, `@radix-ui/react-select`, `@radix-ui/react-avatar`, `@radix-ui/react-popover`, `@radix-ui/react-accordion`
- `embla-carousel-react`, `react-day-picker`, `react-resizable-panels`, `vaul`, `cmdk`, `input-otp`
- `date-fns` (only used in unused `calendar.tsx` and `command.tsx`)
- `@hookform/resolvers`, `react-hook-form` (only used in unused `form.tsx`)
- **Recommendation:** Remove when cleaning up unused components (M5).

### M7. "Coming Soon" Features Exposed in Production UI
- `frontend/src/pages/Settings.tsx:79` — "Two-Factor Authentication: Coming soon"
- `frontend/src/pages/Reports.tsx:126` — `toast.info('Email functionality coming soon!')` (the email button exists and is clickable)
- **Impact:** Users see non-functional features in production. The reports email button fires a toast saying "coming soon".
- **Recommendation:** Hide or disable features that aren't implemented. Use `disabled` prop and tooltip "Not available yet".

### M8. WhatsApp Webhook: O(n) Patient Scanning
- **File:** `backend/app/routers/whatsapp.py:82-94`
- **Text:** `result = await db.execute(select(Patient))` — loads ALL patients, then decrypts each mobile in a loop to find a match
- **Impact:** Every inbound WhatsApp message triggers a full table scan + N decryption operations. With 10K patients this is a serious performance issue and a security concern (mass decryption per webhook call).
- **Recommendation:** Add a deterministic `mobile_lookup_hash` column (already mentioned in the code's own comment on line 81) and index it.

### M9. `send_family_nudge()` is Effectively Dead Code
- **File:** `backend/app/services/whatsapp.py:174-195`
- **Impact:** Only called from `app/tasks/whatsapp_tasks.py` which is a dead module (H3). The nudge feature described in the product is not actually implemented.
- **Recommendation:** Integrate family nudge into the check-in missed flow or remove.

### M10. Orphan API Endpoint: `/grievances`
- **File:** `backend/app/routers/patients.py:542-589`
- **Impact:** The `/grievances` POST endpoint exists in the backend but is **never called from the frontend**. The frontend has no grievance submission form.
- **Recommendation:** Build a frontend grievance form or document the public API.

### M11. `email-validator` Package: Indirect Use Only
- **File:** `backend/requirements.txt:14` — `email-validator==2.2.0`
- **Impact:** Used indirectly by Pydantic's `EmailStr` in `contact.py`. Technically needed but worth noting.
- **Recommendation:** Keep — required for Pydantic EmailStr validation.

### M12. Empty `app/services/__init__.py` and `app/tasks/__init__.py`
- **Files:** Both empty
- **Impact:** No-op, but `tasks/__init__.py` suggests the module was meant to be used.
- **Recommendation:** Remove `tasks/` directory if not integrating Celery soon.

### M13. `console.error()` in Error Boundary
- **File:** `frontend/src/App.tsx:53`
- **Text:** `console.error('App Error:', error, errorInfo)`
- **Impact:** Acceptable for error boundary catch-all, but should be replaced with Sentry integration in production.
- **Recommendation:** Replace with Sentry capture when Sentry is set up.

### M14. Dead Redis Fallback Module
- **File:** `backend/app/core/redis.py` (entire file, 185 lines)
- **Impact:** Provides `cache_result()` decorator, `invalidate_cache()`, and `get_cache_stats()` but none are called by any router or service. The `start_cache_cleanup_task()` is also never started.
- **Recommendation:** Integrate caching into hot paths (dashboard stats, patient list) or remove.

---

## LOW Findings

### L1. TODO in Contact Router
- **File:** `backend/app/routers/contact.py:17`
- **Text:** `# TODO: Email sending can be added later. For now, just accept and log.`
- **Recommendation:** Track as a feature debt item.

### L2. `bcrypt` `deprecated="auto"` (False Positive)
- **File:** `backend/app/core/security.py:6`
- **Text:** `pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")`
- **Note:** This is standard passlib configuration, not actual deprecation. Keep.

### L3. `seed_data.py` Print Statements (Dev-Only)
- **File:** `backend/seed_data.py` (multiple lines)
- **Note:** Only runs in development. Acceptable but consider using `logging` for consistency.
- **Recommendation:** Keep with note — dev-only.

### L4. `scripts/reset_local_db.py` Print Statements
- **File:** `backend/scripts/reset_local_db.py` (22 print calls)
- **Note:** Interactive CLI script. Print statements are appropriate here.
- **Recommendation:** Keep.

### L5. `Encryption.py` "Placeholder" Comments (False Positive)
- **File:** `backend/app/core/encryption.py:30,36`
- **Text:** `Returns placeholder on failure`, `return placeholder for corrupted data`
- **Note:** This is intentional defensive programming — returns `"[ENCRYPTED]"` on decryption failure rather than crashing.
- **Recommendation:** Keep with note — rename "placeholder" to "fallback" in comments for clarity.

### L6. UI Component `placeholder` Attributes (False Positives)
- **Multiple files** in `frontend/src/pages/` — standard HTML `placeholder` attributes on form inputs.
- **Recommendation:** Keep — these are legitimate UI placeholders.

### L7. `Slowapi` Limiter Configured But Barely Used
- **Files:** `backend/app/main.py:28` (global limiter), `backend/app/routers/auth.py:24` (local limiter)
- **Note:** Only auth routes attempt rate limiting (and incorrectly — see C3). No rate limiting on `/contact`, `/grievances`, `/whatsapp/webhook`, or any other public endpoint.
- **Recommendation:** Fix C3 and add rate limits to all public endpoints.

### L8. `DPO_EMAIL` Default Value
- **File:** `backend/app/core/config.py:35`
- **Text:** `DPO_EMAIL: str = os.getenv("DPO_EMAIL", "dpo@ojas.care")`
- **Note:** Default email may not be valid. Should be required in production.
- **Recommendation:** Add production guard like other secrets.

### L9. `GrievanceCreate` Local `Limiter` Import
- **File:** `backend/app/routers/patients.py:557-558`
- **Text:** `from slowapi import Limiter` / `from slowapi.util import get_remote_address`
- **Note:** Imported inside the function but never used. Dead import.
- **Recommendation:** Remove.

### L10. `recharts` Package Usage
- **File:** `frontend/src/pages/Dashboard.tsx:19` and `frontend/src/components/ui/chart.tsx`
- **Note:** `recharts` IS used in Dashboard for bar/pie charts. The `chart.tsx` UI component is not used by any page, but `recharts` is directly imported by Dashboard.
- **Recommendation:** Keep `recharts`, remove unused `chart.tsx`.

### L11. `framer-motion` Usage
- **Files:** `frontend/src/App.tsx:4`, `frontend/src/pages/Reports.tsx:2`
- **Note:** Used for page transitions and report animations. Legitimate.
- **Recommendation:** Keep.

---

## Consolidated Action Items (by priority)

1. **[CRITICAL]** Wire up Enrollment form to actual API call (C1)
2. **[CRITICAL]** Fix or remove fabricated NABH report statistics (C2)
3. **[CRITICAL]** Implement real rate limiting on auth + public endpoints (C3)
4. **[CRITICAL]** Guard or remove `/admin/seed-demo-data` in production (C4)
5. **[HIGH]** Replace all `print()` in production routers with `logger` (H1)
6. **[HIGH]** Remove hardcoded admin password or generate securely (H2)
7. **[HIGH]** Remove or integrate `app/tasks/` dead module (H3)
8. **[HIGH]** Implement contact form email sending (H4)
9. **[HIGH]** Fix fake Settings page toggles (H6) and environment label (H7)
10. **[MEDIUM]** Remove ~35 unused UI components and ~20 unused npm packages (M5, M6)
11. **[MEDIUM]** Remove unused Python imports and packages (M1, M3)
12. **[MEDIUM]** Remove dead `DashboardLayout.tsx` and `TopBar.tsx` (M4)
13. **[MEDIUM]** Hide or disable "Coming Soon" features (M7)
14. **[MEDIUM]** Implement mobile_lookup_hash for WhatsApp webhook (M8)

---

# Phase 3: End-to-End User Flow Verification

**Task ID:** 3
**Scope:** Every frontend page + its backend API, traced through actual code. No assumptions.
**Method:** Read frontend page → read API hook → read backend router/service → verify data shapes, error handling, and integration correctness.

---

## 1. Login — Login.tsx → auth router → JWT generation → response

**Status:** ✅ Works

**Trace:**
- `Login.tsx:35` → `api.post('/auth/login', { email, password })`
- `api/client.ts:17` → request interceptor adds `Authorization: Bearer <token>` from localStorage
- `auth.py:64` → `POST /auth/login` validates email (EmailStr), password (min 1)
- `auth.py:76` → looks up User by email, verifies bcrypt hash via `security.verify_password()`
- `auth.py:82` → checks `user.is_active`
- `auth.py:91` → creates JWT access token (claims: user_id, email, role, hospital_id, type="access", exp, iat)
- `auth.py:92` → creates JWT refresh token (claims: user_id, jti, type="refresh", exp)
- `auth.py:97-103` → stores hashed refresh token in DB (`RefreshToken` table)
- `auth.py:115-126` → returns `{ access_token, refresh_token, token_type: "bearer", user: { id, email, full_name, role, hospital_id } }`
- `AuthContext.tsx:46-67` → `login()` extracts access_token, refresh_token, user → stores in localStorage
- `Login.tsx:47` → `navigate('/dashboard')`

**Notes:**
- Rate limiting attempted at 5/min (auth.py:71-74) — uses local `Limiter` instance, not the global one from main.py. Works but is a separate limiter instance.
- bcrypt truncation guard at 72 bytes in `_safe_password()` — correct.
- No issues found.

---

## 2. Signup — New User Registration

**Status:** ❌ Not Implemented (as standalone flow)

**Trace:**
- No `/signup` route exists in `App.tsx`
- No signup page component exists
- Login.tsx:188 → links "Don't have an account?" to `/contact` (Contact Sales)
- New users can ONLY be created via the **Accept Invite** flow (see flow #15)
- SuperAdmin creates hospital + sends invite → user clicks invite link → sets password

**Root cause:** By design — invite-only system. No public self-registration.
**What needs to be fixed:** Nothing — this is intentional. But the Login page should clarify this.

---

## 3. Logout — Token Invalidation

**Status:** ⚠️ Partial

**Trace:**
- `AuthContext.tsx:69-81` → `logout()` calls `api.post('/auth/logout')` then clears localStorage
- `auth.py:177-192` → `POST /auth/logout` reads Bearer token from header, decodes it (ignoring exp via `decode_token_safe`), extracts user_id, then **DELETES ALL refresh tokens** for that user (`delete(RefreshToken).where(RefreshToken.user_id == uid)`)
- `client.ts:39-43` → `clearAuthAndRedirect()` removes tokens from localStorage and redirects to `/login`
- `hooks.ts:30-49` → `useLogout()` mutation calls logout API, then clears React Query cache and localStorage

**Issue:** Logout deletes refresh tokens but does NOT invalidate the current access token. The access token remains valid until its natural expiry (default: ACCESS_TOKEN_EXPIRE_MINUTES). If someone copies the access token before logout, it still works until it expires. No token blacklist mechanism exists.

**What needs to be fixed:** Implement an access token blacklist (Redis or DB table) checked in `get_current_user()`, or reduce access token TTL significantly (e.g., 5-10 minutes) so the window is minimal.

---

## 4. Forgot Password

**Status:** ❌ Not Implemented

**Trace:**
- `Login.tsx:165` → `<Link to="/forgot-password">Forgot password?</Link>` — exists in UI
- No `/forgot-password` route in `App.tsx` — clicking it shows the **NotFound** page
- No `ForgotPassword.tsx` page component exists anywhere in the repo
- Backend `email.py:97-159` → `send_password_reset_email()` function exists and is fully implemented
- No backend endpoint calls `send_password_reset_email()` — it's dead code
- No password reset token generation or verification logic exists

**Root cause:** The UI link exists but the entire flow is unimplemented.
**What needs to be fixed:**
1. Create `ForgotPassword.tsx` page (email input → send reset link)
2. Create backend `/auth/forgot-password` endpoint (generate token, send email)
3. Create `ResetPassword.tsx` page (new password form)
4. Create backend `/auth/reset-password` endpoint (verify token, update password)
5. Add routes to `App.tsx`

---

## 5. Dashboard — Dashboard.tsx → API calls

**Status:** ⚠️ Partial

**Trace:**
- `Dashboard.tsx:23` → `usePatients('', 1, 100)` — fetches first 100 patients, correct data shape handling (`patientsData?.data || []`)
- `Dashboard.tsx:24` → `useEscalations('OPEN')` — **BUG**: backend returns `{ data: [...], total, limit, offset }` but Dashboard uses `escalationsData || []` then accesses `.length`. Since `escalationsData` is an object (not array), `escalations.length` is `undefined`. The "Open Escalations" stat card shows "undefined".
- `Dashboard.tsx:161` → Quick Action "Manage" links to `/checkins` — **DEAD LINK**: no `/checkins` route exists in App.tsx, shows NotFound page.
- All charts compute from client-side data (no separate stats API). Correct approach.
- `recoveryTrend` chart (line 62-76) — `pending` and `missed` are hardcoded to `0` for both branches. The chart always shows only "completed" bars. This is misleading data visualization.

**Issues:**
1. Escalation count displays "undefined" — data shape mismatch
2. `/checkins` dead link
3. Recovery trend chart always shows 0 for pending/missed (no actual completion tracking per day)

**What needs to be fixed:**
1. Fix `useEscalations` hook to return `data.data` (the array), or update Dashboard to access `escalationsData?.data`
2. Remove or fix the `/checkins` link
3. Compute pending/missed from actual checkin statuses

---

## 6. Patient Enrollment — Enrollment.tsx → patients router

**Status:** 🔴 Mocked

**Trace:**
- `Enrollment.tsx:98-111` → `handleSubmit()`:
  ```js
  // await api.post('/patients', form)  ← COMMENTED OUT
  await new Promise((r) => setTimeout(r, 1500)) // Mock
  toast.success('Patient enrolled successfully!')
  ```
- No API call is made. Patient is never saved to the database.
- The form collects fields: fullName, phone, email, uhid, age, gender, surgeryType, surgeonName, comorbidities, medications, dischargeDate, dischargeSummary, followUpDays, preferredLanguage, emergencyContact
- Backend `PatientCreate` schema requires: full_name, mobile, family_mobile, age, surgery_type, discharge_date, doctor_name, doctor_specialty, bed_number, uhid, consent_given
- **Field name mismatches**: `phone` vs `mobile`, `surgeonName` vs `doctor_name`, `dischargeSummary` vs `instructions`, `emergencyContact` vs `family_mobile`
- **Missing required fields**: `family_mobile`, `doctor_specialty`, `bed_number`, `consent_given`
- **Extra frontend fields not in backend**: email, gender, comorbidities, medications, followUpDays
- `ConsentStep.tsx` component exists but is **NOT imported or used** in Enrollment.tsx
- `useCreatePatient()` hook exists in hooks.ts but is **NOT imported or used** in Enrollment.tsx

**Root cause:** Enrollment was scaffolded with a realistic UI but the API integration was never wired up.
**What needs to be fixed:**
1. Integrate `ConsentStep` as step 0 before personal info
2. Map frontend field names to backend schema
3. Add missing required fields (family_mobile, doctor_specialty, bed_number)
4. Replace mock `setTimeout` with `api.post('/patients', mappedForm)` using `useCreatePatient()`
5. Remove or map extra fields

---

## 7. Patient List — PatientList.tsx → patients router

**Status:** ⚠️ Partial

**Trace:**
- `PatientList.tsx:13` → `usePatients(status, page)` — correctly passes status and page
- `hooks.ts:70-83` → builds query params: `?status=ACTIVE&page=1&limit=20`
- `patients.py:150-191` → `GET /patients` — tenant-scoped, status-filtered, paginated. Returns `{ data, total, page, limit }`. Correct.
- `PatientList.tsx:15-18` → correctly accesses `data?.data`, `data?.total`, `data?.limit`
- `PatientList.tsx:20-24` → **CLIENT-SIDE search** after fetching from server. Filters `full_name`, `surgery_type`, `doctor_name` locally.
- `PatientList.tsx:146-170` → pagination uses `totalPages = Math.ceil(total / limit)` from server. But since search is client-side, pagination is based on the full unfiltered count, not the filtered count. Page 2 might be empty even though total says there are more items.

**Issues:**
1. Client-side search breaks server-side pagination — search only filters the current page's results
2. No server-side search/`q` parameter supported by backend
3. No `uhid` in the list response (backend returns it but frontend doesn't display it)

**What needs to be fixed:**
1. Add `search` query parameter to backend `/patients` endpoint for server-side filtering
2. Or accept the limitation and document that search only applies to current page

---

## 8. Patient Detail — PatientDetail.tsx → timeline, check-ins, risk scores

**Status:** ✅ Works

**Trace:**
- `PatientDetail.tsx:22` → `usePatient(id)` → `GET /patients/{patient_id}`
- `patients.py:194-248` → returns full patient with eager-loaded `checkins`, `timeline`, `escalations` (via `selectinload`)
- All PII fields decrypted via `decrypt_field()`
- Check-in grid (14 days) renders from `patient.checkins[].day, .status, .risk_level` — matches backend shape
- Timeline renders from `patient.timeline[].day, .type, .title, .description` — matches backend shape
- Escalations render from `patient.escalations[].id, .level, .status, .trigger_type` — matches backend shape
- Risk badge, response rate, readmission risk all read from patient object — correct

**Notes:** This is one of the best-integrated pages. Data shapes match perfectly.

---

## 9. Escalations — Escalations.tsx → escalations router

**Status:** ❌ Broken (runtime crash)

**Trace:**
- `Escalations.tsx:20` → `useEscalations(status)` — returns the raw response body
- Backend `escalations.py:73` → returns `{ data: [...], total, limit, offset }`
- `Escalations.tsx:67` → `!escalations || escalations.length === 0` — `escalations` is an object (truthy), `.length` is `undefined`, so `undefined === 0` is `false`. The empty state is NEVER shown.
- `Escalations.tsx:74` → `escalations.map(...)` — **CRASH**: `TypeError: escalations.map is not a function` because `escalations` is `{ data: [...], total: ... }`, not an array.
- `useResolveEscalation()` in hooks.ts correctly calls `POST /escalations/{id}/resolve` with `{ resolution_note: note }`
- Backend `escalations.py:76-128` → resolve endpoint works correctly: updates status, creates timeline event, resets patient status if no open escalations remain

**Root cause:** Data shape mismatch — frontend expects an array, backend returns a paginated object.
**What needs to be fixed:** Either:
1. Change `useEscalations` hook to return `data.data` (extract the array)
2. Or change `Escalations.tsx` to access `escalations?.data` instead of `escalations`

---

## 10. Reports — Reports.tsx → reports router → PDF generation

**Status:** ⚠️ Partial

**Trace:**
- `Reports.tsx:76-79` → `api.get('/reports/nabh', { params: { start_date, end_date }, responseType: 'blob' })` — correct API call
- `reports.py:18-110` → `GET /reports/nabh` — tenant-scoped, generates real PDF via ReportLab
- `pdf_generator.py:9-58` → generates a real A4 PDF with hospital name, dates, NABH COP table, and SHA-256 hash
- PDF download works: creates blob URL → triggers download → shows success modal
- **Report statistics are FABRICATED** (reports.py:69-76):
  - `early_follow_up_rate` = `min(92.0, actual * 0.95)` — arbitrarily capped at 92%
  - `feedback_rate` = `min(78.0, total * 0.78 / total * 100)` — always 78% when patients exist
  - These are fake numbers, not computed from actual data
- Report history is hardcoded in state (Reports.tsx:37-41) — not persisted, lost on refresh
- Email report button (Reports.tsx:125-127) → `toast.info('Email functionality coming soon!')` — stub
- The `Label` component used in Reports.tsx:139,156 is a local inline component (line 327-329), NOT the shadcn/ui `Label` — inconsistent but works

**What needs to be fixed:**
1. Compute report statistics from actual checkin/patient data
2. Persist report history or remove the hardcoded list
3. Implement email report feature or remove the button

---

## 11. WhatsApp Integration — webhook → whatsapp service → templates → sending

**Status:** ⚠️ Partial (works only if API key configured)

**Trace:**
- `whatsapp.py:24-37` → `GET /whatsapp/webhook` — Meta verification handshake. Returns `hub.challenge` if token matches. Works.
- `whatsapp.py:40-189` → `POST /whatsapp/webhook` — handles inbound messages:
  - **CRITICAL PERFORMANCE BUG** (line 82-83): `select(Patient)` loads ALL patients into memory, then iterates to find match by decrypting each mobile number. O(n) with full table scan + N decrypt operations per webhook call. Will degrade severely with scale.
  - Parses text responses: extracts pain level (digit or "pain: X"), fever (keyword matching)
  - Runs AI scoring on parsed responses
  - Creates escalation if CRITICAL
  - Handles HELP/SOS keywords for immediate critical escalation
- `whatsapp.py:192-239` → `POST /whatsapp/send-checkin/{patient_id}/{day}` — sends template-based check-in
- `whatsapp.py:242-274` → `GET /whatsapp/status/{patient_id}` — returns message logs
- `whatsapp.py` (service) → uses httpx to call Meta/360dialog API. Gracefully handles failures (timeout, HTTP errors) without crashing.
- `whatsapp_templates.py` → templates for en, hi (partial), ta/te/bn/mr (empty — will send blank messages)
- **If WHATSAPP_API_KEY is not set**, all sends return `{"status": "skipped"}` — no crash, but no messages sent.

**Issues:**
1. Full table scan for patient matching in webhook — needs `mobile_lookup_hash` column
2. Hindi templates incomplete (marked "pending native speaker review")
3. Tamil, Telugu, Bengali, Marathi templates are EMPTY — will send blank messages
4. Only text messages handled; images, audio, interactive responses ignored

**What needs to be fixed:**
1. Add `mobile_lookup_hash` column for O(1) patient lookup
2. Complete or disable non-English templates
3. Handle or reject non-text message types with appropriate response

---

## 12. Settings — Settings.tsx

**Status:** ⚠️ Partial (mostly static display)

**Trace:**
- `Settings.tsx:15` → reads `user` from `AuthContext` (localStorage, no API call to verify)
- Displays: full_name, email, role, hospital_id (first 8 chars)
- **2FA section** → shows "Coming soon" (Settings.tsx:79) — not implemented
- **Session Management** → shows "Active" badge but does nothing (Settings.tsx:86)
- **Notification toggles** (Settings.tsx:103-112) — three hardcoded toggle divs that are NOT interactive. They look like switches but are just static HTML divs. No `onClick`, no state, no API call.
- **Environment label** → hardcoded "Production" (Settings.tsx:135) — should read from backend or env
- **Version** → hardcoded "3.0.0" (Settings.tsx:129) — should come from build/config
- **Logout button** → calls `useLogout()` mutation which calls `POST /auth/logout` — works correctly

**What needs to be fixed:**
1. Make notification toggles functional (or remove them)
2. Read environment/version from backend `/health` endpoint
3. Remove or implement "Coming soon" items

---

## 13. Hospital Management (SuperAdmin) — Hospitals.tsx → superadmin router

**Status:** ❌ Broken (multiple issues)

**Trace:**
- `Hospitals.tsx:41-47` → calls `GET /superadmin/hospitals`
- `superadmin.py:59-84` → returns `[{ id, name, city, state, bed_count, nabh_level, plan_type, patient_count, created_at }]`
- **Data shape mismatch** — frontend `Hospital` interface expects: `address, phone, email, admin_name, admin_email, is_active`. Backend returns: `city, state, bed_count, nabh_level, plan_type, patient_count`. Fields like `address`, `phone`, `email`, `admin_name`, `admin_email` are **undefined**.
- `Hospitals.tsx:63-66` → search filter uses `hospital.admin_email.toLowerCase()` — **CRASH** when `admin_email` is `undefined` (`Cannot read properties of undefined (reading 'toLowerCase')`)
- `Hospitals.tsx:127-129` → displays `hospital.address`, `hospital.phone`, `hospital.email` — all show "undefined" in the UI
- `Hospitals.tsx:132` → displays `hospital.admin_name` — undefined
- `Hospitals.tsx:75-78` → "Add Hospital" button has **no onClick handler** — dead button
- `Hospitals.tsx:136` → "Edit" button has **no onClick handler** — dead button
- `Hospitals.tsx:137-142` → "Remove" button calls `api.delete('/superadmin/hospitals/${id}')` — **NO DELETE ENDPOINT EXISTS** in superadmin router. Will get 405 Method Not Allowed.
- Backend `superadmin.py:37-56` → `POST /superadmin/hospitals` exists (create hospital) but no delete/update endpoints

**Issues:**
1. Frontend data model doesn't match backend response — page crashes or shows "undefined" everywhere
2. Search filter crashes on undefined admin_email
3. Add/Edit/Remove buttons non-functional
4. No delete hospital endpoint in backend

**What needs to be fixed:**
1. Update frontend Hospital interface to match backend response shape
2. Fix search to use available fields (name, city)
3. Implement or remove Add Hospital dialog
4. Add DELETE endpoint to backend (soft delete preferred) or remove Remove button
5. Add PUT/PATCH endpoint for Edit or remove Edit button

---

## 14. Audit Logs (SuperAdmin) — AuditLogs.tsx → superadmin router

**Status:** ✅ Works

**Trace:**
- `AuditLogs.tsx:5` → `useAuditLogs(100)` → `GET /superadmin/audit-logs?limit=100`
- `superadmin.py:161-181` → returns `[{ id, user_id, hospital_id, action, resource, ip_address, timestamp, success }]`
- Frontend renders a table with: Action, Resource, User (truncated UUID), IP Address, Time (localized), Status (green/red dot)
- Data shapes match correctly
- No pagination on frontend (loads 100), but that's acceptable for audit logs
- No filtering or search — only displays what the backend returns

**Notes:** Clean, functional implementation. Could benefit from date filtering and search but not broken.

---

## 15. Accept Invite — AcceptInvite.tsx → hospital invite flow

**Status:** ❌ Broken (verify-invite parameter mismatch)

**Trace:**
- `AcceptInvite.tsx:29` → `api.post('/auth/verify-invite', { token })` — sends `{ token: "..." }` as JSON body
- `auth.py:195-196` → `async def verify_invite(token: str, ...)` — FastAPI interprets bare `str` parameter as **query parameter** (not body). Expects `POST /auth/verify-invite?token=xxx`.
- **MISMATCH**: Frontend sends JSON body `{ token }`, backend expects query parameter `?token=xxx`. This call will ALWAYS fail with 422 Validation Error (missing required query param).
- `auth.py:206-262` → `POST /auth/accept-invite` — correctly uses Pydantic model `InviteAcceptRequest` with `{ token, full_name, password }`. This would work if verify-invite didn't fail first.
- `superadmin.py:119-158` → `POST /superadmin/hospitals/{hospital_id}/invite` — creates invite token, calls `send_invite_email()`. Works but email is skipped if RESEND_API_KEY not configured.
- After successful accept, user is redirected to `/login` after 2 seconds (AcceptInvite.tsx:48) — correct, but the tokens returned by accept-invite are NOT stored, so user must login manually.

**Root cause:** FastAPI parameter type mismatch for `/auth/verify-invite`.
**What needs to be fixed:**
1. Change backend to: `async def verify_invite(token: str = Body(...), ...)` or accept a Pydantic model
2. Or change frontend to: `api.post('/auth/verify-invite', null, { params: { token } })`

---

## 16. Contact Form — LandingPage.tsx → contact router

**Status:** ⚠️ Partial

**Trace:**
- `LandingPage.tsx:273` → `apiClient.post('/contact', form)` — sends validated contact form data
- `contact.py:14-18` → `POST /contact` — validates with Pydantic (first_name, last_name, email, hospital_name, message), then `logging.info(...)` only
- `contact.py:17` → comment: `# TODO: Email sending can be added later. For now, just accept and log.`
- No email is actually sent. The submission is logged and returns success.
- `RESEND_API_KEY` check is NOT present (unlike other email functions) — the contact form doesn't even have the infrastructure to send email.

**What needs to be fixed:** Implement actual email sending using the existing Resend infrastructure in `email.py`.

---

## 17. AI Scoring — ai_scoring service

**Status:** 🔴 Mocked (heuristic rule engine, not AI)

**Trace:**
- `ai_scoring.py:1-40` → `calculate_risk_score(checkin_data, patient_history)` — pure Python function, no ML model, no API call
- Scoring rules:
  - Pain 3-5: +40, Pain 2: +20
  - Fever: +30, Swelling: +20, Bleeding: +50, Breathing: +60
  - Critical keywords in free text (Hindi + English): +25 each
  - Low response rate (<50%): +15
- Levels: CRITICAL ≥70, HIGH ≥50, MEDIUM ≥30, LOW <30
- Called from `patients.py:292` (checkin submission) and `whatsapp.py:164` (webhook handler)
- `readmission_risk.py:1-10` → `predict_readmission_risk()` — also pure heuristic: age>65 (+20), age>75 (+15), cardiac surgery (+25), ortho+age>60 (+15), missed>2 (+30), open escalations (+25), response_rate<40 (+20). HIGH >60, MEDIUM >35, LOW ≤35.

**Notes:** The LandingPage.tsx marketing copy says "AI-Powered" and "Real-time heuristic analysis". The code IS heuristic, not AI/ML. This is a rule-based scoring system. It works correctly for what it does, but calling it "AI" is misleading.

**What needs to be fixed:** Either integrate a real ML model or rebrand as "rule-based risk scoring" in all user-facing text.

---

## 18. Notifications

**Status:** ⚠️ Partial (client-side only, derived from escalations)

**Trace:**
- `Header.tsx:21` → `useEscalations('OPEN')` — fetches open escalations
- `Header.tsx:28-34` → maps escalation data to `NotificationItem[]` (client-side transformation)
- `Header.tsx:51-53` → `markAllRead()` — only updates local React state, no API call
- `Header.tsx:56-58` → `markRead(id)` — only updates local React state, no API call
- `Header.tsx:60-63` → `clearNotifications()` — only updates local React state, no API call
- No server-side notification system, no WebSocket/SSE, no notification persistence
- Notifications are re-derived from escalations on every header render
- `Escalations.tsx:30-31` → maps `e.priority` but backend returns `e.level` — **BUG**: `e.priority` is always undefined, so all escalations show as 'warning' type in notifications instead of 'critical' for CRITICAL level escalations.

**Issues:**
1. Notification read state is ephemeral — lost on page reload
2. No real-time push — only updates on page navigation/reload
3. Field name mismatch: `e.priority` vs `e.level` in Header.tsx

**What needs to be fixed:**
1. Fix `e.priority` → `e.level` in Header.tsx notification type mapping
2. Consider WebSocket/SSE for real-time notifications
3. Persist notification read state (localStorage at minimum)

---

## 19. Navigation/Sidebar

**Status:** ⚠️ Partial

**Trace:**
- `Sidebar.tsx:23-29` → nav items: Dashboard, Patients, Escalations, Reports, Settings
- `Sidebar.tsx:31-34` → super admin items: Hospitals, Audit Logs (only shown if `user.role === 'SUPER_ADMIN'`)
- `Sidebar.tsx:36` → `isActive()` uses `location.pathname === path || location.pathname.startsWith(path + '/')` — correct matching
- `Sidebar.tsx:50-55` → active indicator uses framer-motion `layoutId` for smooth animation — works correctly
- `App.tsx:131-144` → all routes correctly defined with lazy loading
- `App.tsx:98-119` → `ProtectedRoute` checks `user` existence and `allowedRoles` — correct
- **Dead links found:**
  - Dashboard.tsx:162 → `<Link to="/checkins">Manage</Link>` — no `/checkins` route → NotFound
  - Header.tsx:254 → `navigate('/profile')` — no `/profile` route → NotFound
  - Login.tsx:165 → `<Link to="/forgot-password">` — no `/forgot-password` route → NotFound
  - Login.tsx:189 → `<Link to="/contact">` — no `/contact` route → NotFound (contact form is in LandingPage `#contact` section, not a separate route)

**Issues:**
1. Four dead links across the application
2. Sidebar collapse works on desktop (lg breakpoint) but not on mobile (uses overlay)
3. `lg:ml-64` in AppLayout (App.tsx:87) is hardcoded — doesn't adjust when sidebar is collapsed

**What needs to be fixed:**
1. Fix or remove dead links
2. Adjust main content margin when sidebar is collapsed

---

## 20. Auth Token Refresh — AuthContext.tsx → client.ts → auth router

**Status:** ✅ Works

**Trace:**
- `client.ts:47-101` → response interceptor catches 401 errors
- `client.ts:58` → checks `!originalRequest.headers?.['X-Retry']` to prevent infinite loops
- `client.ts:62` → reads `refresh_token` from localStorage
- `client.ts:68-76` → if already refreshing, queues the request and waits
- `client.ts:80-83` → calls `POST /auth/refresh` with `{ refresh_token }` using raw axios (not the api instance, to avoid interceptor loop)
- `auth.py:129-174` → `POST /auth/refresh`:
  - Decodes refresh token, verifies `type == "refresh"`
  - Looks up non-revoked, non-expired token in DB
  - Verifies user exists and is active
  - Returns new access token only (NOT a new refresh token) — **design note: refresh token rotation not implemented**
- `client.ts:86-89` → stores new access token, retries original request
- `client.ts:90-93` → on refresh failure: clears queue, redirects to `/login`

**Notes:**
- Refresh token rotation (issuing new refresh token on each use) is NOT implemented. The same refresh token is reused until it expires or is revoked (via logout). This is a security consideration but not a bug.
- Queue mechanism correctly handles concurrent 401s during a single refresh.

---

## Summary Table

| # | Flow | Status | Severity |
|---|------|--------|----------|
| 1 | Login | ✅ Works | — |
| 2 | Signup | ❌ Not Implemented | By design (invite-only) |
| 3 | Logout | ⚠️ Partial | Access token not blacklisted |
| 4 | Forgot Password | ❌ Not Implemented | Dead link, no backend |
| 5 | Dashboard | ⚠️ Partial | Escalation count undefined, dead links |
| 6 | Patient Enrollment | 🔴 Mocked | API call commented out |
| 7 | Patient List | ⚠️ Partial | Client-side search breaks pagination |
| 8 | Patient Detail | ✅ Works | — |
| 9 | Escalations | ❌ Broken | Runtime crash: data shape mismatch |
| 10 | Reports | ⚠️ Partial | Fabricated stats, no email |
| 11 | WhatsApp Integration | ⚠️ Partial | Full table scan, empty templates |
| 12 | Settings | ⚠️ Partial | Fake toggles, hardcoded env |
| 13 | Hospital Management | ❌ Broken | Data mismatch, crashes, no delete endpoint |
| 14 | Audit Logs | ✅ Works | — |
| 15 | Accept Invite | ❌ Broken | verify-invite param type mismatch |
| 16 | Contact Form | ⚠️ Partial | No email actually sent |
| 17 | AI Scoring | 🔴 Mocked | Rule-based, not AI |
| 18 | Notifications | ⚠️ Partial | Client-only, field name bug |
| 19 | Navigation/Sidebar | ⚠️ Partial | 4 dead links |
| 20 | Auth Token Refresh | ✅ Works | — |

**Tally:** 4 ✅ Works · 10 ⚠️ Partial · 3 ❌ Broken · 1 ❌ Not Implemented · 2 🔴 Mocked

---

## Critical Fix Priority (blocks production use)

1. **[CRITICAL]** Fix Escalations page crash — change `useEscalations` hook to return `data.data` or update Escalations.tsx to destructure correctly
2. **[CRITICAL]** Fix Accept Invite verify-invite endpoint — change `token: str` to `token: str = Body(...)` in backend
3. **[CRITICAL]** Wire up Patient Enrollment to actual API — replace mock setTimeout with real API call
4. **[CRITICAL]** Fix Hospital Management page — update data model to match backend, fix crash on undefined admin_email
5. **[HIGH]** Fix Dashboard escalation count showing "undefined" — access `escalationsData?.data` 
6. **[HIGH]** Fix Header notification type mapping — `e.priority` → `e.level`
7. **[HIGH]** Remove or implement dead links (/checkins, /profile, /forgot-password, /contact)
8. **[HIGH]** Implement Forgot Password flow (backend + frontend)
9. **[HIGH]** Add hospital delete endpoint or remove delete button from Hospitals UI
10. **[MEDIUM]** Compute real NABH report statistics from actual data

---

# Phase 4: API Endpoint Audit

**Task ID:** 4  
**Scope:** All 8 backend router files, main.py, all frontend API hooks, all 14 page files.  
**Total backend endpoints:** 31  
**Total frontend API call sites:** 17 unique backend paths

---

## 1. Complete Endpoint Registry

### 1.1 Auth Router (`/auth`)
| # | Method | Path | Input Model | Output Model | Auth | Permission | FE Called? | Rate Limited |
|---|--------|------|-------------|--------------|------|------------|------------|--------------|
| 1 | POST | `/auth/login` | `LoginRequest` (EmailStr, password min=1) | `TokenResponse` | No | — | ✅ Yes | ✅ 5/min (local limiter) |
| 2 | POST | `/auth/refresh` | `RefreshRequest` (refresh_token: str) | `dict` | No | — | ✅ Yes (interceptor) | ✅ 10/min (local limiter) |
| 3 | POST | `/auth/logout` | Header Bearer token | `dict` | No (reads header optionally) | — | ✅ Yes | ❌ No |
| 4 | POST | `/auth/verify-invite` | `token: str` **(query param!)** | `dict` | No | — | ⚠️ Yes (BUG: FE sends body) | ❌ No |
| 5 | POST | `/auth/accept-invite` | `InviteAcceptRequest` | `dict` | No | — | ✅ Yes | ❌ No |
| 6 | GET  | `/auth/me` | — | `dict` | ✅ Yes | — | ✅ Yes | ❌ No |

### 1.2 Patients Router (`/patients`)
| # | Method | Path | Input Model | Auth | Permission | FE Called? | Issues |
|---|--------|------|-------------|------|------------|------------|--------|
| 7 | POST | `/patients` | `PatientCreate` (11 fields, phone validator) | ✅ | PATIENT_CREATE | ⚠️ MOCKED in Enrollment.tsx | FE sends wrong field names |
| 8 | GET  | `/patients` | Query: status, page, limit | ✅ | PATIENT_READ | ✅ Yes | No `max` bound on `limit` param |
| 9 | GET  | `/patients/{patient_id}` | Path param | ✅ | PATIENT_READ | ✅ Yes | — |
| 10 | POST | `/patients/{patient_id}/checkin/{day}` | Body: dict (unvalidated) | ✅ | PATIENT_UPDATE | ❌ No FE call | No input validation on `responses` dict |
| 11 | GET  | `/patients/{patient_id}/export` | Path param | ✅ | PATIENT_READ | ❌ No FE call | Orphan — no UI |
| 12 | POST | `/patients/{patient_id}/erasure-request` | Path param | ✅ | PATIENT_UPDATE | ❌ No FE call | Orphan — no UI |
| 13 | POST | `/patients/{patient_id}/erasure-approve` | Path param | ✅ | HOSPITAL_MANAGE | ❌ No FE call | Orphan — no UI |

### 1.3 Grievances Router (`/grievances`)
| # | Method | Path | Input Model | Auth | FE Called? | Issues |
|---|--------|------|-------------|------|------------|--------|
| 14 | POST | `/grievances` | `GrievanceCreate` (contact_info, message) | ❌ No | ❌ No FE call | **Claims rate-limited but IS NOT** |

### 1.4 Escalations Router (`/escalations`)
| # | Method | Path | Input Model | Auth | Permission | FE Called? | Issues |
|---|--------|------|-------------|------|------------|------------|--------|
| 15 | GET  | `/escalations` | Query: status, limit, offset | ✅ | PATIENT_READ | ⚠️ Yes (BUG: response format) | FE treats object as array |
| 16 | POST | `/escalations/{escalation_id}/resolve` | `ResolveRequest` | ✅ | PATIENT_UPDATE | ✅ Yes | — |

### 1.5 Reports Router (`/reports`)
| # | Method | Path | Input Model | Auth | Permission | FE Called? | Issues |
|---|--------|------|-------------|------|------------|------------|--------|
| 17 | GET  | `/reports/nabh` | Query: start_date, end_date, hospital_id | ✅ | REPORT_GENERATE | ✅ Yes | Stats are hardcoded, not from actual data |

### 1.6 Hospitals Router (`/hospitals`)
| # | Method | Path | Input Model | Auth | Permission | FE Called? | Issues |
|---|--------|------|-------------|------|------------|------------|--------|
| 18 | GET  | `/hospitals/me` | — | ✅ | (get_current_user) | ❌ No FE call | Orphan — no UI uses it |
| 19 | PUT  | `/hospitals/me` | `HospitalUpdate` | ✅ | HOSPITAL_MANAGE | ❌ No FE call | Orphan — no UI uses it |

### 1.7 SuperAdmin Router (`/superadmin`)
| # | Method | Path | Input Model | Auth | Permission | FE Called? | Issues |
|---|--------|------|-------------|------|------------|------------|--------|
| 20 | POST | `/superadmin/hospitals` | `HospitalCreate` | ✅ | require_superadmin | ✅ Yes | — |
| 21 | GET  | `/superadmin/hospitals` | — | ✅ | require_superadmin | ✅ Yes | FE type mismatch (address/phone vs city/state) |
| 22 | GET  | `/superadmin/hospitals/{hospital_id}` | Path param | ✅ | require_superadmin | ❌ No FE call | Orphan — no detail page |
| 23 | POST | `/superadmin/hospitals/{hospital_id}/invite` | `InviteCreate` | ✅ | require_superadmin | ❌ No FE call | Orphan — no invite UI |
| 24 | GET  | `/superadmin/audit-logs` | Query: limit (no max bound) | ✅ | require_superadmin | ✅ Yes | No max bound on `limit` |

### 1.8 WhatsApp Router (`/whatsapp`)
| # | Method | Path | Input Model | Auth | Permission | FE Called? | Issues |
|---|--------|------|-------------|------|------------|------------|--------|
| 25 | GET  | `/whatsapp/webhook` | Query: hub.mode, hub.verify_token, hub.challenge | ❌ No | — | ❌ N/A (Meta) | No HMAC signature verification |
| 26 | POST | `/whatsapp/webhook` | JSON body (Meta payload) | ❌ No | — | ❌ N/A (Meta) | No HMAC signature verification, loads ALL patients |
| 27 | POST | `/whatsapp/send-checkin/{patient_id}/{day}` | Path params | ✅ | PATIENT_UPDATE | ❌ No FE call | — |
| 28 | GET  | `/whatsapp/status/{patient_id}` | Path param | ✅ | PATIENT_READ | ❌ No FE call | — |

### 1.9 Contact Router (no prefix)
| # | Method | Path | Input Model | Auth | FE Called? | Issues |
|---|--------|------|-------------|------|------------|--------|
| 29 | POST | `/contact` | `ContactForm` (validated) | ❌ No | ✅ Yes | — |

### 1.10 Main App
| # | Method | Path | Auth | FE Called? | Notes |
|---|--------|------|------|------------|-------|
| 30 | GET  | `/health` | ❌ No | ❌ No (infra) | Correct — infrastructure endpoint |
| 31 | POST | `/admin/seed-demo-data` | ✅ HOSPITAL_MANAGE | ❌ No | Hidden admin utility |

---

## 2. Critical Bugs Found

### 🔴 CRITICAL-1: `/auth/verify-invite` Parameter Type Mismatch
- **Backend:** `token: str` → FastAPI reads as **query parameter** for POST
- **Frontend:** `api.post('/auth/verify-invite', { token })` → sends as **JSON body**
- **Result:** Always returns **422 Unprocessable Entity** — invite flow is completely broken
- **Fix:** Backend should use `req: InviteVerifyRequest` Pydantic model or add `Body()` annotation

### 🔴 CRITICAL-2: Escalations Response Format Mismatch
- **Backend returns:** `{"data": [...], "total": N, "limit": N, "offset": N}`
- **Frontend `useEscalations` hook:** Returns the full object (no `.data` unwrapping)
- **Escalations.tsx line 67:** `escalations.map(...)` — calls `.map()` on an **object**, not an array → **runtime crash**
- **Dashboard.tsx:** `const escalations = escalationsData || []` — object is truthy, so `escalations.length` = `undefined`
- **Fix:** Either unwrap `.data` in the hook, or change the page to access `escalations.data`

### 🔴 CRITICAL-3: Frontend Calls `DELETE /superadmin/hospitals/{id}` — No Backend Endpoint
- **Frontend (Hospitals.tsx line 51):** `api.delete(`/superadmin/hospitals/${id}`)`
- **Backend:** No DELETE route exists on `/superadmin/hospitals/{hospital_id}`
- **Result:** Always returns **404 Not Found** — delete hospital feature is non-functional
- **Fix:** Either add a DELETE endpoint (with cascade logic) or remove the delete button

### 🟠 HIGH-1: Enrollment Page is MOCKED — Never Calls Backend
- **Enrollment.tsx line 101:** `// await api.post('/patients', form)` is **commented out**
- Line 102: `await new Promise((r) => setTimeout(r, 1500)) // Mock`
- **Result:** Patient enrollment is non-functional — always shows fake success, no data saved
- **Additional issue:** Form field names don't match `PatientCreate` schema (e.g., `fullName` vs `full_name`, no `family_mobile`, no `consent_given`)

### 🟠 HIGH-2: Hospitals Frontend Type Mismatch with Backend Response
- **Frontend expects:** `address`, `phone`, `email`, `admin_name`, `admin_email`
- **Backend returns:** `name`, `city`, `state`, `bed_count`, `nabh_level`, `plan_type`, `patient_count`, `created_at`
- **Result:** Hospital list shows `undefined` for all display fields
- **Fix:** Align frontend `Hospital` interface with actual backend response

### 🟠 HIGH-3: WhatsApp Webhook Has No HMAC Signature Verification
- **GET /whatsapp/webhook:** Only compares `hub.verify_token` — correct for initial handshake
- **POST /whatsapp/webhook:** Processes inbound messages with **zero signature validation**
- **Result:** Anyone can POST to this endpoint and trigger check-in completions, escalations, and patient status changes
- **Fix:** Add `X-Hub-Signature-256` header validation using `settings.WHATSAPP_APP_SECRET`

### 🟠 HIGH-4: WhatsApp Webhook Loads ALL Patients for Phone Matching
- **whatsapp.py line 82:** `result = await db.execute(select(Patient))` — loads every patient
- **Line 86:** Iterates and decrypts each patient's mobile number for comparison
- **Result:** O(N) full table scan + decrypt per webhook call; will not scale; decrypted PII in memory
- **Fix:** Add a `mobile_lookup_hash` column (already noted in code comment) with deterministic hash for O(1) lookup

---

## 3. Security Issues

### 🟡 MEDIUM-1: Grievance Endpoint Claims Rate Limiting but Has None
- **patients.py line 554:** Docstring says "rate-limited to prevent abuse"
- **Code imports** `Limiter` and `get_remote_address` inside the function but **never uses them**
- **Fix:** Add `@limiter.limit("5/minute")` decorator or use the app-level limiter

### 🟡 MEDIUM-2: Dual Limiter Instances
- **main.py line 28:** `limiter = Limiter(key_func=get_remote_address)` → stored in `app.state.limiter`
- **auth.py line 24:** `limiter = Limiter(key_func=get_remote_address)` → **separate instance**
- **Result:** Auth rate limits use a separate in-memory store, not the app-level one; `slowapi` middleware won't intercept auth limits
- **Fix:** Use `request.app.state.limiter` in auth.py instead of creating a new instance

### 🟡 MEDIUM-3: `/admin/seed-demo-data` Exposes Internal Error Details
- **main.py line 205:** Returns `str(e)` in 500 response: `{"detail": f"Seeding failed: {str(e)}"}`
- **Result:** Internal error messages (stack traces, file paths, DB details) leaked to client
- **Fix:** Log the error server-side, return generic message to client

### 🟡 MEDIUM-4: No Response Models on Most Endpoints
- **Only 2 endpoints** have `response_model` defined: `POST /auth/login` (TokenResponse) and `POST /auth/refresh` (dict)
- **29 of 31 endpoints** return raw dicts — no schema validation, no OpenAPI documentation
- **Result:** No output validation; response shape can drift without detection
- **Fix:** Define Pydantic response models for all endpoints

### 🟡 MEDIUM-5: No Input Validation on Query Parameters
- **`GET /patients`:** `page` and `limit` have no min/max bounds; `limit=999999` is accepted
- **`GET /escalations`:** Same — `limit` and `offset` unbounded
- **`GET /superadmin/audit-logs`:** Same — `limit` unbounded, defaults to 100
- **Result:** Potential DoS via huge result sets
- **Fix:** Add `Query(ge=1, le=100)` constraints

### 🟢 LOW-1: `/auth/logout` Has No Auth Dependency
- **auth.py line 178:** Reads token from header but has `Depends(get_db)` only, no `get_current_user`
- **Result:** Unauthenticated callers can call logout; it just won't find tokens to revoke (harmless but sloppy)
- **Fix:** Add `get_current_user` dependency for consistency

### 🟢 LOW-2: `PatientUpdate` Model Defined but Never Used
- **patients.py line 54:** Defines `PatientUpdate` with status, current_day, instructions fields
- **No PATCH/PUT endpoint** exists on the patients router
- **Result:** Dead code — likely an unfinished feature
- **Fix:** Implement PATCH `/patients/{patient_id}` or remove the model

### 🟢 LOW-3: `print()` Used Instead of `logging` in Production Code
- **patients.py lines 134, 339:** `print(f"WhatsApp welcome failed (non-fatal): {e}")`
- **whatsapp.py lines 97, 114, 127, 187, 236:** Multiple `print()` calls
- **patients.py line 584:** `print(f"DPO notification failed (non-fatal): {e}")`
- **Result:** No structured logging, no log levels, can't be filtered in production
- **Fix:** Replace all `print()` with `logging.warning()` or `logging.error()`

---

## 4. Orphan Endpoints (Backend exists, no frontend call)

| Endpoint | Reason | Severity |
|----------|--------|----------|
| `GET /hospitals/me` | No Settings UI reads hospital data from API | LOW — useful for future |
| `PUT /hospitals/me` | No hospital edit UI | LOW — useful for future |
| `GET /superadmin/hospitals/{hospital_id}` | No hospital detail page | LOW |
| `POST /superadmin/hospitals/{hospital_id}/invite` | No invite management UI | MEDIUM — core feature missing |
| `POST /grievances` | No public grievance form | MEDIUM — DPDPA requirement |
| `GET /patients/{id}/export` | No data export UI | MEDIUM — DPDPA requirement |
| `POST /patients/{id}/erasure-request` | No erasure request UI | MEDIUM — DPDPA requirement |
| `POST /patients/{id}/erasure-approve` | No erasure approve UI | MEDIUM — DPDPA requirement |
| `POST /whatsapp/send-checkin/{id}/{day}` | Manual trigger — no UI needed | LOW |
| `GET /whatsapp/status/{id}` | WhatsApp logs viewer — no UI | LOW |

---

## 5. Authentication & Authorization Matrix

| Role | PATIENT_CREATE | PATIENT_READ | PATIENT_UPDATE | REPORT_GENERATE | USER_MANAGE | HOSPITAL_MANAGE |
|------|:-:|:-:|:-:|:-:|:-:|:-:|
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| HOSPITAL_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| COORDINATOR | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| DOCTOR | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |

**Finding:** RBAC is consistently enforced. Every protected endpoint uses `require_permission()` or `require_superadmin`. Tenant isolation is applied via `current_user.require_hospital()` on all data-accessing endpoints.

---

## 6. HTTP Status Code Audit

| Status | Used By | Correct? |
|--------|---------|----------|
| 200 | `POST /contact`, `GET /health` | ✅ |
| 201 | **NONE** — patient create returns 200 (should be 201) | ❌ |
| 400 | `POST /auth/verify-invite`, `POST /auth/accept-invite`, `POST /patients/{id}/erasure-approve` | ✅ |
| 401 | Auth failures (login, refresh, get_current_user) | ✅ |
| 403 | Inactive account, permission denied, hospital context required | ✅ |
| 404 | Patient/hospital/escalation not found | ✅ |
| 409 | `POST /admin/seed-demo-data` (data exists) | ✅ |
| 422 | `POST /patients` (no consent) | ✅ |
| 429 | Login/refresh rate limits | ✅ |
| 500 | `POST /admin/seed-demo-data` (internal error) | ⚠️ Leaks `str(e)` |

**Issue:** `POST /patients` returns 200 with `{"id": ..., "message": "Patient enrolled"}` — should return **201 Created** for resource creation.

---

## 7. Response Format Consistency

**No standardized error envelope.** Current patterns:
- Success: varies per endpoint (some return `{"id": ..., "message": ...}`, some return `{"data": [...], "total": ...}`, some return raw object)
- Error: FastAPI default `{"detail": "message"}` (consistent via HTTPException)

**Recommendation:** Standardize success responses to `{ "success": true, "data": ..., "message": "..." }` and errors to `{ "success": false, "error": { "code": "...", "message": "..." } }`.

---

## 8. Rate Limiting Summary

| Endpoint | Rate | Implementation | Working? |
|----------|------|----------------|----------|
| `POST /auth/login` | 5/min | Local `Limiter` instance (not app-level) | ⚠️ Works but uses separate store |
| `POST /auth/refresh` | 10/min | Local `Limiter` instance (not app-level) | ⚠️ Works but uses separate store |
| `POST /grievances` | None | **Claimed but not implemented** | ❌ Broken |
| All others | None | — | — |

**Missing rate limits on:** All data-mutating endpoints (patient create, checkin submit, escalation resolve, hospital create, invite create, contact form).

---

## 9. Logging Audit

| Endpoint | Has Logging? | Method |
|----------|-------------|--------|
| `POST /auth/login` | ✅ | `log_audit()` |
| `POST /patients` | ✅ | `log_audit()` |
| `POST /patients/{id}/checkin/{day}` | ✅ | `log_audit()` |
| `POST /patients/{id}/erasure-request` | ✅ | `log_audit()` |
| `POST /patients/{id}/erasure-approve` | ✅ | `log_audit()` |
| `POST /contact` | ✅ | `logging.info()` |
| WhatsApp webhook | ⚠️ | `print()` (not proper logging) |
| WhatsApp failures | ⚠️ | `print()` (not proper logging) |
| Email failures | ⚠️ | `print()` (not proper logging) |
| All other endpoints | ❌ | No request/response logging |

**Missing:** No request logging middleware. No structured logging for API calls. No correlation IDs.

---

## 10. Summary Statistics

| Metric | Count |
|--------|-------|
| Total backend endpoints | 31 |
| Endpoints called by frontend | 17 (55%) |
| Orphan endpoints (no FE caller) | 14 |
| Critical bugs | 4 |
| High severity issues | 5 |
| Medium severity issues | 5 |
| Low severity issues | 3 |
| Endpoints with input validation | 8 (26%) |
| Endpoints with output models | 2 (6%) |
| Endpoints with rate limiting | 2 (6%) |
| Endpoints with audit logging | 5 (16%) |

---

## 11. Priority Fix Order

1. **CRITICAL-1:** Fix `/auth/verify-invite` parameter mismatch — invite flow is broken
2. **CRITICAL-2:** Fix escalations response format — Escalations page crashes
3. **CRITICAL-3:** Add DELETE hospital endpoint or remove delete button
4. **HIGH-1:** Connect Enrollment page to real API (un-mock + align field names)
5. **HIGH-2:** Align Hospitals frontend type with backend response
6. **HIGH-3:** Add HMAC signature verification to WhatsApp webhook
7. **HIGH-4:** Add mobile_lookup_hash column to avoid full-table patient scan
8. **MEDIUM-1:** Actually rate-limit the grievance endpoint
9. **MEDIUM-2:** Consolidate to single Limiter instance
10. **MEDIUM-3:** Stop leaking internal errors in seed endpoint

---

# Phase 5: Database Audit — Ojas-V2

**Task ID:** 5
**Scope:** All model files, migration, seed data, routers (N+1 / raw SQL), database config, tenant config.
**Version audited:** Backend 3.0.0

---

## 1. Model Inventory

| # | Table | File | Columns | FKs | Relationships |
|---|-------|------|---------|-----|---------------|
| 1 | `users` | `user.py` | 8 (id, email, hashed_password, full_name, role, hospital_id, is_active, created_at) | hospitals.id | `hospital` → Hospital |
| 2 | `hospitals` | `hospital.py` | 14 (id, name, city, state, bed_count, nabh_level, contact_email, contact_phone, plan_type, logo_url, nabh_certificate_number, settings, is_active, created_at) | none | `users`, `patients` |
| 3 | `patients` | `patient.py` | 27 (id, hospital_id, full_name, mobile, family_mobile, age, surgery_type, discharge_date, doctor_name, doctor_specialty, bed_number, uhid, status, current_day, total_days, instructions, response_rate, risk_score, risk_level, readmission_risk, created_at, consent_given, consent_given_at, consent_version, preferred_language, erasure_requested_at) | hospitals.id | `hospital` → Hospital, `checkins`, `escalations`, `timeline` |
| 4 | `checkins` | `checkin.py` | 11 (id, patient_id, day_number, status, sent_at, replied_at, responses, pain_level, risk_score, risk_level, risk_reasons, created_at) | patients.id | `patient` → Patient |
| 5 | `escalations` | `escalation.py` | 11 (id, patient_id, level, status, trigger_type, trigger_detail, description, assigned_to, resolved_by, resolved_at, resolution_note, created_at) | patients.id, users.id (×2) | `patient` → Patient |
| 6 | `timeline_events` | `timeline.py` | 7 (id, patient_id, event_type, title, description, day_number, created_at) | patients.id | `patient` → Patient |
| 7 | `audit_logs` | `audit_log.py` | 11 (id, user_id, hospital_id, action, resource, resource_id, details, ip_address, user_agent, timestamp, success) | users.id, hospitals.id | none |
| 8 | `refresh_tokens` | `refresh_token.py` | 6 (id, user_id, token_hash, expires_at, created_at, revoked_at) | users.id (CASCADE) | none |
| 9 | `hospital_invites` | `hospital_invite.py` | 8 (id, hospital_id, email, role, token, expires_at, used_at, created_at) | hospitals.id, users.id | none |
| 10 | `whatsapp_message_logs` | `whatsapp_log.py` | 9 (id, patient_id, message_type, sent_at, delivered_at, read_at, status, retry_count, error_detail) | patients.id | none |
| 11 | `grievances` | `patient.py` | 7 (id, contact_info, message, status, resolved_at, resolution_notes, created_at, updated_at) | **none** | none |

---

## 2. Findings by Category

### 2.1 Missing Indexes — SEVERITY: HIGH

| Table | Column | Issue | Impact |
|-------|--------|-------|--------|
| `patients` | `status` | No index. Filtered in every list call (`WHERE status=?`). | Full table scan on patient list endpoint |
| `patients` | `uhid` | No index. Hospital-specific UHID lookups will be slow. | N+1 risk for UHID-based queries |
| `checkins` | `(patient_id, day_number)` | No composite index. Always queried together. | Sequential scan within patient's checkins |
| `checkins` | `(patient_id, status)` | No composite index. Webhook queries `WHERE patient_id=? AND status='PENDING'`. | Slow webhook response |
| `escalations` | `patient_id` | No index. Resolved by join in list, but not for single-patient lookup. | Slow escalation count queries |
| `escalations` | `status` | No index. Filtered in every escalation list call. | Full table scan |
| `audit_logs` | `timestamp` | No index. Audit logs ordered by `timestamp DESC`. | Slow audit log retrieval |
| `audit_logs` | `hospital_id` | FK without index. | Slow hospital-scoped audit queries |
| `hospital_invites` | `hospital_id` | FK without index. | Slow invite lookup per hospital |
| `whatsapp_message_logs` | `patient_id` | FK without index (despite being filtered). | Slow WhatsApp status lookups |

**Recommendation:** Add indexes on all status filter columns and composite indexes on `(patient_id, day_number)` and `(patient_id, status)` for checkins.

### 2.2 Cascade / Orphan Risk — SEVERITY: HIGH

| FK | ondelete | ORM Cascade | Risk |
|----|----------|-------------|------|
| `refresh_tokens.user_id` | CASCADE | none | ✅ Safe — DB cleans up |
| `patient.checkins` | **none** | `all, delete` (ORM) | ⚠️ ORM-only cascade. If patient deleted outside ORM (raw SQL), checkins become orphans |
| `patient.escalations` | **none** | `all, delete` (ORM) | ⚠️ Same as above |
| `patient.timeline` | **none** | `all, delete` (ORM) | ⚠️ Same as above |
| `users.hospital_id` | **none** | none | ⚠️ Hospital delete orphans users |
| `patients.hospital_id` | **none** | none | ⚠️ Hospital delete orphans patients |
| `audit_logs.user_id` | **none** | none | Acceptable — audit logs should persist |
| `audit_logs.hospital_id` | **none** | none | Acceptable |
| `escalations.assigned_to` | **none** | none | ⚠️ User delete loses assignment info |
| `escalations.resolved_by` | **none** | none | ⚠️ Same |
| `hospital_invites.hospital_id` | **none** | none | ⚠️ Orphan invites on hospital delete |
| `hospital_invites.created_by` | **none** | none | ⚠️ Orphan invites on user delete |
| `whatsapp_message_logs.patient_id` | **none** | none | ⚠️ Patient delete orphans logs |
| `grievances` | no FKs | none | N/A |

**Recommendation:** Add `ondelete="CASCADE"` to `checkins.patient_id`, `escalations.patient_id`, `timeline_events.patient_id` at DB level. Use `ondelete="SET NULL"` for `escalations.assigned_to/resolved_by`. Add `ondelete="RESTRICT"` on `users.hospital_id` and `patients.hospital_id` to prevent accidental hospital deletion.

### 2.3 N+1 Query Risk — SEVERITY: CRITICAL

**Issue 2.3.1 — WhatsApp Webhook: Full Table Scan on Every Message** `[whatsapp.py:82-93]`
```python
result = await db.execute(select(Patient))
all_patients = result.scalars().all()  # LOADS ALL PATIENTS
for p in all_patients:
    decrypted_mobile = decrypt_field(p.mobile)
    if decrypted_mobile == from_number: ...
```
- **Impact:** Every inbound WhatsApp message loads ALL patients into memory, decrypts every mobile number, and does string comparison. At 1000 patients, this is 1000+ decryptions per webhook call.
- **Severity:** CRITICAL — will cause OOM and latency spikes at scale.
- **Recommendation:** Add a deterministic `mobile_lookup_hash` column (SHA-256 of phone, unencrypted). Index it. Query `WHERE mobile_lookup_hash = ?` directly.

**Issue 2.3.2 — SuperAdmin list_hospitals: N+1 Per Hospital** `[superadmin.py:69-83]`
```python
for h in hospitals:
    patient_count = await db.execute(
        select(func.count()).select_from(Patient).where(Patient.hospital_id == h.id)
    )
```
- **Impact:** One additional query per hospital. At 50 hospitals = 50 extra queries.
- **Severity:** MEDIUM — low cardinality currently.
- **Recommendation:** Use a single `GROUP BY` query or `selectinload` with column_property.

### 2.4 Missing Constraints — SEVERITY: MEDIUM

| Table | Issue | Risk |
|-------|-------|------|
| `patients` | `uhid` not unique per hospital. No `UniqueConstraint('hospital_id', 'uhid')`. | Duplicate UHIDs within same hospital |
| `patients` | `mobile` not unique per hospital. No `UniqueConstraint('hospital_id', 'mobile')`. | Duplicate enrollments for same patient |
| `patients` | `role` is free-text `String`. No `CHECK` constraint or ENUM. | Invalid roles like "admin" or "" possible |
| `users` | `role` is free-text `String`. Same issue. | Invalid roles possible |
| `patients` | `status` is free-text `String`. No `CHECK`. | Invalid statuses like "DRAFT" possible |
| `checkins` | `status` is free-text. No `CHECK`. | Same |
| `escalations` | `status`, `level`, `trigger_type` all free-text. No `CHECK`. | Same |
| `grievances` | `status` free-text. | Same |
| `hospitals` | `nabh_level` free-text. | Same |
| `hospitals` | `plan_type` free-text. | Same |
| `patients` | All PII columns (`full_name`, `mobile`, `family_mobile`, `doctor_name`, `bed_number`, `uhid`) are nullable. | Rows with null name/mobile possible |
| `checkins` | `patient_id` + `day_number` not unique. Duplicate checkins possible. | Data integrity risk |
| `hospital_invites` | `email` not unique per hospital. Multiple invites to same email. | Minor — may be intentional |

**Recommendation:** Add composite unique constraints on `(hospital_id, uhid)` and `(hospital_id, mobile)` for patients. Add composite unique on `(patient_id, day_number)` for checkins. Use PostgreSQL `CHECK` constraints or Python `Enum` types for status/role/level fields. Add `NOT NULL` on critical patient PII columns (or handle at application level).

### 2.5 Soft Deletes — SEVERITY: MEDIUM

**Finding:** Soft delete is **NOT implemented** anywhere in the codebase. No `deleted_at`, `is_deleted`, or `soft_delete` column exists on any model.

- Patient "deletion" uses an anonymization pattern (DPDPA erasure) rather than soft delete.
- Hospital, User, Escalation, and other records have no deletion protection.
- No bulk-restore capability exists.

**Risk:** Accidental hard deletes are irreversible. No audit trail of what was deleted.

**Recommendation:** For a healthcare app, consider adding `deleted_at` (nullable timestamp) to at least `users`, `hospitals`, and `patients`. Use a global query filter to exclude soft-deleted rows by default.

### 2.6 Transaction Safety — SEVERITY: HIGH

**Issue 2.6.1 — Double Commits** (multiple locations)
- `patients.py:136` commits, then `patients.py:145` commits again after `log_audit()`.
- `patients.py:341` commits, then `patients.py:350` commits again after `log_audit()`.
- `auth.py:104` commits, then `auth.py:113` commits again after `log_audit()`.

**Risk:** If the first commit succeeds but `log_audit()` fails, the audit log rollback (line 58 in audit.py) rolls back the ENTIRE session — potentially undoing the business operation that was already committed. With `expire_on_commit=False`, the first commit's data persists in the DB but the session state may be inconsistent.

**Issue 2.6.2 — Audit Log Commits Independently**
`audit.py:53` does `db.add(log)` then `await db.commit()`. This means audit logs share the caller's session and transaction. If audit logging fails, the caller's `except` block in `get_db()` will also rollback.

**Recommendation:** Either (a) use `flush()` instead of `commit()` inside `log_audit()` and let the caller commit once, or (b) use a separate session for audit logging. Remove all double-commit patterns.

### 2.7 Grievance Model Isolation — SEVERITY: LOW

The `Grievance` model has **no foreign key** to `hospitals` or `users`. It's completely disconnected from the multi-tenant data model. There's no way to:
- List grievances for a specific hospital
- Associate a grievance with a patient
- Track who resolved it

**Recommendation:** Add `hospital_id` (nullable FK) and/or `patient_id` (nullable FK) to grievances. Add `resolved_by` FK to users.

### 2.8 WhatsAppMessageLog Orphan Risk — SEVERITY: LOW

`WhatsAppMessageLog` has no relationship definitions and no cascade. If a patient is deleted (anonymized), their WhatsApp logs remain but become unresolvable.

**Recommendation:** Add `relationship("Patient")` and optionally cascade delete.

### 2.9 Migration Integrity — SEVERITY: MEDIUM

Comparing the migration (`b63ce7c1109d`) against model definitions:

| Discrepancy | Migration | Model | Impact |
|-------------|-----------|-------|--------|
| `patients.status` | `nullable=True` | `default="ACTIVE"` (no nullable=False) | Model allows NULL, migration allows NULL — consistent but both wrong (should be NOT NULL) |
| `patients.full_name` | `nullable=True` | No `nullable=False` | Should be NOT NULL |
| `patients.mobile` | `nullable=True` | No `nullable=False` | Should be NOT NULL |
| `checkins.patient_id` | `nullable=True` | No `nullable=False` | A checkin without a patient makes no sense |
| `escalations.patient_id` | `nullable=True` | No `nullable=False` | Same |
| Model default pool_size=5 | N/A | Config `DATABASE_POOL_SIZE` default=5 | The comment says "synced with render.yaml" as 10, but the env var default is 5. Potential mismatch if render.yaml expects 10 but env var isn't set. |
| Single migration | `down_revision=None` | 11 models | No incremental migrations exist. Any model change requires a new migration. |

**Recommendation:** Create a new migration to add `NOT NULL` constraints on critical columns. Fix the default `DATABASE_POOL_SIZE` to match the comment (10).

### 2.10 Seed Data — SEVERITY: LOW (OK)

- ✅ Idempotent (checks for existing patients before seeding)
- ✅ References real model classes
- ✅ Realistic Indian names, surgeries, phone numbers
- ✅ 32 patients with good risk-level distribution (HIGH/MEDIUM/LOW)
- ✅ Proper FK references (hospital.id, nurse.id)
- ✅ Creates checkins, timeline events, and escalations for seeded patients
- ⚠️ Uses hardcoded weak passwords (`admin123`, `nurse123`, `doctor123`) — acceptable for seed/demo only
- ⚠️ All patients belong to same doctor — not diverse but functional for demo

### 2.11 Connection Pooling — SEVERITY: LOW (OK)

- ✅ `pool_pre_ping=True` — detects stale connections
- ✅ `pool_recycle=1800` — 30-min recycle (reasonable for Supabase)
- ✅ Configurable via env vars `DATABASE_POOL_SIZE` and `DATABASE_MAX_OVERFLOW`
- ✅ `expire_on_commit=False` — prevents lazy-load errors after commit
- ✅ `autoflush=False` — explicit control over flush timing
- ✅ NullPool for SQLite (correct — SQLite doesn't support pooling)
- ✅ SSL for Supabase in production
- ⚠️ Default pool_size is 5 but the code comment says "synced with render.yaml" at 10. The env var default should be 10.

### 2.12 SQL Injection Risk — SEVERITY: NONE (OK)

- Only raw SQL is `text("SELECT 1")` in health check — no user input. ✅ Safe.
- All other queries use SQLAlchemy ORM `select()` with parameterized queries. ✅ Safe.
- No `f-string` SQL construction anywhere. ✅ Safe.

### 2.13 Unused Columns — SEVERITY: LOW

| Column | Model | Status |
|--------|-------|--------|
| `patients.erasure_requested_at` | Patient | Written by erasure-request endpoint, never read back by any endpoint. No way to list pending erasure requests. |
| `patients.consent_version` | Patient | Set to `"v1"` on create, never read. |
| `hospitals.nabh_certificate_number` | Hospital | Settable via model but no router writes or reads it. |
| `checkins.sent_at` | CheckIn | Set in seed data, never set by application code. The send-checkin endpoint doesn't update it. |
| `checkins.risk_reasons` | CheckIn | Written by AI scoring, never exposed in any API response. |
| `escalations.assigned_to` | Escalation | Set in seed data, never set by application code (resolutions don't set it). |
| `escalations.resolved_by` | Escalation | Set in resolve endpoint, never read back. |
| `audit_logs.details` | AuditLog | Passed as `{}` default, never populated with meaningful data. |
| `audit_logs.success` | AuditLog | Always set to `True`, never `False`. |
| `whatsapp_message_logs.delivered_at` | WhatsAppMessageLog | Never written. |
| `whatsapp_message_logs.read_at` | WhatsAppMessageLog | Never written. |
| `whatsapp_message_logs.retry_count` | WhatsAppMessageLog | Default 0, never incremented. |
| `whatsapp_message_logs.error_detail` | WhatsAppMessageLog | Never written. |

**Recommendation:** Either implement functionality for these columns or remove them to avoid confusion.

### 2.14 Data Integrity Risks — SEVERITY: MEDIUM

1. **Duplicate patient enrollment:** No unique constraint on `(hospital_id, mobile)` or `(hospital_id, uhid)`. The same patient can be enrolled twice.
2. **Duplicate checkins:** No unique constraint on `(patient_id, day_number)`. The seed data relies on application logic to prevent duplicates.
3. **Floating-point for `response_rate`:** Using `Float` for percentage (0-100) can have precision issues. Consider `Integer` (0-100) or `Numeric(5,2)`.
4. **`risk_score` on Patient vs CheckIn:** Both have `risk_score` and `risk_level`. The patient's values are overwritten on every checkin, losing historical context.

---

## 3. Summary by Severity

| Severity | Count | Key Issues |
|----------|-------|------------|
| **CRITICAL** | 1 | WhatsApp webhook full table scan + decrypt-all pattern |
| **HIGH** | 4 | Missing indexes on status/filter columns; cascade/orphan risk; double-commit transaction safety; missing FK-level ondelete |
| **MEDIUM** | 4 | Missing constraints (unique, check, NOT NULL); no soft deletes; migration nullable mismatches; data integrity (duplicate enrollment) |
| **LOW** | 5 | Grievance isolation; WhatsAppMessageLog orphan; seed data passwords; unused columns; pool_size default mismatch |

---

## 4. Priority Recommendations (Ordered)

1. **[CRITICAL]** Add `mobile_lookup_hash` (SHA-256, indexed) to `patients` table. Rewrite WhatsApp webhook to use indexed lookup instead of full-table scan.
2. **[HIGH]** Add database-level `ON DELETE CASCADE` on `checkins`, `escalations`, `timeline_events` → `patients`.
3. **[HIGH]** Add indexes on `patients.status`, `checkins(patient_id, status)`, `checkins(patient_id, day_number)`, `escalations.status`, `audit_logs.timestamp`, `audit_logs.hospital_id`.
4. **[HIGH]** Fix double-commit pattern: make `log_audit()` use `flush()` only, remove second `commit()` in callers.
5. **[HIGH]** Add `ondelete="RESTRICT"` on `users.hospital_id` and `patients.hospital_id`.
6. **[MEDIUM]** Add `UniqueConstraint('hospital_id', 'uhid')` and `UniqueConstraint('hospital_id', 'mobile')` on patients.
7. **[MEDIUM]** Add `UniqueConstraint('patient_id', 'day_number')` on checkins.
8. **[MEDIUM]** Add `NOT NULL` constraints on critical columns (patient full_name, mobile, checkin patient_id).
9. **[MEDIUM]** Replace free-text status/role/level fields with PostgreSQL `CHECK` constraints or Python Enums.
10. **[LOW]** Fix default `DATABASE_POOL_SIZE` from 5 to 10 to match code comments.
11. **[LOW]** Add `hospital_id` FK to `grievances` table.
12. **[LOW]** Add relationships to `WhatsAppMessageLog`.


---

# Phase 6: Frontend Audit

**Task ID:** 6  
**Scope:** Every `.tsx`, `.ts`, `.css` file in `frontend/src/` read. All 14 pages, 4 layout components, 4 custom components, API client, hooks, context, App.tsx, main.tsx, index.css, tailwind.config.js.  
**Files audited:** 76 source files examined; 20 application files line-by-line reviewed.

---

## Summary

| Category | Critical | High | Medium | Low |
|---|---|---|---|---|
| Undefined CSS Classes (visual breakage) | 3 | — | — | — |
| Dark Mode | 1 | — | — | — |
| Broken Navigation | — | 4 | — | — |
| Broken Buttons | — | 2 | — | — |
| Broken Forms | — | 1 | 1 | — |
| Missing Error States | — | 4 | — | — |
| Missing Loading States | — | 2 | — | — |
| Dead Code | — | 4 | — | — |
| Accessibility | — | 5 | 4 | — |
| Overflow/Layout Issues | — | 1 | 1 | — |
| Spacing/Typography Inconsistency | — | — | 4 | — |
| Form Validation | — | 1 | 1 | — |
| **Total** | **4** | **24** | **12** | **0** |

---

## 1. CRITICAL — Undefined CSS Classes (Visual Breakage)

### 1A. `section-container` — Landing Page Layout Completely Broken
- **File:** `frontend/src/pages/LandingPage.tsx`, lines 292, 346, 376, 453, 484, 573, 615, 654, 690, 747, 793, 952, 994
- **Severity:** CRITICAL
- **Detail:** The class `section-container` is used 14 times as the primary layout wrapper for every section on the landing page. This class is **never defined** in `index.css` nor in `tailwind.config.js`. It provides zero width/padding constraints, meaning the landing page content has no max-width containment and will stretch to full viewport width with no horizontal padding. Every section on the landing page is visually broken.
- **Fix:** Add to `index.css` `@layer components`: `.section-container { @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8; }`

### 1B. `alert-error` — Accept Invite Error Styling Missing
- **File:** `frontend/src/pages/AcceptInvite.tsx`, line 92
- **Severity:** CRITICAL
- **Detail:** `className="alert-error mb-4"` is used for the error banner when invite verification fails. This class is **never defined** anywhere. The error message renders with no background, border, padding, or text color styling — it appears as plain text.
- **Fix:** Add to `index.css`: `.alert-error { @apply bg-[hsl(var(--error-50))] text-[hsl(var(--error-700))] border border-[hsl(var(--error-200))] rounded-xl p-4; }`

### 1C. `badge-risk-*` — RiskBadge Renders With No Styling
- **File:** `frontend/src/components/RiskBadge.tsx`, lines 11–14
- **Severity:** CRITICAL
- **Detail:** `badge-risk-critical`, `badge-risk-high`, `badge-risk-medium`, `badge-risk-low` are used as the sole CSS class for risk badges. None of these classes are defined in `index.css` or `tailwind.config.js`. RiskBadge renders on PatientList, PatientDetail, Dashboard, and Escalations pages — all risk badges appear as unstyled text. This affects every patient-facing view.
- **Fix:** Add badge-risk-* definitions with appropriate bg/text/border for each level.

---

## 2. CRITICAL — Dark Mode Completely Non-Functional

### 2A. Dark Mode Tokens Defined but Never Used
- **File:** `frontend/src/index.css`, lines 54–74; all `.tsx` page/layout files
- **Severity:** CRITICAL
- **Detail:** `ThemeProvider` from `next-themes` is configured in `main.tsx` (line 25, `defaultTheme="system"`, `enableSystem`), and dark mode CSS variables are defined in `:root` / `.dark` in `index.css`. However, **zero application-level files use `dark:` prefixed classes**. Every component uses hardcoded `bg-white`, `bg-slate-50`, `text-slate-600`, `border-slate-200` etc. Specific files with hardcoded light-only colors:
  - `Sidebar.tsx:80` — `bg-white border-r border-slate-200`
  - `Header.tsx:112` — `bg-white/80`
  - `App.tsx:85` (AppLayout) — `bg-slate-50`
  - `Reports.tsx:178,288` — `bg-white` on dropdown/modal
  - `Hospitals.tsx:169` — `bg-white` on delete modal
  - `Enrollment.tsx:138,176` — `bg-white` on step containers
  - `index.css:133` — `.card-default` uses `bg-white`
  - `Settings.tsx` — notification toggles use hardcoded slate colors
  - `LandingPage.tsx` — entire page uses `bg-white`, `text-gray-*` everywhere
  - Toggling to dark mode results in text becoming invisible (white text on white background in some areas, or dark sidebar on white page).
- **Fix:** Replace all hardcoded `bg-white` with `bg-card`, `text-slate-*` with `text-foreground`/`text-muted-foreground`, `border-slate-*` with `border-border`. Add `dark:` variants where needed. Add dark overrides for `card-default`, `form-input`, `btn-primary`, sidebar, and header.

---

## 3. HIGH — Broken Navigation (Dead Links)

### 3A. `/forgot-password` — No Route
- **File:** `frontend/src/pages/Login.tsx`, line 165
- **Detail:** `<Link to="/forgot-password">Forgot password?</Link>` — no route defined in `App.tsx`. Clicking navigates to NotFound (404).

### 3B. `/contact` — No Route
- **File:** `frontend/src/pages/Login.tsx`, line 189
- **Detail:** `<Link to="/contact">Contact Sales</Link>` — no route. Should scroll to `#contact` on landing page or navigate to `/` and scroll.

### 3C. `/checkins` — No Route
- **File:** `frontend/src/pages/Dashboard.tsx`, line 162
- **Detail:** `<Link to="/checkins">Manage</Link>` in "Today's Check-ins" quick action card. No `/checkins` route exists.

### 3D. `/profile` — No Route
- **File:** `frontend/src/components/layout/Header.tsx`, line 254
- **Detail:** `navigate('/profile')` in profile dropdown. No `/profile` route. Should navigate to `/settings`.

---

## 4. HIGH — Broken Buttons (No Functionality)

### 4A. "Add Hospital" Button — No Handler
- **File:** `frontend/src/pages/SuperAdmin/Hospitals.tsx`, line 75
- **Detail:** `<Button className="btn-primary gap-2"><Plus size={16} /> Add Hospital</Button>` — no `onClick` handler, no form, no dialog. Button is completely inert.

### 4B. "Edit" Button Per Hospital — No Handler
- **File:** `frontend/src/pages/SuperAdmin/Hospitals.tsx`, line 136
- **Detail:** `<Button variant="outline" size="sm">Edit</Button>` — no `onClick`, no form, no dialog. Button does nothing.

### 4C. Notification Toggles — Purely Decorative
- **File:** `frontend/src/pages/Settings.tsx`, lines 107–109
- **Detail:** Three notification toggles ("Critical Escalations", "Daily Summary", "Patient Non-Response") are `<div>` elements with no state, no `onClick`, no `role="switch"`, no `aria-checked`. They appear as static orange pills. Users cannot toggle them.

---

## 5. HIGH — Broken Forms

### 5A. Enrollment Form Submit Uses Mock, Not API
- **File:** `frontend/src/pages/Enrollment.tsx`, line 102
- **Detail:** `await new Promise((r) => setTimeout(r, 1500)) // Mock` — the actual API call (`await api.post('/patients', form)`) is commented out. Patient enrollment is **completely non-functional** in production. A `useCreatePatient` hook exists in `hooks.ts` but is never imported. Data is never sent to the backend.

### 5B. Enrollment Form Uses Native `<select>` Instead of Component Library
- **File:** `frontend/src/pages/Enrollment.tsx`, line 234
- **Severity:** MEDIUM
- **Detail:** Gender field uses a bare `<select>` element while all other inputs use shadcn/ui `<Input>`. Inconsistent styling and missing dark mode support, focus ring, and accessibility attributes.

---

## 6. HIGH — Missing Error States

### 6A. Dashboard — No Error Handling
- **File:** `frontend/src/pages/Dashboard.tsx`, lines 23–24
- **Detail:** `usePatients` and `useEscalations` return `isError`/`error` from React Query, but neither is checked. If the API is down, the page silently renders empty/zero stats with no error message.

### 6B. PatientList — No Error State
- **File:** `frontend/src/pages/PatientList.tsx`, line 13
- **Detail:** `usePatients` error not handled. If the API fails, the page shows "No patients found" (empty state) instead of an error message.

### 6C. PatientDetail — No Error State
- **File:** `frontend/src/pages/PatientDetail.tsx`, line 22
- **Detail:** `usePatient` error not handled. API failure shows "Patient not found" which is misleading.

### 6D. AuditLogs — No Error State
- **File:** `frontend/src/pages/SuperAdmin/AuditLogs.tsx`, line 5
- **Detail:** `useAuditLogs` error not handled.

---

## 7. HIGH — Missing Loading States

### 7A. Dashboard Stats/Charts — No Skeleton Loading
- **File:** `frontend/src/pages/Dashboard.tsx`
- **Detail:** Only the "Recent Patients" section (line 261) has a loading skeleton. The stats cards (lines 84–133), risk chart, pie chart, recovery trend chart, and quick action cards all render with zero/default data during load, causing a flash of "0" values then jumping to real values (layout shift).

### 7B. Header — No Loading State for Escalation Notifications
- **File:** `frontend/src/components/layout/Header.tsx`, line 21
- **Detail:** `useEscalations('OPEN')` is called on every authenticated page load. While loading, `escalationsData` is undefined, notifications show "No notifications" briefly, then populate. No loading indicator on the bell icon.

---

## 8. HIGH — Dead Code

### 8A. `DashboardLayout.tsx` — Never Imported
- **File:** `frontend/src/components/layout/DashboardLayout.tsx`
- **Detail:** This entire component (34 lines) is never imported. `App.tsx` defines its own inline `AppLayout` instead.

### 8B. `TopBar.tsx` — Never Imported
- **File:** `frontend/src/components/layout/TopBar.tsx`
- **Detail:** Entire component (61 lines) is dead. Only referenced in its own file.

### 8C. `ConsentStep.tsx` — Never Imported
- **File:** `frontend/src/components/ConsentStep.tsx`
- **Detail:** 132-line DPDPA consent component is defined but never used by any page. It was likely intended for the Enrollment flow.

### 8D. Dead Hooks in `hooks.ts`
- **File:** `frontend/src/api/hooks.ts`
- **Detail:** `useLogin` (line 19), `useMeQuery` (line 6), `useCreateHospital` (line 62), `useCreatePatient` (line 96), and `useHospitals` (line 51) are exported but never imported by any page. Hospitals.tsx uses its own inline `useQuery`. Enrollment.tsx uses a mock instead of `useCreatePatient`.

---

## 9. HIGH — Accessibility Issues

### 9A. Password Toggle Unreachable by Keyboard
- **File:** `frontend/src/pages/Login.tsx`, line 148
- **Detail:** `tabIndex={-1}` on the show/hide password button removes it from tab order. Keyboard-only users cannot toggle password visibility.

### 9B. Tab Buttons Missing ARIA Roles
- **Files:** `frontend/src/pages/PatientList.tsx` lines 62–73; `frontend/src/pages/Escalations.tsx` lines 50–58
- **Detail:** Tab-like filter buttons have no `role="tablist"`, `role="tab"`, `aria-selected`, or `aria-controls`. Screen readers cannot identify them as tab navigation.

### 9C. FAQ Accordion Missing ARIA Attributes
- **File:** `frontend/src/pages/LandingPage.tsx` lines 759–763
- **Detail:** FAQ buttons have `aria-expanded` but no `aria-controls`/`id` association with the content panel. Screen readers cannot determine what content is controlled.

### 9D. Sidebar Missing Navigation Role
- **File:** `frontend/src/components/layout/Sidebar.tsx`, line 106
- **Detail:** `<nav>` has no `aria-label`. The mobile menu close button (line 99) has no `aria-label`. Collapse toggle button (line 94) has no `aria-label`.

### 9E. Header Buttons Missing ARIA Labels
- **File:** `frontend/src/components/layout/Header.tsx`
- **Detail:** Notification bell button (line 130) and profile button (line 220) have no `aria-label`. Notification backdrop (line 149) has no `aria-hidden`.

---

## 10. MEDIUM — Accessibility Issues (Continued)

### 10A. PatientList Search Input — No Label Association
- **File:** `frontend/src/pages/PatientList.tsx`, line 51
- **Detail:** Uses bare `<input>` with `aria-label` but no `<label>` element and no `id`/`htmlFor` association. Also uses native `<input>` instead of the shadcn `<Input>` component.

### 10B. Escalations Resolution Textarea — No Label
- **File:** `frontend/src/pages/Escalations.tsx`, line 104
- **Detail:** `<textarea>` has no associated `<label>` or `aria-label`.

### 10C. Reports Preset Dropdown — No ARIA
- **File:** `frontend/src/pages/Reports.tsx`, lines 173–189
- **Detail:** Custom dropdown has no `role="listbox"`, `aria-expanded`, `aria-haspopup`.

### 10D. PatientDetail Check-in Grid — No Labels
- **File:** `frontend/src/pages/PatientDetail.tsx`, line 165
- **Detail:** Check-in cells use only `title` attribute for info. No `aria-label` on individual cells. Screen readers get no context about what each cell represents.

---

## 11. MEDIUM — Overflow / Layout Issues

### 11A. PatientDetail 14-Day Check-in Grid — Mobile Overflow
- **File:** `frontend/src/pages/PatientDetail.tsx`, line 164
- **Detail:** `grid grid-cols-7` forces 7 columns at all breakpoints. On mobile (~375px), each cell gets ~50px width. Combined with padding and text, the grid overflows or becomes illegible. Should use `grid-cols-4 sm:grid-cols-7` or similar responsive pattern.

### 11B. Double Mobile Overlay in AppLayout
- **File:** `frontend/src/App.tsx` (AppLayout, line 83) + `Sidebar.tsx` (line 67)
- **Detail:** Both `AppLayout` and `Sidebar` render their own mobile overlay. When sidebar opens, two overlapping dark overlays render simultaneously, creating a darker-than-expected backdrop. DashboardLayout.tsx (the dead component) had this same pattern. The Sidebar's built-in overlay should be removed since AppLayout doesn't have one (but it should).

---

## 12. MEDIUM — Spacing / Typography Inconsistency

### 12A. LandingPage Uses Hardcoded `text-gray-*` Instead of Semantic Tokens
- **File:** `frontend/src/pages/LandingPage.tsx`, lines 658, 669, 672, 678, 854, 856
- **Detail:** Testimonials section uses `text-gray-900`, `text-gray-600`, `text-gray-50` instead of `text-foreground`, `text-muted-foreground`. Breaks dark mode and creates inconsistency with the rest of the app.

### 12B. Reports Page Uses Hardcoded `slate` Colors
- **File:** `frontend/src/pages/Reports.tsx`, lines 222–226, 231, 294
- **Detail:** Table headers, table rows, modal text use `text-slate-500`, `text-slate-700`, `bg-slate-800`, `border-slate-100`, `bg-green-100`, `bg-amber-100`, `bg-red-100` instead of semantic CSS variable classes.

### 12C. Hospitals Page Uses Hardcoded `slate` Colors
- **File:** `frontend/src/pages/SuperAdmin/Hospitals.tsx`, lines 126, 132, 141, 175, 178
- **Detail:** `text-slate-500`, `text-slate-400`, `bg-red-100`, `border-red-200` instead of semantic tokens.

### 12D. Enrollment Review Step Uses Hardcoded `slate` Colors
- **File:** `frontend/src/pages/Enrollment.tsx`, lines 404–407, 353–355
- **Detail:** `text-slate-500`, `text-slate-800`, `bg-slate-50`, `border-slate-100`, `border-slate-50` instead of semantic tokens.

---

## 13. MEDIUM — Form Validation Gaps

### 13A. Enrollment Form — No Type/Format Validation
- **File:** `frontend/src/pages/Enrollment.tsx`, lines 67–90
- **Detail:** Only checks `!form.field` (empty string). No email format validation, no phone format validation (accepts any string), no age range validation (accepts negative numbers, text), no UHID format validation.

### 13B. Login Form — No Email Format Validation
- **File:** `frontend/src/pages/Login.tsx`, lines 23–29
- **Detail:** Only checks `!email.trim() || !password.trim()`. Invalid email formats like "abc" are accepted and sent to the API.

---

## 14. LOW — Other Observations

### 14A. TopBar Shows Hardcoded "Dashboard" Breadcrumb
- **File:** `frontend/src/components/layout/TopBar.tsx`, line 33
- **Detail:** `<span>Dashboard</span>` is hardcoded, not dynamic based on current route. However, this component is dead code anyway.

### 14B. Reports Page History Data is Hardcoded
- **File:** `frontend/src/pages/Reports.tsx`, lines 37–41
- **Detail:** Report history is initialized with 3 hardcoded entries. Past reports are not fetched from the API. Only newly generated reports are appended to state (lost on page refresh).

### 14C. Dashboard Fetches 100 Patients on Every Load
- **File:** `frontend/src/pages/Dashboard.tsx`, line 23
- **Detail:** `usePatients('', 1, 100)` fetches all patients up to 100 on every dashboard visit. Should use a dedicated lightweight stats endpoint.

### 14D. `animate-pulse` on Generate Button is Distracting
- **File:** `frontend/src/pages/Reports.tsx`, line 198
- **Detail:** `${!isGenerating && startDate && endDate ? 'animate-pulse' : ''}` — the "Generate & Download PDF" button continuously pulses when dates are selected but not yet generating. This is visually distracting and unusual UX. Should use a subtle highlight instead.

---

## 15. Positive Findings (What Works Well)

1. **Lazy loading** — All 13 pages use `React.lazy()` + `Suspense` in `App.tsx` with a global loading spinner fallback.
2. **Global error boundary** — `ErrorBoundary` class component in `App.tsx` catches render errors with a user-friendly fallback and refresh button.
3. **Token refresh** — API client implements proper silent token refresh with request queuing.
4. **Contact form validation** — LandingPage uses Zod schema validation with per-field error display.
5. **Loading states** — PatientList, PatientDetail, Escalations, AuditLogs, Hospitals all have loading spinners/skeletons.
6. **Empty states** — PatientList, Dashboard (recent patients), Escalations, AuditLogs, Hospitals all have meaningful empty states with icons.
7. **Success states** — Enrollment (toast + redirect), Escalations resolve (toast + optimistic update), Hospitals delete (toast + modal), Reports generate (modal + download).
8. **Responsive layout** — Sidebar collapses on mobile with overlay, tables hide columns responsively, grids use responsive breakpoints, mobile hamburger menu.
9. **Page transitions** — Smooth `framer-motion` page transitions via `AnimatePresence`.
10. **Protected routes** — Role-based gating for SUPER_ADMIN routes works correctly.
11. **API hooks** — React Query hooks are well-structured with proper cache keys and invalidation.
12. **EscalationCoach component** — AI suggestion cards with copy-to-clipboard is well-implemented.

---

## 16. Priority Fix Order

| # | Severity | Issue | Effort |
|---|---|---|---|
| 1 | CRITICAL | Define `section-container` CSS class | 1 min |
| 2 | CRITICAL | Define `alert-error` CSS class | 1 min |
| 3 | CRITICAL | Define `badge-risk-*` CSS classes | 5 min |
| 4 | CRITICAL | Replace hardcoded colors with dark-mode-compatible tokens | 2–4 hrs |
| 5 | HIGH | Fix Enrollment form to use actual API (uncomment + use `useCreatePatient`) | 10 min |
| 6 | HIGH | Fix 4 broken navigation links | 10 min |
| 7 | HIGH | Add `onClick`/`aria-*` to Add Hospital, Edit, Notification toggles | 30 min |
| 8 | HIGH | Add `isError`/error UI to Dashboard, PatientList, PatientDetail, AuditLogs | 30 min |
| 9 | HIGH | Add skeleton loading to Dashboard stats/charts | 20 min |
| 10 | HIGH | Delete dead code (DashboardLayout, TopBar, ConsentStep, dead hooks) | 5 min |
| 11 | HIGH | Fix Login password toggle `tabIndex={-1}` | 1 min |
| 12 | MEDIUM | Fix PatientDetail 7-col grid for mobile | 10 min |
| 13 | MEDIUM | Add ARIA roles to tabs, FAQ, sidebar | 30 min |
| 14 | MEDIUM | Add form validation (email, phone, age) | 30 min |
| 15 | MEDIUM | Replace hardcoded `text-gray-*`/`text-slate-*` with semantic tokens | 1 hr |
| 16 | LOW | Fix Reports hardcoded history, Dashboard 100-patient fetch, pulse animation | 30 min |

---

# Phase 7: AI Features Audit

**Task ID:** 7
**Scope:** All AI-related service files, routers, frontend components, and configuration.
**Files audited:**
- `backend/app/services/ai_scoring.py`
- `backend/app/services/coach_suggestions.py`
- `backend/app/services/readmission_risk.py`
- `backend/app/services/whatsapp_templates.py`
- `backend/app/routers/whatsapp.py` (AI scoring invocation)
- `backend/app/routers/patients.py` (AI scoring + readmission risk invocation)
- `backend/app/routers/escalations.py` (coach suggestions invocation)
- `backend/app/routers/reports.py` (fake analytics)
- `backend/app/core/config.py` (no AI config)
- `backend/requirements.txt` (no AI SDK)
- `frontend/src/components/EscalationCoach.tsx`
- `frontend/src/components/RiskBadge.tsx`
- `frontend/src/pages/Escalations.tsx`
- `frontend/src/pages/PatientDetail.tsx`
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/LandingPage.tsx` (marketing claims)

---

## 1. VERDICT: Is It Real AI?

| Feature | File | Verdict | Evidence |
|---|---|---|---|
| AI Risk Scoring | `ai_scoring.py` | 🔴 **FAKE** | Pure `if/else` heuristic with hardcoded point values. Zero LLM/ML calls. |
| AI Coach Suggestions | `coach_suggestions.py` | 🔴 **FAKE** | Static Python dictionary of 5 trigger types → 3 pre-written strings each. No AI. |
| Readmission Risk Prediction | `readmission_risk.py` | 🔴 **FAKE** | 7-line `if/else` rule with hardcoded weight sums. No ML model. |
| WhatsApp Templates | `whatsapp_templates.py` | N/A (not AI) | Static template strings. Correctly not claimed as AI. |
| NABH Report Analytics | `reports.py` | 🔴 **FAKED DATA** | `feedback_rate` is always 78%, `feedback_count` is always 78% of total. Hardcoded multiplier. |

**Overall: ZERO real AI. 100% heuristic rule-based scoring and static lookup tables.**

### Smoking Gun Evidence
1. **No AI SDK in `requirements.txt`** — No openai, anthropic, google-generativeai, langchain, or any ML library.
2. **No AI API keys in `config.py`** — Zero `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, or similar.
3. **Zero LLM API calls** — `rg` for `openai|anthropic|gemini|llm|chat.completions|genai|vertexai|langchain` returns **0 matches** in backend.
4. **No `.env` AI keys** — `rg` for `OPENAI|ANTHROPIC|GEMINI|LLM_API|AI_MODEL` in `.env*` files returns **0 matches**.

---

## 2. Feature-by-Feature Analysis

### 2.1 AI Risk Scoring (`ai_scoring.py`) — 🔴 FAKE

**What it does:** Adds fixed point values based on structured response fields:
- Pain 3-5 → +40, Pain 2 → +20
- Fever → +30, Swelling → +20
- Bleeding → +50, Breathing difficulty → +60
- Keyword match on free_text (9 Hindi/English keywords) → +25 each
- Low engagement history → +15

**Critical Issues:**
- **Keyword matching is dangerous in healthcare.** `text.lower()` substring matching on words like "blood", "severe" will produce false positives. "My blood pressure is normal" would trigger +25.
- **No debouncing or aggregation** — Multiple keyword hits in one message stack additively (score can exceed 100, capped at 100).
- **No temporal analysis** — Doesn't consider trend across days. A patient with pain 3 on day 1 and pain 0 on day 14 is treated identically to a new pain 3 on day 14.
- **No surgery-type awareness** — Pain 3 after knee replacement is expected; pain 3 after appendectomy is alarming. The scorer doesn't know.
- **Trigger type mismatch** — `escalations.py` passes `trigger_type` (e.g., `"ai_risk"`, `"no_reply"`, `"PATIENT_HELP_REQUEST"`) to `get_suggestions()`, but `coach_suggestions.py` only has keys `"severe_pain"`, `"fever"`, `"no_reply"`, `"bleeding"`, `"swelling"`. Trigger type `"ai_risk"` will ALWAYS fall through to `"no_reply"` suggestions, which say "Call family member immediately. Patient may be non-ambulatory." — **This is a critical mismatch.**

### 2.2 Coach Suggestions (`coach_suggestions.py`) — 🔴 FAKE

**What it does:** Returns 3 pre-written suggestion strings from a static dictionary based on trigger type. Substitutes `{doctor}` placeholder.

**Critical Issues:**
- **Contains medical advice.** "Advise patient to take prescribed painkiller", "Advise Dolo 650 if >99°F", "Check for deep vein thrombosis" — This is clinical decision support that should require physician review or at minimum a medical disclaimer.
- **No doctor name validation.** `doctor_name` is user-supplied via the API. A malicious user could inject content through the `get_suggestions("bleeding", "Dr. <script>alert(1)</script>")` — though since this is a backend API and not rendered as HTML, XSS risk is low, but the `trigger_type` key is also user-derivable.
- **Trigger type mismatch with escalation system** — As noted above, the most common trigger `"ai_risk"` has no matching key and falls through to `"no_reply"`.

### 2.3 Readmission Risk Prediction (`readmission_risk.py`) — 🔴 FAKE

**What it does:** Adds fixed point values:
- Age > 65 → +20, Age > 75 → +15 (cumulative +35)
- "cardiac" in surgery → +25
- "ortho" + age > 60 → +15
- Missed > 2 checkins → +30
- Open escalations > 0 → +25
- Response rate < 40 → +20

**Critical Issues:**
- **Extremely naive.** Age > 75 gives same risk regardless of comorbidities, BMI, lab results, or actual clinical data.
- **Surgery matching is substring-based.** A surgery type of "Cardiology Consult" (non-surgical) would match "cardiac" and add 25 points.
- **No validation of score bounds.** Theoretical max is 140, but thresholds are 60/35 — so any elderly cardiac patient with 1 missed checkin is automatically HIGH risk.
- **Called on every check-in** (`patients.py:308`) with potentially stale `missed_count` and `open_esc_count`.

### 2.4 NABH Report Analytics (`reports.py:69-76`) — 🔴 FAKED DATA

```python
"feedback_rate": round(min(78.0, (total * 0.78) / total * 100) if total > 0 else 0, 1),
# This simplifies to: min(78.0, 78.0) = ALWAYS 78.0%

"early_follow_up_rate": round(min(92.0, (completed / total * 100 * 0.95)) ...),
# Capped at 92% — fabricated ceiling

"feedback_count": min(int(total * 0.78), total)
# Always 78% of total patients — no actual feedback mechanism exists!
```

**This is regulatory fraud risk.** The NABH report claims a 78% patient feedback rate, but there is NO patient feedback collection mechanism anywhere in the codebase. This is a fabricated compliance metric submitted to NABH accreditation bodies.

---

## 3. 15-Criterion Audit Matrix

| # | Criterion | Status | Notes |
|---|---|---|---|
| 1 | **Prompt quality** | N/A | No prompts exist. No LLM is called. |
| 2 | **Hallucination risk** | ✅ N/A (no LLM) | BUT: The keyword matcher in `ai_scoring.py` produces false-positive risk escalations that ARE medical hallucinations in effect — e.g., "my blood test results came back" triggers bleeding alert. |
| 3 | **Token efficiency** | N/A | No tokens consumed. |
| 4 | **Context management** | 🔴 FAIL | No context passed. The scorer receives only current check-in responses, not patient history, surgery type, or trend data. |
| 5 | **Error recovery** | N/A | No AI API to fail. Rule-based code has no try/except (it's pure Python, can't fail externally). |
| 6 | **Streaming** | N/A | Not applicable. |
| 7 | **Fallback models** | 🔴 FAIL | No primary model, no fallback. |
| 8 | **Caching** | N/A | Not applicable (stateless rules). |
| 9 | **Cost optimization** | ✅ $0 | No AI cost. But the COST of fake AI is reputational and legal. |
| 10 | **Latency** | ✅ ~0ms | Rule-based is instant. |
| 11 | **Model routing** | 🔴 FAIL | No models. No routing. Not configurable. |
| 12 | **Structured outputs** | ✅ YES | The one thing done correctly — outputs are clean dicts with `score`, `level`, `reasons`. Easy to swap with real AI later. |
| 13 | **Guardrails** | 🔴 FAIL | No output validation. Score can be gamed by sending "severe severe severe" in free text to stack +75 points. No range check on `pain_level` from webhook parsing (could be negative or >5). |
| 14 | **Prompt injection resistance** | N/A | No prompts. BUT: WhatsApp webhook `message_text[:200]` is stored in `trigger_detail` without sanitization — potential stored XSS if ever rendered in admin UI. |
| 15 | **Is it actually AI?** | 🔴 **NO** | 0% AI. All 4 "AI" features are hardcoded rules/static lookups. |

---

## 4. Marketing vs. Reality Gap

The **LandingPage.tsx** makes these claims:
- "AI Risk Scoring" → "Real-time heuristic analysis detects pain, fever, swelling, and bleeding patterns automatically" *(technically true if you consider if/else "heuristic analysis")*
- "Readmission Prediction" → "Predictive analytics based on age, surgery type, response rates, and missed check-ins" *(true but misleading — "predictive analytics" implies statistical/ML model)*
- "Smart Escalations" → "AI-powered triage with context-aware suggestions" *(false — no AI, no context awareness)*
- "AI-Powered Intelligence" → "Heuristic scoring catches complications before they escalate" *(uses the word "heuristic" which is honest, but "AI-Powered" is false)*
- Pricing tier: "Basic AI risk scoring" / "Advanced AI scoring" *(both tiers get the same if/else rules)*
- Testimonial: "The AI alerts catch issues before they become emergencies" *(deceptive)*
- FAQ: "The AI scoring engine adapts risk thresholds based on surgery type and patient demographics" *(explicitly false — no surgery-type adaptation exists)*
- Backend API description: `"NABH-Compliant | AI-Powered | Multi-Tenant"` *(false)*
- Email template: "AI-powered insights" *(false)*
- `trigger_type="ai_risk"` used internally in escalation records *(misleading audit trail)*

---

## 5. Legal & Compliance Risk Assessment

### 5.1 Consumer Protection (India)
- **Advertising Standards Council of India (ASCI)**: Claims of "AI-powered" without AI capability constitute misleading advertising.
- **Consumer Protection Act 2019**: "AI scoring" as a paid feature (Starter: ₹8,999/mo) that is actually a 40-line Python if/else script could be considered unfair trade practice.

### 5.2 Healthcare Compliance
- **NABH**: Fake 78% feedback rate in NABH reports is a **fabricated compliance metric**. If submitted for accreditation, this is fraud.
- **Medical Device Regulations**: If marketed as a clinical decision support system (CDSS), it may need CDSCO registration under India's Medical Device Rules 2017. Even simple rule-based CDSS may qualify.
- **Clinical Safety**: The keyword-based "critical" escalation (`"severe"`, `"blood"`, `"fainting"`) can trigger false escalations that waste clinical time, or miss real emergencies expressed differently.

### 5.3 DPDPA 2023
- Patient free-text from WhatsApp is stored in `trigger_detail` and `risk_reasons` without explicit consent for AI processing (though there's no AI, the marketing implies it).

---

## 6. What a Real Implementation Would Need

To legitimately claim "AI-powered":

1. **Add `openai` or `anthropic` to `requirements.txt`** with API key in config
2. **Replace `ai_scoring.py`** with an LLM call that receives:
   - Patient surgery type, age, comorbidities
   - Full 14-day check-in history (trend)
   - Current day's responses
   - Structured output schema (JSON mode / function calling)
3. **Replace `coach_suggestions.py`** with an LLM call that generates context-aware suggestions
4. **Replace `readmission_risk.py`** with either:
   - A trained ML model (logistic regression minimum) on historical readmission data, OR
   - An LLM assessment with explicit confidence intervals
5. **Add guardrails**: Output validation, confidence thresholds, human-in-the-loop for HIGH/CRITICAL
6. **Add fallback**: If LLM fails, fall back to current heuristic (which should be renamed honestly to `rule_based_scoring.py`)
7. **Fix NABH reports**: Remove fabricated 78% feedback rate. Either build a feedback mechanism or remove the metric.
8. **Fix trigger type mismatch**: Map `ai_risk` to actual symptom-based suggestion keys.
9. **Add medical disclaimer** to all AI-generated suggestions.
10. **Rename internal labels**: `trigger_type="ai_risk"` → `trigger_type="rule_based_risk"` until real AI is implemented.

---

## 7. Summary

| Metric | Value |
|---|---|
| Total "AI" features claimed | 4 (risk scoring, coach suggestions, readmission prediction, smart escalation) |
| Features using real AI | **0** |
| Features that are pure heuristics/fake | **4** |
| AI SDKs in dependencies | **0** |
| AI API keys configured | **0** |
| Fabricated compliance data | **1** (NABH feedback rate) |
| Marketing claims of "AI" | **12+ instances** across landing page, API docs, emails, internal labels |
| Severity | **CRITICAL** — False advertising, regulatory fraud risk, healthcare safety concern |

---

# Phase 8: Security Audit

**Task ID:** 8
**Scope:** 13 security-critical files + all routers + dependency manifests + .env files + codebase-wide secret/XSS/SQL scans
**Verdict:** **37 findings (5 Critical, 7 High, 14 Medium, 11 Low)** — System has strong foundations (bcrypt, Fernet encryption, RBAC, audit logging, PII encryption) but contains several production-blockers.

---

## CRITICAL Findings

### C-1. Hardcoded Default Admin Password in Production Startup Path
- **File:** `backend/app/main.py:44`
- **Detail:** `_ensure_admin_exists()` runs on EVERY app startup, including production. If no users exist in DB, it creates `admin@ojas.care` with password `admin123`. The password is also logged: `"✅ Default admin created: admin@ojas.care / admin123"` (line 52).
- **Impact:** If the DB is ever empty (fresh deploy, data loss), a publicly known credential grants SUPER_ADMIN access.
- **Remediation:** Remove the auto-admin-creation from the startup path entirely. Admin accounts must only be created via a one-time setup script that forces a password change on first login. Remove the plaintext password from log output.

### C-2. No HMAC Verification on WhatsApp Webhook POST
- **File:** `backend/app/routers/whatsapp.py:40-189`
- **Detail:** The POST `/whatsapp/webhook` endpoint accepts and processes inbound messages with zero authentication. No `X-Hub-Signature-256` validation. Anyone who discovers the webhook URL can forge WhatsApp messages to manipulate patient records, create fake escalations, and update check-in data.
- **Impact:** Attacker can inject false patient responses, trigger false critical escalations, or suppress real ones.
- **Remediation:** Implement HMAC-SHA256 verification of the request body using `X-Hub-Signature-256` header against `WHATSAPP_API_KEY` (or a dedicated app secret). Reject any request with invalid/missing signatures.

### C-3. Webhook Decrypts ALL Patient Records to Match Sender
- **File:** `backend/app/routers/whatsapp.py:82-94`
- **Detail:** `select(Patient)` loads ALL patients across ALL hospitals, then iterates and decrypts each `mobile` field with Fernet to compare with the sender number. This is an O(n) full-table-scan decryption on every webhook call.
- **Impact:** (a) Mass PII decryption on every webhook event, (b) cross-tenant data exposure (patients from other hospitals are loaded and decrypted in memory), (c) performance degradation at scale, (d) if an attacker spams the webhook, they can force decryption of all patient PII.
- **Remediation:** Add a deterministic `mobile_hash` column (e.g., HMAC-SHA256 of phone with a server key) that is NOT encrypted. Index this column and query directly: `WHERE mobile_hash = hmac_sha256(from_number)`. Never decrypt PII for lookup operations.

### C-4. Invite Endpoint Allows Arbitrary Role Assignment (Privilege Escalation)
- **File:** `backend/app/routers/superadmin.py:32-34`
- **Detail:** `InviteCreate.role` is typed as `str` with default `"HOSPITAL_ADMIN"` but NO validation. A superadmin (or anyone who gains superadmin access) can invite a user with `role=SUPER_ADMIN` via the API, creating additional superadmins.
- **Impact:** Privilege escalation chain — once superadmin is compromised, unlimited superadmins can be created.
- **Remediation:** Constrain role to `Literal["HOSPITAL_ADMIN", "COORDINATOR", "DOCTOR"]` in the Pydantic model. Never allow `SUPER_ADMIN` creation via invite.

### C-5. Seed Data Hardcoded Passwords Reachable via `/admin/seed-demo-data`
- **File:** `backend/app/main.py:169-206` + `backend/seed_data.py:44,81,97`
- **Detail:** The `/admin/seed-demo-data` endpoint (protected only by `HOSPITAL_MANAGE` permission, not `SUPER_ADMIN`) can trigger `seed()` which creates users with passwords `admin123`, `nurse123`, `doctor123`. Also leaks internal error details via `str(e)` in the 500 response.
- **Impact:** Any HOSPITAL_ADMIN can trigger seed data creation with known-credential accounts in any empty-DB scenario. Error leakage reveals internal stack traces.
- **Remediation:** (a) Guard this endpoint with `require_superadmin`, not `require_permission(HOSPITAL_MANAGE)`. (b) Remove from production entirely via environment guard. (c) Replace `str(e)` with a generic error message.

---

## HIGH Findings

### H-1. JWT Tokens Stored in localStorage (XSS-Stealable)
- **File:** `frontend/src/context/AuthContext.tsx:61-66`, `frontend/src/api/client.ts:18`
- **Detail:** Both `access_token` and `refresh_token` are stored in `localStorage`. Any XSS vulnerability (even in a third-party dependency) allows an attacker to steal both tokens.
- **Remediation:** Migrate to httpOnly, Secure, SameSite=Strict cookies for token storage. Set tokens via `Set-Cookie` headers from the backend.

### H-2. No Refresh Token Rotation
- **File:** `backend/app/routers/auth.py:129-174`
- **Detail:** The `/auth/refresh` endpoint issues a new access token but does NOT rotate the refresh token. The original refresh token remains valid for its full 7-day lifespan.
- **Impact:** If a refresh token is stolen, it can be used indefinitely (7 days) and there's no way to detect or revoke it without logging the user out entirely.
- **Remediation:** On refresh, revoke the old refresh token and issue a new one. Implement refresh token reuse detection (if a revoked token is reused, revoke all tokens for that user — indicates theft).

### H-3. No CSRF Protection
- **Files:** `backend/app/main.py` (no CSRF middleware), `frontend/src/api/client.ts` (no CSRF token)
- **Detail:** While Bearer token auth reduces CSRF risk for JSON APIs, the app has no CSRF middleware at all. If any endpoint switches to cookie-based auth or if the token is also sent via cookies, the app becomes fully vulnerable.
- **Remediation:** Add CSRF middleware (e.g., `fastapi-csrf-protect`). If migrating to httpOnly cookies (per H-1), CSRF protection becomes mandatory.

### H-4. Logout Revokes ALL User Refresh Tokens (Denial of Service)
- **File:** `backend/app/routers/auth.py:177-192`
- **Detail:** `DELETE FROM refresh_tokens WHERE user_id = uid` revokes ALL refresh tokens for the user, not just the current session's token. Additionally, the endpoint doesn't verify the access token is valid (uses `decode_token_safe` which skips expiry).
- **Impact:** (a) An attacker with an expired token can force-logout a legitimate user, (b) multi-device users lose all sessions.
- **Remediation:** Only revoke the specific refresh token associated with the current session. Verify the access token is valid before processing logout.

### H-5. Grievance Endpoint Has No Rate Limiting (Despite Comment Claiming Otherwise)
- **File:** `backend/app/routers/patients.py:546-589`
- **Detail:** Comment says "Public endpoint (no auth required) but rate-limited to prevent abuse" but no `@limiter.limit()` decorator is applied. The `Limiter` import is local but never used.
- **Impact:** Spam abuse of the grievance endpoint and DPO email flooding.
- **Remediation:** Add `@limiter.limit("5/minute")` decorator to the `create_grievance` endpoint.

### H-6. `/auth/verify-invite` is Public and Unrate-Limited
- **File:** `backend/app/routers/auth.py:195-203`
- **Detail:** Accepts a raw `token: str` query parameter (not Pydantic model). No rate limiting. Can be used to enumerate valid invite tokens.
- **Impact:** Invite token enumeration — an attacker can brute-force invite tokens to discover valid ones.
- **Remediation:** (a) Accept token in a Pydantic model with validation, (b) add rate limiting, (c) return generic "invalid or expired" for both used and non-existent tokens (currently does this correctly for used tokens but reveals valid vs. non-existent).

### H-7. No Security Headers (Missing HSTS, X-Frame-Options, CSP)
- **File:** `backend/app/main.py`
- **Detail:** No security header middleware. Missing: `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy`.
- **Remediation:** Add `starlette-secure-headers` or a custom middleware to set all OWASP-recommended security headers.

---

## MEDIUM Findings

### M-1. python-jose Library is Unmaintained
- **File:** `backend/requirements.txt:7` — `python-jose==3.3.0`
- **Detail:** `python-jose` has had no meaningful updates since 2021 and has known issues. The Python community recommends `PyJWT` as the replacement.
- **Remediation:** Migrate from `python-jose` to `PyJWT>=2.8.0` with `cryptography` backend.

### M-2. `.env.example` Contains Non-Random Salt Value
- **File:** `backend/.env.example:15` — `ENCRYPTION_SALT=ojas-salt-2026`
- **Detail:** If a deployer copies `.env.example` to `.env` without changing the salt, all Fernet encryption uses a predictable key.
- **Remediation:** Replace with a placeholder like `ENCRYPTION_SALT=` (empty) or `ENCRYPTION_SALT=CHANGE-ME-generate-with-openssl-rand-base64-16`.

### M-3. Contact Form Email Logged in Plaintext
- **File:** `backend/app/routers/contact.py:16`
- **Detail:** `logging.info(f"Contact form from {form.email} at {form.hospital_name}")` — PII (email, hospital name) logged to application logs.
- **Remediation:** Log only a hashed/abbreviated form: `logging.info(f"Contact form received from {form.email[:3]}***")`.

### M-4. `print()` Used for Logging in Production Code Paths
- **Files:** `backend/app/routers/whatsapp.py:97,114,127,187,236`, `backend/app/routers/patients.py:134,339,584`
- **Detail:** Multiple `print()` calls for logging in production paths (webhook handler, patient creation). `print()` bypasses structured logging, doesn't respect log levels, and may leak to uncontrolled stdout.
- **Remediation:** Replace all `print()` calls with `logger.info()` / `logger.warning()` / `logger.error()` using the module-level logger.

### M-5. Invite Token and Link Returned in API Response
- **File:** `backend/app/routers/superadmin.py:154-158`
- **Detail:** `return {"message": "Invite created", "token": token, "link": invite_link}` — the invite token is returned in the HTTP response body. If the superadmin's session is compromised, all pending invite tokens are exposed.
- **Remediation:** Remove `token` and `link` from the response. The invite should only be sent via email.

### M-6. No Password Change or Reset Functionality
- **Detail:** No `/auth/change-password` or `/auth/reset-password` endpoint exists. The email service template references a password reset link but the endpoint is not implemented.
- **Remediation:** Implement password change (authenticated) and password reset (email-based token flow) endpoints. Password change should require current password verification.

### M-7. `status` Query Parameter in `list_patients` Not Validated
- **File:** `backend/app/routers/patients.py:156`
- **Detail:** `status: str = None` accepts any string. While SQLAlchemy parameterizes (no SQL injection), invalid values silently return empty results instead of 422 errors.
- **Remediation:** Add `status: Optional[str] = Query(None, pattern="^(ACTIVE|COMPLETED|ESCALATED|NO_REPLY|ANONYMIZED)$")`.

### M-8. `status` Query Parameter in `list_escalations` Not Validated
- **File:** `backend/app/routers/escalations.py:30`
- **Detail:** Same issue as M-7 — `status: str = "OPEN"` with no validation.
- **Remediation:** Add pattern validation: `pattern="^(OPEN|RESOLVED)$"`.

### M-9. `limit` Parameter in `list_escalations` Not Bounded
- **File:** `backend/app/routers/escalations.py:31`
- **Detail:** `limit: int = 50` has no maximum bound. An attacker can request `limit=999999` to extract all data.
- **Remediation:** Add `le=500` or similar maximum.

### M-10. `limit` Parameter in `list_patients` Not Bounded
- **File:** `backend/app/routers/patients.py:157`
- **Detail:** `limit: int = 20` — same unbounded issue.
- **Remediation:** Add `le=100`.

### M-11. `limit` Parameter in `get_audit_logs` Not Bounded
- **File:** `backend/app/routers/superadmin.py:166`
- **Detail:** `limit: int = 100` — unbounded.
- **Remediation:** Add `le=500`.

### M-12. `page` Parameter in `list_patients` Not Validated for Negative Values
- **File:** `backend/app/routers/patients.py:157`
- **Detail:** `page: int = 1` accepts 0 or negative values, causing unexpected `OFFSET` behavior.
- **Remediation:** Add `ge=1`.

### M-13. Health Check Exposes Environment Name
- **File:** `backend/app/main.py:163`
- **Detail:** `"environment": settings.ENVIRONMENT` — reveals whether the system is in production or development mode.
- **Remediation:** Remove `environment` from health check response or return only `"status"`. Health checks should not leak infrastructure details.

### M-14. `dangerouslySetInnerHTML` in Chart Component
- **File:** `frontend/src/components/ui/chart.tsx:83-84`
- **Detail:** Uses `dangerouslySetInnerHTML` to inject CSS. Current content is derived from the static `THEMES` constant, NOT user input, so the actual XSS risk is low. However, if the THEMES constant is ever modified to include dynamic data, this becomes an XSS vector.
- **Remediation:** This is acceptable for the current static implementation but add a code comment warning that no user-supplied data must ever be inserted into this template.

---

## LOW Findings

### L-1. No Password Complexity Requirement on Admin Auto-Create
- **File:** `backend/app/main.py:44`
- **Detail:** Default password `admin123` fails the application's own password policy (8+ chars, uppercase, lowercase, digit). The `InviteAcceptRequest` validator enforces this, but the admin auto-creation bypasses it.
- **Remediation:** See C-1. Remove auto-creation entirely.

### L-2. Access Token Does Not Include `jti` (Token ID)
- **File:** `backend/app/core/security.py:27-36`
- **Detail:** Access tokens lack a unique `jti` claim, making it impossible to implement token revocation or blacklist.
- **Remediation:** Add `"jti": str(uuid.uuid4())` to access token payload. Implement a token blacklist for logout.

### L-3. No `iss` (Issuer) Claim in JWT
- **File:** `backend/app/core/security.py:27-36,39-48`
- **Detail:** Neither access nor refresh tokens include an `iss` claim, making cross-service token confusion possible if multiple services share the same SECRET_KEY.
- **Remediation:** Add `"iss": "ojas-api"` to token payloads.

### L-4. `RESET_KEY` in `.env.example`
- **File:** `backend/.env.example:49`
- **Detail:** `RESET_KEY=only-for-local-dev-never-in-production` — while not used in any code path currently, its presence suggests a planned database reset endpoint. If implemented, it could be catastrophic.
- **Remediation:** Remove from `.env.example` entirely. If a reset mechanism is needed, use a one-time signed token.

### L-5. Missing `audit_logs` `details` Field in Audit Log Response
- **File:** `backend/app/routers/superadmin.py:172-181`
- **Detail:** The `details` dict is stored in the DB but not returned in the audit log listing, reducing investigative capability.
- **Remediation:** Include `details` in the response (may need PII filtering).

### L-6. `surgery_type` Not Encrypted
- **File:** `backend/app/routers/patients.py:95`
- **Detail:** `surgery_type` is stored in plaintext while similar clinical fields like `doctor_name` are encrypted. Surgery type could be considered health-related PII.
- **Remediation:** Evaluate if `surgery_type` and `doctor_specialty` should be encrypted for DPDPA compliance.

### L-7. `preferred_language` Accepts Any String Without Validation
- **File:** `backend/app/routers/patients.py:42`
- **Detail:** `preferred_language: str = Field(default="en")` — no validation against a list of supported languages.
- **Remediation:** Add a validator or use `Literal["en", "hi"]`.

### L-8. No Token Expiry Warning on Frontend
- **File:** `frontend/src/context/AuthContext.tsx`
- **Detail:** No proactive token expiry check. Users only discover session expiry when a 401 occurs and they're redirected to login.
- **Remediation:** Add a timer that warns users ~1 minute before token expiry.

### L-9. `hospital_id` Query Param in Reports Not Validated as UUID
- **File:** `backend/app/routers/reports.py:25`
- **Detail:** `hospital_id: str = Query(None)` — validated later via `uuid.UUID()` which throws ValueError (caught by FastAPI as 422), but the error message may leak internal details.
- **Remediation:** Accept as `str` but validate early with a clear error message.

### L-10. No `SameSite` Cookie Policy Documented
- **Detail:** While the app currently uses Bearer tokens (not cookies), the migration to httpOnly cookies (recommended in H-1) must include `SameSite=Strict` and `Secure` flags.
- **Remediation:** Document cookie policy for the planned migration.

### L-11. Seed Data Uses `password[:72]` Truncation Instead of SHA-256 Pre-Hash
- **File:** `backend/seed_data.py:13-14`
- **Detail:** `safe_hash()` truncates password to 72 bytes before bcrypt, while the main `security.py` uses SHA-256 pre-hash for long passwords. Inconsistent approach.
- **Remediation:** Use the same `_safe_password()` / `get_password_hash()` from `security.py` instead of a custom truncation.

---

## Summary Scorecard

| Area | Status | Notes |
|---|---|---|
| Authentication (JWT) | ✅ Good | bcrypt + HS256, short expiry (15min), type-discriminated tokens |
| Token Storage | ❌ Bad | localStorage (XSS-vulnerable), no httpOnly cookies |
| Token Rotation | ❌ Missing | No refresh token rotation |
| RBAC | ✅ Good | Permission-based, DB-verified, tenant-scoped |
| PII Encryption at Rest | ✅ Good | Fernet (AES-128-CBC) with PBKDF2 key derivation, 480K iterations |
| SQL Injection | ✅ Safe | All queries use SQLAlchemy ORM; one `text("SELECT 1")` is hardcoded |
| XSS | ✅ Low Risk | React auto-escapes; one `dangerouslySetInnerHTML` uses only static data |
| CSRF | ❌ Missing | No CSRF middleware |
| CORS | ✅ Good | Restricted to configured origins, not `*` |
| Rate Limiting | ⚠️ Partial | Login (5/min) and refresh (10/min) are limited; grievance and verify-invite are not |
| Input Validation | ⚠️ Partial | Pydantic models used, but some query params lack validation |
| Secrets Management | ⚠️ Partial | Env vars with production guard, but hardcoded admin password in startup |
| Audit Logging | ✅ Good | Non-fatal, covers key operations, includes IP/UA |
| Error Leakage | ⚠️ Partial | Most errors return generic messages; seed-demo-data leaks `str(e)` |
| Security Headers | ❌ Missing | No HSTS, CSP, X-Frame-Options |
| WhatsApp Webhook Auth | ❌ Critical | No HMAC signature verification |
| File Upload | N/A | No file upload endpoints |
| Dependencies | ⚠️ Watch | python-jose unmaintained; otherwise recent versions |
| Broken Access Control | ⚠️ Partial | Webhook bypasses tenant isolation; invite allows arbitrary role |

## Priority Remediation Order

1. **C-2 + C-3**: WhatsApp webhook HMAC verification + indexed lookup hash (prevents data exfiltration and manipulation)
2. **C-1**: Remove hardcoded admin password from production startup path
3. **C-4**: Validate invite role to prevent privilege escalation
4. **H-1**: Migrate tokens from localStorage to httpOnly cookies
5. **H-2**: Implement refresh token rotation
6. **H-7**: Add security headers middleware
7. **H-3 + H-5 + H-6**: CSRF protection, rate limit grievance + verify-invite
8. **C-5**: Tighten seed-demo-data guard to SUPER_ADMIN only

---

# Phase 9: Performance Audit

**Task ID:** 9
**Scope:** Bundle size, lazy loading, caching, DB efficiency, API patterns, Docker optimization, dependency audit

---

## 9.1 Bundle Size & Code Splitting

| Check | Status | Details |
|-------|--------|---------|
| Manual chunks | ✅ Good | 5 chunks: vendor, charts, query, ui (lucide), utils (date-fns+axios) |
| CSS code splitting | ✅ Good | `cssCodeSplit: true` in vite config |
| Source maps in prod | ✅ Good | Disabled when `NODE_ENV=production` |
| framer-motion | ⚠️ Medium | ~35KB gzipped, imported in 6 files (App, Login, Landing, Enrollment, Hospitals, Reports, Sidebar, Header) — NOT in a separate chunk. Should be added as `motion: ['framer-motion']` manual chunk |

### Unused npm Dependencies (Dead Code)

| Package | Size (approx) | Used? | Recommendation |
|---------|---------------|-------|----------------|
| `date-fns` | ~72KB raw / ~15KB gzipped | ❌ Never imported in any source file | **Remove** |
| `react-hook-form` | ~25KB raw | ❌ Only in shadcn `form.tsx` wrapper, never imported by any page/component | **Remove** |
| `@hookform/resolvers` | ~5KB raw | ❌ Only in shadcn `form.tsx`, never used in app | **Remove** |
| `embla-carousel-react` | ~18KB raw | ❌ Only in shadcn `carousel.tsx`, never imported by app | **Remove** |
| `vaul` | ~12KB raw | ❌ Only in shadcn `drawer.tsx`, never imported by app | **Remove** |
| `react-day-picker` | ~40KB raw | ❌ Only in shadcn `calendar.tsx`, never imported by app | **Remove** |
| `react-resizable-panels` | ~10KB raw | ❌ Only in shadcn `resizable.tsx`, never imported by app | **Remove** |
| `input-otp` | ~8KB raw | ❌ Only in shadcn `input-otp.tsx`, never imported by app | **Remove** |
| `cmdk` | ~15KB raw | ❌ Only in shadcn `command.tsx`, never imported by app | **Remove** |
| `zod` | ~13KB raw | ✅ Used in LandingPage | Keep |

**Impact:** Removing these 9 unused packages + their shadcn wrapper files would save an estimated **~220KB raw / ~50KB gzipped** from the production bundle.

**Severity:** 🔴 HIGH — significant unnecessary bundle bloat

---

## 9.2 Lazy Loading & Route Splitting

| Check | Status | Details |
|-------|--------|---------|
| Route-level lazy loading | ✅ Good | All 13 page components use `React.lazy()` + `Suspense` |
| Eager layout imports | ✅ Good | Only `Header` and `Sidebar` are eagerly loaded (correct — needed for every authenticated page) |

---

## 9.3 Image Optimization

| Check | Status | Details |
|-------|--------|---------|
| Static images | ✅ N/A | No static image files found in the repository. All icons are from `lucide-react` (SVG, tree-shakeable) |

---

## 9.4 Memoization

| Check | Status | Details |
|-------|--------|---------|
| AuthContext | ✅ Good | `useMemo` for context value, `useCallback` for login/logout |
| UI primitives (shadcn) | ✅ Good | `useCallback`/`useMemo` in carousel, sidebar, slider |
| Page components | ❌ Missing | **Zero** page components use `React.memo`, `useMemo`, or `useCallback`. Dashboard performs 12+ `.filter()` calls on every render with no memoization |
| Dashboard filters | 🔴 Critical | `riskDistribution`, `statusDistribution`, `recoveryTrend`, `highRiskPatients`, `recentPatients` — all computed via `.filter()` on every render. Should be wrapped in `useMemo` |

**Severity:** 🟡 MEDIUM — affects Dashboard re-render performance with large patient lists

---

## 9.5 Database Efficiency

### P-1: CRITICAL — WhatsApp Webhook Full Table Scan + Decrypt-All
**File:** `backend/app/routers/whatsapp.py:82-93`
```python
result = await db.execute(select(Patient))  # NO WHERE CLAUSE
all_patients = result.scalars().all()
for p in all_patients:
    decrypted_mobile = decrypt_field(p.mobile)  # Decrypts EVERY patient
```
This loads ALL patients into memory and decrypts every mobile number for every incoming WhatsApp message. At scale (10K+ patients), this will timeout and is a severe performance + security issue.

**Recommendation:** Add a `mobile_lookup_hash` column (HMAC of phone number, indexed). Query: `SELECT * FROM patients WHERE mobile_lookup_hash = :hash LIMIT 1`. Eliminates full scan and decryption loop.

**Severity:** 🔴 CRITICAL

### P-2: N+1 Query — Hospital List with Patient Counts
**File:** `backend/app/routers/superadmin.py:69-83`
```python
for h in hospitals:
    patient_count = await db.execute(
        select(func.count()).select_from(Patient).where(Patient.hospital_id == h.id)
    )
```
One query per hospital to count patients. With 50 hospitals = 51 queries.

**Recommendation:** Single query with GROUP BY:
```python
counts = await db.execute(
    select(Patient.hospital_id, func.count()).group_by(Patient.hospital_id)
)
```

**Severity:** 🟡 MEDIUM

### P-3: Double Commits
**Files:** `patients.py:136+145`, `patients.py:341+350`, `auth.py:104+113`
Two sequential `await db.commit()` calls in create_patient (one for data, one after log_audit). Each commit requires a database round-trip and disk flush.

**Recommendation:** Single commit after both the data changes and audit log are added.

**Severity:** 🟡 LOW-MEDIUM

### Connection Pool Configuration
| Setting | Value | Assessment |
|---------|-------|------------|
| `pool_size` | 5 (default) | ✅ Adequate for current scale |
| `max_overflow` | 0 (default) | ⚠️ No burst capacity — under load spikes, requests will queue |
| `pool_recycle` | 1800 (30 min) | ✅ Good |
| `pool_pre_ping` | True | ✅ Good — detects stale connections |

**Note:** `DATABASE_POOL_SIZE` and `DATABASE_MAX_OVERFLOW` are configurable via env vars but default to 5/0. For production, recommend `pool_size=10, max_overflow=20` (already documented in comments).

---

## 9.6 API Latency Patterns

### A-1: Dashboard Fetches 100 Patients
**File:** `frontend/src/pages/Dashboard.tsx:23`
```typescript
const { data: patientsData } = usePatients('', 1, 100)
```
Dashboard requests 100 patients just to show stats and 5 recent patients. All stats (counts, risk distribution, averages) should be computed server-side.

**Recommendation:** Create `/dashboard/stats` endpoint that returns pre-computed aggregates. Reduce patient fetch to 5 most-recent only.

**Severity:** 🟡 MEDIUM

### A-2: Client-Side Search on Paginated Data
**File:** `frontend/src/pages/PatientList.tsx:20-24`
```typescript
const filteredPatients = patients.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) || ...
)
```
Search is performed on already-paginated results (20 items). If user searches, they only search the current page, not all patients.

**Recommendation:** Move search to the backend with a `?search=` query parameter.

**Severity:** 🟡 MEDIUM (functional bug + performance)

---

## 9.7 Caching

| Check | Status | Details |
|-------|--------|---------|
| Redis infrastructure | ✅ Good | Client with fallback to in-memory cache, cleanup task |
| `@cache_result` decorator | ❌ Unused | Decorator is defined in `redis.py` but **zero** endpoints use it |
| React Query cache | ✅ Good | 5-minute staleTime, refetchOnWindowFocus disabled |
| `useMeQuery` | ✅ Good | `staleTime: Infinity` — user data only fetched once |

**Recommendation:** Apply `@cache_result` to `list_hospitals`, `get_audit_logs`, and dashboard stats endpoint (when created).

**Severity:** 🟡 MEDIUM — caching infrastructure exists but is completely unused

---

## 9.8 Compression

| Check | Status | Details |
|-------|--------|---------|
| Gzip (backend) | ✅ Good | `GZipMiddleware(minimum_size=1000)` in `main.py` |
| Brotli | ❌ Missing | No brotli compression. Vercel handles this for frontend, but self-hosted deployments won't get it. |
| Vite build compression | ❌ Missing | No `vite-plugin-compression` to pre-compress static assets |

**Recommendation:** Add `vite-plugin-compression` (brotli + gzip) to generate `.br`/`.gz` files at build time.

**Severity:** 🟢 LOW — Vercel handles compression; only matters for self-hosted

---

## 9.9 Duplicate Requests

| Check | Status | Details |
|-------|--------|---------|
| React Query dedup | ✅ Good | Same queryKey prevents duplicate fetches |
| Token refresh queue | ✅ Good | Queues concurrent 401 retries during refresh |
| Parallel same-route fetches | ✅ Good | No obvious duplicate calls |

---

## 9.10 Request Waterfalls

| Check | Status | Details |
|-------|--------|---------|
| Auth → Data | ✅ Good | `useMeQuery` with `staleTime: Infinity` avoids repeated auth checks |
| Dashboard parallel | ✅ Good | `usePatients` and `useEscalations` fire in parallel |
| Login redirect | ⚠️ Minor | `useLogout()` calls `api.post('/auth/logout')` then does `window.location.href = '/login'` (hard navigation) — acceptable for logout |

---

## 9.11 Memory Leaks

| Check | Status | Details |
|-------|--------|---------|
| Event listener cleanup | ✅ Good | All `useEffect` with `addEventListener` have proper cleanup returns (LandingPage scroll, Header mousedown, sidebar keydown, use-mobile matchMedia) |
| Timer cleanup | ✅ Good | `setTimeout` calls are fire-and-forget (appropriate for animations) |
| In-memory cache | ⚠️ Minor | `_in_memory_cache` dict grows unbounded until cleanup task runs (every 5 min). No max-size limit. |

**Severity:** 🟢 LOW

---

## 9.12 Render Performance

| Check | Status | Details |
|-------|--------|---------|
| Missing keys | ✅ Good | All `.map()` calls use proper keys (patient.id, tab.value, e.id, c.day) |
| AnimatePresence | ⚠️ Minor | `mode="wait"` on page transitions causes exit animation before enter — adds 300ms delay to every navigation. Consider `mode="popLayout"` or removing for snappier navigation. |
| Page transition on every route | ⚠️ Minor | `PageTransition` wraps all routes including non-authenticated ones (landing, login). The 300ms fade animation on login page feels sluggish. |
| Large list rendering | ⚠️ Minor | No virtualization for patient list or escalation list. Not an issue at current scale (<100 items) but would be needed at 1000+. |

**Severity:** 🟢 LOW

---

## 9.13 Large Dependencies Assessment

| Package | Raw Size | Justified? | Notes |
|---------|----------|------------|-------|
| `recharts` | ~500KB | ✅ Yes | Actively used in Dashboard (3 charts) |
| `framer-motion` | ~150KB | ⚠️ Review | Used for page transitions + minor UI animations. Consider CSS transitions for page transitions to save ~35KB gzipped |
| `lucide-react` | Tree-shaken | ✅ Good | Named imports enable tree-shaking; manual chunk is appropriate |
| `reportlab` (backend) | ~5MB | ✅ Yes | Required for NABH PDF generation |
| `@radix-ui/*` (21 packages) | ~300KB raw | ⚠️ Review | Only ~12 are actually used in pages. The 9 unused ones (carousel, drawer, calendar, resizable, form, command, input-otp, context-menu, menubar, navigation-menu, aspect-ratio, hover-card, toggle-group, slider, radio-group, checkbox, collapsible, toggle) add dead weight even though tree-shaking should remove unused code |

---

## 9.14 Unused Packages Summary

**Confirmed unused in any page/component (only in dead shadcn wrappers):**
- `date-fns` — 0 imports
- `react-hook-form` + `@hookform/resolvers` — 0 imports in app code
- `embla-carousel-react` — 0 imports in app code
- `vaul` — 0 imports in app code
- `react-day-picker` — 0 imports in app code
- `react-resizable-panels` — 0 imports in app code
- `input-otp` — 0 imports in app code
- `cmdk` — 0 imports in app code

**Dead shadcn UI wrapper files (safe to delete):**
- `carousel.tsx`, `drawer.tsx`, `calendar.tsx`, `resizable.tsx`, `form.tsx`, `command.tsx`, `input-otp.tsx`, `context-menu.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `aspect-ratio.tsx`, `hover-card.tsx`, `toggle-group.tsx`, `toggle.tsx`, `slider.tsx`, `radio-group.tsx`, `checkbox.tsx`, `collapsible.tsx`, `breadcrumb.tsx`, `kbd.tsx`, `button-group.tsx`, `item.tsx`, `pagination.tsx`, `input-group.tsx`

**Severity:** 🔴 HIGH — ~50KB gzipped wasted

---

## 9.15 Backend Performance

| Check | Status | Details |
|-------|--------|---------|
| Async patterns | ✅ Good | All DB operations use `async/await` with asyncpg |
| Python-Jose JWT | ⚠️ Slow | `python-jose` is pure Python and ~10x slower than `PyJWT` for token verification. Every authenticated request pays this cost. |
| Report generation | ⚠️ Blocking | `reportlab` PDF generation is synchronous. Should use `asyncio.to_thread()` or a background task. |
| Audit logging | ✅ Good | Non-fatal, doesn't block response (though it does add latency due to double commit) |

---

## 9.16 Docker Optimization

| Check | Status | Details |
|-------|--------|---------|
| Multi-stage build | ❌ Missing | Single-stage build means the final image includes pip build artifacts, compilers, etc. |
| Layer caching | ✅ Good | `requirements.txt` copied before app code — dependency layer is cached |
| `--no-cache-dir` | ✅ Good | Reduces image size by not keeping pip cache |
| Non-root user | ✅ Good | Runs as `ojas` user |
| Health check | ✅ Good | Configured with reasonable intervals |
| Base image | ⚠️ Okay | `python:3.11-slim` is acceptable but `python:3.11-alpine` would be ~30% smaller (requires different pip install flags) |

**Recommendation:** Add multi-stage build:
```dockerfile
FROM python:3.11-slim AS builder
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.11-slim
COPY --from=builder /root/.local /root/.local
COPY . .
...
```

**Severity:** 🟡 MEDIUM — larger image size (~200MB vs ~100MB with multi-stage)

---

## 9.17 Vite / Static Asset Optimization

| Check | Status | Details |
|-------|--------|---------|
| Path alias | ✅ Good | `@` → `./src` configured |
| CSS code split | ✅ Good | `cssCodeSplit: true` |
| Build target | ✅ Default | Modern browsers |
| Asset inlining threshold | Default (4KB) | ✅ Acceptable |
| Pre-compressed assets | ❌ Missing | No `vite-plugin-compression` for .gz/.br |
| Image optimization plugin | N/A | No images in project |

---

## 9.18 Additional Findings

### EN-1: Enrollment Page Uses Mock API
**File:** `frontend/src/pages/Enrollment.tsx:102`
```typescript
await new Promise((r) => setTimeout(r, 1500)) // Mock
```
The enrollment form doesn't actually call the backend API. The real `useCreatePatient` hook exists in `hooks.ts` but is not used.

**Severity:** 🔴 HIGH — feature is non-functional in production

### EN-2: `next-themes` in Non-Next.js App
Using `next-themes` in a Vite/React SPA works but adds unnecessary dependency. A simple `document.documentElement.classList.toggle('dark')` wrapper would achieve the same with zero dependencies.

**Severity:** 🟢 LOW — works fine, minimal overhead

### EN-3: `lucide-react` in Manual Chunk
The `ui: ['lucide-react']` manual chunk forces ALL of lucide-react into one chunk, potentially defeating tree-shaking. Since only ~15 icons are actually imported, the tree-shaken chunk should be much smaller. Consider removing `lucide-react` from `manualChunks` and letting Rollup's tree-shaking handle it.

**Severity:** 🟢 LOW

---

## Summary: Issues by Severity

### 🔴 CRITICAL (1)
| ID | Issue | Impact |
|----|-------|--------|
| P-1 | WhatsApp webhook loads + decrypts ALL patients | O(n) time per message, will timeout at scale, data exposure risk |

### 🔴 HIGH (3)
| ID | Issue | Impact |
|----|-------|--------|
| Unused deps | 9 npm packages + 24 shadcn wrappers never used | ~50KB gzipped wasted bandwidth |
| EN-1 | Enrollment page uses mock API, not real backend | Feature is non-functional in production |
| Framer-motion | Not in separate chunk, adds 35KB to initial load | Slower initial page load |

### 🟡 MEDIUM (7)
| ID | Issue | Impact |
|----|-------|--------|
| P-2 | N+1 query in hospital list | Linear query growth with hospitals |
| P-3 | Double commits in 3 endpoints | Extra DB round-trips per request |
| A-1 | Dashboard fetches 100 patients for stats | Unnecessary data transfer |
| A-2 | Client-side search on paginated data | Broken search UX |
| Caching | Redis `@cache_result` defined but unused | Missing cache hits for repeated queries |
| Docker | No multi-stage build | ~2x larger Docker image |
| Dashboard memo | No useMemo on computed values | Unnecessary re-computations |

### 🟢 LOW (6)
| ID | Issue | Impact |
|----|-------|--------|
| AnimatePresence | 300ms delay on all route changes | Perceived slowness |
| Virtualization | No list virtualization | Not needed at current scale |
| Brotli | No brotli pre-compression | Vercel handles this |
| next-themes | Unnecessary dep for dark mode | Minimal overhead |
| lucide chunk | Manual chunk may prevent tree-shaking | Minor bundle size |
| Memory leak risk | In-memory cache unbounded | Cleanup task mitigates |

---

## Recommended Priority Order for Performance Fixes

1. **P-1**: Add `mobile_lookup_hash` column to patients table + indexed query in WhatsApp webhook
2. **EN-1**: Wire enrollment form to real `useCreatePatient` hook
3. **Unused deps**: Remove 9 unused packages + 24 dead shadcn wrapper files
4. **A-1**: Create `/dashboard/stats` server-side aggregation endpoint
5. **P-2**: Replace N+1 hospital count queries with single GROUP BY query
6. **Caching**: Apply `@cache_result` to hospital list and audit logs
7. **P-3**: Consolidate double commits to single commit per request
8. **Docker**: Add multi-stage build
9. **Dashboard memo**: Add `useMemo` for computed statistics
10. **A-2**: Move patient search to backend query parameter

