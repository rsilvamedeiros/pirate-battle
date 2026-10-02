# 0002: Separate a functional core from an imperative shell

## Status

Proposed

## Date

2026-10-02

## Context

[CHALLENGE.md](../../CHALLENGE.md) §4 requires separation of rules, rendering, input, and interface state, with continuous combat state owned by the simulation. §1 assigns React, PixiJS, Axios, TanStack Query, and MSW distinct roles; §8 requires reproducible tests that execute real gameplay rules.

## Decision

Use these logical layers; concrete folders and interfaces remain implementation decisions:

| Layer | Responsibility |
| --- | --- |
| core | Pure TypeScript state transitions, movement, combat, collisions, enemy behavior, and typed gameplay configuration |
| engine | Simulation ownership, scheduling, injected clock and random source, pause, and lifecycle orchestration |
| render | PixiJS projection of simulation state, textures, effects, and ship health indicators |
| input | Keyboard and touch commands, gameplay focus, and coordinate conversion |
| ui | React menus, forms, dialogs, and semantic HUD snapshots |
| api | Typed contracts, Axios transport, TanStack Query queries and mutations, and submission recovery |
| mocks | MSW handlers, fixtures, reproducible network scenarios, and confirmed-record persistence |

The core must not depend on PixiJS, React, Date, or Math.random. Pass state, commands, fixed elapsed time, and explicit random values into core transitions. Browser time, record timestamps, identifiers, storage, and network effects belong to the shell. Rendering and input consume core types without making the core depend on their adapters.

## Alternatives considered

- Rules inside PixiJS display objects or ticker callbacks: couples gameplay to rendering and complicates clock-controlled testing.
- React reducers and component state as the combat owner: couples continuous updates to React lifecycle and encourages per-frame interface work.

## Consequences

Gameplay can run deterministically without a browser renderer. Adapters and explicit state transitions add interface design work; visual effects must follow simulation events without changing gameplay outcomes.
