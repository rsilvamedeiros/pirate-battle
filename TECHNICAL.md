# Technical project guide

The root [README.md](README.md) preserves the original challenge. This document describes the evolving implementation; [TESTING.md](TESTING.md) provides setup, commands, and practical verification steps.

## Current implementation

| Area | Implemented | Pending |
| --- | --- | --- |
| Core / engine | Typed configuration, navigation, fixed-step timer, pause/restart, front/broadside weapons, projectile lifetime/range and obstacle contacts | Enemies, target damage, scoring, death completion |
| React / PixiJS | Menu, Options, arena/ship/projectiles, HUD, simultaneous keyboard/touch controls, firing/impact feedback, pause and time-completion dialogs | Full result screen, ranking/history views, damage/destruction feedback |
| Local persistence | Versioned Options and local player identity; invalid-data recovery and storage errors | Last completed result, outbox, confirmed mock records |
| Tests | Configuration, navigation, engine, geometry and weapons units; Options, assets, movement, weapons and pause E2E | Damage/scoring, enemies/API suites, visual baselines |
| Delivery | Production build verified locally | Public deployment and profiling evidence |

Play starts a session with movement and three weapons. Ranking and Match History remain disabled. Enemies, damage and scoring are pending; the time-completion dialog is not yet the full persisted result flow. Installed packages alone do not mean their corresponding features are implemented.

## Technology roles

| Technology | Current role |
| --- | --- |
| Vite | Development server and production build |
| React | Menus, Options, HUD snapshots and session dialogs; StrictMode at the entry point |
| TypeScript | Strict checking for application, tooling, and E2E files |
| Vitest 4 | Pure configuration, navigation, engine, geometry and weapons unit tests in Node |
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

The interface is in English and supports keyboard navigation, visible focus, labeled numeric fields, associated errors, status feedback, and mobile portrait/landscape layouts. Movement, fire and pause bindings are active; the menu identifies enemies as forthcoming.

## Navigable session

The proposed arena is 1000 × 700 logical units with a circular island at (500, 350), radius 100, and a conservative player footprint of radius 40. Coordinates are clamped to arena bounds; movement overlapping the island is rejected. Rotation remains possible while blocked. The supplied hull is 44 × 64 logical units. CSS preserves arena proportions while PixiJS uses devicePixelRatio for its backing canvas.

The engine accumulates injected-clock deltas, clamps each frame to 250 ms, and advances at 60 Hz. The active timer counts executed steps and clips the final step to the configured duration. Pause clears held actions and the accumulator; resume resets the clock baseline. Window blur and document hiding pause automatically and require explicit resume.

React subscribes through useSyncExternalStore to stable snapshots of health, score, remaining whole seconds and session status. PixiJS owns continuous positions. Async initialization has disposal guards; exit destroys the private ticker, display objects and canvas, removes input listeners and deletes owned hooks. Assets retains the shared ship texture for reuse.

Only `?e2e=1` exposes `window.__game.getState()` (a detached copy) and `advance(milliseconds)` through the normal engine. Manual mode renders on controlled advances rather than running a display ticker. Navigation has no randomness; seeded spawn generation remains pending. Test hooks cannot move ships or award outcomes directly.

## Player weapons

Space holds front fire (one projectile); Q/E hold left/right fire (three parallel projectiles each). Touch buttons support independent pointers alongside movement/rotation. Front cooldown is 350 ms and each side cooldown is 1000 ms by default. Cooldowns store the next eligible active timestamp, start ready, and do not bank unused shots. New input after pause is required; keyboard repeats cannot reactivate a cleared action.

Proposed geometry: projectiles have radius 4 lu; muzzle centers sit 46 lu from the player center; broadside origins are spaced 16 lu along the hull. Each projectile snapshots its heading, speed, damage, range and lifetime. Segment/circle contact against the expanded island and segment/arena exit are resolved before range/lifetime expiration at the reachable endpoint. Starting inside an obstacle or outside the arena removes the shot immediately. Target damage remains pending.

Firing flashes last a proposed 120 ms and obstacle impacts 180 ms of active time. PixiJS loads the supplied cannon_ball, fire_1 and explosion_1 textures before starting. Sprite maps reuse live entity sprites and destroy removed sprites while preserving cached textures. Pause freezes projectiles, cooldowns and effects; completion freezes weapon state and restart restores empty entities/cooldowns.

## Verification and limitations

Verification results for this increment are recorded in [TESTING.md](TESTING.md#current-coverage). This evidence covers the implemented features, not the complete challenge. Browser tests use SwiftShader to avoid headless GPU-driver stalls; this does not establish hardware performance.

Mobile emulation does not establish performance on a physical device. Review screenshots are not versioned visual baselines. Profiling tables remain unfilled; no FPS, memory, or deployment result is claimed.

## Decisions and next work

ADRs remain Proposed. Frame clamping, navigation/projectile geometry and broadside spacing are implemented as proposed choices. Resolve simultaneous time/death ordering, enemy type sequencing after skipped spawns, ship-target collision geometry and aiming tolerance before implementing affected rules. Validate tuning through gameplay and profiling.

Next implementation areas are seeded enemy spawns, Chaser/Shooter behavior, damage and scoring, followed by the persisted result and ranking/history integration with idempotent recovery. See the [construction guide](docs/README.md) for incremental delivery and AI assistance.

## Documentation references

- [Architecture](ARCHITECTURE.md) and [ADR index](docs/adr/README.md)
- [Gameplay](docs/specs/gameplay.md), [API contracts](docs/specs/api-contracts.md), and [network scenarios](docs/specs/network-scenarios.md)
- [Requirement traceability and test plan](docs/testing/test-plan.md)
- [Profiling template](docs/performance/profiling.md)
- [Practical testing guide](TESTING.md)
