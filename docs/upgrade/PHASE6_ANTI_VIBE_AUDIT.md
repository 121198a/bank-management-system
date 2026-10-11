# Phase 6 — 30-item anti-vibe audit (scored)

**Method and limits.** Each check was measured against the frontend source (63 `.jsx` files) with counts, then the matches were read in context. Copy was read on the auth pages, the Service Center and the dashboard banners only. **Nothing was inspected visually** (no browser available), so spacing, rhythm and "feels generic" judgements are not covered. The kit says to use the list as an audit, not an automatic removal order; **no redesign was performed** (that is Phase 5 and needs the owner's direction decision).

## Verdicts
| # | Check | Verdict | Evidence |
|---|---|---|---|
| 1 | Harsh gradients | **Pass (fixed)** | Was 49 uses in 10 files. All hero banners, logo/avatar tiles, the account card, the active sidebar link and the primary button are now solid colours. One subtle `primary-50 → transparent` tint behind the sidebar header remains |
| 2 | Default icon library | Minor | `lucide-react` in 40 files, 67 distinct icons. Normal for a back-office app; no custom iconography |
| 3 | Pure-white canvas | Pass | App canvas is `slate-50` / dark navy; white is used for cards |
| 4 | Rainbow colouring | **Pass (fixed)** | Stat cards and quick-action tiles used 5 different hues; now one accent (green) for all decorative tiles. Remaining colour is semantic only (status, warnings, errors) |
| 5 | Shadows on everything | Pass | 40 uses in 14 of 63 files |
| 6 | Identical 3-card rows | Minor | 10 uses; these are KPI stat grids, which suit dashboards |
| 7 | Emojis as design assets | **Pass (corrected and fixed)** | **My first audit said "none" and was wrong** (the grep could not match emoji). A Unicode-aware scan found a waving-hand emoji in the customer and employee dashboard headings and a warning sign in employee accounts; all removed |
| 8 | Glassmorphism everywhere | **Pass (fixed)** | Translucent/blurred surfaces (navbar, chips, sidebar) are now solid; the unused `.glass-panel` utility was deleted |
| 9 | Formulaic AI-style copy | **Pass (fixed)** | Replaced "Everything banking, in one place.", "Everything important about your money, in one place." and "Built for secure banking operations" with plain statements; the Service Center `<h1>` is now "Service Center" (it also feeds the browser tab title). "Secure session" → "Signed in" |
| 10 | Default trendy font | **Pass (changed)** | Inter replaced with self-hosted IBM Plex Sans (a more distinctive, banking-appropriate face; not a bespoke brand typeface) |
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
| 30 | Generic pastel blocks | **Minor** | Tinted icon tiles are now a single accent and status badges keep semantic tints; no pastel rainbow remains. Not removed because badges are functional |

**Totals (after the Phase 5 pass): 23 pass · 5 minor/justified (2 icon library, 6 KPI grids, 25 arrows, 28 hover motion, 30 status badges) · 2 partial (26, 27: draft legal pages) · 0 recommend-change.**

Everything the checklist flags objectively has now been addressed; what remains is functional (status badges, KPI grids) or waiting on legal review.

## Changed (Phase 6 pass, plus accessibility fixes found while doing it)
- Removed the repeated dark "premium hero" decoration: 7 blurred orbs, 6 hero gradients (now solid `slate-900`), 4 logo/avatar/card gradients (now solid `primary-700`).
- Sparkle icons replaced with meaningful ones; stock marketing headlines replaced with plain statements; an unsupported "Built for secure banking operations" claim removed.
- **Contrast defects found by this scan and fixed:** the active sidebar link (white on a green→emerald gradient, 3.3–3.8:1) is now solid `primary-700` (5.0:1); avatar initials and logo tiles that sat on `primary-500` (2.3:1) are now `primary-700`.
- Earlier: primary button gradient → solid (3.3:1 → 5.0:1).
- **Not changed:** glass/translucent surfaces, typeface, pastel status/icon blocks, layout, spacing. No browser was available, so none of this was looked at visually; the banners are simply plainer than before.

## Phase 5 pass (visual direction), verified in a browser
Direction taken: the kit's stated default — **light and neutral unless dark is genuinely required**. The app keeps its dark theme as a user choice; light is the default look.
- Sign-in and register: the large dark hero panel became a light panel with plain, factual copy ("Accounts, transfers, loans and insurance."); the stock headline, "Secure digital banking workspace" chip and four-item checkmark grid were removed.
- Dashboards and Service Center: dark navy banners became light cards in light mode (still dark in dark mode); wave emoji removed.
- **Layout bug found by looking at the real screen:** on the customer dashboard the first stat card's icon was clipped at 1280 px because the text column had no `min-width: 0`, so a long balance pushed it out of the card. Stat cards now put the icon beside the title and give the value the full width; verified at 375 and 1280 px.
- Removed a hover-rotate animation, the "Secure" label next to the page title, and an unsupported "at a glance" phrase.
- Screens were reviewed as screenshots at 1280 px light, 1280 px dark and 375 px light (customer dashboard) and 1280 px light (sign-in). **Other pages were not visually reviewed.**
