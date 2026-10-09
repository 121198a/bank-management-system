# Final report — Bank Management System upgrade (master-kit Phases 0–13)

Branch `upgrade/master-kit` · baseline tag `pre-upgrade-20261006` (= `origin/main` = `9240780`) · 13 commits · 121 files changed

## Verdict
**Not "production ready".** The kit allows that phrase only when the documented checks support it, and these do not yet: the end-to-end suite has never run, nothing has been tested in a browser or at any viewport size, the backup/restore CLI has never touched a real database, the KYC encryption migration has not been run, secrets from the uploaded ZIP have not been rotated, and the legal pages are unreviewed drafts. What *has* been done is real and verified (section 9). Section 12 lists what only the owner can do.

## Phase status
| Phase | Status |
|---|---|
| 0 Safety and baseline | Done (tag + branch local; **not pushed**; `git fetch --all --prune` ran clean and `origin/main` still equals the baseline) |
| 1 Gap analysis | Done — `CURRENT_STATE_AUDIT.md` |
| 2 Product identity | Audit done, 3 safe fixes made, **rename awaits owner decisions D1–D6** — `PHASE2_IDENTITY.md` |
| 3 Architecture | Done where needed (layering was already sound; limiter factory extracted, tooling added under `scripts/`) |
| 4 Security | Largely done; open items are owner actions (section 11–12) |
| 5 UI/UX redesign | **Not done** — needs the owner's direction (kit default is light/neutral; current UI uses glass/gradients) |
| 6 Anti-vibe audit | Done as a scored audit (16 pass · 7 recommend change · 5 minor · 2 partial); **no redesign** — `PHASE6_ANTI_VIBE_AUDIT.md` |
| 7 Responsive engineering | **Not done** — needs a real browser |
| 8 Performance | Partial — code splitting and caching done; no Lighthouse or load tests |
| 9 Reliability | Mostly done — timeouts, error boundary, shared rate limiting, backups; no offline UI state |
| 10 SEO/a11y/public readiness | Partial — contrast, headings, skip link, title sync fixed; source-level only — `PHASE10_PUBLIC_READINESS.md` |
| 11 Testing | Partial — 85 tests run by default (66 backend + 19 frontend); 5 Redis tests (verified) and 10 e2e tests (never run) are opt-in; no browser/a11y tests |
| 12 Git | Partial — logical commits and `diff --check` clean; **push is yours to do** |
| 13 Final report | This document |

## 1. What was discovered
React 18/Vite 8 frontend, Express 4/Mongoose 8 backend, MongoDB replica set, Docker Compose + nginx, GitHub Actions. 121 API routes in 18 modules, solid RBAC/org-scope, bcrypt, rotating refresh tokens, idempotent money movement. Notable defects at baseline (full list with severities in `CURRENT_STATE_AUDIT.md`): frontend `npm ci` failed (CI broken); shared rate-limit counters locked users out of login after ~12 normal requests; secrets and customer-data backups inside the delivered ZIP; backend dependency advisories incl. one high; raw internal error text in 5xx responses; malformed amounts returned 500; KYC document numbers stored in plain text; unconditional "Local development environment" text on sign-in; WCAG contrast failures on the main button, links and secondary text; one repeated `h1` across dashboards.

## 2. What was changed
Security hardening, reliability, tests, tooling, accessibility fixes and documentation — itemised in section 16. No business rule, route, model field or API response shape was altered, except: error bodies for unexpected 5xx errors are now generic, malformed amounts now return 400, and (only if enabled) KYC document search is exact-match.

## 3. What was deliberately preserved
All 121 routes and their behaviour, every model and migration utility, the money/idempotency/transaction logic, the existing role and permission system, all original unit tests (12), the owner's uncommitted UI work (Service Center, production UI polish — committed first, untouched in substance), git history (no rewrite, no force-push), and the README's honest "not a regulated bank" disclaimer.

## 4. What was removed and why
Root `.npmrc` (legacy-peer-deps workaround that CI never read) · `backend/backen/` (stray `.env`) · `User.js.phase2-backup` (byte-identical to `User.js`) · empty brace-named directories · the "Production-ready" description claim · the default sender `no-reply@digitalbank.com` (domain not shown to be owned) · the primary-button gradient (failed contrast) · the always-on dev label · the shared global rate-limit map. `.env`, `backup-*.json` and `backen/.env` were **excluded from every delivered ZIP** (not deleted from your original).

## 5. Security improvements
Safe production error responses with request IDs · API CSP/HSTS/referrer policy and nginx CSP and security headers · all backend advisories cleared (production audit: 0) · isolated, expiring, configurable rate limiters; optional Redis-backed shared limits with in-memory fallback; per-user money-movement cap · malformed amounts → 400 · opt-in AES-256-GCM encryption of KYC document numbers with blind-index search and a dry-run/rollback migration · compose: `TRUST_PROXY`, backend port not published, healthchecks, Redis unpublished · CI: least-privilege token, `npm audit` · route-guard tests that fail if any non-intended route becomes public · encrypted verify-then-apply backups.

## 6. UI/UX improvements
Real 404 page · error boundary · skeleton on the KYC page · draft privacy/terms pages linked from sign-in · dev label hidden in production · one `h1` per page matching its title · tab title follows the page · skip-to-content link · primary button, links, secondary text, placeholders and focus indicators now meet WCAG contrast (measured). **No visual redesign** (Phase 5).

## 7. Responsive improvements
**None made and none verified.** Tailwind breakpoints exist in the code; no viewport was ever rendered.

## 8. Performance improvements
Main JavaScript chunk 288 kB → 37 kB (route-level lazy loading) · nginx: gzip, immutable cache for hashed assets, `no-cache` for the SPA shell · 20 s API timeout · shared Redis rate-limit store. **No Lighthouse, load or concurrency testing was run.**

## 9. Test results (final, from clean installs)
| Suite | Result |
|---|---|
| Backend `npm test` | **66 passed, 0 failed, 15 skipped** (10 e2e need MongoDB; 5 need Redis). With `TEST_REDIS_URL`: 71 passed — verified against a real Redis 7 |
| Frontend `npm test` | **19 passed** |
| Frontend lint / build | clean / builds |
| `npm audit --omit=dev` | backend **0**; frontend **2 moderate** (react-router SSR advisory; app is client-only; upgrade is a breaking v7 move — accepted) |
| Dev-dependency audit | 3 high in the `nodemon` chain; only fix is a 2017 downgrade; not shipped (`--omit=dev`) — accepted |
| OpenAPI | valid 3.0.3, 121 operations, drift-tested |
| **Never executed** | the 10-step real-database end-to-end suite · backup/restore CLI against MongoDB · KYC encryption migration · real SMTP with nodemailer 10 · any browser, viewport or screen-reader test |

## 10. Deployment changes
Compose adds `redis` (no persistence, 64 MB cap, healthcheck), `NODE_ENV=production`, `TRUST_PROXY=true`, `REDIS_URL`, backend healthcheck, `expose` instead of `ports`. nginx gains security headers and cache rules. CI gains `backend-e2e` (MongoDB 7 replica set), a Redis service, frontend tests and audits. **TLS is not handled here** — terminate HTTPS in front of nginx.

## 11. Remaining risks
1. End-to-end suite unproven — first CI run may expose test/assumption mismatches.
2. KYC numbers remain plain text until the key is set and the migration run; key loss would make encrypted data unrecoverable.
3. Backups are logical, not point-in-time; restore never rehearsed.
4. No responsive, browser, accessibility-tool or load testing; contrast measured for 13+ pairs only.
5. Plain-text secrets and PII were in the uploaded ZIP; historic hard-coded admin password remains in git history (`SECURITY.md`).
6. Rate limiter is fixed-window (up to 2× burst at a window edge).
7. Legal pages are unreviewed drafts; contact details are placeholders.
8. Three names in use until D1 is decided.
9. Charts have no text alternative; focus visibility unverified in a browser.

## 12. Manual actions required from the owner
1. **Rotate every secret** that was in `backend/.env` and `backend/backen/.env` (JWT secrets, database credentials, SMTP password). Delete or secure the five `backup-*.json` files (customer data).
2. **Push**: `git push origin pre-upgrade-20261006` then `git push origin upgrade/master-kit`; open a PR; do not force-push.
3. **Watch the `backend-e2e` CI job** and send/fix failures.
4. Decide D1–D6 (`PHASE2_IDENTITY.md`) and the UI direction for Phase 5.
5. Set `KYC_ENCRYPTION_KEY`, back the key up separately, then on a *copy* of the data run `npm run kyc:encrypt` (dry run) → `--apply`; verify the admin KYC page and an exact-number search. Decide whether reviewers should see full or masked numbers.
6. Set `BACKUP_ENCRYPTION_KEY`, run `npm run backup`, and rehearse a restore into a scratch database (`BACKUP_RUNBOOK.md`).
7. Send a real test email (nodemailer 10) and set `SMTP_FROM` to a domain you control.
8. Have a lawyer review `/privacy` and `/terms`; add real contact details.
9. Wire up uptime monitoring (`BACKUP_RUNBOOK.md` lists the checks) and put TLS in front of nginx.
10. Decide whether to purge the old admin password from git history (needs your authorisation; rotating is the minimum).

## 13. Final folder tree (source only)
```
.github/workflows/ci.yml        backend, backend-e2e, frontend jobs
backend/
  scripts/                      encrypt-kyc, backup, restore, list-routes, generate-openapi
  scripts/lib/                  backup.js, openapi.js
  src/{config,controllers,middleware,models,routes,services,utils,validators}
  test/  test/e2e/  test-support/
deployment/                     docker-compose.yml, nginx.conf, *.Dockerfile
docs/upgrade/                   audit, phase reports, API_ENDPOINTS.md, openapi.json, runbook, ADRs, changelog
frontend/
  public/                       favicon.svg, robots.txt
  src/{api,components,context,pages,routes,test,utils}
```

## 14. Final route map
121 routes — insurance 27 · loans 17 · collections 11 · users 8 · sales 8 · transactions 6 · security 6 · employees 6 · auth 6 · accounts 6 · branches 5 · notifications 4 · kyc 4 · departments 3 · health/ready/dashboard/audit 1 each. Exactly 8 are public (6 auth + health + ready); a test enforces this. Full table with auth and roles: `API_ENDPOINTS.md`; full OpenAPI: `openapi.json`. Frontend routes: `/login`, `/register`, `/forgot-password`, `/reset-password/:token`, `/privacy`, `/terms`, `/dashboard/*`, `/admin/*`, `/employee/*`, 404.

## 15. Final environment variable contract
| Variable | Required | Side | Secret | Purpose |
|---|---|---|---|---|
| `JWT_ACCESS_SECRET` | Yes | Server | **Yes** | ≥32 chars, must differ from refresh secret |
| `JWT_REFRESH_SECRET` | Yes | Server | **Yes** | ≥32 chars |
| `MONGO_URI` | Yes | Server | **Yes** | Replica-set URI (transactions required) |
| `NODE_ENV` | No | Server | No | `production` in deployment |
| `PORT` | No | Server | No | default 5000 |
| `CLIENT_URL` | No | Server | No | comma-separated CORS allow-list |
| `TRUST_PROXY` | **Yes behind a proxy** | Server | No | `true` behind nginx/LB so rate limits see real client IPs |
| `REQUIRE_REPLICA_SET` | No | Server | No | default true |
| `JWT_ACCESS_EXPIRES` / `JWT_REFRESH_EXPIRES` / `JWT_REFRESH_EXPIRES_MS` | No | Server | No | token lifetimes |
| `SMTP_HOST/PORT/SECURE/USER/FROM` | For email | Server | No | mail transport |
| `SMTP_PASS` | For email | Server | **Yes** | mail credential |
| `KYC_ENCRYPTION_KEY` | Recommended (prod) | Server | **Yes** | 32 bytes (64 hex chars or base64). Enables AES-256-GCM encryption of KYC document numbers. **Losing it makes encrypted data unrecoverable** — keep it in a secrets manager and back it up separately from the database. |
| `REDIS_URL` | No (recommended for >1 instance) | Server | **Yes** if it has a password | e.g. `redis://redis:6379`. Shared rate-limit store; unset = per-process counters |
| `TEST_REDIS_URL` | Tests only | CI | No | enables the Redis rate-limit tests |
| `BACKUP_ENCRYPTION_KEY` | For backups | Server/ops | **Yes** | 32 bytes (64 hex or base64) encrypting `.bkp` files. Keep separate from the backups; loss = backups unreadable |
| `RATE_LIMIT_GLOBAL_MAX` / `RATE_LIMIT_AUTH_MAX` / `RATE_LIMIT_TRANSACTION_MAX` | No | Server | No | requests per minute per IP; defaults 120 / 10 / 30 |
| `E2E_MONGO_URI` | Tests only | CI | No | replica-set URI for `npm run test:e2e`; uses and drops a throw-away database — never point at real data |
| `RESET_PASSWORD_EXPIRES_MS` | No | Server | No | reset link TTL |
| `ADMIN_SEED_EMAIL/PASSWORD/FULL_NAME` | Seed only | Server | **Yes** | first admin (password ≥12 chars); remove after seeding |

The frontend uses **no** environment variables; no secret reaches the browser bundle.

The frontend uses no environment variables; nothing secret reaches the browser bundle.

## 16. Changelog
### Security
- Production-safe error responses; request-id in error body; CastError no longer echoes input
- API CSP (`default-src 'none'`), HSTS (prod), referrer policy; nginx CSP + security headers
- Backend dependency advisories cleared (nodemailer 10, mongoose 8.24.5, morgan 1.12.1, express 4.22.3)
- Compose: `TRUST_PROXY=true`, backend not published to host, healthchecks, `NODE_ENV=production`
### Fixed
- Money-movement rate limit is now per authenticated user (was effectively per IP); per-IP limiter kept as a coarse backstop
- Malformed money amounts (`10.`, `.5`, `+5`, `007`) now return a clear **400** instead of a 500 across all modules
- **Rate limiters no longer share one counter per IP** (first login after ~12 normal API calls returned 429); per-limiter buckets, expiry sweep, configurable limits
- Frontend `npm ci` failure (Vite 8 peer conflict); ESLint scanning `dist/`; 9 lint errors; unused KYC loading state
### Added
- Encrypted backup/restore tooling (`npm run backup` / `npm run restore`): AES-256-GCM, verify-then-apply, refuses non-empty targets and requires `--confirm=<db>`; 12 tests; `BACKUP_RUNBOOK.md` with restore rehearsal and monitoring checklist
- `docs/upgrade/openapi.json`: OpenAPI 3.0.3 generated from the live router + validators (`npm run docs:openapi`), validated and drift-tested in `npm test`; `@apidevtools/swagger-parser` added as a devDependency
- Optional Redis-backed rate limiting (`REDIS_URL`): atomic shared counters across instances, named per-limiter keys, automatic in-memory fallback on Redis failure; `redis` service in Docker Compose and CI; 6 tests against a real Redis
- 10-step real-database end-to-end suite (`npm run test:e2e`, skipped unless `E2E_MONGO_URI` is set) and a `backend-e2e` CI job with a MongoDB 7 replica set — **not yet executed**
- KYC document-number protection: AES-256-GCM field encryption (opt-in via `KYC_ENCRYPTION_KEY`), HMAC blind index for exact-match search, last-4 field, migration script `npm run kyc:encrypt` (dry-run default, `--rollback`), startup warning in production when no key is set; 10 new tests
- Frontend test suite (Vitest + Testing Library): formatters, ProtectedRoute role redirects, ErrorBoundary, NotFound, Button double-submit guard, legal pages — wired into CI
- Route-guard regression tests: only 8 intended endpoints may be public; user-management writes admin-only
- `backend/scripts/list-routes.js` generating `docs/upgrade/API_ENDPOINTS.md` from the live router
- Draft `/privacy` and `/terms` pages (placeholders require legal review), linked from sign-in
- 16 backend tests (error handler, rate limit, RBAC, HTTP integration); 404 page; error boundary; robots/OG/noindex meta; axios timeout; CI `npm audit` + least-privilege permissions
### Changed
- **Behaviour change when encryption is enabled:** admin/employee KYC search matches a document number by exact value only (partial-number search is impossible on encrypted data); name/email search is unchanged
- Pages lazy-loaded (entry chunk 288 kB → 37 kB); nginx caches only hashed assets, revalidates the SPA shell
### Removed
- Stray files: `backend/backen/.env`, `User.js.phase2-backup`, empty brace-named directories
- Root `.npmrc` (legacy-peer-deps workaround)

## 17. Rollback procedure
Nothing has been merged or deployed, so the baseline is intact: `main` and tag `pre-upgrade-20261006` are both `9240780`.
1. **Before merge:** do nothing — simply do not merge `upgrade/master-kit`. Delete the branch if unwanted.
2. **After merge, no deploy needed:** `git revert -m 1 <merge-commit>` (creates a new commit; no force-push). Or reset a *local* copy with `git reset --hard pre-upgrade-20261006`.
3. **After deploy:** redeploy the previous image/commit. Config added by the upgrade is inert if unused (`REDIS_URL`, `KYC_ENCRYPTION_KEY`, `BACKUP_ENCRYPTION_KEY`, `RATE_LIMIT_*`) — leaving them set is harmless.
4. **If KYC encryption was enabled:** *before* removing the key, run `npm run kyc:encrypt -- --rollback --apply` to turn encrypted rows back into plain text (or restore the pre-migration backup). Removing the key first makes encrypted rows unreadable.
5. **If Redis was enabled:** unset `REDIS_URL`; limits fall back to per-process counters automatically.
6. **Dependency rollback:** nodemailer: `npm i nodemailer@9.1.1` (note: leaves the known advisory); frontend plugin: revert `frontend/package.json` and lockfile together (restores the broken `npm ci`, so only as a last resort).
7. **UI colour/heading changes:** revert the relevant commits; they touch class names only, not data.
