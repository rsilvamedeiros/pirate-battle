# Technical project guide

The root [README.md](README.md) preserves the original challenge. This document describes the evolving implementation; [TESTING.md](TESTING.md) provides setup, commands, and practical verification steps.

## Current implementation

| Area | Implemented | Pending |
| --- | --- | --- |
| Core / engine | Typed configuration, navigation, weapons, seeded safe spawns, Chaser/Shooter behavior, damage, score, pause/restart and time/death completion | Persisted completed-match data and network integration |
| React / PixiJS | Menu, Options, arena/ships/projectiles, HUD, simultaneous controls, health/deterioration, damage/destruction feedback and completion dialogs | Full persisted result/registration flow and ranking/history views |
| Local persistence | Versioned Options and local player identity; invalid-data recovery and storage errors | Last completed result, outbox, confirmed mock records |
| Tests | Configuration, navigation, engine, geometry, weapons, enemies and damage units; gameplay/browser suites | Persistence/API suites, visual baselines |
| Delivery | Production build verified locally | Public deployment and profiling evidence |

Play starts combat with both enemy types, three weapons, HP and scoring. Ranking and Match History remain disabled; the completion dialog is not yet the full persisted result/registration flow. Installed packages alone do not mean their corresponding features are implemented.

## Technology roles

| Technology | Current role |
| --- | --- |
| Vite | Development server and production build |
| React | Menus, Options, HUD snapshots and session dialogs; StrictMode at the entry point |
| TypeScript | Strict checking for application, tooling, and E2E files |
| Vitest 4 | Pure configuration, navigation, engine, geometry, weapons, enemy and damage tests in Node |
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
| [src/ui/OptionsScreen.tsx](src/ui/OptionsScreen.tsx) | Two-field form, associated errors, Save/Main Menu actions, focus |
| [src/App.tsx](src/App.tsx) | Menu/Options/game navigation and saved Options state |
| [src/main.tsx](src/main.tsx) | One-time storage bootstrap and React StrictMode mount |
| [src/App.css](src/App.css) | Supplied menu assets and responsive screen styling |
| [playwright.config.ts](playwright.config.ts) | Desktop/mobile projects, preview server, reports, failure traces |
| [vitest.config.ts](vitest.config.ts) | Node-based core test discovery |

The core has no React, PixiJS, browser time, storage, or network dependencies. Storage belongs to the imperative shell. Bootstrap runs outside StrictMode so its development mount cycle does not regenerate the local player identity.

## Configuration and persistence

Only sessionTime and enemySpawnInterval are exposed in Options. sessionTime defaults to 120 seconds and accepts the required 60–180 range. enemySpawnInterval defaults to 3 seconds and accepts the proposed 1–10 range. Decimal values are accepted. Other proposed defaults/bounds are listed in the [gameplay specification](docs/specs/gameplay.md#game-configuration).

The form reuses core validation without coercing persisted values. Only a successful explicit Save updates stored Options. Main Menu discards unsaved edits; a failed storage write preserves the previous saved state. Each session uses a validated immutable snapshot, independent of later edits.

The `pirate-battle.options.v1` localStorage envelope contains version, playerId, playerName, sessionTime, and enemySpawnInterval. The local display name defaults to Player. Valid identity persists across refresh; malformed/unsupported data restores defaults with feedback. Storage failures are handled visibly, without claiming persistence succeeded.

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

Each active step checks time expiry first, then player movement, spawn, enemy movement, projectile damage, surviving Chaser contact and surviving Shooter fire. Every enemy killed by player shots earns one point. Lethal player damage stops remaining damage/contact/fire processing. Time expiry wins at the duration boundary; earlier death wins in its own step. This replaces the earlier conflicting proposed death-priority sentence. Completion shows score, active duration and reason; persistence and registration remain pending.

Ship tint deteriorates at HP ratios 0.65 and 0.3; each ship has a proportional health bar. Damage feedback lasts 180 ms and destruction feedback 400 ms of active time. Effects freeze with terminal simulation state. These thresholds, routing and collision geometry are proposed tuning, not additional challenge requirements.

## Verification and limitations

Verification results for this increment are recorded in [TESTING.md](TESTING.md#current-coverage). This evidence covers the implemented features, not the complete challenge. Browser tests use SwiftShader to avoid headless GPU-driver stalls; this does not establish hardware performance.

Mobile emulation does not establish performance on a physical device. Review screenshots are not versioned visual baselines. Profiling tables remain unfilled; no FPS, memory, or deployment result is claimed.

## Decisions and next work

ADRs remain Proposed. Frame clamping, collision geometry, routing, aiming, successful-spawn sequencing and time-first terminal ordering are implemented as proposed choices. Validate tuning through gameplay and profiling. Ship-to-ship separation beyond spawn checks and Chaser impact is not modeled; routes assume the current circular island.

Next work is the persisted result and ranking/history integration with idempotent recovery, then visual baselines, profiling and public deployment. See the [construction guide](docs/README.md) for incremental delivery and AI assistance.

## Documentation references

- [Architecture](ARCHITECTURE.md) and [ADR index](docs/adr/README.md)
- [Gameplay](docs/specs/gameplay.md), [API contracts](docs/specs/api-contracts.md), and [network scenarios](docs/specs/network-scenarios.md)
- [Requirement traceability and test plan](docs/testing/test-plan.md)
- [Profiling template](docs/performance/profiling.md)
- [Practical testing guide](TESTING.md)
