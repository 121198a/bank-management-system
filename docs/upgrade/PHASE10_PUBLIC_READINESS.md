# Phase 10 — SEO, accessibility and public readiness

**Method and limits.** Contrast was first computed exactly (WCAG relative luminance), then everything was verified with **axe-core in headless Chromium 153** over the 6 public pages and the 3 role dashboards (mocked API), at phone and desktop sizes, in light and dark: **62 scans, 0 violations** after the fixes below, with axe's *best-practice* rules switched on as well as WCAG A/AA. This is automated testing only — axe finds roughly a third of accessibility problems. **No screen reader or manual keyboard walkthrough was done**, and the other ~30 logged-in pages were not scanned. Treat this as strong evidence, not a conformance claim.

## Accessibility — fixed
Found later, once best-practice rules and a Lighthouse run were added: **sign-in, forgot- and reset-password pages had no `<main>` landmark**; the sign-in side panel sat outside any landmark (now a labelled `<aside>`); **heading levels skipped** (`h1` → `h3`) after page titles were promoted — section headings re-levelled across 10 pages/components and `VolumeChart`, and modal body headings `h4` → `h3` under the modal's `h2` (the modal changes are reasoned, **not browser-tested**); the show-password button was below the minimum touch-target size (now ≈ 40 px) and the reset-password toggle had **no accessible name** (my earlier "icon buttons all carry labels" was wrong; two more unlabeled buttons fixed). Lighthouse accessibility on sign-in: 93 → **100**.

Found by the browser run (after the source-level pass): **sign-in and register had no visible `h1` on phones** (their only `h1` lived in the desktop-only hero panel; the visible title was an `h2`); mobile brand subtitle and 71 other `text-gray-500` strings had no dark-mode variant (3.0–3.7:1 on navy); `text-red-500` (sidebar Logout and 18 others, 3.6:1) → `red-600`; 5 explicit `dark:text-gray-500` → `gray-400`; `<main>` was a scrollable region with `tabindex=-1`, which axe flags as keyboard-inaccessible → focusable with a visible focus ring.

| Issue | Before | After |
|---|---|---|
| White on primary button | 3.30:1 (2.54:1 at gradient end) | **5.02:1** (hover 7.13:1) |
| Green links/labels on white (`text-primary-600`, 33 uses in 21 files) | 3.30:1 | **5.02:1** (`primary-700`), with a `dark:` companion so dark mode keeps 8–10:1 |
| Secondary text `text-gray-400` on white (106 uses in 31 files) | 2.54:1 | **4.83:1** (`gray-500`), dark mode keeps `gray-400` (5.8:1) |
| Input placeholders | 2.54:1 | 4.83:1 |
| Login/register footer text on near-black | 4.24:1 | 7.87:1 |
| Active sidebar link: white on green→emerald gradient | 3.30–3.77:1 | **5.02:1** (solid `primary-700`) |
| Avatar initials / logo tiles on `primary-500` | 2.28:1 | **5.02:1** (`primary-700`) |
| Focus ring / input focus border (`primary-500`, 2.3:1, below the 3:1 non-text minimum) | 2.3:1 | 3.3:1 (`primary-600`) |
| Dashboard pages had the same `<h1>` ("Customer Portal") everywhere; real page title was an `<h2>` | 7 of 35 pages had an h1 | every page has **exactly one h1 = its title** (25 titles promoted; navbar label is now a plain element) |
| Browser tab title never changed on dashboards | static | follows the page `<h1>` (also for lazy-loaded pages); tested |
| No skip link / `<main>` not targetable | — | "Skip to main content" link, focusable `main#main-content`; tested |

Already fine: `prefers-reduced-motion` is honoured (2 blocks in `index.css`), `lang="en"`, no `<img>` (so no alt text needed), icon-only buttons found carry `aria-label`, success/error states and loading skeletons exist.

## Accessibility — not verified / still open
- Only **13 colour pairs** were measured; badge and chart colours, hover/disabled states and text over translucent surfaces were not.
- Focus visibility is implemented in ~23 places but never seen in a browser; form errors are not confirmed to be announced to screen readers (`aria-live`/`aria-describedby` not audited).
- Charts (Recharts) have no text alternative or data table.
- Touch-target sizes and reflow at 320 px / 200 % zoom unverified (Phase 7).

## Public-readiness checklist (kit §10 + production-protection extras)
| Item | Status |
|---|---|
| Custom 404 | Done |
| Title / description / Open Graph / theme-color | Done. **No OG image** (the app is intentionally `noindex`, so low value) |
| Favicon | SVG only; no PNG/apple-touch-icon fallback |
| robots.txt | `Disallow: /` + `noindex` meta (private banking app — deliberate) |
| Sitemap, canonical URLs | **Not applicable** by the same decision. If a public marketing site is ever added, revisit |
| Privacy / terms | **Draft templates**, need legal review |
| Real contact information | **Missing** — only bracketed placeholders (needs owner: D4 in `PHASE2_IDENTITY.md`) |
| Cookie consent | Only a strictly-necessary sign-in cookie and a theme preference in `localStorage`; no analytics or ad cookies. Many jurisdictions don't require a banner for strictly-necessary storage — **owner/counsel to confirm** (not legal advice) |
| Analytics | None. Product decision; if added, it changes the privacy text and the consent question |
| Security headers | Done (nginx + API) |
| HTTPS | **Not handled in this repo**: nginx listens on port 80; TLS must be terminated in front of it |
| Form states, success states | Present |
| Responsive breakpoints | Present in code, **unverified** |
