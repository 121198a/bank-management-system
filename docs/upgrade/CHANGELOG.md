## Unreleased (branch upgrade/master-kit)
### Security
- Production-safe error responses; request-id in error body; CastError no longer echoes input
- API CSP (`default-src 'none'`), HSTS (prod), referrer policy; nginx CSP + security headers
- Backend dependency advisories cleared (nodemailer 10, mongoose 8.24.5, morgan 1.12.1, express 4.22.3)
- Compose: `TRUST_PROXY=true`, backend not published to host, healthchecks, `NODE_ENV=production`
### Fixed
- Frontend `npm ci` failure (Vite 8 peer conflict); ESLint scanning `dist/`; 9 lint errors; unused KYC loading state
### Added
- 16 backend tests (error handler, rate limit, RBAC, HTTP integration); 404 page; error boundary; robots/OG/noindex meta; axios timeout; CI `npm audit` + least-privilege permissions
### Changed
- Pages lazy-loaded (entry chunk 288 kB → 37 kB); nginx caches only hashed assets, revalidates the SPA shell
### Removed
- Root `.npmrc` (legacy-peer-deps workaround)
