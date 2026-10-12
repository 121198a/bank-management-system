## Unreleased (branch upgrade/master-kit)
### Security
- Production-safe error responses; request-id in error body; CastError no longer echoes input
- API CSP (`default-src 'none'`), HSTS (prod), referrer policy; nginx CSP + security headers
- Backend dependency advisories cleared (nodemailer 10, mongoose 8.24.5, morgan 1.12.1, express 4.22.3)
- Compose: `TRUST_PROXY=true`, backend not published to host, healthchecks, `NODE_ENV=production`
### Fixed
- Found by the browser run: sign-in/register had no visible `h1` on phones (form title promoted, hero text demoted); dark-mode contrast for `text-gray-500`, `dark:text-gray-500` and `text-red-500` text app-wide (95 class strings); `<main>` scroll region now keyboard-reachable with a visible focus ring
- Money-movement rate limit is now per authenticated user (was effectively per IP); per-IP limiter kept as a coarse backstop
- Malformed money amounts (`10.`, `.5`, `+5`, `007`) now return a clear **400** instead of a 500 across all modules
- **Rate limiters no longer share one counter per IP** (first login after ~12 normal API calls returned 429); per-limiter buckets, expiry sweep, configurable limits
- Frontend `npm ci` failure (Vite 8 peer conflict); ESLint scanning `dist/`; 9 lint errors; unused KYC loading state
### Added
- `npm run check:login` (backend): read-only login diagnostic that says whether a user is missing, inactive or has a different password, without printing passwords or hashes; 4 tests; troubleshooting section in `APPLY_UPGRADE.md`
- Offline banner (`role=status`) and plain-language messages for timeouts and unreachable servers; app shell and mobile sidebar use `100dvh` with a `100vh` fallback
- Playwright suite (`frontend/e2e/`, `npm run test:e2e`): the kit's 20 viewports x 6 public pages (no horizontal overflow, exactly one visible `h1`), axe WCAG A/AA scans (public pages + 3 role dashboards against a mocked API, phone/desktop, light/dark), keyboard and title checks. **182 checks pass locally in Chromium 153**; `PW_CHROMIUM_PATH` lets it use a custom browser; non-blocking `frontend-browser` CI job until first green CI run
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
- **Phase 2:** product name unified on the existing NexaBank / Bank Management System lockup and centralised in `brand.js` config files (frontend + backend) with guard tests; provisional until owner decisions D1–D6
- **Phase 5:** light, neutral direction — light sign-in/register panels and dashboard hero cards with plain copy, single accent colour, solid surfaces, emoji removed, self-hosted IBM Plex Sans (Google Fonts and its CSP hosts removed); stat-card icon clipping bug fixed
- **Phase 8:** chunking fixed with Rolldown `advancedChunks` (charts no longer loaded outside dashboards), fonts preloaded (layout shift 0.181 → 0); Lighthouse mobile performance 84 → 92–94
- Heading hierarchy re-levelled across pages; `<main>` on all auth pages; larger/labelled password toggles
- UI de-vibe pass: removed 7 decorative blurred orbs and 10 gradients (hero banners, logo/avatar tiles, account card, active sidebar link) in favour of solid colours; replaced sparkle icons; replaced stock marketing copy with plain statements; Service Center heading is now "Service Center"
- **Behaviour change when encryption is enabled:** admin/employee KYC search matches a document number by exact value only (partial-number search is impossible on encrypted data); name/email search is unchanged
- Pages lazy-loaded (entry chunk 288 kB → 37 kB); nginx caches only hashed assets, revalidates the SPA shell
### Removed
- Stray files: `backend/backen/.env`, `User.js.phase2-backup`, empty brace-named directories
- Root `.npmrc` (legacy-peer-deps workaround)
