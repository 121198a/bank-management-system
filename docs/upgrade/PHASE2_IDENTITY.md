# Phase 2 — Product identity audit and migration plan

Status: **audit complete; no renaming performed** (the kit requires approval first, and it forbids inventing brand claims).

## 1. Current identity (as found)
| Item | Finding |
|---|---|
| Product name | **Three competing names**: "NexaBank" (sign-in, register, sidebar, legal pages: 4 files), "Bank Management System" (HTML title, emails, PDFs, notifications, API docs, README: 18 files), and the sender domain `digitalbank.com` (SMTP default, and in the local `.env`) |
| Repo/package names | `bank-management-system`, `-backend`, `-frontend`; database `bank_management_system`; no author, repository or homepage fields; `license: MIT` declared in the backend but **no LICENSE file exists** |
| Logo | None. The favicon is a generic bank-building glyph (white columns on a green rounded square) |
| Colours | Consistent green `#16a34a` (favicon, theme-color, email headings, PDF header) with a dark slate/glass look in the app shell |
| Typography | Inter, loaded from Google Fonts |
| Copy | Plain and restrained. No fabricated statistics, testimonials, certifications or regulatory claims were found. README carries an explicit not-a-regulated-bank disclaimer (good, keep it) |
| URLs | No canonical URL or domain configured anywhere |

## 2. Fixed during this phase (safe, no brand decision involved)
1. **"Local development environment" was shown on the login and register pages in every build.** A production deployment would have told customers it is a dev environment. Now shown only in development builds (verified absent from the production bundle).
2. **Default email sender was `no-reply@digitalbank.com`**, a domain nobody here has shown ownership of. Default is now `no-reply@example.com`, and the server logs a warning in production if the sender still uses an example domain. (Your own `.env` sets its own value and is unaffected.)
3. **Backend package description said "Production-ready"**, which the kit forbids unless documented checks support it. Wording removed.

## 3. Decisions needed from the owner
| # | Decision | Why it matters |
|---|---|---|
| D1 | **Canonical product name** — keep "NexaBank", keep "Bank Management System", or choose another | Today customers see one name on sign-in and another in emails and PDFs |
| D2 | Is "NexaBank" free to use? | I cannot check trademarks or domains; do a search before committing to it |
| D3 | Legal entity name for the footer "© <year> …" and legal pages | Currently the product name stands in for a company |
| D4 | Sender domain and support/privacy/security contact addresses | Needed for `SMTP_FROM`, legal pages and the contact link |
| D5 | Copyright holder for a `LICENSE` file (or remove `license: MIT`) | A declared license with no file is ambiguous |
| D6 | Whether to commission a real logo | The current glyph is generic; I will not invent a brand mark |

## 4. Migration plan (execute only after D1–D6)
Files that carry the name, so the change is mechanical and reviewable:
- Frontend: `index.html` (title, description, og:title), `Sidebar.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`, `ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx`, `LegalPage.jsx`, `NotFound.jsx`, `LoadingScreen.jsx`
- Backend: `emailService.js` (subjects and headings), `pdfService.js`, `authController.js` and `userController.js` (welcome notifications), `config/env.js` (sender), `scripts/lib/openapi.js` (API title), `package.json` description
- Docs/ops: `README.md`, `.env.example`, `docs/upgrade/*`
Order of work: (1) centralise the name in one constants file per side (`frontend/src/config/brand.js`, `backend/src/config/brand.js`) with the current visible text preserved, so a rename becomes a one-line edit; (2) apply D1–D4; (3) update tests that assert titles; (4) regenerate `openapi.json`; (5) rebuild and re-run all suites.

**Deliberately not renamed even after approval unless required:** the git repository, npm package names, Docker service names and the MongoDB database name. Renaming the database would orphan existing data; if wanted it needs a migration plan of its own. No route paths contain the brand, so no redirects are needed.
