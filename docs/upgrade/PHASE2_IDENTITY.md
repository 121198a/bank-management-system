# Phase 2 — Product identity audit and migration plan

Status: **audit complete; names unified on a provisional basis.** The kit asks for approval before renaming. The owner then instructed that the remaining phases be completed without answering D1–D6, so I did *not* invent a brand: I kept the lockup the app already shows on its sign-in screen (name **NexaBank**, descriptor **Bank Management System**) and applied it everywhere, centralised so any later decision is a one-line edit. D1–D4 below are therefore still open questions, not settled ones.

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

## 4. What was executed, and how to change it later
- **One source of truth per side:** `frontend/src/config/brand.js` and `backend/src/config/brand.js` (`name`, `descriptor`; the frontend also builds document titles).
- Replaced 34 hard-coded occurrences: sign-in, register, forgot/reset password, sidebar, loading screen, 404, legal pages, tab titles, welcome notifications, email subjects and headings, PDF header, default email sender, OpenAPI title, `index.html` title/description/Open Graph.
- Conventions now consistent: product name = **NexaBank**; tab title = `<page heading> — NexaBank`; default title = `NexaBank — Bank Management System`; sender = `NexaBank <no-reply@example.com>`.
- **Guard tests** fail if a literal name appears in source outside the brand files (frontend and backend) or if the static `index.html` drifts from the config.
- **To rename:** edit the two `brand.js` files, then the static values in `frontend/index.html` (a test tells you if you miss one), `backend/.env.example` (`SMTP_FROM`) and `README.md`; run both test suites and `npm run docs:openapi`.
- **Deliberately not renamed:** git repository, npm package names, Docker service names, the MongoDB database name (renaming it would orphan data and needs its own migration). No route contains the brand, so no redirects are needed.
- **Still open (owner):** D1 final name, D2 trademark/domain check (I cannot do this), D3 legal entity for the footer and legal pages, D4 sender domain and contact addresses, D5 license holder, D6 logo (the current glyph is generic; I did not invent a brand mark).
