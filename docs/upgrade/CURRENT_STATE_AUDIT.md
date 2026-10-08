# CURRENT_STATE_AUDIT — Bank Management System

Audit date: 2026-10-06 · Baseline: git `9240780` (tag `pre-upgrade-20261006`) · Branch: `upgrade/master-kit`

## 1. Repository inventory
- Stack: React 18 + Vite 8 + Tailwind 3 (frontend, ESM) · Node ≥20 + Express 4 + Mongoose 8 (backend, CommonJS) · MongoDB replica set
- Package manager: npm (two lockfiles: `backend/`, `frontend/`)
- Deployment: Docker Compose (mongo, backend, nginx-served frontend) · CI: GitHub Actions `ci.yml`
- Remote: `origin` → GitHub `121198a/bank-management-system` (branch `main`)
- Tests at baseline: 12 backend unit tests (money, orgScope, sanitize). No frontend tests. No API/auth/RBAC tests.

## 2. Routes (frontend)
Public: `/login`, `/register`, `/forgot-password`, `/reset-password/:token`.
Customer `/dashboard/*` (accounts, deposit, withdraw, transfer, transactions, loans, insurance, kyc, profile, notifications, services).
Admin `/admin/*` (users, accounts, transactions, loans, insurance, collections, sales, security, kyc, audit, profile, notifications, services).
Employee `/employee/*` (accounts, kyc, transactions, loans, insurance, collections, sales, security, audit, profile, notifications, services).
Catch-all: previously redirected to `/` (no 404) → now a real 404 page.

## 3. APIs (backend, all under `/api`)
`/health`, `/ready` (public) · `/auth` (register, login, refresh, logout, forgot/reset-password; 10 req/min/IP) · `/users` `/accounts` `/transactions` (30/min; Idempotency-Key required for money moves) `/kyc` `/notifications` `/audit` `/dashboard` `/employees` `/branches` `/loans` `/insurance` `/collections` `/departments` `/sales` `/security` (all JWT + RBAC + org-scope). Validation via express-validator on every module.

## 4. Authentication
bcrypt(12), 15-min access JWT held in memory only, HTTP-only rotating refresh cookie with reuse detection, token-version revocation, hashed single-use reset tokens, generic login/reset responses, failed-login → fraud alert after 5 in 15 min. Role is read server-side from the DB user, never from the request (now covered by a test).

## 5. Environment (names only; see `ENVIRONMENT.md`)
Required: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `MONGO_URI`. Optional: PORT, NODE_ENV, CLIENT_URL, TRUST_PROXY, REQUIRE_REPLICA_SET, JWT_*, SMTP_*, RESET_PASSWORD_EXPIRES_MS, ADMIN_SEED_*.

## 6. Findings

### Security
| # | Sev | Finding | Status |
|---|---|---|---|
| S1 | **High** | Local `backend/.env`, `backend/backen/.env` and 5 `backup-*.json` files (customer/employee/account/transaction PII) were inside the delivered ZIP. They are git-ignored and **not in git history** (verified), but the ZIP itself is a leak vector. | Excluded from upgraded output. **Owner action: rotate every secret in those files; delete/secure backups.** |
| S2 | High | Backend dependency advisories at baseline: nodemailer (high), mongoose, morgan, body-parser/express (moderate). | **Fixed** → `npm audit --omit=dev` = 0 |
| S3 | Medium | Error handler returned raw `err.message` for unexpected 5xx (could expose DB/driver text), and echoed CastError values. | **Fixed + tested** |
| S4 | Medium | Behind nginx, `TRUST_PROXY` was unset, so all users shared nginx's IP and one per-IP rate-limit bucket (self-DoS on `/api/auth`). | **Fixed** in compose |
| S5 | Medium | Backend port 5000 published to host in compose, bypassing nginx. | **Fixed** (`expose` only) |
| S6 | Medium | nginx had no security headers/CSP; Helmet CSP was disabled. | **Fixed** (nginx CSP/XFO/nosniff/referrer/permissions; API CSP `default-src 'none'`, HSTS in prod) |
| S7 | Low | Rate limiting was per-process only. | **Fixed (opt-in)** — set `REDIS_URL` and limits are shared by every instance via an atomic Lua counter; if Redis is unreachable the limiter degrades to the in-memory one (logged, never fails open or takes the API down). Tested against a real Redis 7: shared across instances, 40-way concurrent race passes exactly `limit` requests, outage fallback, full app run with Redis live and down. **Still open:** the `/transactions` limiter key uses `req.user`, which is not set yet at that point, so it is effectively per-IP. |
| S8 | Low | Frontend `react-router` advisory (GHSA-337j-9hxr-rhxg) concerns SSR hydration; this is a client-only SPA. | **Open, accepted** (upgrade to RR 7 is a breaking change; schedule separately) |
| S12 | Low | `npm audit` (including dev dependencies) reports 3 high findings in the `nodemon → chokidar → braces/brace-expansion` chain (glob stack-exhaustion DoS in a developer file-watcher). The only offered fix downgrades nodemon to a 2017 release. Production images install with `--omit=dev`, so none of it ships; CI audits production dependencies only. | **Accepted, dev-only** — revisit when nodemon publishes a fixed chain |
| S11 | **High** | **Rate limiters shared one counter per IP.** All limiters wrote into one module-level map keyed only by IP, so ~12 ordinary API calls made the *first* login/refresh attempt return 429 (reproduced). A signed-in user browsing the dashboard could be locked out of sign-in and token refresh; the map also never shrank. | **Fixed** — per-limiter buckets, expired-bucket sweep, limits configurable via env; regression test proven to fail on the old code |
| S10 | **Medium** | `KYCRequest.documentNumber` (Aadhaar/PAN/passport numbers) was stored as plain text. Aadhaar storage is legally restricted in India. | **Code ready, not yet active.** AES-256-GCM field encryption + blind-index search + last-4 are implemented and unit-tested; **it only takes effect once you set `KYC_ENCRYPTION_KEY` and run `npm run kyc:encrypt -- --apply`** (dry-run by default, rollback supported). Migration and real-database behaviour were **not tested** (no MongoDB in the build environment). Reviewers (admin/employee) still see the full number; masking that is a policy decision. |
| S9 | Info | `SECURITY.md` records a historic hard-coded admin password in git history. | **Open** — history rewrite not performed (needs your authorisation); rotate instead |

### Reliability / structure
| # | Finding | Status |
|---|---|---|
| R1 | **Frontend `npm ci` failed** (Vite 8 vs `@vitejs/plugin-react@4` peer range); a root `.npmrc` workaround was not read from `frontend/` → CI frontend job was broken. | **Fixed** (plugin-react 6.1.2; `.npmrc` removed) |
| R2 | ESLint scanned `dist/` (388 errors) + 9 real errors. | **Fixed**, lint clean |
| R3 | No axios timeout. | **Fixed** (20 s) |
| R4 | No error boundary; no 404; unguarded `localStorage`. | **Fixed** |
| R5 | No code splitting: 288 kB entry chunk. | **Fixed**: entry 37 kB (pages lazy-loaded) |
| R6 | KYC page computed `loading` but never showed it. | **Fixed** (skeleton) |
| R9 | **Malformed amounts returned HTTP 500.** The validators accept `10.`, `.5`, `+5` and `007` but the money parser rejects them with a plain `Error`, which the error handler turned into *Internal Server Error* (and a server-side error log) instead of a 400. Affects every money field (deposit, withdraw, transfer, opening deposit, loans, insurance, collections). Found by the new OpenAPI drift test. | **Fixed** at the parser (`ApiError(400)`); regression-tested through the real error handler |
| R7 | Stray artefacts: `backend/backen/` (a stray `.env`), `User.js.phase2-backup` (byte-identical to current `User.js`), empty brace-named directories from a bad `mkdir`. | **Removed** (none were tracked in git) |
| R8 | CRLF-only edits on 4 backend files/.gitignore were uncommitted noise. | Reverted |

### UI/UX vs the 30-item anti-vibe checklist
Present and *context-judged*: glass/gradient surfaces (`PRODUCTION_UI_UPGRADE.md` explicitly adds them), identical stat-card grids, hover animation on cards, Inter as default font, green-on-near-white/dark palette (not purple/black, not neon). No fake testimonials, terminals or pricing tiers. For a banking back-office tool dense uniform cards are functional, so no mass redesign was done; the glass/gradient direction is flagged for owner decision (ADR-003). Skeleton loaders already existed.

### Performance
Entry JS 288 kB → 37 kB; charts (387 kB) now only load on dashboard pages. Pagination exists on list endpoints (UI `Pagination`). Indexes: `utils/createIndexes.js` exists (manual `npm run indexes`) — **UNKNOWN** whether run against production.

## 7. Gap analysis vs kit docs
| Kit requirement | Status |
|---|---|
| 01 PRD / 02 TRD discovery | IMPLEMENTED (this doc) |
| 03 Architecture | PARTIAL — layering is already clean (routes→controllers→services/models); no moves were needed |
| 04 Data model audit | PARTIAL — models inspected; per-entity retention/PII table not written (needs owner policy) |
| 05 Data sources / 06 Scraping / 11 AdMob | NOT_APPLICABLE |
| 07 API contract | **IMPLEMENTED (requests) / PARTIAL (responses)** — `openapi.json` (OpenAPI 3.0.3, 121 operations) is generated from the live router and the real express-validator rules (`npm run docs:openapi`): paths, auth, roles, params, query, body schemas, required Idempotency-Key. It is validated by a spec validator and drift-tested (fails CI if a route/validator changes without regenerating, and checks the money-amount schema against what the API really accepts). Success response bodies beyond the common envelope are **not** described; `custom()` rules are flagged, not translated |
| 08 UI spec / responsive matrix | PARTIAL — Tailwind responsive classes exist; **the 20-viewport matrix was NOT executed** (no browser available in this run) |
| 09 Error handling | IMPLEMENTED (boundary, 404, timeout, safe 5xx); offline-specific UI MISSING |
| 10 Security | PARTIAL (see table; secrets rotation + Redis limiter + CSRF review open) |
| 12 GitHub Actions | IMPLEMENTED (+audit, least-privilege permissions) |
| 13 Testing | PARTIAL — 52 backend tests (57 with `TEST_REDIS_URL`) run on every `npm test` + 16 frontend tests (CI). A 10-step end-to-end suite (register, login, RBAC, account approval, idempotent deposit, overdraw, atomic transfer, concurrent duplicates, refresh rotation/reuse, logout) is **written but has never been executed** — no MongoDB was available in the build environment. It runs in the new `backend-e2e` CI job against a real replica set; expect to fix small mismatches on its first run. Browser E2E and automated a11y tests MISSING |
| 14 Production checklist | PARTIAL — see report; privacy/terms pages are **draft templates needing legal review**; sitemap intentionally omitted (app is noindex); uptime monitoring and backup-restore test MISSING / UNKNOWN |
