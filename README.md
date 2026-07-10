<div align="center">

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:0f766e,50:0d9488,100:14b8a6&height=220&section=header&text=Ojas%20HealthTech&fontSize=64&fontColor=ffffff&fontAlignY=35&desc=Multi-Tenant%20%7C%20NABH-Compliant%20%7C%20AI-Powered%20Post-Discharge%20Recovery%20Platform&descAlignY=58&descSize=16&animation=fadeIn"/>

<br/>

<img src="https://img.shields.io/badge/version-2.0-0d9488?style=for-the-badge&labelColor=0f172a" alt="version"/>
<img src="https://img.shields.io/badge/API-3.0.0-14b8a6?style=for-the-badge&labelColor=0f172a" alt="api version"/>
<img src="https://img.shields.io/badge/license-BUSL_1.1-f59e0b?style=for-the-badge&labelColor=0f172a" alt="license"/>
<img src="https://img.shields.io/badge/status-active_development-22c55e?style=for-the-badge&labelColor=0f172a" alt="status"/>

<br/><br/>

**Ojas HealthTech** is a multi-tenant SaaS platform that lets hospitals monitor patients for 14 days after discharge — automatically, over WhatsApp — using AI-driven risk scoring, a coordinator-facing escalation console, and one-click NABH compliance reporting.

V2 rebuilds the platform on a real multi-tenant foundation: a Super Admin control plane, hospital-scoped data isolation, invite-based onboarding, full audit logging, and a hardened, production-shaped FastAPI + TypeScript stack.

<br/>

[🌐 Live App](https://ojas-v2.vercel.app) · [🐛 Report Bug](https://github.com/shivamim/Ojas-V2/issues) · [💡 Request Feature](https://github.com/shivamim/Ojas-V2/issues)

</div>

<br/>

## 📋 Table of Contents

- [🆕 What's New in V2](#-whats-new-in-v2)
- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🧰 Tech Stack](#-tech-stack)
- [🚀 Quick Start](#-quick-start)
- [🔑 Demo Access](#-demo-access)
- [⚙️ Configuration](#️-configuration)
- [📡 API Reference](#-api-reference)
- [🧠 AI Risk Engine](#-ai-risk-engine)
- [🔒 Security & Compliance](#-security--compliance)
- [🏢 Multi-Tenancy & Super Admin](#-multi-tenancy--super-admin)
- [🧪 Testing](#-testing)
- [☁️ Deployment](#️-deployment)
- [📁 Project Structure](#-project-structure)
- [🗺️ Roadmap](#️-roadmap)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

<br/>

## 🆕 What's New in V2

V1 proved the concept. V2 turns it into a platform a hospital chain could actually run on — the rewrite touches nearly every layer of the stack.

| Area | V1 | V2 |
|---|---|---|
| **Frontend language** | JavaScript (`.jsx`) | Full TypeScript rewrite (`.tsx`, strict mode) |
| **UI system** | Hand-rolled Tailwind components | Complete [shadcn/ui](https://ui.shadcn.com) component library (40+ primitives — dialogs, command palette, data tables, charts, forms) |
| **Tenancy model** | Single hospital, implicit scoping | True multi-tenant core: every query is scoped through `require_tenant()` + RBAC, with a dedicated **Super Admin** role that sits above all hospitals |
| **Onboarding** | Manual DB seeding | Token-based **hospital invite** flow (`HospitalInvite` model → email → `/accept-invite` page → scoped account creation) |
| **Observability** | None | Structured **audit log** on every privileged action (actor, IP, user agent, timestamp, success/failure) with a dedicated Super Admin viewer page |
| **Secrets handling** | Missing `SECRET_KEY`/`ENCRYPTION_KEY` silently auto-regenerated → **silently invalidated every issued JWT** on restart | Fails fast (`sys.exit(1)`) if secrets are missing in production — no more silent session wipes |
| **Data types** | `is_active` stored as `String` | Corrected to a proper `Boolean` column |
| **Audit timestamps** | Timezone-naive/aware mismatch bug | Fixed to consistent UTC handling |
| **Token refresh** | Race condition — concurrent 401s could double-fire refresh calls | Refresh calls are now queued; concurrent requests wait on a single in-flight refresh |
| **Caching** | None | Lightweight in-memory TTL cache (`app/core/cache.py`), designed as a drop-in swap for Redis when scaling to multiple instances |
| **Compression / headers** | Basic CORS only | Gzip + optional Brotli compression, CSP, HSTS, `X-Frame-Options`, `Permissions-Policy`, per-request `X-Request-ID` / `X-Process-Time` tracing |
| **Rate limiting** | Not implemented | `slowapi`-based limiter, configurable per environment |
| **Containerization** | Bare `uvicorn` only | Non-root, health-checked `Dockerfile` + `docker-compose.yml` for one-command local spin-up |
| **Uptime** | Manual | GitHub Actions **keep-alive workflow** pings `/health` every 10 minutes to defeat Render free-tier cold starts |
| **AI escalation help** | Risk score only | Dedicated **AI Coach** panel suggesting doctor-reviewable next actions per escalation trigger, with one-click copy |
| **Symptom detection** | English keywords only | Risk engine also scans for **Hindi/Hinglish** distress phrases (*bahut dard, khoon, chakkar, bukhar…*) — built for how Indian patients actually text |
| **Report integrity** | Standard PDF | NABH PDF reports are SHA-256 hashed at generation time for tamper-evidence |
| **Licensing** | Informal proprietary notice | Formal **Business Source License 1.1** with explicit production-use, healthcare-data, and IP terms |

<br/>

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 🔐 Security & Compliance
| Feature | Details |
|---|---|
| NABH Compliance | Automated COP 7.3, 7.3.1, 7.4, 5.6 reporting with SHA-256 report hash |
| Field Encryption | Patient PII (name, mobile, UHID, bed, doctor) encrypted at rest — AES via Fernet, key derived with PBKDF2-HMAC-SHA256 (480,000 iterations) |
| JWT Auth | 15-min access tokens, 7-day rotating refresh tokens (hashed at rest) |
| RBAC | 4-tier role hierarchy enforced via a typed `Permission` enum |
| Multi-Tenant Isolation | Every request resolves a `hospital_id` scope through `require_tenant()` |
| Audit Logging | IP, user agent, action, resource, and outcome on every privileged call |
| Rate Limiting | `slowapi` request throttling, tunable via `RATE_LIMIT` |
| Hardened Headers | CSP, HSTS, `X-Frame-Options: DENY`, `Permissions-Policy`, no-sniff |

</td>
<td width="50%" valign="top">

### 🤖 AI & Automation
| Feature | Details |
|---|---|
| Heuristic Risk Scoring | Weighted scoring on pain, fever, swelling, bleeding, breathing difficulty |
| Bilingual Keyword Detection | Flags English **and** Hindi/Hinglish distress phrases in free-text replies |
| Readmission Prediction | Age, surgery type, missed check-ins, open escalations, response rate |
| AI Coach Suggestions | Context-aware, copy-ready next actions per escalation trigger type |
| WhatsApp Automation | 360dialog Cloud API integration with automatic console-log simulation when no API key is set |
| 14-Day Protocol | Daily check-in schedule with automatic family-contact nudges on non-response |

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 📊 Dashboard & Analytics
| Feature | Details |
|---|---|
| Risk Distribution | Cohort-wide risk visualizations via Recharts |
| Escalation Board | OPEN → RESOLVED triage workflow with resolution notes |
| Patient Timeline | Full event history from enrollment through discharge day 14 |
| Response Tracking | Per-patient and hospital-wide engagement metrics |
| One-Click NABH PDFs | Generated server-side with ReportLab, hash-stamped |

</td>
<td width="50%" valign="top">

### 🏢 Admin & Platform
| Feature | Details |
|---|---|
| Super Admin Console | Create/manage hospitals platform-wide, outside any single tenant |
| Invite-Based Onboarding | Token invite → `/accept-invite` → scoped hospital account, no manual DB work |
| Audit Log Viewer | Searchable log of every privileged action across the platform |
| Marketing Landing Page | Public-facing `/` route for hospital-facing pitch/onboarding |
| Skeleton Loading States | Route-level code splitting with graceful loading UI throughout |

</td>
</tr>
</table>

<br/>

## 🏗️ Architecture

```
                          ┌───────────────────────────────────────────┐
                          │              OJAS HEALTHTECH               │
                          └───────────────────────────────────────────┘
                                 │                │                │
                                 ▼                ▼                ▼
                    ┌─────────────────┐ ┌──────────────────┐ ┌──────────────────┐
                    │   🌐 Frontend    │ │    ⚡ Backend      │ │   🐘 Database      │
                    │                  │─▶│                  │─▶│                  │
                    │ React 18 + TS    │ │ FastAPI (async)  │ │ PostgreSQL 15+   │
                    │ TanStack Query   │ │ SQLAlchemy 2.0   │ │ asyncpg pooler   │
                    │ shadcn/ui        │ │ Pydantic v2      │ │ AES-256 PII      │
                    │ Vite + Tailwind  │ │ slowapi limiter  │ │ Alembic-ready    │
                    └─────────────────┘ └──────────────────┘ └──────────────────┘
                                                 │
                          ┌──────────────────────┼──────────────────────┐
                          ▼                      ▼                      ▼
                ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
                │  💬 WhatsApp      │   │  🧠 AI Risk        │   │  📄 NABH Engine    │
                │  (360dialog)      │   │  + Coach Layer     │   │  (ReportLab PDF)   │
                └──────────────────┘   └──────────────────┘   └──────────────────┘

     Cross-cutting: RBAC (Permission enum) · Tenant scoping · Audit logging · TTL cache
```

**Request lifecycle:** every inbound request passes through CORS → compression → request-ID/timing middleware → security-header middleware → the router's `Depends(require_permission(...))` chain, which resolves the caller's identity from the JWT, checks the `Permission`, and scopes every DB query to `current_user.require_hospital()` — unless the caller is `SUPER_ADMIN`, who can cross tenant boundaries deliberately.

<br/>

## 🧰 Tech Stack

<table>
<tr>
<td width="50%" valign="top">

**Backend**
| | |
|---|---|
| Framework | FastAPI 0.115 (async) |
| ORM | SQLAlchemy 2.0 + asyncpg |
| Validation | Pydantic v2 / pydantic-settings |
| Auth | python-jose (JWT) + passlib/bcrypt |
| Encryption | `cryptography` (Fernet + PBKDF2HMAC) |
| PDF | ReportLab |
| Rate limiting | slowapi |
| Migrations | Alembic |
| Server | Uvicorn (standard) |

</td>
<td width="50%" valign="top">

**Frontend**
| | |
|---|---|
| Framework | React 18 + TypeScript (strict) |
| Build tool | Vite 5 |
| Data layer | TanStack Query 5 + Axios |
| Routing | React Router 6 (lazy-loaded routes) |
| UI kit | shadcn/ui on Radix primitives |
| Styling | Tailwind CSS + `tailwindcss-animate` |
| Forms | react-hook-form + Zod |
| Charts | Recharts |
| Icons | lucide-react |

</td>
</tr>
</table>

<br/>

## 🚀 Quick Start

### Prerequisites
✅ Node.js 18+ · ✅ Python 3.11+ · ✅ PostgreSQL 15+ (or let SQLite handle local dev automatically)

### ⚡ Backend

```bash
git clone https://github.com/shivamim/Ojas-V2.git
cd Ojas-V2/backend

python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# ✏️  Fill in DATABASE_URL, SECRET_KEY, ENCRYPTION_KEY (see Configuration below)

uvicorn app.main:app --reload --port 8000
```

Tables are created automatically on first boot, and demo data is seeded in the background the first time the `users` table is empty — no manual migration step needed for local dev.

### 🎨 Frontend

```bash
cd ../frontend
npm install

echo "VITE_API_URL=http://localhost:8000" > .env

npm run dev
```

### 🐳 Or: one-command backend via Docker

```bash
cd backend
docker compose up
```

💡 **Backend:** http://localhost:8000 · **Frontend:** http://localhost:5173 · **API Docs:** http://localhost:8000/docs *(disabled outside development)*

<br/>

## 🔑 Demo Access

On first boot against an empty database, the backend seeds a realistic demo dataset — one hospital, seven patients across escalation states, and three role-based logins:

| Role | Email | Password | Scope |
|---|---|---|---|
| Super Admin | `admin@ojas.care` | `admin123` | Full platform — all hospitals |
| Coordinator | `nurse@cityhospital.com` | `nurse123` | City Hospital only |
| Doctor | `dr.gupta@cityhospital.com` | `doctor123` | City Hospital only, read-mostly |

> ⚠️ These credentials exist **only** for local/demo databases. Never let this seed run against a production `DATABASE_URL` — rotate or remove `seed_data.py`'s trigger condition before going live with real patient data.

<br/>

## ⚙️ Configuration

All secrets are environment-driven. Never commit `.env` files.

### Backend

| Variable | Required | Description |
|---|:---:|---|
| `DATABASE_URL` | ✅ | PostgreSQL async connection string (`postgresql+asyncpg://…`). Defaults to local SQLite if unset. |
| `SECRET_KEY` | ✅ in prod | JWT signing secret — generate with `openssl rand -hex 32`. **Boot fails in production if missing.** |
| `ENCRYPTION_KEY` | ✅ in prod | Base key for patient PII encryption. **Boot fails in production if missing.** |
| `ENCRYPTION_SALT` | ✅ | PBKDF2 salt — **never rotate after go-live**, or all encrypted data becomes unreadable |
| `FRONTEND_URL` | ✅ | Comma-separable list of allowed CORS origins, no trailing slash |
| `ENVIRONMENT` | ✅ | `development` or `production` — gates `/docs`, CSP, and fail-fast secret checks |
| `RATE_LIMIT` | ❌ | e.g. `100/minute` (default) |
| `DATABASE_POOL_SIZE` / `DATABASE_MAX_OVERFLOW` | ❌ | SQLAlchemy pool tuning |
| `WHATSAPP_API_KEY` / `WHATSAPP_API_URL` | ❌ | 360dialog credentials — omit to run in console-simulation mode |

### Frontend

| Variable | Required | Description |
|---|:---:|---|
| `VITE_API_URL` | ✅ | Base URL of the FastAPI backend |

<br/>

## 📡 API Reference

Interactive Swagger docs are served at `/docs` (and `openapi.json` at `/openapi.json`) whenever `ENVIRONMENT` is not `production`. Endpoint paths are intentionally not enumerated in full here — use the live docs or the router source for exact request/response shapes.

| Domain | Prefix | Covers |
|---|---|---|
| Auth | `/auth` | Login, refresh, logout, invite verification/acceptance, current-user profile |
| Super Admin | `/superadmin` | Create/list hospitals, send hospital invites, view audit logs, database reset (dev) |
| Hospitals | `/hospitals` | Get/update the caller's own hospital profile |
| Patients | `/patients` | Enroll, list, detail view, submit a daily check-in |
| Escalations | `/escalations` | List with AI-suggested actions, resolve with notes |
| Reports | `/reports` | Generate the NABH compliance PDF for a date range |
| WhatsApp | `/whatsapp` | Trigger a check-in message, check delivery status |

**Auth flow**

```
Login → Access Token (15 min) + Refresh Token (7 days, hashed in DB)
   │
   ├── API calls via  Authorization: Bearer <access_token>
   └── On 401 → single in-flight refresh (concurrent requests queue) → re-login on failure
```

Every response carries `X-Request-ID`, `X-Process-Time`, and `X-API-Version` headers for tracing; requests slower than 500ms are logged server-side automatically.

<br/>

## 🧠 AI Risk Engine

Ojas doesn't call out to an LLM for triage — it uses fast, auditable, deterministic heuristics that a clinician can fully explain, which matters for a compliance-sensitive product.

**Per-check-in risk scoring** (`app/services/ai_scoring.py`) — additive point system across pain level, fever, swelling, bleeding, and breathing difficulty, *plus* a keyword scan across the patient's free-text reply in **both English and Hindi/Hinglish** (e.g. *bahut dard, khoon, chakkar, bukhar*), because that's how patients actually type on WhatsApp. Scores map to `LOW / MEDIUM / HIGH / CRITICAL`.

**Readmission risk** (`app/services/readmission_risk.py`) — a separate model weighing age, surgery type (cardiac and elderly-ortho weighted higher), missed check-ins, open escalations, and historical response rate.

**AI Coach** (`app/services/coach_suggestions.py`) — once an escalation is triggered, the coordinator sees a ranked list of concrete next actions (e.g. *"URGENT: ask patient to apply pressure — if active bleeding, send to emergency now"*), personalized with the assigned doctor's name, and copyable with one click from the `EscalationCoach` component.

<br/>

## 🔒 Security & Compliance

**Encryption at rest** — PII fields (name, mobile numbers, UHID, bed number, doctor name, hospital contact details) are encrypted with Fernet, keyed via PBKDF2-HMAC-SHA256 over 480,000 iterations.

> ⚠️ `ENCRYPTION_SALT` must remain constant for the lifetime of the database. Changing it without a full re-encryption pass renders existing patient data unreadable.

**Role hierarchy** — enforced through a typed `Permission` enum (`PATIENT_CREATE/READ/UPDATE/DELETE`, `REPORT_GENERATE`, `USER_MANAGE`, `HOSPITAL_MANAGE`), not string comparisons:

| Role | Patients | Reports | User Mgmt | Hospital Mgmt | Cross-Tenant |
|---|:---:|:---:|:---:|:---:|:---:|
| `SUPER_ADMIN` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `HOSPITAL_ADMIN` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `COORDINATOR` | Create/Read/Update | ❌ | ❌ | ❌ | ❌ |
| `DOCTOR` | Read only | ✅ | ❌ | ❌ | ❌ |

**Transport & headers** — HSTS, a strict Content-Security-Policy in production, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and a locked-down `Permissions-Policy` (camera, mic, geolocation, USB, payment all denied by default).

**Containers run as a non-root user**, with a Docker `HEALTHCHECK` against `/health` baked in.

<br/>

## 🏢 Multi-Tenancy & Super Admin

V2's core architectural shift is treating "which hospital does this belong to" as a first-class, enforced concept rather than an assumption.

- **Tenant scoping** — `app/core/tenant.py`'s `require_tenant()` resolves the caller's `hospital_id` from their JWT claims on every request. Non-superadmin callers without a resolvable hospital are rejected with a 403 before any query runs.
- **Onboarding without shell access** — a Super Admin creates a hospital, then issues a `HospitalInvite` (scoped role + expiring token). The invitee visits `/accept-invite`, sets a password, and lands with an account pre-scoped to the right hospital — no manual SQL, no shared credentials.
- **Full audit trail** — every privileged action writes an `AuditLog` row (actor, hospital, action, resource, IP, user agent, success/failure, arbitrary JSON detail). The Super Admin console exposes this as a searchable log at `/superadmin/audit`.
- **Platform view** — `/superadmin/hospitals` lists every tenant on the platform with bed count, NABH level, and plan type, independent of any single hospital's data.

<br/>

## 🧪 Testing

There is no automated test suite in this repository yet — this is the most notable gap between "impressive demo" and "production-hardened platform," and it's the top item on the roadmap below.

For now, verification is manual: seed data + `/docs` (Swagger) for backend endpoint checks, and `npm run lint` for frontend static checks. If you're contributing, `pytest` + `httpx.AsyncClient` on the backend and `Vitest` + `React Testing Library` on the frontend are the natural fits given the existing stack.

<br/>

## ☁️ Deployment

<table>
<tr>
<td width="33%" valign="top">

**⚡ Backend (Render)**
- Connect the GitHub repo
- `render.yaml` drives config (IaC) — root dir `backend`
- Health check: `GET /health`
- `SECRET_KEY` auto-generated by Render; everything else set manually in the dashboard

</td>
<td width="33%" valign="top">

**🌐 Frontend (Vercel)**
- Import the GitHub repo
- Set `VITE_API_URL`
- SPA rewrites already configured in `vercel.json`
- Currently live at [ojas-v2.vercel.app](https://ojas-v2.vercel.app)

</td>
<td width="33%" valign="top">

**🐘 Database (Supabase)**
- Create a Supabase project
- Use the **session/transaction pooler** URL
- Format: `postgresql+asyncpg://…`
- Enable RLS as your compliance posture requires

</td>
</tr>
</table>

**Cold-start mitigation** — `.github/workflows/keepalive.yml` pings the Render `/health` endpoint every 10 minutes via a scheduled GitHub Action, so the first real user request isn't the one paying Render's 30–90 second free-tier cold-boot cost. Set the `RENDER_BACKEND_URL` repo secret to your actual Render URL to activate it.

**Local/self-hosted backend** — `backend/Dockerfile` builds a non-root, health-checked image; `docker-compose.yml` wires it up with SQLite for a true one-command local environment with no Python setup required.

<br/>

## 📁 Project Structure

```
Ojas-V2/
├── backend/
│   ├── app/
│   │   ├── core/            # config, database, security, encryption, rbac, tenant, audit, cache
│   │   ├── models/           # SQLAlchemy models: user, hospital, hospital_invite, patient,
│   │   │                     #   checkin, escalation, timeline, whatsapp_log, refresh_token, audit_log
│   │   ├── routers/          # auth, superadmin, hospitals, patients, escalations, reports, whatsapp
│   │   ├── services/         # ai_scoring, readmission_risk, coach_suggestions, pdf_generator, whatsapp
│   │   ├── tasks/             # async WhatsApp task queue (Celery-ready)
│   │   └── main.py            # app factory, middleware, lifespan, exception handlers
│   ├── seed_data.py           # demo hospital + 7 patients + 3 role-based users
│   ├── Dockerfile / docker-compose.yml
│   ├── render_entrypoint.sh
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/               # Axios client (auto-refresh + request queuing), TanStack Query hooks
│   │   ├── components/        # EscalationCoach, RiskBadge, layout/ (Sidebar, TopBar, DashboardLayout)
│   │   ├── components/ui/     # shadcn/ui primitives (40+ components)
│   │   ├── context/            # AuthContext
│   │   ├── hooks/               # use-mobile, etc.
│   │   └── pages/                # LandingPage, Login, AcceptInvite, Dashboard, PatientList,
│   │                              #   PatientDetail, Enrollment, Escalations, Reports, Settings,
│   │                              #   SuperAdmin/Hospitals, SuperAdmin/AuditLogs, NotFound
│   └── vite.config.ts / vercel.json
│
├── .github/workflows/keepalive.yml
├── render.yaml
└── LICENSE
```

<br/>

## 🗺️ Roadmap

- [ ] Backend (`pytest`) and frontend (`Vitest`) test suites
- [ ] Inbound WhatsApp webhook receiver — currently replies are recorded via the check-in endpoint rather than parsed automatically from 360dialog callbacks
- [ ] Swap the in-memory cache for Redis when running more than one backend instance
- [ ] Promote `whatsapp_tasks.py` from async-simulated to a real Celery/queue worker for scale
- [ ] Alembic migration history (schema is currently created via `create_all` on boot)

<br/>

## 🤝 Contributing

Contributions from healthcare technologists, security researchers, and designers are welcome — within the bounds of the license below (no production/patient-data use without a commercial agreement).

```bash
git checkout -b feature/your-feature-name
git commit -m 'feat: add your feature description'
git push origin feature/your-feature-name
```

Open a pull request against `main`. By submitting a PR you agree to the contribution terms in Section 7 of the LICENSE.

<br/>

## 📄 License

**Business Source License 1.1** — free for personal use, education, and non-production evaluation. A commercial license is required for any production use: serving real patients, hosting as SaaS, processing real PHI/PII, or embedding in a sold product. Full terms in [`LICENSE`](./LICENSE).

- **Change date:** May 1, 2030 → automatically relicensed under Apache 2.0
- **Healthcare data:** production PHI use additionally requires DPDPA 2023 compliance, NABH accreditation (or equivalent), and a signed Data Processing Agreement
- **Governing law:** India; disputes via arbitration in Gurugram, Haryana

For a commercial license: **shivam.shukla1688@gmail.com**

<br/>

<div align="center">

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:14b8a6,50:0d9488,100:0f766e&height=120&section=footer"/>

Built with ❤️ for better patient outcomes across India

**© 2026 Shivam Shukla · Ojas HealthTech.** All rights reserved.

</div>
