# Applying the upgrade on your machine (Windows PowerShell)

The zip deliberately excludes `node_modules`, and several `package.json` files changed (Vite 8, `@fontsource/ibm-plex-sans`, `ioredis`, Vitest, Playwright, dev tooling). **After copying the new files you must reinstall inside `backend/` and inside `frontend/`** — never at the repository root.

## 0. Requirements
- Node.js **20.19+ or 22.12+** (`node -v`). Vite 8 needs at least the range Vite 7 needed; `npm ci` warns if yours is too old.
- MongoDB as before. **Redis is optional** — leave `REDIS_URL` unset locally and the app uses in-memory rate limiting.

## 1. Clean up a stray root install (only if you ran `npm install <something>` in the project root)
No `package.json` exists at the repo root, so a root install creates an unwanted one plus `node_modules`.
```powershell
cd C:\Users\HP\Desktop\Project\bank-management-system
git status --short                      # root package.json / package-lock.json showing as "??" = created by mistake
Test-Path .\node_modules                # True = a root node_modules was created
Remove-Item -Recurse -Force .\node_modules, .\package.json, .\package-lock.json -ErrorAction SilentlyContinue
```
Only delete them if they are untracked/unwanted — they are not part of this project.

## 2. Backend
```powershell
cd backend
npm ci          # exact versions from package-lock.json (includes ioredis)
npm test        # expect: 68 pass, 15 skipped
```
Start it the way you normally do.

## 3. Frontend
```powershell
cd ..\frontend
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm ci
npm run lint ; npm test ; npm run build     # expect: lint clean, 27 tests pass, build succeeds
npm run dev                                  # banner should say VITE v8.x
```
Check you really have the new manifests: `Select-String package.json -Pattern '"vite"','fontsource'` must show `^8.` and `@fontsource/ibm-plex-sans`. If not, copy `package.json` **and** `package-lock.json` from the zip first.

## 4. Troubleshooting
| Symptom | Cause | Fix |
|---|---|---|
| `Failed to resolve import "@fontsource/ibm-plex-sans/latin-400.css"` | frontend dependencies not reinstalled (a stale install is also why the banner shows Vite 7) | step 3 |
| `Cannot find module 'ioredis'` | backend dependencies not installed in `backend/` | step 2 (do not install it at the root) |
| `ERESOLVE` / peer-dependency errors | old `node_modules` or lockfile mixed with the new `package.json` | delete `node_modules`, copy both manifest files from the zip, `npm ci` |
| `npm install` reports many vulnerabilities | different dependency tree than the one audited | run `npm audit --omit=dev` **inside** `backend/` (expect 0) and `frontend/` (expect 2 moderate: react-router SSR advisory, accepted). Dev-only: 3 high in the `nodemon` chain, accepted. **Do not run `npm audit fix --force`** — it proposes downgrading nodemon to a 2017 release. If a *critical* remains inside backend/frontend after a clean `npm ci`, send the output. |
| Sign-in page shows API errors | backend not running | start it (frontend proxies `/api` to port 5000) |

## 5. "Invalid email or password" when signing in
The `TEST_CUSTOMER_*` / `TEST_EMPLOYEE_*` lines in `.env` are **notes only** — no code reads them and they do not create accounts. The login answers "Invalid email or password" in exactly three cases (it never says which, on purpose): **no such user in the database you are connected to**, **the user is deactivated**, or **the password does not match**. Repeated failed attempts do **not** lock an account (they only raise a fraud alert after 5 in 15 minutes).

Find out which one (read-only; writes nothing, prints no passwords or hashes), from `backend/`:
```powershell
node scripts/check-login.js --list                                  # who exists in this database
node scripts/check-login.js abhishek.customer1.2026@bank.local      # exists? active?
$env:CHECK_PASSWORD = 'the-password-you-type'                       # optional: also test the password
node scripts/check-login.js abhishek.customer1.2026@bank.local
Remove-Item Env:CHECK_PASSWORD
```
| Result | Meaning | Fix |
|---|---|---|
| `NOT_FOUND`, or "This database has NO users" | wrong or fresh database, or the account was never created | compare the database name with the one you used before; create customers on the Register page; create employees as an admin (Users → Create); no admin yet → set `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` (12+ chars) in `backend/.env` and run `npm run seed` (it creates **or resets** that admin) |
| `INACTIVE` | user deactivated | an admin re-activates the user |
| `WRONG_PASSWORD` | stored password differs | "Forgot password" (needs working SMTP) or recreate the user |
| `OK` | credentials are fine | check the browser Network tab: request reaches port 5000? HTTP 429 (rate limit)? CORS? |
