# Pre-deployment audit: the four master prompts, executed

You asked for these prompts to be run before pushing to GitHub and deploying to Vercel. **No scanner output was supplied**, so I could not read or reproduce any scanner score or quote its lines; I measured the underlying properties directly instead (real browser, raw HTML and rendered DOM). If you have the scanner's numbers, run it again on the new build and send me the output - I cannot say what it will score.

Placeholders for prompt 1: site URL not decided yet (Vercel URL unknown); purpose = login and dashboards for a bank management system; indexing = **no** (private app; kept `noindex`).

## Prompt 1 - semantic HTML and SEO
**Measured before -> after** (9 pages; raw HTML and rendered DOM, headless Chromium):
| Property | Before | After |
|---|---|---|
| Landmarks in the *served* HTML (what a non-JS crawler sees) | 0, no `<main>`, no `<h1>` | `<main>` + `<h1>` in a `<noscript>` fallback |
| Form controls without a programmatic label (placeholder only, no `id`/`for`) | 9 on the auth pages (the shared `Input`/`Select` never linked labels; app-wide) | **0** |
| Controls with a `name` (needed for autofill/password managers) | missing on all auth inputs | present |
| Distinct `<title>` across 9 pages | 7 | **9** |
| Distinct meta descriptions | 1 (one static value) | 7 (dashboards intentionally keep the default) |
| `<main>` per page / `<h1>` per page | 1 / 1 on rendered pages | unchanged |
| Heading skips / unlabeled buttons | 0 / 0 on measured pages | 0 / 0 |
| Images without `alt` | the app has no `<img>` tags | n/a |
Files: `components/ui/Input.jsx`, `Select.jsx` (id/htmlFor/aria-invalid/aria-describedby), the four auth pages, `hooks/usePageMeta.js` (new), `LegalPage.jsx`, `NotFound.jsx`, `Navbar.jsx`, `ManagementFilterBar.jsx`, `admin/Users.jsx`, `index.html`.
**Unresolved / unexplained:** no scanner lines were available, so nothing is claimed about them. Canonical URL, `og:url`, `og:image`: **not added** (no real production URL or image yet). `robots.txt` stays `Disallow: /` and `<meta robots noindex>` stays: correct for a private app. A client-rendered SPA cannot give crawlers real page content without pre-rendering; that was **not** done because the site should not be indexed.
**Needs your input:** production URL, brand/legal name (D1-D6), indexing decision, og:image (only if you want link previews).

## Prompt 2 - div soup
Measured per page: 120-500+ DOM nodes, depth up to 16 on dashboards, 20-31% `<div>`, 3-18 single-child wrapper `<div>`s. I inspected every one of them: **none is classless or redundant**. They are icon tiles (`w-10 h-10 rounded-xl ... flex items-center justify-center` around an SVG), page containers, and positioning wrappers for input icons - all carry layout or visual classes. The remaining "empty" divs are the toast library's fixed container and Recharts internals. **No wrappers were removed** - doing so would have meant merging classes into children for no real gain and risking layout. Landmarks already correct: dashboards have `<header>`, `<nav>`, `<aside>`, `<main>`; auth pages have `<main>` (+ labelled `<aside>` on sign-in/register). A naive single-child-div score would flag the icon tiles as soup; that would be a false positive, not a defect. **Final diagnostic score: not available (tool not provided).**

## Prompt 3 - Tailwind soup density
Tailwind 3.4.19, React 18, Vite 8. Across **1,312** class strings in 59 files: mean 3.4 classes, median 3, p95 7, max 21 (one string over 20). **Exact duplicate utilities: 0. Same-variant conflicting utilities: 0** (checked for 12 property groups: text size, weight, display, position, flex direction, text align, radius, overflow, align/justify items, shadow, border width - spacing/colour conflicts were *not* checked). Repeated long patterns: 2 -> consolidated into `.hero-chip` (4 uses) and `.field-icon` (3 uses) in `index.css`, matching the existing `.input-field`/`.btn-primary` convention. Everything else was left: short strings repeated across components are normal Tailwind.
CSS bundle: 62.76 kB (10.34 kB gzip) -> **58.95 kB (9.77 kB gzip)**. That reduction comes mostly from removing the nine rainbow gradient classes, an unused shine-sweep rule and glass effects, not from the two consolidations - I am not claiming a runtime performance gain.

## Prompt 4 - bento / AI sparkles / template look
Scanned with Unicode-aware matching (an earlier regex scan wrongly reported "no emoji" - corrected in `PHASE6_ANTI_VIBE_AUDIT.md`):
| Pattern | Now |
|---|---|
| Sparkle icons / glyphs, emoji, "magic / AI-powered" copy | **0** (removed earlier) |
| Rainbow decorative colours | **0** - the **Service Center** still had 9 different gradient tiles (my first scan missed them because the colours live in a data array); now one accent, like the dashboards |
| Shine-sweep hover effect, sidebar glass blur | removed |
| Repeated cards / grids | KPI stat grids and quick-action tiles are functional (data and shortcuts), kept; most repeated recipe is `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` x6 |
| Kept on purpose | toast backdrop blur (legibility over content); orange/yellow `border-l-4` stripes on the 2 employee "pending items" alert cards (semantic); small hover lifts on clickable cards; page-background and skeleton-shimmer gradients |
Visual regression (24 screenshots = 6 screens x 2 sizes x 2 themes, clock frozen): **14 pixel-identical; 6 desktop dashboards differ only in text anti-aliasing inside the sidebar** (removing `backdrop-filter` changes the browser's text rendering mode, no layout/colour change - confirmed on an amplified diff); **4 Service Center screenshots differ as intended**. Not covered: other screens, other browsers, real devices.

## Bug sweep and verification (all executed)
| Check | Result |
|---|---|
| Frontend lint / build | clean / succeeds |
| Frontend unit tests | **42 passed** (new: label association, page meta hook, Vercel config) |
| Backend tests | **74 passed, 0 failed, 15 skipped** (10 need MongoDB, 5 need Redis; new: login diagnostic, trust-proxy parsing) |
| Browser suite (headless Chromium) | **187 passed**: 120 viewport/overflow, 31 public-page axe (incl. best-practice rules) + labels/titles/no-JS, 36 dashboard axe |
| CSP check with `vercel.json` headers | **0 violations** across 22 page/theme combinations incl. deep-link refresh, 404, 3 dashboards; 4 web-font faces loaded |
| `npm audit --omit=dev` | backend 0; frontend 2 moderate (react-router SSR advisory, app is client-only) |
Real bugs found and fixed this round: unlabeled form controls app-wide (no autofill names either), identical titles on auth pages, Service Center rainbow tiles, repeated decorative effects, and `TRUST_PROXY=true` being forgeable behind several proxies (now a hop count; compose uses 1).
My own harness mistakes (no effect on the product): screenshots compared across a drifting sandbox clock (redone with the clock frozen), and a timed-out test run that left no server for the next run (65 false failures; the clean re-run passed).

## Not verified / not possible here
Real Vercel build and runtime, GitHub push, real MongoDB (10 end-to-end tests, backup/restore, KYC migration), real email, WebKit/Firefox, real devices, screen readers, the scanner you used, and any screen not listed above.
