# Architecture

## Overview

Describe the browser-only naval game and its architectural boundaries, following [ADR 0001](docs/adr/0001-record-architecture-decisions.md). TODO: replace this skeleton with the implemented design and accepted decisions.

## Layers

Describe core, engine, render, input, ui, api, and mocks, with dependencies directed away from the pure simulation ([ADR 0002](docs/adr/0002-functional-core-imperative-shell.md)). TODO: map layers to actual modules and public interfaces.

Implemented navigation modules: `src/core/simulation.ts` owns pure rules, `src/engine/game-engine.ts` schedules steps and HUD snapshots, `src/input/keyboard.ts` owns browser input, `src/render/arena-view.ts` owns PixiJS, and `src/ui/GameScreen.tsx` owns lifecycle and dialogs. API and mock layers remain pending.

`src/core/enemies.ts` owns spawn validation, steering and obstacle routes; `src/core/random.ts` owns pure seeded transitions. `src/engine/scenarios.ts` prepares pre-match E2E fixtures without exposing running-state mutation. Browser crypto supplies normal seeds in the shell.

## React ↔ PixiJS integration

Explain PixiJS ownership of combat visuals and React subscriptions to changed HUD snapshots ([ADR 0004](docs/adr/0004-react-pixi-sync-strategy.md)). TODO: document snapshot fields, display precision, subscriptions, canvas resizing, and Strict Mode lifecycle behavior.

Navigation uses useSyncExternalStore with stable health, score, ceil-rounded remaining seconds and status snapshots. PixiJS holds continuous visuals; CSS scales a 1000 × 700 arena proportionally and the backing canvas uses devicePixelRatio. Async initialization is guarded against disposal before completion, including StrictMode effect replay.

## Simulation loop

Describe fixed 60 Hz stepping, the accumulator, frame clamping, pause/resume, and injected clocks ([ADR 0003](docs/adr/0003-fixed-timestep-simulation.md), [ADR 0007](docs/adr/0007-seeded-rng-and-test-hooks.md)). TODO: document the clamp value, update order, completion handling, and test clock interface.

The engine clamps deltas to 250 ms, steps at 60 Hz, and clips the final active step to session duration. Time expiry stops before movement/combat; otherwise the order is player movement, spawn, enemy movement, projectile resolution, Chaser contact and Shooter fire. Lethal damage stops remaining damage/contact/fire interactions. Pause clears input/accumulator; explicit resume resets the clock baseline. `?e2e=1` exposes copied-state observation and manual clock advance through the same engine, with seeded spawns.

Related specification: [Gameplay](docs/specs/gameplay.md#match-rules).

Related validation: [Test plan](docs/testing/test-plan.md).

## Collisions

Explain how core rules enforce arena limits, island blocking, single-hit projectiles, and removal of destroyed entities ([ADR 0002](docs/adr/0002-functional-core-imperative-shell.md)). TODO: document shapes, detection and resolution algorithms, ordering, and safeguards against missed collisions.

Ships use conservative 40 lu circle footprints, arena insets and island overlap rejection at (500, 350), radius 100 lu. Enemy steering uses a 16-node ring route when the direct path is blocked. Chaser/player contact deals configured damage once and removes the Chaser without scoring. Ship-to-ship separation beyond spawn safety and Chaser impacts is not modeled.

Weapons use `src/core/weapons.ts` and swept geometry in `src/core/geometry.ts`. A 4 lu projectile radius expands island/ship targets and insets arena bounds; the earliest contact removes the shot and emits feedback. Obstacles win equal-contact ties; targets use stable IDs. Travel clips to remaining range/lifetime. Team filters, immediate target removal and creation-order projectile processing prevent repeated damage or duplicate scoring.

Related specification: [Gameplay](docs/specs/gameplay.md#combat-rules).

## Resource management

Describe resource ownership, texture loading/reuse, failure recovery, and disposal on exit or restart ([ADR 0004](docs/adr/0004-react-pixi-sync-strategy.md)). TODO: document asset ownership, asynchronous cancellation, listener/ticker cleanup, and memory profiling evidence.

Each session owns its PixiJS application and ticker. The supplied ship texture is cached by Assets and retained for reuse; display objects, canvas, ticker and input listeners are destroyed on exit. A disposed pending initialization destroys its completed candidate without attaching it; loading errors allow Retry or Main Menu. Memory profiling remains pending.

Player/Chaser/Shooter, cannonball, firing and impact textures must all load before gameplay starts. Enemy/projectile/effect sprite maps create each live sprite once and destroy it on entity removal, keeping shared textures cached. Ship tints deteriorate with HP, and PixiJS draws health bars for every ship. Effects follow active simulation time and freeze during pause/completion; all session objects are destroyed on teardown.

Related validation: [Profiling template](docs/performance/profiling.md#memory).

## Local persistence

Describe persisted options, the last completed result, confirmed mock records, and the pending outbox ([ADR 0005](docs/adr/0005-idempotent-match-submission-outbox.md), [ADR 0006](docs/adr/0006-msw-in-production.md)). TODO: document schemas, validation, storage errors, reset scope, and abandonment behavior.

`src/persistence/results.ts` captures completed states once, outside the core, using shell UUIDs/timestamps and immutable typed records from `src/api/contracts.ts`. It writes a versioned outbox before the last result, retains multiple pending records and restores the latest queued result after interrupted writes. Last Result is accessible from the menu after refresh; active combat is abandoned without writing a record. Storage failures keep in-memory payloads and allow Retry Save with the same IDs. Invalid/unreadable outbox data is preserved rather than overwritten. See [technical persistence details](TECHNICAL.md#configuration-and-persistence) for schemas and recovery limits.

Related specification: [API contracts](docs/specs/api-contracts.md#local-persistence-proposed).

## Ranking & match history

Describe Axios and TanStack Query integration, shared MSW contracts, and idempotent registration ([ADR 0005](docs/adr/0005-idempotent-match-submission-outbox.md), [ADR 0006](docs/adr/0006-msw-in-production.md)). TODO: document endpoints, pagination, configuration comparison, deterministic tie-breaking, cache keys, invalidation, stale-response protection, retries, and boot recovery.

Related specifications: [API contracts](docs/specs/api-contracts.md), [Network scenarios](docs/specs/network-scenarios.md).

## Balancing decisions

Describe typed gameplay parameters and the configuration snapshot taken at match start ([ADR 0002](docs/adr/0002-functional-core-imperative-shell.md), [ADR 0007](docs/adr/0007-seeded-rng-and-test-hooks.md)). TODO: document defaults, positive spawn interval bounds, enemy distribution, safe spawn distance, and tuning rationale.

Related specification: [Gameplay](docs/specs/gameplay.md#game-configuration).

## Known limitations

Record observed constraints and evidence, including local mock data and behavior under clamped frame delays ([ADR 0006](docs/adr/0006-msw-in-production.md), [ADR 0003](docs/adr/0003-fixed-timestep-simulation.md)). TODO: document supported mobile orientation, reference hardware/browser, three-minute frame metrics, five-cycle memory results, and verified limitations.

The current increment supports movement, weapons, both enemy types, damage, scoring and persisted time/death results in portrait/landscape. Registration is pending with no HTTP dispatch yet; APIs, visual baselines, profiling and deployment remain pending. Storage uses two ordered writes rather than a transaction, recovering from the durable outbox; simultaneous-tab coordination is not implemented. Routes are designed for the current single circular island and spawn attempts are bounded. Excess frame delay above the clamp is discarded; performance and memory targets are unmeasured.

Related validation: [Profiling template](docs/performance/profiling.md).
