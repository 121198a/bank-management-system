## Unreleased (branch upgrade/master-kit)
### Security
- Production-safe error responses; request-id in error body; CastError no longer echoes input
- API CSP (`default-src 'none'`), HSTS (prod), referrer policy; nginx CSP + security headers
- Backend dependency advisories cleared (nodemailer 10, mongoose 8.24.5, morgan 1.12.1, express 4.22.3)
- Compose: `TRUST_PROXY=true`, backend not published to host, healthchecks, `NODE_ENV=production`
### Fixed
- **Rate limiters no longer share one counter per IP** (first login after ~12 normal API calls returned 429); per-limiter buckets, expiry sweep, configurable limits
- Frontend `npm ci` failure (Vite 8 peer conflict); ESLint scanning `dist/`; 9 lint errors; unused KYC loading state
### Added
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
