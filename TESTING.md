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
| Front fire | Hold Space or Front Fire | One forward shot per eligible fire step; default cooldown is 350 ms |
| Broadsides | Hold Q/E or Left Fire/Right Fire | Each side emits three parallel shots; independent 1000 ms cooldowns |
| Projectile blocking | Fire toward the island or outside an arena edge | Shots stop at the obstacle/edge with visible impact feedback |
| Projectile expiry | Sail below the island and fire toward open water | Shots disappear at range or lifetime, whichever is reached first |
| Enemy spawns | Start a standard match and survive through two spawn intervals | A dark-sailed Chaser and red-sailed Shooter appear at safe positions |
| Chaser impact | Let a Chaser reach the player | Player loses 25 HP by default; Chaser disappears without awarding a point |
| Shooter attack | Stay within a Shooter's range | Aimed projectiles deal 10 HP by default and obey the 1.5-second cooldown |
| Player kills | Aim Space/Q/E attacks at enemies | HP bars/tints deteriorate; destruction explodes and adds exactly one point |
| Death | Receive damage until HP reaches zero | Completion dialog shows destruction, score and active duration; combat stops |
| Simultaneous touch | Hold Forward/rotation and fire buttons with separate fingers | Actions run together; releasing/canceling stops the corresponding action |
| Manual pause | Fire, press Esc/P or select Pause; wait; select Resume | Movement, shots, effects, time and cooldowns stop; fresh input is required |
| Automatic pause | Switch browser tabs or move focus away; return | Session stays paused until explicit Resume; paused time is excluded |
| Exit and restart | Pause, choose Main Menu, then Play again | Old canvas is removed; ship, health, score and timer reset |
| Time completion | Save a 60-second session, Play, and let active time expire | Completion dialog appears; movement stops; Play Again starts fresh |
| Result and refresh | Complete a match, return to Main Menu, refresh, select Last Result | Score, active duration, reason and date remain unchanged; registration is pending |
| Pending matches | Complete two matches with Play Again between them | Distinct match IDs stay in the outbox; the second result is the latest; gameplay remains available |
| Abandonment | Complete a match, start another, pause and leave or refresh before completion | Previous result and pending entries are unchanged; active combat is not restored |
| Feature availability | Inspect Ranking and Match History | Tabs remain disabled; HTTP registration and confirmed records are pending |

To repeat default-value checks in an existing profile, remove only `pirate-battle.options.v1` in browser DevTools and refresh. This also resets the local player identity. Do not clear unrelated site data.

For invalid-data recovery, replace that key with malformed JSON or an unsupported version, then refresh. Defaults and visible feedback should appear; a subsequent valid Save should succeed. Automated tests also cover blocked storage, failed writes, and retry without overwriting previous values.

Results use `pirate-battle.last-result.v1` and `pirate-battle.outbox.v1`. Inspect them in DevTools: every pending entry retains its matchId, frozen record and zero HTTP attempts. No registration request is made in this increment. A failed write shows Retry Save; restore storage access and retry to save the same payload. If the last-result write was interrupted after the outbox write, refresh recovers the queued result. Invalid/unreadable outbox data is preserved; inspect/export it before removing only the damaged owned key. Clearing the outbox discards pending records and is not a recovery test.

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
| npm run test:unit | Run core, engine and result persistence suites with Vitest |
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
npm run test:e2e -- tests/e2e/combat.spec.ts tests/e2e/assets.spec.ts
npm run test:e2e -- tests/e2e/enemies.spec.ts tests/e2e/match-end.spec.ts
npm run test:e2e -- tests/e2e/result.spec.ts tests/e2e/navigation.spec.ts
npm run test:e2e -- --project=chromium-mobile
```

Each E2E test gets a fresh browser context. Refresh/recovery cases preserve state only within their own test. Options tests exercise the real React form and localStorage. Navigation tests activate `?e2e=1`, send real keyboard/touch inputs, observe copied state with `window.__game.getState()`, and advance the injected clock with `window.__game.advance(milliseconds)`. This follows the normal fixed-step simulation and renders its results; hooks cannot set positions or outcomes.

The manual clock disables the display ticker, so time advances only when requested. Ordinary URLs expose no hooks and ignore fixtures. `?e2e=1&seed=42` reproduces xorshift32 spawn state; zero seeds map to 1 and invalid seeds fall back to 1. Normal matches use browser crypto for their seed. Chromium tests force SwiftShader software WebGL to avoid driver stalls in headless environments; this is not a performance benchmark.

## Pre-match gameplay fixtures

Fixtures only prepare configuration and entities at startup; they cannot mutate running outcomes. Use `?e2e=1&seed=42&fixture=<id>`, select Play and advance the clock with the documented hook. Combat tests still send actual keyboard/touch controls and execute real movement, damage, collisions and rendering. All fixtures keep scheduled spawns enabled.

| Fixture | Initial setup / purpose |
| --- | --- |
| front-target | Shooter ahead of the player; 100 lu attack range; verify real front hits and kill |
| broadsides | Two side targets with 30 HP; verify simultaneous real touch hits and duplicate-free scoring |
| chaser-impact | Chaser 85 lu from the player; observe approach and one impact |
| shooter-attack | Aimed Shooter in range; observe first cooldown, projectile and HP loss |
| island-cover | Player and Shooter on opposite sides of the island; real shots hit land |
| lethal-chaser | Player starts with 25 HP and a nearby Chaser; observe real lethal damage |
| time-expiry | 500 HP, 1 HP enemy damage and 10-second spawns; exercise time expiry while combat remains enabled |

These are test arrangements, not ordinary spawn positions or normal tuning. Each fresh test context resets options; fixtures are reapplied only before a new session. Refresh abandons combat rather than restoring it.

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

The result increment contains 128 unit tests and 114 E2E executions. Execution results are recorded in the [construction guide](docs/README.md#increment-6-persisted-results-and-pending-outbox); rerun them on your checkout.

| Suite | Cases | Execution |
| --- | ---: | --- |
| src/core/config.test.ts | 52 | Vitest / Node |
| src/core/simulation.test.ts | 11 | Vitest / Node |
| src/engine/game-engine.test.ts | 9 | Vitest / Node |
| src/core/collisions.test.ts | 9 | Vitest / Node |
| src/core/combat.test.ts | 12 | Vitest / Node; weapon mechanics |
| src/core/enemies.test.ts | 15 | Vitest / Node; seed, spawn safety, routes and behavior |
| src/core/damage.test.ts | 7 | Vitest / Node; teams, damage, scoring and terminal ordering |
| src/persistence/results.test.ts | 13 | Vitest / Node; snapshots, validation, durable queue and write recovery |
| tests/e2e/options.spec.ts | 13 | Desktop and mobile: 26 executions |
| tests/e2e/assets.spec.ts | 7 | Desktop and mobile: 14 executions |
| tests/e2e/combat.spec.ts | 9 | Desktop and mobile: 18 executions |
| tests/e2e/enemies.spec.ts | 6 | Desktop and mobile: 12 executions |
| tests/e2e/match-end.spec.ts | 3 | Desktop and mobile: 6 executions |
| tests/e2e/movement.spec.ts | 5 | Desktop and mobile: 10 executions |
| tests/e2e/pause.spec.ts | 4 | Desktop and mobile: 8 executions |
| tests/e2e/result.spec.ts | 7 | Desktop and mobile: 14 executions |
| tests/e2e/navigation.spec.ts | 3 | Desktop and mobile: 6 executions |

All 128 units, lint, type checking and production build pass. The full browser run passed 112 of 114 executions and found two duplicate-status failures under blocked storage. After correction, all 46 Options/result/navigation revalidation executions passed, including both failures. The latest HTML report contains this targeted desktop/mobile run; remaining suites passed in the full run. Separate development StrictMode review checked five completion/exit cycles per layout, exactly one pending entry per match, one canvas, deleted hooks, refresh restoration and no unhandled page errors. Portrait/landscape screenshots are review artifacts, not versioned visual baselines or memory measurements.

HTTP registration, ranking/history, MSW scenarios, visual baselines and performance measurements remain pending. Result/browser suites cover completed details, refresh, full configuration, consecutive pending matches, interrupted writes, storage retry and abandonment. Registration transitions beyond pending still require real HTTP integration. Focus-loss pause is automated; hidden-tab behavior also needs manual browser verification. Remaining planned cases stay in the [test plan](docs/testing/test-plan.md); the [profiling template](docs/performance/profiling.md) requires real measurements.
