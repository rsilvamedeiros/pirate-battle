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
| Result and refresh | Complete a match in success; return to Main Menu, refresh, select Last Result | Details remain unchanged; registration stays confirmed; outbox has no duplicate entry |
| Pending matches | Complete two matches with Play Again between them | Distinct match IDs stay in the outbox; the second result is the latest; gameplay remains available |
| Abandonment | Complete a match, start another, pause and leave or refresh before completion | Previous result and pending entries are unchanged; active combat is not restored |
| Ranking and history | Open each tab, change pages, return to a previously shown tab | Identified players, scores, dates/durations/reasons and independent pagination; returning refetches |
| Configuration grouping | Save different Options or choose Last result under Ranking configuration | Only records with the same full configuration are compared |
| Offline recovery | Use offline-at-match-end, finish a match, refresh and select Recover connection | Pending payload survives; recovery confirms the same ID in both views |
| Post-commit timeout | Use submit-timeout-after-commit and finish a match | Database commits once; client times out/retries and confirms without duplicating |
| Demo reset | Expand Network scenarios, read reset scope and select Reset demo data | Last result/outbox/database fixtures reset; Options, identity and unrelated keys remain |

To repeat default-value checks in an existing profile, remove only `pirate-battle.options.v1` in browser DevTools and refresh. This also resets the local player identity. Do not clear unrelated site data.

For invalid-data recovery, replace that key with malformed JSON or an unsupported version, then refresh. Defaults and visible feedback should appear; a subsequent valid Save should succeed. Automated tests also cover blocked storage, failed writes, and retry without overwriting previous values.

Results use `pirate-battle.last-result.v1` and `pirate-battle.outbox.v1`; confirmed records use `pirate-battle.msw-db.v1`. Inspect entries in DevTools: each pending record retains its ID/payload and tracks actual HTTP attempts. Registration runs through Axios/TanStack Query/MSW after readiness. Failed local writes show Retry Save; failed HTTP registration shows Retry Registration. These actions have different responsibilities. Interrupted writes recover from the queue; invalid/unreadable outbox data is preserved. Inspect/export damaged data before removing only the affected key. Clearing the outbox discards pending records and is not a recovery test.

## Network scenario reproduction

Open `/?scenario=<id>&seed=42` or expand Network scenarios, select a scenario and choose Apply. Ordinary selection preserves stored records. Empty/multi-page fixture layouts apply only on first initialization with clean owned storage or explicit Reset demo data. Reset retains Options/local identity, removes last-result/outbox contents, reseeds confirmed records and invalidates delayed work. Recover connection changes offline-at-match-end to success and replays pending IDs.

| Scenario | Manual observation |
| --- | --- |
| success | Registration confirms; both tabs contain the same completed ID |
| empty | Fresh/reset demo lists are empty until a real completion confirms |
| multi-page | Fresh/reset demo has 25 comparable records; pages contain 10/10/5 rows |
| slow | Two-second loading/sending; game and Options remain available |
| variable-latency | 100–1500 ms delays from independent seeded endpoint streams |
| out-of-order | Alternating 2000/100 ms reads; changing views cannot replace current data with an obsolete response |
| timeout | Five-second Axios timeout, three attempts maximum, then manual recovery |
| connection-failure | No HTTP response; bounded retries preserve the pending record |
| http-4xx | HTTP 400; no automatic retry; payload remains pending |
| http-5xx | HTTP 503; bounded retries, then explicit recovery |
| ranking-failure | Only ranking fails; history/registration remain available |
| history-failure | Only history fails; ranking/registration remain available |
| submit-timeout-after-commit | Commit precedes lost response; retry/refresh confirms the first payload once |
| offline-at-match-end | Registration remains pending; another voyage can start; Recover connection confirms after refresh |

Use Network scenarios in the menu for recovery after leaving a completed result. Independent pending entries each have Retry Registration. Demo reset is destructive to owned demo match data as described beside its button; it is not a retry mechanism.

## Automated verification

Run these commands independently:

```bash
npm run test:unit
npm run typecheck
npm run lint
npm run format:check
npm run test:e2e
```

`test:e2e` builds the app before starting the preview server and running browser tests. Keep port 4173 available; stop any manually launched preview server on that port first.

| Command | Purpose |
| --- | --- |
| npm run test:unit | Run core, engine, persistence, API/coordinator and shared MSW/database suites with Vitest |
| npm run test:unit:watch | Rerun unit tests while editing |
| npm run typecheck | Check application, tooling, and E2E TypeScript |
| npm run lint | Run both ESLint and Stylelint |
| npm run lint:code | Check TypeScript source/tooling with ESLint |
| npm run lint:styles | Check every application SCSS file with Stylelint, failing on warnings |
| npm run lint:styles:fix | Apply supported SCSS lint fixes; review changes and run npm run format afterward |
| npm run format | Apply the shared Prettier formatting rules to source, SCSS, tests, scripts, GitHub workflows and root configuration/HTML files |
| npm run format:check | Check formatting without writing files; documentation, supplied assets, generated files and archived evidence are excluded |
| npm run build | Type-check and produce the optimized build |
| npm run preview | Serve an existing optimized build for manual review |
| npm run test:e2e | Build and run implemented desktop/mobile E2E suites |
| npm run test:e2e:ui | Build and open Playwright UI |
| npm run test:e2e:report | Open the latest HTML report |
| npx playwright test --config=playwright.strict.config.ts | Run three lifecycle/focus/orientation cases in both development StrictMode projects, using port 4174 |

## Continuous integration

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on pushes, pull requests and manual dispatch from the repository's Actions tab. A newer run cancels an older run for the same branch or pull request. Actions are pinned to commit SHAs, repository permissions are read-only, and no private service credentials are needed.

| Job | Environment | Checks and outputs |
| --- | --- | --- |
| quality | Ubuntu 24.04, Node.js 24 | npm ci, format:check, ESLint/Stylelint, typecheck, Vitest and optimized build; unit JSON artifact |
| browser (optimized) | Windows Server 2022, Node.js 24, locked Playwright Chromium | Optimized preview; all desktop/mobile functional and visual tests; HTML/JSON reports and failure traces/screenshots |
| browser (strict-mode) | Windows Server 2022, Node.js 24, locked Playwright Chromium | Development lifecycle/focus/orientation checks in both projects; HTML/JSON reports and failure traces/screenshots |

Browser jobs start only after quality passes, run independently, and retain the existing zero-retry policy. Snapshots are compared with the committed images; CI never regenerates them. Windows matches the baseline platform suffix, but fonts and rendering may differ from the Windows 10 reference environment. Inspect actual/diff images from the first hosted run before declaring visual compatibility; do not rename baselines or relax thresholds to hide differences. A green workflow is not a physical-mobile or deployed-site validation.

Open Actions → CI → the run to inspect step logs. Download `unit-results-<attempt>`, `browser-reports-optimized-<attempt>` or `browser-reports-strict-mode-<attempt>` from Artifacts; retention is 14 days. Browser uploads run after failures unless the workflow was cancelled. Extract each browser archive to its own directory, then use:

```sh
npx playwright show-report <optimized-extraction>/playwright-report
npx playwright show-report <strict-extraction>/playwright-report/strict-mode
```

Open a failed case's trace from its HTML report, or run `npx playwright show-trace <trace.zip>`. Browser artifacts also preserve `test-results/` with JSON and failure attachments. Unit JSON is at the root of its extracted artifact. If installation fails before tests produce output, inspect the failed step's logs; there may be no report to upload. The hosted workflow itself remains unverified until the committed file is pushed and a run completes.

## Targeted browser runs

Target a suite or a browser project:

```bash
npm run test:e2e -- tests/e2e/options.spec.ts
npm run test:e2e -- tests/e2e/movement.spec.ts tests/e2e/pause.spec.ts
npm run test:e2e -- tests/e2e/combat.spec.ts tests/e2e/assets.spec.ts
npm run test:e2e -- tests/e2e/enemies.spec.ts tests/e2e/match-end.spec.ts
npm run test:e2e -- tests/e2e/result.spec.ts tests/e2e/navigation.spec.ts
npm run test:e2e -- tests/e2e/leaderboard.spec.ts tests/e2e/submission.spec.ts tests/e2e/resilience.spec.ts
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

Final review: all 161 unit/integration cases across 14 files and all 174 optimized-browser executions passed. Six additional development StrictMode executions passed. The final full run includes all six visual comparisons without snapshot updates; there were zero failures, skips, flaky cases or automatic retries. Lint, strict types and optimized build pass; the large-chunk warning remains. [Final review](docs/delivery/final-review.md) and [versioned reports](docs/delivery/artifacts/2026-10-03-final/README.md) preserve results and earlier failures. Browser-test counts do not establish measured performance.

| Suite | Cases | Execution |
| --- | ---: | --- |
| src/core/config.test.ts | 52 | Vitest / Node |
| src/core/simulation.test.ts | 11 | Vitest / Node |
| src/engine/game-engine.test.ts | 9 | Vitest / Node |
| src/engine/profiling.test.ts | 3 | Vitest / Node; detached observations, unclamped intervals, pause gaps and validated preset |
| src/core/collisions.test.ts | 9 | Vitest / Node |
| src/core/combat.test.ts | 12 | Vitest / Node; weapon mechanics |
| src/core/enemies.test.ts | 15 | Vitest / Node; seed, spawn safety, routes and behavior |
| src/core/damage.test.ts | 7 | Vitest / Node; teams, damage, scoring and terminal ordering |
| src/persistence/results.test.ts | 17 | Vitest / Node; durable queue, validation, confirmation and storage recovery |
| src/mocks/database.test.ts | 6 | Vitest / Node; shared records, grouping, ordering, pagination and durable commits |
| src/mocks/scenarios.test.ts | 4 | Vitest / Node; 14 schedules, seeds, endpoint isolation and generations |
| src/api/integration.test.ts | 8 | Vitest / Node; real Axios and shared MSW handlers with controlled waits |
| src/api/submissions.test.ts | 6 | Vitest / Node; actual TanStack mutations, coalescing, retries and stale acknowledgment guards |
| src/api/runtime.test.ts | 2 | Vitest / Node; worker readiness/bootstrap using a lifecycle test double |
| tests/e2e/options.spec.ts | 13 | Desktop and mobile: 26 executions |
| tests/e2e/assets.spec.ts | 7 | Desktop and mobile: 14 executions |
| tests/e2e/combat.spec.ts | 9 | Desktop and mobile: 18 executions |
| tests/e2e/enemies.spec.ts | 6 | Desktop and mobile: 12 executions |
| tests/e2e/match-end.spec.ts | 3 | Desktop and mobile: 6 executions |
| tests/e2e/movement.spec.ts | 5 | Desktop and mobile: 10 executions |
| tests/e2e/pause.spec.ts | 4 | Desktop and mobile: 8 executions |
| tests/e2e/result.spec.ts | 7 | Desktop and mobile: 14 executions |
| tests/e2e/navigation.spec.ts | 3 | Desktop and mobile: 6 executions |
| tests/e2e/leaderboard.spec.ts | 8 | Desktop and mobile: 16 executions |
| tests/e2e/submission.spec.ts | 4 | Desktop and mobile: 8 executions |
| tests/e2e/resilience.spec.ts | 10 | Desktop and mobile: 20 executions |
| tests/e2e/visual.spec.ts | 3 | Desktop and mobile: 6 visual executions; baseline comparison |
| tests/e2e/profiling.spec.ts | 2 | Desktop and mobile: 4 behavior checks; not performance measurements |
| tests/e2e/lifecycle.spec.ts | 3 | Desktop and mobile: 6 optimized-preview executions; 6 additional development StrictMode executions |

The complete optimized-browser inventory is 174 executions (87 per project); development StrictMode adds six separately executed cases. Earlier functional/visual/profiling records remain historical in construction increments 7–9. [Increment 10](docs/README.md#increment-10-final-regression-and-delivery-review) records corrections, the full final run and evidence packaging. Development checks and real-time performance measurements are reported separately.

Public deployment remains pending. HTTP coverage includes pagination, loading/empty/errors, cache refresh, boot/manual recovery, bounded retries, post-commit timeout and reset/obsolete-response protection. Unit schedules accept controlled waits; native HTTP timeout tests use the documented timeout boundary and observable states. Gameplay time stays independent. Expanded planned variants, variable-latency browser repetition and hidden-tab manual verification remain in the [test plan](docs/testing/test-plan.md). The [profiling record](docs/performance/profiling.md) now includes actual measurements; its limits are explicit. Review the [challenge audit](docs/delivery/challenge-audit.md) before submission.

Increment 9: all 161 unit/integration cases across 14 files passed. All 34 targeted browser executions passed (profiling, visual, movement, pause and navigation), including all six unchanged baseline comparisons. The complete browser inventory is now 168 executions; this is not a claim that all 168 were rerun in this increment. See the [construction record](docs/README.md#increment-9-real-time-profiling) for earlier failures and final validation.

## Performance reproduction

```sh
npm run build
node scripts/profile.mjs
node scripts/summarize-profile.mjs docs/performance/artifacts/<run-id>
node scripts/inspect-profile-heaps.mjs docs/performance/artifacts/<run-id>
node scripts/unpack-profile.mjs docs/performance/artifacts/<run-id>
```

The benchmark opens headed Chromium on the local optimized preview, uses native time and hardware acceleration, and takes about nine minutes. Keep that browser visible/focused and avoid concurrent E2E/analysis work during collection. `--quick` is only a smoke check; `--software` labels a separate SwiftShader run. Neither may be silently substituted for the recorded reference benchmark. The proposed endurance preset retains real damage/spawns and is visibly labeled.

The two profiling E2E cases verify opt-in gates, rendered observations, pause/resume and teardown. They use Playwright's browser clock for bounded RAF execution in headless SwiftShader; they do not measure real FPS or bypass game rules. Manual E2E mode still exposes only its existing game hooks and ignores profiling/preset flags. See [Playwright Clock](https://playwright.dev/docs/clock) and the [measured report](docs/performance/profiling.md) for the distinction.

## Visual regression

Six PNG baselines live in [tests/e2e/visual.spec.ts-snapshots/](tests/e2e/visual.spec.ts-snapshots/README.md): Menu with expanded Controls, stable arena and confirmed result, for desktop and portrait mobile. Include these images in the commit. Their README records the Windows/Chromium reference environment, seeds, dates, capture settings and limitations. Other platforms require separately reviewed baselines.

```sh
npm run test:e2e -- tests/e2e/visual.spec.ts
npm run test:e2e -- tests/e2e/visual.spec.ts --repeat-each=3
# Intentional, reviewed changes only:
npm run test:e2e -- tests/e2e/visual.spec.ts --update-snapshots
```

The simulation clock remains stopped during capture after real fixed-step gameplay and input. Dates are fixed while network timers remain active; result capture waits for actual registration confirmation. Assets/fonts finish loading, CSS animations are disabled and no elements are masked. Comparison permits zero differing pixels under Playwright's default 0.2 per-pixel threshold; each assertion has 15 seconds to acquire stable images. Review expected/actual/diff artifacts before updating; rerun without the update flag. Do not replace baselines to silence an unexplained failure.
