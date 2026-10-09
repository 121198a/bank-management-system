# Phase 6 — 30-item anti-vibe audit (scored)

**Method and limits.** Each check was measured against the frontend source (63 `.jsx` files) with counts, then the matches were read in context. Copy was read on the auth pages, the Service Center and the dashboard banners only. **Nothing was inspected visually** (no browser available), so spacing, rhythm and "feels generic" judgements are not covered. The kit says to use the list as an audit, not an automatic removal order; **no redesign was performed** (that is Phase 5 and needs the owner's direction decision).

## Verdicts
| # | Check | Verdict | Evidence |
|---|---|---|---|
| 1 | Harsh gradients | **Recommend change** | 49 uses in 10 files: dark slate→blue/violet hero banners on the 3 dashboards, Service Center, sign-in/register, and a green page backdrop. Not rainbow, but repeated. *(Primary button gradient removed in this phase — see below.)* |
| 2 | Default icon library | Minor | `lucide-react` in 40 files, 67 distinct icons. Normal for a back-office app; no custom iconography |
| 3 | Pure-white canvas | Pass | App canvas is `slate-50` / dark navy; white is used for cards |
| 4 | Rainbow colouring | Minor | Green 111, red 73, yellow/amber 71, blue 48, orange 21, purple/violet 21. Mostly semantic status colours; purple/violet appears in 4 files as decoration |
| 5 | Shadows on everything | Pass | 40 uses in 14 of 63 files |
| 6 | Identical 3-card rows | Minor | 10 uses; these are KPI stat grids, which suit dashboards |
| 7 | Emojis as design assets | Pass | none |
| 8 | Glassmorphism everywhere | **Recommend change** | `backdrop-blur` in 7 files plus a `.glass-panel` utility (navbar, hero chips). Limited, not everywhere |
| 9 | Formulaic AI-style copy | **Recommend change** | "Everything banking, in one place." and "Built for secure banking operations" (Service Center). Rest of sampled copy is plain. "Built for secure…" is also a claim nothing in the product backs |
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
| 22 | Radial orbs | **Recommend change** | 7 blurred orbs across sign-in, register, 3 dashboards and Service Center |
| 23 | Dot grids | Pass | none (the radial gradients are page tints) |
| 24 | Sparkle icons | **Recommend change** | `Sparkles` marks "Service Center" in all three sidebars and in two hero chips. A headset/help icon would say what the page is |
| 25 | Animated arrows | Minor | 6 uses |
| 26 | No terms where applicable | **Partial** | `/terms` exists but is a **draft template** needing legal review |
| 27 | No privacy information | **Partial** | `/privacy` exists but is a **draft template** needing legal review |
| 28 | Hover animation on everything | Minor | 16 lift/scale hovers, e.g. navbar icon actions |
| 29 | Neon colours as identity | Pass | none |
| 30 | Generic pastel blocks | **Recommend change** | 139 uses of `bg-*-50/100`: the heaviest pattern, mostly status badges and icon tiles |

**Totals: 16 pass · 7 recommend change · 5 minor/justified · 2 partial (draft legal pages).**

The same few elements account for most findings: the dark "premium" hero banner (gradient + blurred orbs + sparkle chip + stock headline) repeated on six screens, and pastel icon tiles. Replacing that one pattern with a plain page header would clear checks 1, 22, 24 and part of 8 and 9.

## Changed in this phase (accessibility, not redesign)
- Primary button was a green-to-emerald gradient with white text at 3.3:1 (2.5:1 at the emerald end). Now solid `primary-700`/`-800` (5.0:1 / 7.1:1), no gradient, no lift on hover.
- No other visual patterns were removed.
