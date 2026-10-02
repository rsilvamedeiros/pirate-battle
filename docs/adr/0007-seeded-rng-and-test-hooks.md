# 0007: Use seeded randomness and gated test hooks

## Status

Proposed

## Date

2026-10-02

## Context

[CHALLENGE.md](../../CHALLENGE.md) §8 requires seeded scenarios, simulation time control, isolated tests, and stable visual baselines. Instrumentation may observe state and control time while preserving real rules, input, collisions, and rendering; combat tests must use game controls. §6 also requires controlled randomness and latency in network tests.

## Decision

Supply a seed through the engine and keep explicit PRNG state in pure core transitions. The initial implementation uses xorshift32 with zero normalized to 1; spawn selection advances that state without browser randomness. Use an injected manual clock in E2E mode through the normal fixed-step loop. Keep simulation randomness and network-scenario randomness independently controlled so network activity does not change spawn sequences.

Expose window.__game only when the URL contains ?e2e=1. Limit hooks to read-only state observation, deterministic scenario setup before a match, and clock control; do not provide shortcuts that award score, apply damage, or bypass gameplay. Playwright combat tests operate keyboard or touch controls and observe the resulting state and rendering. Remove hooks on teardown and reset clock, seeds, input, and persisted scenario state between tests.

## Alternatives considered

- Math.random and real-time sleeps: produce variable spawns and timing, making failures and visual baselines difficult to reproduce.
- Always expose test hooks: unnecessarily exposes clock and scenario controls during ordinary gameplay.
- Set combat outcomes directly from tests: skips the real behavior that §8 requires the tests to exercise.

## Consequences

Tests can reproduce timing and random sequences while exercising the production rules. `?e2e=1&seed=42` enables the manual clock and copied-state observation; an optional `fixture` selects setup before match start. Normal gameplay ignores fixtures and gets a seed from browser crypto. No hooks change running outcomes. Network seed scheduling remains pending. The query flag is an activation mechanism, not an authentication boundary.
