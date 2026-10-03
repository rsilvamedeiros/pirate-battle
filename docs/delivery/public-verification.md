# Public deployment verification

Date: 2026-10-03. Production URL: [Pirate Battle on Vercel](https://game-pirate-battle.vercel.app/).

## Executed checks

Checks used fresh local Playwright Chromium contexts against the public HTTPS origin, without Vercel authentication. These are deployed smoke checks, separate from the [176-case local regression suite](artifacts/2026-10-03-release/README.md). Browser errors were observed; no unhandled JavaScript page errors occurred in the three completion/recovery flows.

| Check | Observation |
| --- | --- |
| Public access and refresh | HTTP 200; Play visible on first visit and reload |
| Production MSW | Active controller at `/pirate-battle-worker.js`; Ranking displayed fixture data after reload |
| Static resources | Worker wrapper, generated MSW worker and supplied player ship PNG returned HTTP 200 |
| Options persistence | Saved duration of 60 seconds survived refresh in Pixel 7 emulation |
| Match registration | Real lethal-Chaser completion using gated seed/manual-clock preparation; confirmed match appeared once in Ranking and Match History and remained confirmed after refresh |
| Post-commit timeout | Same completed match recovered and appeared once in both tabs |
| Offline completion | Pending match survived refresh; Recover connection confirmed it once in both tabs |

Completion checks used `?e2e=1&seed=42&fixture=lethal-chaser` with each selected network scenario. The injected clock advanced real rules and collision damage; records were not inserted directly. Ordinary menu/worker startup was checked without test flags. This does not establish default-difficulty balance, hardware performance or physical touch usability.

## Startup observation

The developer reported a noticeable delay during first rendering and refresh. One fresh-context desktop observation measured 1,128 ms from navigation start until Play was visible and 889 ms on subsequent reload. These are single browser observations, not first-paint/Web Vitals measurements, a distribution or a performance guarantee. Network/cache/device conditions were not controlled for benchmarking.

Startup loads/evaluates the application and initializes the local worker/data layer; entering combat also initializes PixiJS and textures. The reviewed main entry is approximately 605 kB minified (186 kB gzip). Its size is a possible contributor, but no causal profiling or startup optimization was performed. Combat FPS evidence remains separate in the [profiling record](../performance/profiling.md).

## Build identity and final handoff

The published `/assets/index-CTmfo7dl.js` SHA-256 is `f6cc39c8596beb242d380512eb38388c064ff8211f6d90ae436002db9821e225`, matching the entry in the [local verification identity](artifacts/2026-10-03-release/verification.json), whose application source is `7da72fc4a821d81d9bdd955741033e32e9423280`. This identifies the checked bundle; it does not independently establish the complete Vercel deployment commit.

The browser's automatic `/favicon.ico` request returned 404. The final source change declares the supplied ship PNG as favicon in `index.html`; the current public deployment predates that correction. No reduction in startup delay is claimed by this change.

- [ ] Commit/push this final revision, redeploy it and confirm its exact SHA in Vercel against the delivered repository.
- [ ] Verify the favicon correction and repeat the console/refresh check on the new deployment.
- [ ] Review real-device touch, portrait/landscape, standard balance and hidden-tab pause manually.
- [ ] Confirm hosted CI status and keep the public production URL accessible during evaluation.

Archived local reports and checksums remain unchanged. Include the public URL, repository URL and final deployed commit SHA in the submission.
