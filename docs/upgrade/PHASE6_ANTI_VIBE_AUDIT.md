# Phase 6 — 30-item anti-vibe audit (scored)

**Method and limits.** Each check was measured against the frontend source (63 `.jsx` files) with counts, then the matches were read in context. Copy was read on the auth pages, the Service Center and the dashboard banners only. **Nothing was inspected visually** (no browser available), so spacing, rhythm and "feels generic" judgements are not covered. The kit says to use the list as an audit, not an automatic removal order; **no redesign was performed** (that is Phase 5 and needs the owner's direction decision).

## Verdicts
| # | Check | Verdict | Evidence |
|---|---|---|---|
| 1 | Harsh gradients | **Pass (fixed)** | Was 49 uses in 10 files. All hero banners, logo/avatar tiles, the account card, the active sidebar link and the primary button are now solid colours. One subtle `primary-50 → transparent` tint behind the sidebar header remains |
| 2 | Default icon library | Minor | `lucide-react` in 40 files, 67 distinct icons. Normal for a back-office app; no custom iconography |
| 3 | Pure-white canvas | Pass | App canvas is `slate-50` / dark navy; white is used for cards |
| 4 | Rainbow colouring | Minor | Green 111, red 73, yellow/amber 71, blue 48, orange 21, purple/violet 21. Mostly semantic status colours; purple/violet appears in 4 files as decoration |
| 5 | Shadows on everything | Pass | 40 uses in 14 of 63 files |
| 6 | Identical 3-card rows | Minor | 10 uses; these are KPI stat grids, which suit dashboards |
| 7 | Emojis as design assets | Pass | none |
| 8 | Glassmorphism everywhere | **Recommend change** | `backdrop-blur` in 7 files plus a `.glass-panel` utility (navbar, hero chips). Limited, not everywhere |
| 9 | Formulaic AI-style copy | **Pass (fixed)** | Replaced "Everything banking, in one place.", "Everything important about your money, in one place." and "Built for secure banking operations" with plain statements; the Service Center `<h1>` is now "Service Center" (it also feeds the browser tab title). "Secure session" → "Signed in" |
| 10 | Default trendy font | **Recommend change** | Inter via Google Fonts, no display face or art direction |
| 11 | Repeated coloured left stripes | Pass | 2 uses |
| 12 | Fake testimonials | Pass | none |
| 13 | Bento grids | Pass | none |
| 14 | Fake terminal windows | Pass | `font-mono` is used only for account numbers, IDs and amounts |
| 15 | Formulaic "not X, but Y" copy | Pass | 0 regex matches (regex-limited) |
| 16 | Checkmark bullets | Pass | 12 check icons, all success/approve states |
| 17 | Three-tier pricing | Pass | none |
| 18 | No real product evidence | Pass | It is a working product (121 API routes); no screenshots or invented metrics |
| 19 | Same soft radius everywhere | Pass | Mixed: `xl` 48, `full` 30, `lg` 27, `2xl` 17 |
| 20 | Purple + black by default | Pass | Hero is near-black slate with green accent; purple is a minor accent |
| 21 | No skeleton loaders | Pass | Skeleton components used in 20 files (KYC page gap fixed earlier) |
| 22 | Radial orbs | **Pass (fixed)** | All 7 blurred orbs removed (sign-in, register, 3 dashboards, Service Center) |
| 23 | Dot grids | Pass | none (the radial gradients are page tints) |
| 24 | Sparkle icons | **Pass (fixed)** | `Sparkles` removed everywhere: Service Center now uses a life-buoy icon, dashboard chips a bank icon |
| 25 | Animated arrows | Minor | 6 uses |
| 26 | No terms where applicable | **Partial** | `/terms` exists but is a **draft template** needing legal review |
| 27 | No privacy information | **Partial** | `/privacy` exists but is a **draft template** needing legal review |
| 28 | Hover animation on everything | Minor | 16 lift/scale hovers, e.g. navbar icon actions |
| 29 | Neon colours as identity | Pass | none |
| 30 | Generic pastel blocks | **Recommend change** | 139 uses of `bg-*-50/100`: the heaviest pattern, mostly status badges and icon tiles |

**Totals (after this round): 20 pass · 3 recommend change (8 glass surfaces, 10 default font, 30 pastel status/icon blocks) · 5 minor/justified · 2 partial (draft legal pages).**

The three remaining items are design taste rather than defects: translucent navbar/chips (check 8), Inter as the only typeface (10), and pastel badge/icon tiles (30). They are left for the Phase 5 direction decision, since changing them alters the look of every screen.

## Changed (Phase 6 pass, plus accessibility fixes found while doing it)
- Removed the repeated dark "premium hero" decoration: 7 blurred orbs, 6 hero gradients (now solid `slate-900`), 4 logo/avatar/card gradients (now solid `primary-700`).
- Sparkle icons replaced with meaningful ones; stock marketing headlines replaced with plain statements; an unsupported "Built for secure banking operations" claim removed.
- **Contrast defects found by this scan and fixed:** the active sidebar link (white on a green→emerald gradient, 3.3–3.8:1) is now solid `primary-700` (5.0:1); avatar initials and logo tiles that sat on `primary-500` (2.3:1) are now `primary-700`.
- Earlier: primary button gradient → solid (3.3:1 → 5.0:1).
- **Not changed:** glass/translucent surfaces, typeface, pastel status/icon blocks, layout, spacing. No browser was available, so none of this was looked at visually; the banners are simply plainer than before.
