# Bank Management System

A full-stack banking-management application built with React, Vite, Node.js, Express, MongoDB/Mongoose, JWT authentication, RBAC, KYC workflows, audit logging, notifications, and PDF statements.

> **Important:** This project implements engineering controls for a banking-style application. It is **not** a legal, regulatory, AML/KYC, PCI, privacy, or banking-compliance certification. Real-world deployment requires organization-specific security review, legal/regulatory review, operational controls, monitoring, incident response, and approval.

## Architecture

```text
React + Vite
   │ Axios + HTTP-only refresh cookie
   ▼
Express REST API
   │ JWT + RBAC + object-level authorization
   ▼
Mongoose / MongoDB
   │ Decimal128 money + MongoDB transactions
   ▼
Financial records / audit / KYC / notifications
```

## Roles

- **Admin:** system/user/account/KYC/audit administration.
- **Employee:** customer-support/account approval/KYC/transaction monitoring according to backend route permissions.
- **Customer:** own profile, accounts, KYC, statements, and own financial operations.

Backend authorization is authoritative. Frontend route guards are only a UX layer.

## Financial integrity controls

- Monetary values use MongoDB `Decimal128` internally and are restricted to INR with at most two decimal places.
- Deposits, withdrawals, and transfers use MongoDB sessions/transactions. There is **no unsafe sequential fallback** for financial operations.
- Transfers update both accounts and both transaction legs atomically.
- Every money-moving request requires an `Idempotency-Key` and is protected against duplicate submissions.
- Transaction references and operation IDs are generated server-side.
- Financial records use immutable fields for core transaction identity and amounts.
- Account lifecycle supports `pending`, `active`, `rejected`, `frozen`, `suspended`, and `closed` with server-side transition rules.
- Initial deposits are held as pending application data and are credited only when the account is approved.

## Authentication and security controls

- bcrypt password hashing with a work factor of 12.
- Short-lived JWT access tokens.
- HTTP-only, secure-in-production refresh-token cookie with rotation and reuse detection.
- Access tokens are held in frontend memory, not `localStorage`/persistent storage.
- Token-version revocation invalidates previously issued access tokens after sensitive account changes.
- Password reset tokens are single-use, hashed at rest, and time-limited.
- Generic login/reset responses reduce account enumeration.
- Security headers via Helmet.
- CORS allowlist.
- JSON/body size limits.
- Request IDs and rate limiting.
- Regex search input is escaped before database use.
- Audit logs redact passwords, tokens, OTPs, and KYC document identifiers/URLs.
- Production API errors do not expose stack traces.

## Setup

### Prerequisites

- Node.js 20+
- MongoDB 7+ or MongoDB Atlas
- MongoDB must support replica-set transactions for financial operations. MongoDB Atlas is the simplest option for development; a local deployment should be configured as a single-node replica set if transactions are required.

### 1. Backend environment

```powershell
cd backend
Copy-Item .env.example .env
```

Generate two different JWT secrets:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Put the generated values into `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

Set `MONGO_URI` to your local MongoDB or Atlas connection string.

For the initial administrator, set:

```env
ADMIN_SEED_EMAIL=your-admin-email@example.com
ADMIN_SEED_PASSWORD=your-unique-password-at-least-12-characters
ADMIN_SEED_FULL_NAME=System Administrator
```

Never commit `.env`.

### 2. Install and seed

```powershell
cd backend
npm install
npm test
npm run indexes
npm run seed
npm start
```

If upgrading an existing pre-production database, back it up and run `npm run migrate-money` once before `npm run indexes`. The migration converts historical balances/transaction amounts to Decimal128 and adds transaction metadata; review the resulting data before accepting it as authoritative. Then run `npm run indexes` against the target database. Index creation will fail if existing data violates a new uniqueness rule.

The seed command creates/resets only the administrator configured through environment variables. No administrator password is stored in source code.

### 3. Frontend

The supplied frontend lockfile currently pins Vite 8 while the older checked-in `@vitejs/plugin-react` release declares an older Vite peer range. The root `.npmrc` enables npm's legacy peer resolution so the existing lockfile can still be installed. Before a production CI baseline is frozen, regenerate the frontend lockfile with the Vite-8-compatible `@vitejs/plugin-react` 6.x release.

```powershell
cd frontend
npm install
npm run lint
npm run build
npm run dev
```

Vite proxies `/api` to `http://localhost:5000` during development.

## API health

- `GET /api/health` — liveness check.
- `GET /api/ready` — readiness check; returns `503` if MongoDB is not connected.

## Financial API requirement

The following endpoints require a unique `Idempotency-Key` header with 16–128 safe characters:

```http
POST /api/transactions/deposit
POST /api/transactions/withdraw
POST /api/transactions/transfer
Idempotency-Key: a-unique-client-generated-key
```

The same key must never be reused for a different request body.

## Important operational requirements

1. Use HTTPS in production.
2. Configure `CLIENT_URL` to the exact trusted frontend origin(s).
3. Set `TRUST_PROXY=true` only when the deployment is actually behind a trusted reverse proxy/load balancer.
4. Store production secrets in a secret manager/environment configuration, not in Git.
5. Rotate any credentials that have ever been committed to repository history.
6. Use MongoDB backups, restore testing, monitoring, alerting, and disaster-recovery procedures.
7. The included in-process rate limiter is suitable for a single backend instance. A multi-instance deployment should use a shared rate-limit store/gateway.
8. KYC document URLs are not a complete secure document-storage system. Real deployment should use private object storage, controlled download authorization, malware scanning, retention rules, and organization-specific KYC/AML controls.

## Testing

Backend unit tests:

```powershell
cd backend
npm test
```

Frontend static checks/build:

```powershell
cd frontend
npm run lint
npm run build
```

For end-to-end financial testing, run against a dedicated test MongoDB replica set and exercise authentication, RBAC, IDOR protection, account lifecycle, idempotency, concurrent transfers, insufficient funds, KYC workflow, and audit logging.

## Production deployment checklist

- [ ] Production secrets configured outside source control.
- [ ] Historical credentials rotated.
- [ ] HTTPS enabled.
- [ ] Exact CORS origins configured.
- [ ] MongoDB replica set and backups configured.
- [ ] Monitoring/alerting configured.
- [ ] Shared rate-limit strategy configured for multiple instances.
- [ ] Secure KYC document storage implemented.
- [ ] Security assessment completed.
- [ ] Legal/regulatory/AML/KYC/privacy review completed.
- [ ] Disaster recovery and restore procedures tested.
- [ ] Incident-response process approved.

## Known limitations

This repository is an engineering project, not a production banking platform certification. Payment-rail integration, AML transaction monitoring, sanctions screening, regulatory reporting, maker-checker controls, secure KYC document storage, HSM/key-management integration, reconciliation operations, and organization-specific compliance controls require additional design and validation before real financial use.
