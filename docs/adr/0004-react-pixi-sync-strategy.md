# 0004: Synchronize React through observable HUD snapshots

## Status

Proposed

## Date

2026-10-02

## Context

[CHALLENGE.md](../../CHALLENGE.md) §4 keeps continuous combat state in the simulation, prohibits React rendering every frame, and requires correct initialization and cleanup under React Strict Mode. §7 requires semantic score, time, and match state without per-frame announcements.

## Decision

Let the engine own combat state and PixiJS render it independently. Expose an external snapshot store to React through useSyncExternalStore; publish a new immutable snapshot only when displayed HUD values change, such as health, score, formatted remaining time, or match status. Preserve snapshot identity between changes and avoid subscribing React to entity transforms.

Use a lifecycle adapter with symmetric initialization and disposal. Every mount owns its listeners, ticker subscription, input bindings, and subscriptions; cleanup releases them and cancels or guards pending asynchronous initialization. Dispose safely on repeated calls and prevent stale initialization from attaching resources after unmount, including Strict Mode setup/cleanup/setup cycles.

## Alternatives considered

- Copy all combat state into React on every ticker frame: violates §4 and adds rendering work unrelated to visible HUD changes.
- Update HUD DOM nodes imperatively outside React: avoids renders but bypasses React ownership and complicates semantic accessibility and lifecycle cleanup.

## Consequences

React work follows visible changes while PixiJS remains responsive. The store needs stable snapshots, reliable unsubscribe behavior, and explicit display precision; time formatting and resource ownership details remain to be implemented.
