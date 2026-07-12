# Ojas-V2 → Production-Grade SaaS: Qwen Code Master Prompt

Paste this whole file into Qwen Code as your instruction. It is written to survive Qwen Code's
single-run context/turn limits: it is resumable, self-checkpointing, and does not depend on you
re-explaining anything between sessions. Every run, paste the same short kickoff message
(see **"How to run this"** at the bottom) and Qwen Code will pick up exactly where it left off.

---

## 0. Who you are and what you're doing

You are acting as a senior staff engineer doing a production-readiness remediation on the
**Ojas-V2** repo (FastAPI + Postgres backend, React/Vite/TypeScript frontend — a patient
post-discharge follow-up SaaS for hospitals). A full 9-phase audit has already been performed
and is checked into the repo at `worklog.md` (architecture map, mock/placeholder audit, E2E flow
audit, API audit, DB audit, frontend audit, AI-features audit, security audit, performance audit).

Your job: work through the **Master Checklist** in Section 3 below, in order, until every item is
`[x]` and the **Definition of Done** in Section 2 is true for the whole repo. Nothing is done
until it is verified, not just edited.

You do **not** have unlimited context or unlimited turns in a single run. Section 1 tells you how
to work inside that constraint without losing progress or re-doing work.

---

## 1. Operating rules (read first, every run)

1. **State lives in files, not in your head.** At repo root, maintain `PROGRESS.md` — a copy of
   the Master Checklist (Section 3) with checkboxes. On your very first run, if `PROGRESS.md`
   doesn't exist, create it by copying Section 3 verbatim. On every subsequent run, **read
   `PROGRESS.md` first**, before touching any code. It is the single source of truth for what's
   done. Do not trust your own memory of prior runs — trust the file.

2. **One task at a time, fully closed out, before starting the next.** For each checklist item:
   Read → Fix → Verify → Test → Commit → Check the box in `PROGRESS.md` → append one line to
   `CHANGELOG_REMEDIATION.md`. Never leave an item half-done and move to the next one. Never batch
   five fixes into one unverified commit.

3. **Budget your context deliberately.** Don't re-read the entire repo or the entire
   `worklog.md` every run. `worklog.md` gives exact file/line references for each finding — jump
   straight to the referenced file. If a finding's line numbers have drifted (the audit is a
   snapshot, code may have moved on), `grep`/search for the pattern described rather than
   re-reading the whole file. When you sense you're low on remaining context/turns for the
   session, **stop after finishing your current item cleanly** (don't start a new one you can't
   finish), make sure `PROGRESS.md` and the changelog are updated and committed, and end the run.
   That's a successful run, not a failure.

4. **Never fabricate a fix.** If `worklog.md` says something is broken, confirm it's still broken
   in the current code before fixing it (the codebase may have drifted since the audit). If you
   can't find the referenced code, say so in `CHANGELOG_REMEDIATION.md` and search by symptom
   instead of skipping the item.

5. **Never mock, stub, hardcode, or fake anything you're asked to make real.** The entire reason
   this remediation exists is that the codebase has mocked API calls, fabricated statistics, and a
   fake rate limiter. If you catch yourself writing `// TODO`, `setTimeout(...) // mock`,
   a hardcoded return value standing in for a real calculation, or a print statement claiming
   something happened that didn't — stop, that is exactly the failure mode you're fixing. Do not
   introduce new instances of it anywhere in the codebase, including in code you write.

6. **Minimal, surgical diffs.** Fix the thing the checklist item names. Don't refactor unrelated
   code, don't rename things "while you're in there," don't upgrade unrelated dependencies. Scope
   creep burns your context budget and makes commits hard to review/revert.

7. **Never delete or disable functionality without checking for usages first.** Before removing a
   component, endpoint, hook, or package, `grep` the entire repo (both `frontend/` and `backend/`)
   for its usage. If something looks dead per the audit, confirm it's still dead before deleting.

8. **Every backend model/schema change ships a matching Alembic migration**, generated and
   reviewed, not hand-waved. Never rely on `Base.metadata.create_all()` for schema changes in a
   codebase that already has Alembic — that auto-create path is itself one of the things you're
   removing (see 4.1).

9. **Verify before you commit, every time.** Run the relevant commands from Section 5 after every
   change. A commit that doesn't build, lint, or pass existing tests is not a completed task —
   it's a regression. If you don't have a way to run something (e.g., no DB available in this
   environment), say so explicitly in the commit message and changelog rather than silently
   skipping verification.

10. **Commit style:** one logical fix per commit, conventional-commit style prefix
    (`fix:`, `security:`, `perf:`, `chore:`, `feat:`, `refactor:`), message references the
    checklist item ID, e.g. `security: fix WhatsApp webhook HMAC verification (CRIT-2)`.

11. **Don't ask the user clarifying questions mid-task if the answer is already in `worklog.md`.**
    It has file paths, line numbers, exact impact, and a recommended fix for nearly every item.
    Only surface a question if the fix requires a genuine product decision (e.g., "should the
    delete-hospital endpoint hard-delete or soft-delete/deactivate?") — and when you do, pick the
    safer/more conservative default (soft-delete, deactivate, restrict), implement that, and note
    the assumption in `CHANGELOG_REMEDIATION.md` instead of blocking.

---

## 2. Definition of Done — "production, enterprise-grade SaaS"

The repo is not done at "checklist items checked." It's done when all of these are true:

- **No mocked, faked, or fabricated behavior anywhere.** Every button, form, and API response
  does what it claims. No hardcoded statistics presented as real data. No feature labeled "AI"
  that isn't AI (either implement real model-backed scoring, or rename the feature and its UI/
  marketing copy to accurately describe rule-based logic — see 4.14).
- **No known-critical or known-high security issue remains open** (Section 3, Stages 1 and 4).
- **Every mutating and public endpoint has real rate limiting, input validation with bounds, and
  a defined response model.** No unbounded `limit`/`page` query params.
- **Every table with a foreign key has correct `ondelete` behavior; every hot-path query is
  indexed; no full-table scans on request paths that run per-user-action** (WhatsApp webhook is
  the big one).
- **All console/print debugging output in backend production code paths is replaced with
  structured logging** (`logger.info/warning/error`, no bare `print()`).
- **Frontend has no dead links, no non-functional interactive elements (buttons/toggles that do
  nothing), no undefined CSS classes, working dark mode, loading states and error states on every
  data-fetching page.**
- **Secrets are never hardcoded, never logged, never returned in error responses.** No default
  admin password auto-created in a code path that runs in production.
- **Every schema change has a migration; migrations run cleanly up and down.**
- **`npm run build`, `npm run lint`, TypeScript typecheck, and the backend's import/syntax checks
  (and test suite, once one exists) all pass with zero errors.**
- **Dead code and unused dependencies are removed** (Section 3, Stage 9) — not just flagged.
- **`README.md` and any marketing copy accurately describe what the product does today** — no
  claims about AI, 2FA, or features that don't exist or aren't wired up.

---

## 3. Master Checklist

This merges and de-duplicates all findings from `worklog.md` Phases 1–9 into one dependency-aware,
priority-ordered list. IDs like `(P2-C1)` map back to the finding IDs inside `worklog.md` — use
those to jump straight to the detailed writeup (exact file/line, code snippet, recommended fix)
instead of re-deriving it. Copy this whole section into `PROGRESS.md` verbatim on your first run.

### Stage 0 — Safety net (do this before touching any fix)
- [ ] 0.1 Create a working branch (`remediation/production-hardening`). Never commit straight to `main`.
- [ ] 0.2 Confirm the app currently builds/runs (`Section 5` commands). Record baseline pass/fail
      in `CHANGELOG_REMEDIATION.md` so later regressions are obvious.
- [ ] 0.3 Create `PROGRESS.md` (this checklist) and `CHANGELOG_REMEDIATION.md` (one line per
      completed item: date, ID, one-sentence summary, commit hash).

### Stage 1 — Critical security (repo is actively unsafe until these are fixed)
- [ ] 1.1 **(P8-C1 / P2-H2)** Remove auto-creation of default admin (`admin@ojas.care` /
      `admin123`) from the production startup path in `backend/app/main.py`. Replace with a
      one-time CLI setup script that forces a strong random password + mandatory reset on first
      login. Stop logging any password anywhere.
- [ ] 1.2 **(P8-C2 / P4-HIGH-3)** Add HMAC-SHA256 signature verification (`X-Hub-Signature-256`)
      on the WhatsApp webhook `POST` handler in `backend/app/routers/whatsapp.py`. Reject
      unsigned/invalid requests before any processing.
- [ ] 1.3 **(P8-C3 / P4-HIGH-4 / P2-M8 / P5-1 / P9-P1)** Add an indexed `mobile_lookup_hash`
      column (deterministic HMAC-SHA256, not reversible) to `patients`. Rewrite the WhatsApp
      webhook lookup to a single indexed query. Delete the current "load every patient, decrypt
      each mobile number, compare" loop entirely — it's a cross-tenant PII exposure and an O(n)
      decrypt-per-message DoS vector. Ship the Alembic migration + backfill script.
- [ ] 1.4 **(P8-C4)** Constrain `InviteCreate.role` to a `Literal["HOSPITAL_ADMIN","COORDINATOR",
      "DOCTOR"]` (or enum) in `backend/app/routers/superadmin.py`. Block `SUPER_ADMIN` from ever
      being assignable via invite.
- [ ] 1.5 **(P2-C4 / P4-MEDIUM-3 / P8-C5)** Lock down `/admin/seed-demo-data`: require
      `SUPER_ADMIN` (not just `HOSPITAL_MANAGE`), add a hard environment guard so it 404s/no-ops
      in production regardless of caller, and stop returning `str(e)` internals in the 500
      response — log server-side, return a generic message.
- [ ] 1.6 **(P2-C3 / P4-MEDIUM-1 / P4-MEDIUM-2)** Fix rate limiting, which is currently a
      no-op fake (`limiter.limit("5/minute")(lambda: None)()` in `backend/app/routers/auth.py`).
      Apply `@limiter.limit(...)` as a real decorator directly on the `login` and `refresh` route
      handlers. Delete the duplicate local `Limiter()` instance in `auth.py`; use
      `request.app.state.limiter` everywhere. Add real rate limits to `/grievances`, `/contact`,
      and `/auth/verify-invite`.

### Stage 2 — Critical functional bugs (core flows are broken today)
- [ ] 2.1 **(P3-#2 / P4-CRITICAL-1)** Fix `/auth/verify-invite`: backend reads `token: str` as a
      query param on a POST while the frontend sends it as a JSON body → always 422. Use a
      Pydantic request model (`Body(...)`) on the backend.
- [ ] 2.2 **(P3-#1 / P4-CRITICAL-2)** Fix the Escalations response-shape mismatch. Backend returns
      `{"data": [...], "total", "limit", "offset"}`; `useEscalations()` returns the whole object
      unwrapped, so `Escalations.tsx` calls `.map()` on an object and crashes, and
      `Dashboard.tsx`'s escalation count reads as `undefined`. Unwrap `.data` in the hook once,
      fix both call sites.
- [ ] 2.3 **(P2-C1 / P3-#3 / P4-HIGH-1 / P6-#5)** Wire `Enrollment.tsx` to the real
      `useCreatePatient()` hook — delete the commented-out API call and the
      `setTimeout(...) // Mock`. Align the form's field names with the `PatientCreate` schema
      (`fullName`→`full_name`, add `family_mobile`, `consent_given`, etc.). This is the single
      most-cited bug in the audit: the enrollment flow currently discards every patient a user
      enters and shows a fake success toast. Add a proper error state on submit failure.
- [ ] 2.4 **(P3-#4 / P4-CRITICAL-3 / P4-HIGH-2)** Fix Hospital Management: align the frontend
      `Hospital` TypeScript type with the actual backend response fields (`name`, `city`, `state`,
      `bed_count`, `nabh_level`, `plan_type`, `patient_count`, `created_at` — not `address`/
      `phone`/`admin_email`). Either implement `DELETE /superadmin/hospitals/{id}` on the backend
      (soft-delete/deactivate, with cascade handling) or remove the delete button from the UI —
      it currently always 404s.
- [ ] 2.5 **(P3-#5)** Fix Dashboard escalation count rendering "undefined" — depends on 2.2 being
      fixed first; verify the Dashboard call site after.
- [ ] 2.6 **(P3-#6)** Fix Header/notification type mapping bug: code reads `e.priority`, the API
      field is `e.level`.

### Stage 3 — Data integrity & compliance risk (fabricated/misrepresented data)
- [ ] 3.1 **(P2-C2 / P2-H5 / P3-#10)** `backend/app/routers/reports.py`: the NABH report's
      `feedback_rate`/`feedback_count` are hardcoded to always compute as 78% of total, and
      `early_follow_up_rate` is artificially capped at 92% with a fake `0.95` multiplier. This
      goes into a regulatory compliance PDF. Implement real feedback collection + real rate
      calculation from actual check-in/feedback data. If real feedback data doesn't exist yet as a
      concept in the schema, add it — don't ship a report with numbers that are just math on the
      total patient count.
- [ ] 3.2 **(P7 — all findings)** The product claims 4 "AI" features (risk scoring, coach
      suggestions, readmission prediction, smart escalation). All 4 are currently rule-based
      heuristics — zero AI SDKs, zero AI API keys, zero model calls anywhere in the codebase. In
      a healthcare product this is a false-advertising and regulatory-risk issue, not just a
      naming nitpick. Do **one** of the following (confirm which with the product owner if truly
      ambiguous, otherwise default to (b) since it's non-breaking and immediate):
      (a) Implement real model-backed scoring for at least the primary risk-scoring feature, or
      (b) Rename every "AI"-labeled surface (landing page, in-app labels, API docs/OpenAPI
      descriptions, email copy) to accurately describe it as rule-based/deterministic clinical
      logic. Do not leave "AI-powered" language next to code that is `if/else` rules.
- [ ] 3.3 **(P2-H4)** Contact form (`backend/app/routers/contact.py`) currently accepts
      submissions and silently discards them (`# TODO: Email sending can be added later`). Wire up
      real email delivery, or remove the form from `LandingPage.tsx` — don't leave users believing
      "we will contact you shortly" when nothing happens.

### Stage 4 — High-severity security hardening
- [ ] 4.1 **(P8-H1)** Migrate `access_token`/`refresh_token` off `localStorage` (XSS-stealable)
      onto httpOnly, `Secure`, `SameSite=Strict` cookies set by the backend. Update
      `AuthContext.tsx` and `client.ts` accordingly.
- [ ] 4.2 **(P8-H2)** Implement refresh-token rotation (invalidate the old refresh token on use,
      issue a new one) rather than a static long-lived refresh token.
- [ ] 4.3 **(P8-H7)** Add a security headers middleware: HSTS, `X-Content-Type-Options`,
      `X-Frame-Options`, a real Content-Security-Policy.
- [ ] 4.4 **(P8-H3)** Add CSRF protection appropriate to the new cookie-based auth from 4.1.
- [ ] 4.5 **(P2-H1 / P4-LOW-3)** Replace every production `print()` call with structured
      `logger.info()`/`logger.error()` — this hits `whatsapp.py` (5 occurrences on the hottest
      path in the app) and `patients.py` (3 occurrences). No bare `print()` left in any router or
      service.

### Stage 5 — High-severity frontend breakage
- [ ] 5.1 **(P6-#3 / P3-#7)** Fix the 4 dead navigation links identified in the audit
      (`/checkins`, `/profile`, `/forgot-password`, `/contact` — confirm exact set in
      `worklog.md` §Phase 6 item 3) — either implement the destination or remove the link.
- [ ] 5.2 **(P3-#8)** Implement the Forgot Password flow end-to-end (backend endpoint + frontend
      page), or remove the link if it's out of scope for this release — don't ship a dead link on
      the login page.
- [ ] 5.3 **(P2-H6 / P6-#7)** Settings page notification toggles have `cursor-pointer` styling
      but zero `onClick` handlers — implement real toggle state + persistence, or remove them.
- [ ] 5.4 **(P2-H7 / P6-#7)** Settings page hardcodes the environment label to "Production" —
      fetch the real environment from the backend `/health` (or a dedicated config endpoint)
      instead.
- [ ] 5.5 **(P6-#11)** Fix the Login page's password-visibility toggle `tabIndex={-1}` keyboard
      accessibility bug.
- [ ] 5.6 **(P6-#1)** Define the missing CSS classes causing visual breakage: `section-container`,
      `alert-error`, `badge-risk-*`.
- [ ] 5.7 **(P6-#2)** Fix dark mode — currently completely non-functional despite `next-themes`
      being wired up. Audit hardcoded colors that don't respond to the `.dark` class and replace
      with theme tokens.
- [ ] 5.8 **(P6-#8)** Add `isError` UI states to Dashboard, PatientList, PatientDetail, AuditLogs
      — currently failed queries render nothing informative.
- [ ] 5.9 **(P6-#9)** Add skeleton/loading states to Dashboard stats and charts.
- [ ] 5.10 **(P2-H3 / P2-M4 / P6-#10)** Delete confirmed-dead code after re-verifying with a
      repo-wide grep: `backend/app/tasks/whatsapp_tasks.py` (never imported),
      `DashboardLayout.tsx`, `TopBar.tsx`, and any other component flagged dead in `worklog.md`
      §Phase 6 item 10.

### Stage 6 — Medium: database integrity
- [ ] 6.1 **(P5-#2)** Add `ON DELETE CASCADE` on `checkins`, `escalations`, `timeline_events` →
      `patients` foreign keys.
- [ ] 6.2 **(P5-#3)** Add indexes: `patients.status`, `checkins(patient_id, status)`,
      `checkins(patient_id, day_number)`, `escalations.status`, `audit_logs.timestamp`,
      `audit_logs.hospital_id`.
- [ ] 6.3 **(P5-#4 / P9-P3)** Fix the double-commit pattern: `log_audit()` should `flush()` only;
      remove the redundant second `commit()` in each of the 3 call sites.
- [ ] 6.4 **(P5-#5)** Add `ondelete="RESTRICT"` on `users.hospital_id` and `patients.hospital_id`.
- [ ] 6.5 **(P5-#6)** Add `UniqueConstraint('hospital_id','uhid')` and
      `UniqueConstraint('hospital_id','mobile')` on `patients`.
- [ ] 6.6 **(P5-#7)** Add `UniqueConstraint('patient_id','day_number')` on `checkins`.
- [ ] 6.7 **(P5-#8)** Add `NOT NULL` constraints on critical columns (patient `full_name`,
      `mobile`, checkin `patient_id`).
- [ ] 6.8 **(P5-#9)** Replace free-text status/role/level string columns with DB `CHECK`
      constraints or proper enums.

### Stage 7 — Medium: API consistency & validation
- [ ] 7.1 **(P4-MEDIUM-4)** Add `response_model` Pydantic schemas to all endpoints — currently
      only 2 of 31 have one.
- [ ] 7.2 **(P4-MEDIUM-5)** Add `Query(ge=1, le=100)` (or sane equivalents) to every unbounded
      `page`/`limit`/`offset` param on `/patients`, `/escalations`, `/superadmin/audit-logs`.
- [ ] 7.3 **(P4-§7)** Standardize the response envelope across all endpoints:
      `{"success": true, "data": ..., "message": ...}` on success,
      `{"success": false, "error": {"code": ..., "message": ...}}` on failure.
- [ ] 7.4 **(P4-§6)** `POST /patients` should return `201 Created`, not `200`.
- [ ] 7.5 **(P4-§9)** Add request-logging middleware with a correlation ID per request.

### Stage 8 — Medium: performance
- [ ] 8.1 **(P9 §9.6 / A-1)** Create a server-side `/dashboard/stats` aggregation endpoint;
      stop fetching 100 patients client-side just to compute counts.
- [ ] 8.2 **(P5 §db / P-2)** Replace the N+1 hospital-count query pattern with a single
      `GROUP BY` query.
- [ ] 8.3 **(P9 §9.7)** Wire up the already-built-but-unused Redis `@cache_result` decorator
      (`backend/app/core/redis.py`) on the hospital list and audit-log endpoints.
- [ ] 8.4 **(P9 §9.4)** Add `useMemo` around Dashboard's computed statistics.
- [ ] 8.5 **(P9 A-2)** Move patient search from broken client-side filtering (which breaks
      pagination) to a real backend query parameter.

### Stage 9 — Low: dead-code & bundle hygiene
- [ ] 9.1 **(P2-M5/M6 / P9 §9.14)** Remove the ~9 confirmed-unused npm packages (`date-fns`,
      `react-hook-form`, `@hookform/resolvers`, `embla-carousel-react`, `vaul`,
      `react-day-picker`, `react-resizable-panels`, `input-otp`, `cmdk`) and the ~24 dead shadcn
      wrapper files listed in `worklog.md` §9.14 — re-grep each one first to confirm zero imports
      before deleting.
- [ ] 9.2 **(P2-M1)** Remove unused Python imports: `time` in `main.py`; `hashlib`, `hmac` in
      `whatsapp.py` (unless consumed by your Stage-1 HMAC work — check order); `date` in
      `reports.py`.
- [ ] 9.3 **(P9 §9.12)** Fix `AnimatePresence mode="wait"` adding a 300ms delay to every route
      change; switch to `mode="popLayout"` or drop the wrapper on public routes (landing, login).
- [ ] 9.4 **(P9 §9.16)** Add a Docker multi-stage build to `backend/Dockerfile` to drop build
      toolchain weight from the final image.
- [ ] 9.5 **(P2-M7)** Hide or `disabled`-state any "Coming Soon" UI (2FA toggle in Settings,
      Reports email button) instead of shipping clickable non-functional controls.

### Stage 10 — Enterprise-readiness (beyond the audit — required for "production SaaS")
- [ ] 10.1 Stand up an automated test suite: backend (pytest + httpx test client, cover auth,
      RBAC/tenant isolation, and every endpoint touched in Stages 1–3), frontend (Vitest/RTL for
      Enrollment, Escalations, Login at minimum). Wire into CI so regressions fail the build.
- [ ] 10.2 Add CI (GitHub Actions): lint + typecheck + build + tests on every PR, blocking merge
      on failure.
- [ ] 10.3 Complete OpenAPI docs — every endpoint has a description, request/response schema
      (depends on 7.1), and is browsable via Swagger UI.
- [ ] 10.4 Wire Sentry (already a dependency) end-to-end on both frontend and backend; replace the
      remaining `console.error` in the frontend error boundary with a real Sentry capture.
- [ ] 10.5 Add a fail-fast startup check: required env vars (DB URL, JWT secret, encryption key,
      WhatsApp secret, etc.) are validated at boot in production and the app refuses to start with
      a clear error if any are missing — never silently falls back to an insecure default.
- [ ] 10.6 Add/verify automated tests that every DB query touching patient data is scoped by
      `hospital_id` (tenant isolation) — this is a healthcare product; cross-tenant leakage is the
      single worst possible bug class here.
- [ ] 10.7 Confirm every model change made in Stages 1–9 has a corresponding Alembic migration
      that has actually been run against a scratch DB (up and down) — not just written.
- [ ] 10.8 Pass on accessibility: ARIA roles on tabs/FAQ/sidebar, keyboard navigation, visible
      focus states — audit flagged this as Medium but it's a baseline enterprise requirement.
- [ ] 10.9 Update `README.md` and any landing-page copy to remove/correct claims about AI,
      2FA, or any feature not actually shipped as of this remediation, per 3.2's outcome.

---

## 4. Per-item execution loop (repeat for every checklist item)

1. Open `PROGRESS.md`, find the first unchecked item.
2. Open `worklog.md`, jump to the referenced finding ID for exact file/line/snippet context.
3. Read the current state of that file — confirm the issue still exists as described (rule 4).
4. Make the smallest correct change that fully resolves it (rule 6). If it's a backend model
   change, write the Alembic migration now, not later.
5. Run the applicable commands from Section 5. Fix anything that breaks.
6. If tests exist for the touched area, run them. If they don't exist yet and the item is in
   Stage 1–3, add a minimal regression test for it if feasible in your remaining budget — don't
   let that block finishing the fix itself if it doesn't fit this run.
7. Commit with a conventional-commit message referencing the item ID.
8. Check the box in `PROGRESS.md`. Append one line to `CHANGELOG_REMEDIATION.md`.
9. If you have budget left, move to the next unchecked item. If not, stop cleanly here.

---

## 5. Verification commands

Run these after every change relevant to that side of the stack. Never commit on a red run.

**Backend** (`cd backend`):
```
python -m py_compile $(git diff --name-only --diff-filter=ACMR -- '*.py')   # fast syntax check
python -m pytest                                                             # once tests exist
alembic upgrade head && alembic downgrade -1 && alembic upgrade head         # after any migration
```

**Frontend** (`cd frontend`):
```
npm run lint
npx tsc --noEmit
npm run build
```

If a command isn't available in this environment (e.g., no live Postgres to run migrations
against), say so explicitly in the commit/changelog entry rather than skipping silently — flag it
for the user to verify.

---

## 6. Guardrails — do not

- Do not mark a checklist item done without having actually run the verification for it.
- Do not remove the audit trail (`worklog.md`, `PROGRESS.md`, `CHANGELOG_REMEDIATION.md`) — these
  are how work resumes across runs.
- Do not touch `.env` files or commit real secrets. Use `.env.example` for documentation.
- Do not "fix" Stage 3.2 (AI misrepresentation) by making the marketing copy more aggressive —
  fix it by making the copy match reality or the implementation match the copy.
- Do not silently change API response shapes without checking every frontend call site that
  depends on them (grep first).
- Do not skip ahead to Stage 10 items before Stages 1–3 are fully closed — enterprise polish on
  top of broken/insecure core flows is wasted work.

---

## How to run this

1. Put this file at the repo root as `QWEN_PROMPT.md` (or paste it directly into your Qwen Code
   session). Make sure `worklog.md` is also present at the repo root — the checklist above
   references it constantly.
2. Kick off the first run with something like:
   > Follow `QWEN_PROMPT.md` exactly. This is a fresh start — create `PROGRESS.md` from Section 3
   > and begin at Stage 0.
3. For every subsequent run (new session, new terminal, whenever Qwen Code's context resets),
   just say:
   > Continue following `QWEN_PROMPT.md`. Read `PROGRESS.md` and pick up from the first unchecked
   > item.
4. Repeat until every box in `PROGRESS.md` is checked and Section 2's Definition of Done is true.
   At that point, do one final full pass of Section 5's verification commands across the whole
   repo before calling it production-ready.
