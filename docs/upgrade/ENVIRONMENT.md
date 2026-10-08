# Environment variable contract (names only — never commit values)

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
