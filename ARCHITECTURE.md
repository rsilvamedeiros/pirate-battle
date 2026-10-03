# Architecture

## Overview

Pirate Battle is a browser-only naval shooter with local gameplay and mocked remote records. Architecture decisions and functional specifications are versioned alongside implementation and tests, following [ADR 0001](docs/adr/0001-record-architecture-decisions.md). ADRs retain Proposed status for candidate review; implementation evidence does not automatically mark them Accepted.

## Layers

Dependencies point away from the pure simulation ([ADR 0002](docs/adr/0002-functional-core-imperative-shell.md)). The core accepts typed state, actions and elapsed time; it does not read React, PixiJS, browser time, storage or HTTP. The imperative shell supplies clock, input, persistence and side effects.

| Layer | Modules and boundary |
| --- | --- |
| core | Configuration, simulation, geometry, weapons, enemies and seeded RNG; deterministic state transitions |
| engine | Injectable-clock scheduling, action ownership, snapshots and pre-match test fixtures |
| render | Private PixiJS application, cached assets, sprite maps and post-render diagnostics |
| input | Keyboard bindings and browser focus/visibility events |
| ui | React screens, form state, semantic HUD, touch buttons and native modal dialogs |
| persistence | Validated Options, completed result and durable outbox envelopes |
| api | Typed contracts, Axios transport, QueryClient, readiness and keyed submission coordination |
| mocks | Shared handlers, fixtures, local confirmed database and seeded network schedules |

Implemented modules: `src/core/simulation.ts` owns pure rules, `src/engine/game-engine.ts` schedules steps and HUD snapshots, `src/input/keyboard.ts` owns browser input, `src/render/arena-view.ts` owns PixiJS, and `src/ui/GameScreen.tsx` owns lifecycle and dialogs. `src/api/` owns Axios, QueryClient and submission coordination; `src/mocks/` owns shared MSW handlers, fixtures/database and scenario schedules.

`src/core/enemies.ts` owns spawn validation, steering and obstacle routes; `src/core/random.ts` owns pure seeded transitions. `src/engine/scenarios.ts` prepares pre-match E2E fixtures without exposing running-state mutation. Browser crypto supplies normal seeds in the shell.

## React ↔ PixiJS integration

PixiJS owns continuous combat visuals; React owns menus, HUD text, controls and dialogs ([ADR 0004](docs/adr/0004-react-pixi-sync-strategy.md)). useSyncExternalStore subscriptions receive a new snapshot only when visible health, score, remaining whole seconds or match status changes; entity transforms never enter React state.

Navigation uses useSyncExternalStore with stable health, score, ceil-rounded remaining seconds and status snapshots. PixiJS holds continuous visuals; CSS scales a 1000 × 700 arena proportionally and the backing canvas uses devicePixelRatio. Async initialization is guarded against disposal before completion, including StrictMode effect replay.

CSS adapts the same logical arena to portrait/landscape without changing simulation coordinates. Each mounted session owns its application and subscriptions. Development StrictMode setup/cleanup replay is checked separately with [playwright.strict.config.ts](playwright.strict.config.ts); optimized-preview E2E covers the production lifecycle.

## Simulation loop

The engine consumes an injectable clock and advances a fixed 60 Hz simulation through an accumulator ([ADR 0003](docs/adr/0003-fixed-timestep-simulation.md), [ADR 0007](docs/adr/0007-seeded-rng-and-test-hooks.md)). Production uses performance.now; gated browser tests advance a manual clock through the same rules and rendering path.

The engine clamps deltas to 250 ms, steps at 60 Hz, and clips the final active step to session duration. Time expiry stops before movement/combat; otherwise the order is player movement, spawn, enemy movement, projectile resolution, Chaser contact and Shooter fire. Lethal damage stops remaining damage/contact/fire interactions. Pause clears input/accumulator; explicit resume resets the clock baseline. `?e2e=1` exposes copied-state observation and manual clock advance through the same engine, with seeded spawns.

Related specification: [Gameplay](docs/specs/gameplay.md#match-rules).

Related validation: [Test plan](docs/testing/test-plan.md).

## Collisions

Pure geometry and combat rules enforce arena limits, island blocking and one-hit projectiles ([ADR 0002](docs/adr/0002-functional-core-imperative-shell.md)). Collision resolution removes destroyed entities before later interactions; rendering only reads the resulting state.

Ships use conservative 40 lu circle footprints, arena insets and island overlap rejection at (500, 350), radius 100 lu. Enemy steering uses a 16-node ring route when the direct path is blocked. Chaser/player contact deals configured damage once and removes the Chaser without scoring. Ship-to-ship separation beyond spawn safety and Chaser impacts is not modeled.

Weapons use `src/core/weapons.ts` and swept geometry in `src/core/geometry.ts`. A 4 lu projectile radius expands island/ship targets and insets arena bounds; the earliest contact removes the shot and emits feedback. Obstacles win equal-contact ties; targets use stable IDs. Travel clips to remaining range/lifetime. Team filters, immediate target removal and creation-order projectile processing prevent repeated damage or duplicate scoring.

Related specification: [Gameplay](docs/specs/gameplay.md#combat-rules).

## Resource management

The session owns its PixiJS application, canvas, ticker callbacks, sprite maps and input listeners ([ADR 0004](docs/adr/0004-react-pixi-sync-strategy.md)). Shared textures belong to the Assets cache and survive session teardown. Asset startup has visible loading/error states and a fresh-session Retry action.

Each session owns its PixiJS application and ticker. The supplied ship texture is cached by Assets and retained for reuse; display objects, canvas, ticker and input listeners are destroyed on exit. A disposed pending initialization destroys its completed candidate without attaching it; loading errors allow Retry or Main Menu. The [memory record](docs/performance/profiling.md#memory) now includes five real-time cycles, stable DOM/listener counts and investigated heap changes; it does not prove leak freedom.

Player/Chaser/Shooter, cannonball, firing and impact textures must all load before gameplay starts. Enemy/projectile/effect sprite maps create each live sprite once and destroy it on entity removal, keeping shared textures cached. Ship tints deteriorate with HP, and PixiJS draws health bars for every ship. Effects follow active simulation time and freeze during pause/completion; all session objects are destroyed on teardown.

Related validation: [Measured memory profiling](docs/performance/profiling.md#memory).

## Local persistence

Versioned, validated localStorage envelopes hold Options/identity, the last completed result, pending submissions and confirmed mock records ([ADR 0005](docs/adr/0005-idempotent-match-submission-outbox.md), [ADR 0006](docs/adr/0006-msw-in-production.md)). The query cache is disposable; the outbox is the durable submission source. Never overwrite unrelated browser data or report persistence success after a failed write.

`src/persistence/results.ts` captures completed states once, outside the core, using shell UUIDs/timestamps and immutable typed records from `src/api/contracts.ts`. It writes a versioned outbox before the last result, retains multiple pending records and restores the latest queued result after interrupted writes. Last Result is accessible from the menu after refresh; active combat is abandoned without writing a record. Storage failures keep in-memory payloads and allow Retry Save with the same IDs. Invalid/unreadable outbox data is preserved rather than overwritten. See [technical persistence details](TECHNICAL.md#configuration-and-persistence) for schemas and recovery limits.

Sending/error entries survive refresh as pending. Confirmation updates only a matching last result, saves it before removing the acknowledged queue entry, and filters that ID from subsequent storage merges. Interrupted acknowledgement writes can replay the same ID safely. The mock database persists a single confirmed-record collection before acknowledging PUT; both query views derive from it. Storage failure never fabricates confirmation.

Related specification: [API contracts](docs/specs/api-contracts.md#local-persistence-proposed).

## Ranking & match history

Axios consumes GET /api/ranking, GET /api/players/:playerId/matches and PUT /api/matches/:matchId through shared typed MSW handlers ([ADR 0005](docs/adr/0005-idempotent-match-submission-outbox.md), [ADR 0006](docs/adr/0006-msw-in-production.md)). Paginated reads and registration mutations use TanStack Query; the local mock database is the single confirmed-record source for both views.

`src/api/runtime.ts` bootstraps outside StrictMode, starts the worker in development and optimized builds and gates HTTP on readiness. One QueryClient serves `['ranking', configKey, page, 10]` and `['match-history', playerId, page, 10]`; queries use 30-second staleTime, explicit refetch on tab mount and Axios AbortSignal cancellation. Registration uses a TanStack MutationObserver keyed by matchId plus a coordinator that shares in-flight work. Timeout/connection/429/5xx receive at most two retries (1 s, then 2 s); other 4xx do not retry automatically.

Guarded dynamic MSW imports preserve gameplay when storage is unavailable. A small wrapper imports the unchanged generated worker; explicit activation/page control prevents MSW startup from reloading a restored page.

PUT uses a frozen payload and first-write-wins identity. Confirmation cancels obsolete reads and invalidates both resource families. Ranking compares all 31 validated configuration fields and orders score descending, duration ascending, UTC completion date ascending, then lexical matchId; history is player-scoped and newest first. Independent tab pages and current-options/last-result group selection are UI state. Both views show loading, empty, error and background refresh without blocking gameplay.

Scenario changes cancel reads, suspend/abort submissions and advance handler/mutation generations before replay. Reset reseeds the selected fixture collection, clears only owned result/outbox data and preserves Options/identity. Delayed pre-reset commits and acknowledgements cannot repopulate cleared data. Per-endpoint seeded network schedules remain independent of simulation RNG.

Related specifications: [API contracts](docs/specs/api-contracts.md), [Network scenarios](docs/specs/network-scenarios.md).

## Balancing decisions

All 31 parameters have typed validation and are frozen per match ([ADR 0002](docs/adr/0002-functional-core-imperative-shell.md), [ADR 0007](docs/adr/0007-seeded-rng-and-test-hooks.md)). Only duration and spawn interval appear in Options. Values beyond the required 60–180-second duration are proposed balance choices, not additional challenge requirements.

| Choice | Implemented default / rationale |
| --- | --- |
| Duration / spawn interval | 120 s / 3 s; exposed positive spawn interval bounds are 1–10 s |
| Enemy mix / spawn distance | 0.5/0.5 weights after the first two successful distinct spawns; minimum 250 logical units, with footprint/obstacle checks |
| Player / Chaser / Shooter HP | 100 / 40 / 60; front damage 20 and side damage 15 produce distinct attack pressure |
| Weapon cadence | Front 0.35 s, each broadside 1 s; three parallel side shots reward positioning |
| Enemy damage | Chaser contact 25 HP, Shooter projectile 10 HP; no area damage from explosions |
| Collision/routing | Conservative circles, swept projectiles and bounded circular-island routes; simple geometry makes rule verification reproducible |

Defaults remain candidates for human playtesting. Explicit opt-in profiling uses a proposed endurance preset (180 s, player HP 500, enemy damage 1) to collect the full interval while preserving combat rules; it is not default-difficulty performance evidence.

Related specification: [Gameplay](docs/specs/gameplay.md#game-configuration).

## Known limitations

Limits are tied to observed evidence and the local-demo scope ([ADR 0006](docs/adr/0006-msw-in-production.md), [ADR 0003](docs/adr/0003-fixed-timestep-simulation.md)). Desktop and emulated mobile portrait/landscape are supported; physical touch/performance validation and public deployment remain separate delivery checks.

The current increment supports local combat, persisted results, HTTP registration, both record views and 14 network scenarios in portrait/landscape. Confirmed records are local to this browser, not a shared online backend. Six menu/arena/result visual baselines now exist for desktop and portrait mobile; see the [baseline record](tests/e2e/visual.spec.ts-snapshots/README.md). Headed desktop profiling now has raw frame/entity and five-cycle heap evidence; public deployment remains pending. Storage uses ordered writes rather than transactions; simultaneous-tab coordination is not implemented. Routes assume the current circular island and spawn attempts are bounded. Excess delay above the clamp is discarded; profile results are scoped to one desktop and an explicitly proposed endurance preset; physical-mobile and display-presentation timing are unmeasured. The build reports a large entry chunk that must be considered during profiling and delivery.

Delivery review: [Challenge audit](docs/delivery/challenge-audit.md).

Related validation: [Measured profiling record](docs/performance/profiling.md).
