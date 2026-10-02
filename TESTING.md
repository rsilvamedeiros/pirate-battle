# Testing instructions

This guide covers the implemented increment. See [TECHNICAL.md](TECHNICAL.md) for project structure and limitations, and the [test plan](docs/testing/test-plan.md) for future requirement coverage.

## Setup

Use Node.js 20.19+ (20.x), Node.js 22.12+ (22.x), or Node.js 24+. No environment variables or external services are required for the current menu, Options or navigation flow.

```bash
npm ci
npx playwright install chromium
```

Browser installation is needed before the first Playwright run. The current automated suites use Chromium desktop and Pixel 7 emulation.

## Manual verification

```bash
npm run dev
```

Open the URL printed by Vite. Start with a new browser profile/context for default-value checks; ordinary reloads deliberately retain saved Options.

| Check | Steps | Expected result |
| --- | --- | --- |
| Defaults | Open Options with no saved data | Game session time = 120; Enemy spawn time = 3 |
| Save and refresh | Save 150 and 2; return to Main Menu; refresh; reopen Options | Both saved values are restored |
| Lower boundaries | Save 60 and 1 | Save succeeds |
| Upper boundaries | Save 180 and 10 | Save succeeds |
| Decimal values | Save 90.5 and 2.5 | Save succeeds and survives refresh |
| Invalid values | Try 59/181 for session time; 0, negative values, or 11 for spawn time; also empty fields | Associated errors appear; saved values remain unchanged |
| Unsaved edits | Edit a valid value, select Main Menu without Save, reopen Options | Previous saved values return |
| Keyboard | Use Tab/Enter; submit an invalid field; return to Main Menu | Visible focus; first invalid field receives focus; returning focuses Options |
| Control instructions | Expand Controls on Main Menu | Seven actions have keyboard and touch instructions |
| Mobile layout | Review portrait and landscape; open Options using touch | Fields/actions remain usable without horizontal page overflow |
| Start and sail | Select Play; hold W/ArrowUp and A/ArrowLeft or D/ArrowRight | Ship advances and rotates; HUD shows health, score and active time |
| Island and boundaries | Sail into the central island and arena edges | Ship stays outside the island and inside the arena; rotation still works |
| Simultaneous touch | Hold Forward and either rotation button with separate fingers | Both actions run together; releasing stops the corresponding action |
| Manual pause | Press Esc/P or select Pause; wait; select Resume | Simulation/time stop; held actions are cleared; fresh input is required |
| Automatic pause | Switch browser tabs or move focus away; return | Session stays paused until explicit Resume; paused time is excluded |
| Exit and restart | Pause, choose Main Menu, then Play again | Old canvas is removed; ship, health, score and timer reset |
| Time completion | Save a 60-second session, Play, and let active time expire | Completion dialog appears; movement stops; Play Again starts fresh |
| Feature availability | Inspect Ranking and Match History; try attack bindings | Record tabs are disabled; weapons/enemies and persisted results are pending |

To repeat default-value checks in an existing profile, remove only `pirate-battle.options.v1` in browser DevTools and refresh. This also resets the local player identity. Do not clear unrelated site data.

For invalid-data recovery, replace that key with malformed JSON or an unsupported version, then refresh. Defaults and visible feedback should appear; a subsequent valid Save should succeed. Automated tests also cover blocked storage, failed writes, and retry without overwriting previous values.

## Automated verification

Run these commands independently:

```bash
npm run test:unit
npm run typecheck
npm run lint
npm run test:e2e
```

`test:e2e` builds the app before starting the preview server and running browser tests. Keep port 4173 available; stop any manually launched preview server on that port first.

| Command | Purpose |
| --- | --- |
| npm run test:unit | Run configuration, navigation and engine suites with Vitest |
| npm run test:unit:watch | Rerun unit tests while editing |
| npm run typecheck | Check application, tooling, and E2E TypeScript |
| npm run lint | Run ESLint |
| npm run build | Type-check and produce the optimized build |
| npm run preview | Serve an existing optimized build for manual review |
| npm run test:e2e | Build and run implemented desktop/mobile E2E suites |
| npm run test:e2e:ui | Build and open Playwright UI |
| npm run test:e2e:report | Open the latest HTML report |

Target a suite or a browser project:

```bash
npm run test:e2e -- tests/e2e/options.spec.ts
npm run test:e2e -- tests/e2e/movement.spec.ts tests/e2e/pause.spec.ts
npm run test:e2e -- --project=chromium-mobile
```

Each E2E test gets a fresh browser context. Refresh/recovery cases preserve state only within their own test. Options tests exercise the real React form and localStorage. Navigation tests activate `?e2e=1`, send real keyboard/touch inputs, observe copied state with `window.__game.getState()`, and advance the injected clock with `window.__game.advance(milliseconds)`. This follows the normal fixed-step simulation and renders its results; hooks cannot set positions or outcomes.

The manual clock disables the display ticker, so time advances only when requested. Ordinary URLs expose no hooks. The fixture includes a seed for future spawns; navigation currently uses no random values and a seeded PRNG is still pending. Chromium tests force SwiftShader software WebGL to avoid driver stalls in headless environments; this is not a performance benchmark.

## Reports and failure investigation

Playwright writes its HTML report to `playwright-report/` and failure traces/screenshots to `test-results/`. These generated directories are ignored by Git.

```bash
npm run test:e2e:report
```

Open the failed test in the report to inspect its trace, or use:

```bash
npx playwright show-trace test-results/<case>/trace.zip
```

Record the actual failing command, browser project, values used, and visible error before changing assertions. A missing-browser failure requires the Chromium installation command above. A preview port conflict requires stopping the conflicting server.

## Current coverage

The navigation increment passes 72 unit tests and 48 E2E executions. Counts describe the recorded checks, not a guarantee about future changes; rerun them on your checkout.

| Suite | Cases | Execution |
| --- | ---: | --- |
| src/core/config.test.ts | 52 | Vitest / Node |
| src/core/simulation.test.ts | 11 | Vitest / Node |
| src/engine/game-engine.test.ts | 9 | Vitest / Node |
| tests/e2e/options.spec.ts | 13 | Desktop and mobile: 26 executions |
| tests/e2e/assets.spec.ts | 2 | Desktop and mobile: 4 executions |
| tests/e2e/movement.spec.ts | 5 | Desktop and mobile: 10 executions |
| tests/e2e/pause.spec.ts | 4 | Desktop and mobile: 8 executions |

Lint, type checking and production build also pass. After the final keyboard-repeat guard, the 8 pause executions were rerun against a fresh build and passed; the latest HTML report contains that focused run. A separate development review exercised five enter/move/exit cycles on desktop and five on mobile with StrictMode enabled, checking a single canvas, deleted hooks and no unhandled page errors. Portrait/landscape screenshots were reviewed; they are not versioned visual baselines or memory measurements.

Weapons, enemies, death completion, persisted results, ranking/history, MSW scenarios, visual baselines and performance measurements are pending. Focus-loss pause is automated; hidden-tab behavior also needs manual browser verification. The [test plan](docs/testing/test-plan.md) contains remaining proposed cases; the [profiling template](docs/performance/profiling.md) is filled only after real measurements.
