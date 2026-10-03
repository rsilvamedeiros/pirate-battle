# Pirate Battle

[Play the game](https://game-pirate-battle.vercel.app/) | [Portuguese guide](README.pt-BR.md) | [Upstream challenge repository](https://github.com/junglegaming/game-developer-challenge)

A browser-only naval shooter built with React, strict TypeScript and PixiJS. Sail around the island, fight Chasers and Shooters, and earn one point per enemy destroyed. React owns menus and semantic HUD/dialogs; the pure simulation owns combat. Axios and TanStack Query consume REST APIs mocked by MSW in development and optimized builds.

## Project status

**Development is complete for the technical challenge scope, and the game is published on Vercel.** Gameplay, menus, persistence, ranking/history APIs, failure recovery, automated tests, architecture documentation and profiling evidence have been implemented and delivered. Documented limitations describe the delivered solution; optional future improvements are listed separately.

Verification completed: **161 unit/integration tests, 176 desktop/mobile E2E executions and 6 development StrictMode executions passed**, including six visual comparisons without baseline updates. Formatting, lint, strict types and optimized build passed. [Versioned reports](docs/delivery/artifacts/2026-10-03-release/README.md) preserve these results. [Measured profiling](docs/performance/profiling.md) includes a three-minute match and five memory cycles, with its environment, build and measurement limits recorded.

**Play the published game: [Pirate Battle](https://game-pirate-battle.vercel.app/).** The Vercel deployment is publicly accessible. See the [deployed verification record](docs/delivery/public-verification.md) for worker, reload and recovery checks and their limits.

## Challenge source

This solution implements the naval-shooter challenge from [junglegaming/game-developer-challenge](https://github.com/junglegaming/game-developer-challenge): browser gameplay with React, TypeScript and PixiJS, mocked REST ranking/history, reproducible tests and documented performance. The upstream repository is the source for the full assignment and supplied assets; [CHALLENGE.md](CHALLENGE.md) preserves the original statement locally.

## Technical implementation

| Area | Delivered implementation |
| --- | --- |
| Simulation | Pure TypeScript core, fixed 60 Hz steps, accumulator/frame clamp, injectable clock and seeded PRNG |
| Gameplay | Chaser pursuit/contact damage, Shooter ranged attacks, safe spawns, independent weapon cooldowns and duplicate-free damage/scoring |
| Geometry | Arena bounds, island blocking, swept projectile collisions, range/lifetime removal and deterministic contact ordering |
| React/PixiJS boundary | PixiJS owns continuous rendering; React subscribes to HUD snapshots only when displayed values change |
| Lifecycle | Cached textures, visible loading/retry, session resource cleanup and StrictMode-safe initialization/disposal |
| Input and accessibility | Simultaneous keyboard/multitouch actions, automatic/manual pause, portrait/landscape layouts, semantic HUD and keyboard dialog focus |
| Configuration | 31 typed balance parameters, immutable per-match snapshots and validated persistent Options |
| API and cache | Typed REST contracts, Axios cancellation, TanStack Query queries/mutations, configuration-grouped ranking and deterministic tie-breaking |
| Submission recovery | Idempotent PUT keyed by matchId, durable localStorage outbox, boot/manual replay and protection against obsolete responses |
| Network mocks | Production MSW worker, shared fixtures/handlers, 14 seeded failure/latency scenarios and explicit demo reset |
| Quality and styling | SCSS Modules, shared Sass tokens, strict TypeScript, ESLint, Stylelint, Prettier and a GitHub Actions workflow |
| Documentation and evidence | Docs-as-Code, ADRs, functional specs, requirement-to-test mapping, HTML reports, visual baselines and frame/entity/memory profiling |

Module boundaries and tradeoffs are detailed in [ARCHITECTURE.md](ARCHITECTURE.md) and [TECHNICAL.md](TECHNICAL.md).

## Evaluator walkthrough

1. Follow Setup below, or open the published game linked above.
2. Open Options, save a session duration and spawn interval, reload, and verify the saved values.
3. Select Play. Move, rotate and fire together; verify island blocking, health bars, score, pause and explicit resume. Finish a match and inspect its result.
4. Return to Main Menu. Open Ranking and Match History, change pages, and verify the completed record after refresh. Use `multi-page` with Reset demo data to inspect fixture pagination.
5. Follow the failure-recovery steps below. Review [test reports](docs/delivery/artifacts/2026-10-03-release/README.md), [profiling evidence](docs/performance/profiling.md) and [architecture](ARCHITECTURE.md).

## Setup and environment

Use Node.js 20.19+ in the 20.x line, 22.12+ in the 22.x line, or 24+. Install from the committed lockfile:

~~~sh
npm ci
npx playwright install chromium
npm run dev
~~~

Open the URL printed by Vite. No environment variables, credentials or private services are required. Match records and pending submissions belong to this browser/origin; this is a local API demonstration, not a shared online leaderboard. Service Workers require HTTPS or localhost. If npm ci reports a Windows native-binding file lock, stop this repository's Vite server and retry.

No `.env` file or API URL override is needed: the application uses same-origin `/api` routes intercepted by its production MSW worker. Opening `dist/index.html` through `file://` does not provide the required origin/worker environment; use preview or the deployed HTTPS site.

## Commands

| Command | Purpose |
| --- | --- |
| npm run dev | Run the development server with React StrictMode |
| npm run build | Type-check and generate dist/ |
| npm run preview | Serve the optimized build locally |
| npm run lint | Run ESLint and Stylelint checks |
| npm run lint:code | Check TypeScript source/tooling with ESLint |
| npm run lint:styles | Check application SCSS with Stylelint |
| npm run lint:styles:fix | Apply supported SCSS lint fixes; review the diff and run format afterward |
| npm run format | Format source, SCSS, tests, scripts, GitHub workflows and root configuration/HTML files |
| npm run format:check | Verify formatting without changing files |
| npm run typecheck | Check application, tooling and browser-test types |
| npm run test:unit | Run core, engine, persistence, API and mock tests |
| npm run test:e2e | Build and run desktop/mobile browser and visual suites |
| npm run test:e2e:ui | Build and open Playwright UI |
| npm run test:e2e:report | Open the latest browser HTML report |
| npx playwright test --config=playwright.strict.config.ts | Run lifecycle/accessibility checks against development StrictMode |
| node scripts/profile.mjs | Measure the optimized build in headed Chromium with native time; run build first |

Browser tests own ports 4173 (preview) and 4174 (StrictMode development). Keep them available. Failure traces/screenshots are retained under test-results/; HTML reports are under playwright-report/. The [testing guide](TESTING.md) explains reproduction, visual baseline updates and delivery reports.

## Continuous integration

[GitHub Actions](.github/workflows/ci.yml) runs on pushes, pull requests and manual dispatch. The quality job checks formatting, ESLint/Stylelint, types, unit tests and the optimized build. After it passes, separate Windows jobs run the full Chromium desktop/mobile E2E suite (including visuals) and development StrictMode checks. Reports and failure traces are retained as downloadable artifacts for 14 days.

CI uses Node.js 24 and the committed lockfile. Browser jobs use Windows to match the versioned `win32` baselines; hosted Windows images can still differ from the Windows 10 reference environment. The first hosted run must confirm visual compatibility. See [TESTING.md](TESTING.md#continuous-integration) for reports and failure review.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move forward | W / ArrowUp | Hold Forward |
| Rotate left | A / ArrowLeft | Hold Rotate Left |
| Rotate right | D / ArrowRight | Hold Rotate Right |
| Front fire | Space | Hold Front Fire |
| Left broadside | Q | Hold Left Fire |
| Right broadside | E | Hold Right Fire |
| Pause | Esc / P | Tap Pause |

Movement, rotation and fire can run simultaneously. Front fire emits one projectile; each broadside emits three parallel projectiles. Desktop and mobile portrait/landscape layouts are supported; mobile tests use emulation. Loss of focus or hiding the tab pauses combat. Resume requires explicit action and fresh inputs. Refresh or leaving active combat abandons it without creating a match record.

## Configuration and persistence

Options exposes Game session time (60-180 seconds, default 120) and Enemy spawn time (proposed 1-10 seconds, default 3). Save persists values; unsaved edits are discarded. Every match takes an immutable snapshot of all 31 typed balance parameters. Full defaults, units and proposed bounds are in the [gameplay specification](docs/specs/gameplay.md#game-configuration).

Completed results persist and can be opened with Last Result after refresh. Each receives one matchId, saved to the outbox before submission. PUT retries reuse it and recover the first confirmed record without duplication. Pending registration never prevents another match. Local-write failures and HTTP failures have separate Retry Save and Retry Registration actions.

Owned localStorage keys: pirate-battle.options.v1, pirate-battle.last-result.v1, pirate-battle.outbox.v1 and pirate-battle.msw-db.v1. Do not clear unrelated data. Reset demo data discards owned results, pending submissions and confirmed fixtures, preserving Options/player identity. Storage failures are visible; refresh recovery is not guaranteed when writes are blocked.

## Network scenarios and failure reproduction

Open /?scenario=<id>&seed=42 or expand Network scenarios, select a schedule and choose Apply. Applying a schedule preserves records. Empty/multi-page fixtures are seeded on first initialization or explicit Reset demo data. The 14 IDs are success, empty, multi-page, slow, variable-latency, out-of-order, timeout, connection-failure, http-4xx, http-5xx, ranking-failure, history-failure, submit-timeout-after-commit and offline-at-match-end.

1. Open /?scenario=offline-at-match-end&seed=42, finish a match, and observe pending registration.
2. Return to Main Menu, refresh, then select Recover connection in Network scenarios.
3. Open Last Result and both record tabs; registration confirms with the same matchId and no duplicate entry.
4. Repeat with submit-timeout-after-commit: the mock commit occurs before the lost response; retry recovers the existing record.

Queries use bounded retries, background-refresh states and cancellation; network errors leave gameplay/Options usable. See the [scenario matrix](docs/specs/network-scenarios.md) and [manual test guide](TESTING.md#network-scenario-reproduction) for all failure schedules.

Only ?e2e=1 exposes copied-state/manual-clock test hooks; tests still use real rules and controls. Separate ?profile=1 diagnostics observe native-time render frames. The explicit preset=endurance profiling option changes survival parameters and must not be confused with default balance or ordinary E2E.

## Publish on Vercel

The game is already published. To reproduce or maintain the deployment, use these settings, following [Vercel's Vite guide](https://vercel.com/docs/frameworks/frontend/vite) and [build settings](https://vercel.com/docs/builds/configure-a-build):

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Root directory | Repository root |
| Node.js version | 24.x, matching CI |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variables | None required |

The app navigates through React state at `/`; scenarios use query parameters, so it has no pathname routes requiring an SPA fallback. Keep `/pirate-battle-worker.js`, `/mockServiceWorker.js` and `/assets/` available as static files. Do not add a server API for the mocked `/api` resources or disable MSW in production.

Open the production HTTPS URL in a fresh browser profile without a Vercel login requirement. Confirm worker startup, Options persistence after reload, one completed record in both tabs, and recovery for `submit-timeout-after-commit` and `offline-at-match-end`. Check desktop and mobile portrait/landscape, plus the browser console. The complete [public acceptance checklist](docs/delivery/final-review.md#public-acceptance-checklist) records these checks.

Provide the public URL, repository URL and deployed commit SHA in the submission message. Redeploy changes and confirm the source revision in Vercel when updating the delivery. Keep the production site accessible throughout evaluation. Hosted CI status and physical-device checks are documented separately from the completed local test suite.

## Architecture, evidence and limitations

- [Architecture](ARCHITECTURE.md), [technical guide](TECHNICAL.md) and [ADR index](docs/adr/README.md).
- [Test plan](docs/testing/test-plan.md), [practical testing](TESTING.md) and [final review](docs/delivery/final-review.md).
- [Latest delivery verification and archived HTML reports](docs/delivery/artifacts/2026-10-03-release/README.md); earlier failure reports remain preserved in the [previous review archive](docs/delivery/artifacts/2026-10-03-final/README.md).
- [API contracts](docs/specs/api-contracts.md), [network scenarios](docs/specs/network-scenarios.md) and [challenge audit](docs/delivery/challenge-audit.md).
- [Measured profiling](docs/performance/profiling.md), [raw artifacts](docs/performance/artifacts/2026-10-03T16-17-54-458Z/) and [reusable template](docs/performance/profiling-template.md).
- [Construction and AI-assistance record](docs/README.md).

Known limits include one circular island/routing scheme, uncoordinated simultaneous-tab storage writes, no shared backend, a large entry chunk, Windows-specific visual baselines and no physical-mobile performance measurement. Profiling records post-render cadence rather than display presentation; five post-GC cycles do not prove leak freedom.

Initial rendering and page reload can have a noticeable startup delay, as reported during delivery review. The browser must load/evaluate the application and initialize the local data worker; entering combat also initializes PixiJS and textures. These are startup costs, separate from in-match FPS. The existing large entry chunk is a possible contributor; no bottleneck attribution or loading optimization is claimed. See the [deployed observations](docs/delivery/public-verification.md).

## Optional future improvements

These suggestions are outside the completed challenge implementation:

- Profile first-load/reload costs, then evaluate bundle splitting and asset preloading against measured startup timings.
- Expand device/browser coverage with physical phones and additional visual/performance reference environments.
- Explore additional arenas, enemy patterns and audio feedback as gameplay extensions.
- For a product beyond the local mocked-API challenge, consider a shared backend and coordinated multi-tab persistence.

## Assets and AI assistance

The supplied [assets](public/assets/) are the visual basis. The [original challenge](CHALLENGE.md) is preserved without edits; its original asset paths are historical, while the application serves public/assets/. Source assets are included with the repository.

AI assisted documentation, test planning/implementation, application changes, debugging and evidence review, as recorded per increment in the construction guide. The candidate remains responsible for reviewing the implementation, understanding the decisions and validating the final delivery. This record describes the actual scope of assistance.
