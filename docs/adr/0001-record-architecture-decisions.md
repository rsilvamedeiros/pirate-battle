# 0001: Record architecture decisions with Docs-as-Code

## Status

Proposed

## Date

2026-10-02

## Context

[CHALLENGE.md](../../CHALLENGE.md) §4 leaves internal organization open and requires architectural decisions to be documented. §11 requires ARCHITECTURE.md to cover integration, simulation, collisions, resources, persistence, and data access; §3 requires documentation in English.

## Decision

Keep architecture documentation in versioned Markdown beside the source. Use numbered ADRs to record context, choices, alternatives, and consequences; use ARCHITECTURE.md to describe the evolving system and link those decisions. Start these decisions as Proposed, accept them after review, and retain superseded records with a link to their replacements.

## Alternatives considered

- External wiki: separates decisions from the delivered repository and makes changes harder to review alongside implementation.
- A single architecture document without ADRs: describes the current design but makes decision history and rejected alternatives harder to preserve.

## Consequences

Documentation can be reviewed and versioned with implementation. Contributors must keep the index, statuses, and architecture overview current. ADRs and their lifecycle are project choices, not a format mandated by the challenge.
