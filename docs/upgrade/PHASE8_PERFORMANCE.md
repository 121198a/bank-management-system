# Phase 8 — Performance (measured)

**Method and limits.** Lighthouse 13.5 against the production build (`vite preview`) of the sign-in page, mobile profile with *simulated* throttling, headless Chromium 153, in a sandbox. Absolute numbers depend on this machine and a missing backend, so use them to compare before and after, not as a promise about real devices. One page was measured; dashboards (which load the charts) were not. No load or concurrency testing was done.

## Before / after (same method)
| | Before | After (2 runs) |
|---|---|---|
| Performance score | 84 | **92 – 94** |
| Accessibility score | 93 | **100** |
| Best practices | 96 | 96 |
| Cumulative layout shift | **0.181** (poor) | **0** |
| First contentful paint | 2.4 s | 2.0 – 2.2 s |
| Largest contentful paint | 2.8 s | 2.5 – 2.8 s |
| Total blocking time | 90 ms | 110 – 120 ms |
| Transferred on sign-in | 303 KB, 17 requests | **205 KB, 16 requests** |
| Charting library (≈100 KB gzip) loaded on sign-in | **yes** | **no** |

## What produced the change
1. **Chunking bug** — the charts bundle contained React's core, so every page (and the entry script) statically imported it and `index.html` preloaded it. Replaced the substring rule with Rolldown `advancedChunks` groups with explicit priority (`vendor` 30 > `charts` 20). Verified on a clean build: the entry has no import of the charts chunk, it is not preloaded, and exactly one file (`VolumeChart`) imports it, so only dashboards pay for charting.
2. **Layout shift** — the centred sign-in form jumped when the web font arrived late and text re-wrapped. The three text faces are now preloaded as soon as the entry script runs.
3. **Self-hosted font** — IBM Plex Sans via `@fontsource` (4 weights, Latin subset, ≈94 KB total, only the weights/subset used are fetched). Removes the Google Fonts request and both Google hosts from the nginx CSP.
4. Earlier rounds: route-level lazy loading (main chunk 288 → ~42 kB), nginx gzip and immutable caching for hashed assets, 20 s API timeout.

## Still flagged by Lighthouse (explained, not fixed)
- *Browser errors logged to the console* — the sandbox has no backend, so the token-refresh call returns 502. Not a defect of the app.
- *Page is blocked from indexing* — deliberate (`noindex`, private banking app). It is why the SEO score is 63.
- FCP/LCP of ~2 s are under simulated slow-mobile throttling; render-blocking CSS is 62 kB (10 kB gzip). Not optimised further.

## Not done
Dashboard-page Lighthouse runs, real-device and real-network measurements, load testing, database query/index review under load (`npm run indexes` exists; whether it was run in production is unknown).
