# Technical project guide

The root [README.md](README.md) preserves the original challenge. This document describes the evolving implementation; [TESTING.md](TESTING.md) provides setup, commands, and practical verification steps.

## Current implementation

| Area | Implemented | Pending |
| --- | --- | --- |
| Core / engine | Typed configuration, navigation, weapons, seeded safe spawns, Chaser/Shooter behavior, damage, score, pause/restart and time/death completion | Network integration in the shell |
| React / PixiJS | Menu, Options, arena/ships/projectiles, HUD, simultaneous controls, health/deterioration, completion details and Last Result view | HTTP registration statuses and ranking/history views |
| Local persistence | Versioned Options/identity, completed results and pending outbox; validation and write recovery | Confirmed mock records and HTTP replay |
| Tests | Core/engine/persistence units; gameplay, result and abandonment browser suites | API suites and visual baselines |
| Delivery | Production build verified locally | Public deployment and profiling evidence |

Play starts combat with both enemy types, three weapons, HP and scoring. Completed results survive refresh and are available through Last Result. Registration remains pending with an explicit availability message; no HTTP requests are made yet. Ranking and Match History remain disabled. Installed packages alone do not mean their corresponding features are implemented.

## Technology roles

| Technology | Current role |
| --- | --- |
| Vite | Development server and production build |
| React | Menus, Options, HUD snapshots and session dialogs; StrictMode at the entry point |
| TypeScript | Strict checking for application, tooling, and E2E files |
| Vitest 4 | Core, engine and persistence tests in Node with injected storage |
| Playwright | Browser tests against the optimized preview build |
| PixiJS | Arena, supplied ship/projectile/effect sprites and ship health indicator |
| Axios / TanStack Query | Installed; ranking/history integration pending |
| MSW | Installed with its generated worker; handlers, startup, and scenarios pending |

## Source organization

| File | Responsibility |
| --- | --- |
| [src/core/config.ts](src/core/config.ts) | Parameter definitions, Options bounds, validation, detached frozen snapshots |
| [src/core/simulation.ts](src/core/simulation.ts) | Pure navigation, geometry, active timer and time completion |
| [src/core/geometry.ts](src/core/geometry.ts) | World dimensions, collision footprints and swept obstacle contacts |
| [src/core/weapons.ts](src/core/weapons.ts) | Front/broadside shots, independent cooldowns, projectile removal and timed effects |
| [src/core/enemies.ts](src/core/enemies.ts) | Safe scheduled spawns, enemy steering, island routes and aiming policy |
| [src/core/random.ts](src/core/random.ts) | Pure xorshift32 transitions and seed normalization |
| [src/engine/scenarios.ts](src/engine/scenarios.ts) | Pre-match deterministic fixture preparation |
| [src/engine/game-engine.ts](src/engine/game-engine.ts) | Injectable clock, fixed-step accumulator, input state and stable HUD snapshots |
| [src/render/arena-view.ts](src/render/arena-view.ts) | Async texture loading, private PixiJS application, drawing and teardown |
| [src/input/keyboard.ts](src/input/keyboard.ts) | Gameplay bindings, focus/visibility pause and listener cleanup |
| [src/ui/GameScreen.tsx](src/ui/GameScreen.tsx) | Canvas lifecycle, touch pointers, semantic HUD, dialogs and gated test hooks |
| [src/persistence/options.ts](src/persistence/options.ts) | Versioned storage envelope, local player identity, loading/saving/recovery |
| [src/api/contracts.ts](src/api/contracts.ts) | Immutable MatchRecord, full configuration grouping and persisted-record validation |
| [src/persistence/results.ts](src/persistence/results.ts) | Completion capture, versioned last result/outbox, restore and storage retry |
| [src/ui/ResultDetails.tsx](src/ui/ResultDetails.tsx) | Semantic score, duration, reason, date, registration status and save retry |
| [src/ui/OptionsScreen.tsx](src/ui/OptionsScreen.tsx) | Two-field form, associated errors, Save/Main Menu actions, focus |
| [src/App.tsx](src/App.tsx) | Menu/Options/game/result navigation and saved state subscriptions |
| [src/main.tsx](src/main.tsx) | One-time storage bootstrap and React StrictMode mount |
| [src/App.css](src/App.css) | Supplied menu assets and responsive screen styling |
| [playwright.config.ts](playwright.config.ts) | Desktop/mobile projects, preview server, reports, failure traces |
| [vitest.config.ts](vitest.config.ts) | Node-based core, engine and persistence test discovery |

The core has no React, PixiJS, browser time, storage, or network dependencies. Storage belongs to the imperative shell. Bootstrap runs outside StrictMode so its development mount cycle does not regenerate the local player identity.

## Configuration and persistence

Only sessionTime and enemySpawnInterval are exposed in Options. sessionTime defaults to 120 seconds and accepts the required 60–180 range. enemySpawnInterval defaults to 3 seconds and accepts the proposed 1–10 range. Decimal values are accepted. Other proposed defaults/bounds are listed in the [gameplay specification](docs/specs/gameplay.md#game-configuration).

The form reuses core validation without coercing persisted values. Only a successful explicit Save updates stored Options. Main Menu discards unsaved edits; a failed storage write preserves the previous saved state. Each session uses a validated immutable snapshot, independent of later edits.

The `pirate-battle.options.v1` localStorage envelope contains version, playerId, playerName, sessionTime, and enemySpawnInterval. The local display name defaults to Player. Valid identity persists across refresh; malformed/unsupported data restores defaults with feedback. Storage failures are handled visibly, without claiming persistence succeeded.

Completed-match capture runs in the shell on the engine's terminal transition. It generates one cryptographic UUID and UTC completion timestamp, freezes the full configuration and records floor(elapsedMs), score, player identity and end reason. Repeated notifications for the same terminal state reuse that record. `configKey` is `v1:` plus compact JSON of all validated configuration fields in lexical order; seed and presentation are excluded.

The results store bootstraps outside StrictMode and exposes stable snapshots. It writes `pirate-battle.outbox.v1` first (`{ version: 1, entries }`, keyed by matchId, each entry holding record and attempts), then `pirate-battle.last-result.v1` (`{ version: 1, record, submissionStatus }`). New entries are pending with zero HTTP attempts. Recovery restores pending/sending/error states as pending; an outbox entry overrides stale confirmed status. A newer queued record recovers a missing or older last result after an interrupted write.

Storage failure keeps records in memory and shows Retry Save without claiming refresh recovery. Retry preserves identifiers and merges readable existing pending records. Unreadable or invalid outbox data is preserved and blocks overwrite: inspect/export it in DevTools before removing only the corrupted owned key and retrying. Invalid last results have visible feedback and can be recovered from valid pending records. Automatic migration and simultaneous-tab coordination are not implemented.

Refresh or leaving active combat abandons it without creating a record or replacing an earlier result. Completed pending matches never prevent starting another match. Last Result opens the most recent completed details from the menu and offers Play Again/Main Menu; loading the page returns to the menu rather than resuming combat. HTTP dispatch, confirmation, boot replay and manual submission retry remain pending.

## Assets and interface

Provided assets now live in `public/assets/`. The menu uses the supplied scene background, title, panel, and button images. The restored challenge keeps its original asset path references; implementation paths are documented here.

The interface is in English and supports keyboard navigation, visible focus, labeled fields, associated errors, status feedback and mobile portrait/landscape layouts. Movement, fire and pause bindings are active. Chasers use a dark sail and Shooters a red sail; health bars, reduced-health tints, impacts and explosions communicate combat state.

## Navigable session

The proposed arena is 1000 × 700 logical units with a circular island at (500, 350), radius 100, and a conservative player footprint of radius 40. Coordinates are clamped to arena bounds; movement overlapping the island is rejected. Rotation remains possible while blocked. The supplied hull is 44 × 64 logical units. CSS preserves arena proportions while PixiJS uses devicePixelRatio for its backing canvas.

The engine accumulates injected-clock deltas, clamps each frame to 250 ms, and advances at 60 Hz. The active timer counts executed steps and clips the final step to the configured duration. Pause clears held actions and the accumulator; resume resets the clock baseline. Window blur and document hiding pause automatically and require explicit resume.

React subscribes through useSyncExternalStore to stable snapshots of health, score, remaining whole seconds and session status. PixiJS owns continuous positions. Async initialization has disposal guards; exit destroys the private ticker, display objects and canvas, removes input listeners and deletes owned hooks. Assets retains the shared ship texture for reuse.

Only `?e2e=1` exposes `window.__game.getState()` (a detached copy) and `advance(milliseconds)` through the normal engine. Manual mode renders on controlled advances rather than running a display ticker. `seed` controls pure xorshift32 state (zero maps to 1); normal gameplay gets a seed from browser crypto. An optional gated `fixture` prepares initial entities/configuration before the session. Hooks cannot move ships, apply damage or award outcomes during play.

## Player weapons

Space holds front fire (one projectile); Q/E hold left/right fire (three parallel projectiles each). Touch buttons support independent pointers alongside movement/rotation. Front cooldown is 350 ms and each side cooldown is 1000 ms by default. Cooldowns store the next eligible active timestamp, start ready, and do not bank unused shots. New input after pause is required; keyboard repeats cannot reactivate a cleared action.

Proposed geometry: projectiles have radius 4 lu; muzzle centers sit 46 lu from the firing ship center; broadside origins are spaced 16 lu along the hull. Each projectile snapshots heading, team, speed, damage, range and lifetime. Swept contacts select the earliest opposing target, island or arena exit along the reachable trajectory. Obstacles win contact ties, then stable target IDs; removing a hit projectile and dead targets prevents repeated damage/score. Range/lifetime limits still apply.

Firing flashes last a proposed 120 ms and obstacle impacts 180 ms of active time. PixiJS loads the supplied cannon_ball, fire_1 and explosion_1 textures before starting. Sprite maps reuse live entity sprites and destroy removed sprites while preserving cached textures. Pause freezes projectiles, cooldowns and effects; completion freezes weapon state and restart restores empty entities/cooldowns.

## Enemies and completion

Spawns follow active-time intervals, trying 32 seeded candidates and an 80 lu grid fallback. Positions must contain the 40 lu enemy footprint, avoid islands/ships and satisfy minSpawnDistance. Failed attempts advance the schedule without weakening safety or consuming the initial Chaser/Shooter sequence; weighted selection starts after two successful spawns.

Enemy steering uses 16 waypoints on a 160 lu ring when the direct path is blocked. Rotation is bounded by configuration and movement waits until heading error is at most π/3. Chasers pursue and deal one configured impact before removal, with no score. Shooters approach, stop within attack range and fire toward their heading when aligned within 0.15 rad and their independent cooldown permits; the first shot waits a cooldown after spawn.

Each active step checks time expiry first, then player movement, spawn, enemy movement, projectile damage, surviving Chaser contact and surviving Shooter fire. Every enemy killed by player shots earns one point. Lethal player damage stops remaining damage/contact/fire processing. Time expiry wins at the duration boundary; earlier death wins in its own step. Completion shows score, active duration, reason, date and pending registration, then captures the result and outbox in the shell.

Ship tint deteriorates at HP ratios 0.65 and 0.3; each ship has a proportional health bar. Damage feedback lasts 180 ms and destruction feedback 400 ms of active time. Effects freeze with terminal simulation state. These thresholds, routing and collision geometry are proposed tuning, not additional challenge requirements.

## Verification and limitations

Verification results for this increment are recorded in [TESTING.md](TESTING.md#current-coverage). This evidence covers the implemented features, not the complete challenge. Browser tests use SwiftShader to avoid headless GPU-driver stalls; this does not establish hardware performance.

Mobile emulation does not establish performance on a physical device. Review screenshots are not versioned visual baselines. Profiling tables remain unfilled; no FPS, memory, or deployment result is claimed.

## Decisions and next work

ADRs remain Proposed. Frame clamping, collision geometry, routing, aiming, successful-spawn sequencing and time-first terminal ordering are implemented as proposed choices. Validate tuning through gameplay and profiling. Ship-to-ship separation beyond spawn checks and Chaser impact is not modeled; routes assume the current circular island.

Next work is Axios/TanStack Query and MSW registration, ranking/history, idempotent replay and network scenarios, then visual baselines, profiling and public deployment. See the [construction guide](docs/README.md) for incremental delivery and AI assistance.

## Documentation references

- [Architecture](ARCHITECTURE.md) and [ADR index](docs/adr/README.md)
- [Gameplay](docs/specs/gameplay.md), [API contracts](docs/specs/api-contracts.md), and [network scenarios](docs/specs/network-scenarios.md)
- [Requirement traceability and test plan](docs/testing/test-plan.md)
- [Profiling template](docs/performance/profiling.md)
- [Practical testing guide](TESTING.md)
