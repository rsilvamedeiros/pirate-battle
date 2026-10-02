# 0006: Enable MSW in the published build

## Status

Proposed

## Date

2026-10-02

## Context

[CHALLENGE.md](../../CHALLENGE.md) §6 requires network-layer mocks, shared contracts, fixtures and handlers, selectable reproducible scenarios, reset, and persistence of confirmed and pending records. §11 requires the published game to execute those mocks on initial navigation and refresh without private services.

## Decision

Start the MSW browser worker in development and the published build, and gate ranking/history requests on its readiness. Keep gameplay accessible when data access fails. Share contracts, fixtures, handlers, and scenario definitions with tests.

Provide scenario selection and an explicit reset mechanism. Cover success, empty and paginated lists, slow and variable latency, out-of-order responses, timeout, connection and HTTP errors, independent query failures, post-commit timeout, and recovery after submission unavailability. Control latency and randomness in tests.

Persist confirmed mock records locally and keep the client outbox described in [ADR 0005](0005-idempotent-match-submission-outbox.md). Restore confirmed state before serving queries so ranking and history remain consistent after refresh. Document reset scope and selection controls during implementation.

## Alternatives considered

- Enable MSW only in development and tests: leaves the published build without the required ranking/history mocks.
- Mock Axios or return fixtures directly from components: bypasses the network layer and does not exercise real HTTP integration or shared MSW handlers.
- Deploy a separate backend: adds an unnecessary service dependency and does not replace the required published MSW behavior.

## Consequences

The public demonstration exercises the same API boundary as development and tests. Worker delivery, deployment paths, startup failures, persisted-state schema, and reset semantics need verification; these records remain local to the browser rather than a shared online ranking.
