# Architecture

## Overview

Describe the browser-only naval game and its architectural boundaries, following [ADR 0001](docs/adr/0001-record-architecture-decisions.md). TODO: replace this skeleton with the implemented design and accepted decisions.

## Layers

Describe core, engine, render, input, ui, api, and mocks, with dependencies directed away from the pure simulation ([ADR 0002](docs/adr/0002-functional-core-imperative-shell.md)). TODO: map layers to actual modules and public interfaces.

## React ↔ PixiJS integration

Explain PixiJS ownership of combat visuals and React subscriptions to changed HUD snapshots ([ADR 0004](docs/adr/0004-react-pixi-sync-strategy.md)). TODO: document snapshot fields, display precision, subscriptions, canvas resizing, and Strict Mode lifecycle behavior.

## Simulation loop

Describe fixed 60 Hz stepping, the accumulator, frame clamping, pause/resume, and injected clocks ([ADR 0003](docs/adr/0003-fixed-timestep-simulation.md), [ADR 0007](docs/adr/0007-seeded-rng-and-test-hooks.md)). TODO: document the clamp value, update order, completion handling, and test clock interface.

Related specification: [Gameplay](docs/specs/gameplay.md#match-rules).

Related validation: [Test plan](docs/testing/test-plan.md).

## Collisions

Explain how core rules enforce arena limits, island blocking, single-hit projectiles, and removal of destroyed entities ([ADR 0002](docs/adr/0002-functional-core-imperative-shell.md)). TODO: document shapes, detection and resolution algorithms, ordering, and safeguards against missed collisions.

Related specification: [Gameplay](docs/specs/gameplay.md#combat-rules).

## Resource management

Describe resource ownership, texture loading/reuse, failure recovery, and disposal on exit or restart ([ADR 0004](docs/adr/0004-react-pixi-sync-strategy.md)). TODO: document asset ownership, asynchronous cancellation, listener/ticker cleanup, and memory profiling evidence.

Related validation: [Profiling template](docs/performance/profiling.md#memory).

## Local persistence

Describe persisted options, the last completed result, confirmed mock records, and the pending outbox ([ADR 0005](docs/adr/0005-idempotent-match-submission-outbox.md), [ADR 0006](docs/adr/0006-msw-in-production.md)). TODO: document schemas, validation, storage errors, reset scope, and abandonment behavior.

Related specification: [API contracts](docs/specs/api-contracts.md#local-persistence-proposed).

## Ranking & match history

Describe Axios and TanStack Query integration, shared MSW contracts, and idempotent registration ([ADR 0005](docs/adr/0005-idempotent-match-submission-outbox.md), [ADR 0006](docs/adr/0006-msw-in-production.md)). TODO: document endpoints, pagination, configuration comparison, deterministic tie-breaking, cache keys, invalidation, stale-response protection, retries, and boot recovery.

Related specifications: [API contracts](docs/specs/api-contracts.md), [Network scenarios](docs/specs/network-scenarios.md).

## Balancing decisions

Describe typed gameplay parameters and the configuration snapshot taken at match start ([ADR 0002](docs/adr/0002-functional-core-imperative-shell.md), [ADR 0007](docs/adr/0007-seeded-rng-and-test-hooks.md)). TODO: document defaults, positive spawn interval bounds, enemy distribution, safe spawn distance, and tuning rationale.

Related specification: [Gameplay](docs/specs/gameplay.md#game-configuration).

## Known limitations

Record observed constraints and evidence, including local mock data and behavior under clamped frame delays ([ADR 0006](docs/adr/0006-msw-in-production.md), [ADR 0003](docs/adr/0003-fixed-timestep-simulation.md)). TODO: document supported mobile orientation, reference hardware/browser, three-minute frame metrics, five-cycle memory results, and verified limitations.

Related validation: [Profiling template](docs/performance/profiling.md).
