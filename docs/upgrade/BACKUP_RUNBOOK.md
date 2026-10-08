# Backup, restore and monitoring runbook

## What exists
| Tool | Purpose | Tested how |
|---|---|---|
| `npm run backup` | Encrypted logical export of every collection to `backups/bank-<time>.bkp` + a manifest (counts + sha256, no personal data) | Library logic is unit-tested (12 tests: type fidelity, encryption, tamper/wrong-key/truncation detection, safety guards). **The CLI against a real MongoDB has not been run.** |
| `npm run restore -- <file>` | **Verify only** by default: authenticates the whole file, prints counts, writes nothing | same |
| `npm run restore -- <file> --apply --confirm=<db>` | Restore into an **empty** database | same — rehearse it first |

Backups contain password hashes, refresh-token hashes and personal data. They are encrypted with `BACKUP_ENCRYPTION_KEY` (32 bytes; see `.env.example`), files are created `0600`, and `backups/`, `*.bkp` are git-ignored.

## Important limits
- **Not a point-in-time snapshot.** Writes made while the export runs may or may not be included (money movement uses transactions, so individual transfers stay atomic, but two collections can reflect slightly different moments). For consistent production backups use `mongodump --oplog` or your cloud provider's snapshots, and treat this tool as a portable, encrypted second copy.
- **Key loss = backups unreadable.** Keep the key in a secrets manager, separate from the backups, and test that you can retrieve it.
- No retention/rotation logic: schedule and prune externally.
- Restore refuses a non-empty database by design. To restore over live data, restore into a new database, verify, then switch `MONGO_URI`.
- After any restore: `npm run indexes` (unique and partial indexes protect emails, idempotency keys, pending KYC).

## Backup procedure
1. `BACKUP_ENCRYPTION_KEY=… npm run backup` (from `backend/`).
2. Copy the `.bkp` and its `.manifest.json` **off the server**; compare the sha256 in the manifest after copying.
3. Record date, size and counts. Alert if counts drop sharply versus the previous backup.

## Restore rehearsal (do this before you need it — quarterly)
1. Create an empty scratch database (e.g. `bank_restore_test`), point `MONGO_URI` at it.
2. `npm run restore -- backups/<file>.bkp` → must print `VERIFIED OK` with the expected counts.
3. `npm run restore -- backups/<file>.bkp --apply --confirm=bank_restore_test`
4. `npm run indexes`, start the API, log in as a test user, check an account balance.
5. Record how long it took (this is your real recovery time) and drop the scratch database.

## Monitoring (nothing is wired up yet — no monitoring service exists in this repo)
Endpoints already provided: `GET /api/health` (process up, 200) and `GET /api/ready` (200 only when MongoDB is connected, otherwise 503). Docker Compose uses `/api/health` for container healthchecks.

Suggested external checks (any uptime service works):
| Check | Target | Alert when |
|---|---|---|
| Liveness | `GET https://<host>/api/health` every 1 min | non-200 for 2 consecutive checks |
| Readiness | `GET https://<host>/api/ready` every 1 min | 503 for 3 minutes (database trouble) |
| Frontend | `GET https://<host>/` | non-200 or response time > 3 s |
| TLS | certificate expiry | < 14 days |
| Backups | newest `.bkp` age | > 26 h |
| Errors | log lines containing `-> 5` (the error handler logs `[request-id] METHOD path -> status`) | spike versus baseline |
| Rate limiting | log line `Rate-limit store unavailable` | any occurrence (Redis down; limits degraded to per-process) |
