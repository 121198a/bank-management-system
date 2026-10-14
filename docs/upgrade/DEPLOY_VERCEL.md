# Deploying: frontend on Vercel, backend elsewhere, code on GitHub

**What I could and could not do.** I cannot push to GitHub or deploy to Vercel (no access to your accounts), and I never ran a real Vercel build. What *is* verified: the frontend builds, `vercel.json` parses and behaves as designed (unit tests), and the app runs without Content-Security-Policy violations when served with exactly the headers in `vercel.json` (22 page/theme combinations in a real browser, see `PREDEPLOY_AUDIT.md`).

## Architecture (and why)
- **Frontend (this repo's `frontend/`) -> Vercel.** Static Vite build.
- **Backend (`backend/`) -> a normal Node host** (Render, Railway, Fly.io, a VPS, ...). It is a long-running Express server with MongoDB (transactions need a replica set, e.g. MongoDB Atlas) - it does **not** run on Vercel as it is.
- **The browser only ever talks to the Vercel domain.** Vercel proxies `/api/*` to your backend. This matters: the sign-in refresh cookie is `HttpOnly; SameSite=Strict; path=/api/auth`, so calling a different domain from the browser would break staying signed in.

## 1. Backend first
Create the backend service from `backend/` (build: `npm ci`, start: `npm start`; Node 20.19+ or 22.12+) and set:
| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | Atlas replica-set URI |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | two different random strings, 32+ chars - **new ones, not the ones from the ZIP** |
| `CLIENT_URL` | your Vercel URL, e.g. `https://your-app.vercel.app` |
| `TRUST_PROXY` | hop count - start with `2` (Vercel + your host's router), see below |
| `SMTP_*`, `SMTP_FROM` | real mail settings (sender on a domain you control) |
| optional | `REDIS_URL`, `KYC_ENCRYPTION_KEY`, `BACKUP_ENCRYPTION_KEY` (see `ENVIRONMENT.md`) |

Then run `npm run indexes` once and `npm run seed` (needs `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`, 12+ chars) to create the first admin. Check `https://<backend>/api/health` returns 200 and `/api/ready` returns 200 (database connected).

**TRUST_PROXY:** I could not verify your real hop count. Too high = a client can forge `X-Forwarded-For` and dodge the rate limiter; too low = all users share one IP and get rate-limited together. Test after deploy: sign in 11 times in a minute from your own machine - you should get HTTP 429 - then from a different network confirm you are not blocked.

## 2. Point the frontend at the backend
From `frontend/`:
```powershell
npm run vercel:api-origin -- https://YOUR-BACKEND-HOST
```
This writes the rewrite `/api/:path*` -> `https://YOUR-BACKEND-HOST/api/:path*` into `vercel.json` (before the SPA fallback). It refuses `http://` (except localhost), paths and credentials. Commit the change.

## 3. Push to GitHub
```powershell
git push origin pre-upgrade-20261006
git push origin upgrade/master-kit      # then open a pull request; do not force-push
```
Before pushing, run `git status`: nothing named `.env`, `backup-*.json` or a root `package.json`/`node_modules` should be staged.

## 4. Vercel project settings
- Import the GitHub repo. **Root Directory: `frontend`**. Framework preset: Vite. Build command `npm run build`, output `dist` (already in `vercel.json`).
- Node.js version: 22.x (the frontend declares `>=20.19`).
- No environment variables are needed for the frontend.
- Deploy, then open the site and check, in this order: `/login` loads with the IBM Plex font; refreshing on `/dashboard` (after signing in) does not 404; sign-in works and **stays** after a page refresh (that proves the cookie/proxy design); the browser console shows no CSP errors.

## 5. After deploy
- Add your real domain, set `CLIENT_URL` to it, and update the `og:*`/canonical values only if you decide the site should be indexed (see below).
- The site is **`noindex`** on purpose (private banking app). To change that you must also decide what public pages exist; do not just remove the tag.
- Rotate every secret that was in the ZIP's `.env` (still open).
- Put monitoring on `/api/health` and `/api/ready` (`BACKUP_RUNBOOK.md`).

## Known limits
- Vercel's rewrite proxy has request-time limits (a slow backend request can be cut off); the API timeout in the app is 20 s.
- `vercel.json` rewrites and header behaviour on Vercel itself were not run here; they follow Vercel's documented format and were tested only as a config + local-server equivalent.
- If the site must be reachable without JavaScript, this is a client-rendered SPA: the served HTML has only a `<noscript>` message with a real `<main>`/`<h1>`.
