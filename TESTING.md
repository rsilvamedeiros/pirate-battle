# Testing instructions

This guide covers the implemented increment. See [TECHNICAL.md](TECHNICAL.md) for project structure and limitations, and the [test plan](docs/testing/test-plan.md) for future requirement coverage.

## Setup

Use Node.js 20.19+ (20.x), Node.js 22.12+ (22.x), or Node.js 24+. No environment variables or external services are required for the current menu/Options flow.

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
| Feature availability | Inspect Play, Ranking, and Match History | Actions are disabled with availability messages |

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
| npm run test:unit | Run the configuration suite with Vitest |
| npm run test:unit:watch | Rerun unit tests while editing |
| npm run typecheck | Check application, tooling, and E2E TypeScript |
| npm run lint | Run ESLint |
| npm run build | Type-check and produce the optimized build |
| npm run preview | Serve an existing optimized build for manual review |
| npm run test:e2e | Build and run implemented desktop/mobile E2E suites |
| npm run test:e2e:ui | Build and open Playwright UI |
| npm run test:e2e:report | Open the latest HTML report |

Target the implemented Options suite or a browser project:

```bash
npm run test:e2e -- tests/e2e/options.spec.ts
npm run test:e2e -- --project=chromium-mobile
```

Each E2E test gets a fresh browser context. Refresh/recovery cases preserve state only within their own test. Current Options tests exercise the real React form and localStorage; manual simulation clocks and gameplay hooks are future combat-test infrastructure.

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

The last completed increment passed 52 configuration unit tests and 26 E2E executions: 13 Options cases on each of desktop and mobile. Those counts describe the recorded run, not a guarantee about future changes; rerun checks on your checkout.

Combat, ranking/history, MSW scenarios, visual baselines, and performance measurements are pending. The [test plan](docs/testing/test-plan.md) contains their proposed cases; the [profiling template](docs/performance/profiling.md) is filled only after real measurements.
