# 0003: Run the simulation at a fixed 60 Hz timestep

## Status

Proposed

## Date

2026-10-02

## Context

[CHALLENGE.md](../../CHALLENGE.md) §4 requires frame-rate-independent movement, damage, and spawning. §2 suspends the timer, cooldowns, and simulation during pause and prohibits accumulated actions on resume. §8 requires control of simulation time; §9 sets a rendering target of 60 FPS, without prescribing a simulation frequency.

## Decision

Advance gameplay in steps of 1/60 second. The engine reads elapsed time from an injectable monotonic clock, clamps each frame delta to a bounded maximum, adds it to an accumulator, and executes fixed steps while the accumulator contains a full step. Render once per display frame from the resulting state.

Pause clears the accumulator and pending input; no steps run while paused. Explicit player resume resets the clock baseline and accumulator so paused time cannot enter the next frame. Completion stops stepping, and restart creates fresh state. A manual clock drives the same stepping path in tests.

The initial implementation uses a proposed 250 ms frame clamp, bounding catch-up work to 15 full steps per frame. The fixed rate, accumulator and clamp are design choices, not challenge requirements; profiling may justify revisiting the bound.

## Alternatives considered

- Variable timestep per render frame: simpler scheduling, but large deltas make collision behavior and reproducibility harder to control.
- An unclamped accumulator: preserves all elapsed time but can produce excessive catch-up work after stalls and delay input or rendering.

## Consequences

Rules have a consistent time unit and reproducible stepping. Clamping intentionally discards excess wall time, so active simulation time can lag wall time during stalls; the game timer follows executed steps. Fixed stepping does not guarantee collision accuracy or 60 FPS, which still require implementation and profiling.
