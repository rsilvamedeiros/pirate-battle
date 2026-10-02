# Construction guide and AI assistance

This document records the project's construction process and how AI supports documentation and test design. Requirements come from [CHALLENGE.md](../CHALLENGE.md); the workflow below is a proposed way to organize their implementation.

## AI assistance

AI has supported the preparation of architecture records, functional specifications, the test plan, and the profiling template. Its contributions include drafting concise documents, mapping requirements to planned tests, proposing alternatives and balancing values, checking links and consistency, and identifying unresolved decisions.

The developer sets the scope and constraints. Proposed decisions and generated material require developer review before adoption; implementation, correctness, and delivery remain the developer's responsibility. AI suggestions do not establish new challenge requirements.

At this stage, AI assistance with tests consists of planning cases, determinism, isolation, failure scenarios, and reporting. The 124 documented cases are planned cases, not implemented or passing tests. Profiling tables contain placeholders, not measured results. Changes made during these preparation steps were limited to Markdown.

As testing is implemented, AI may also support writing tests, reviewing assertions, and investigating failures. Record that assistance here when it occurs, together with the commands actually executed and their results. Claims of coverage and performance must be supported by executable tests, reports, traces, and measurements.

## Construction steps

“Drafted” means the documentation exists; it does not mean the associated feature is implemented or the proposed decision is accepted.

| Step | Work | Current status | Reference / completion evidence |
| --- | --- | --- | --- |
| 1 | Read the challenge and document architecture boundaries and alternatives | Drafted; ADRs remain Proposed | [ADR index](adr/README.md), [architecture skeleton](../ARCHITECTURE.md) |
| 2 | Specify gameplay, configuration, screens, API contracts, and network scenarios | Drafted; design choices remain proposed | [Gameplay](specs/gameplay.md), [API contracts](specs/api-contracts.md), [network scenarios](specs/network-scenarios.md) |
| 3 | Map requirements to tests and define profiling procedures | Drafted | [Test plan](testing/test-plan.md), [profiling template](performance/profiling.md) |
| 4 | Resolve open decisions and implement the core, engine, input, PixiJS rendering, and React interface | Planned | Accepted ADRs, implementation, and updated architecture documentation |
| 5 | Implement persistence, Axios/TanStack Query integration, MSW handlers, and recovery scenarios | Planned | Working registration and queries, persistent outbox, and published-build mocks |
| 6 | Implement and execute core/E2E tests and review visual baselines | Planned | Versioned tests/baselines, HTML report, and failure traces |
| 7 | Profile the optimized build, document limitations, and complete delivery | Planned | Filled profiling record, public deployment, and project setup/reproduction instructions |

Steps may overlap. Update statuses and link evidence as work is completed; keep implementation details in the corresponding specifications and architecture documents.

## Decisions to resolve before implementation

- Clarify simultaneous match-end ordering: the gameplay spec checks time exhaustion before combat but also gives death precedence when both coincide.
- Clarify enemy type sequencing when unsafe spawn attempts are skipped; the first-two-interval guarantee depends on valid spawn positions.
- Choose the frame clamp, collision geometry, aiming tolerance, and projectile spacing; validate proposed balancing and mobile layouts.

These points are recorded in the [test plan](testing/test-plan.md#review-blockers-and-unresolved-details). Review the affected proposed decisions/specifications before setting final assertions.

## Keeping the record current

For each completed step, record what changed, which requirements it addresses, how it was verified, and any AI contribution. Distinguish documentation checks from executed application tests. Update ADR status only after review, and link actual reports or measurements when available.

The root README remains the intended entry point for the final application's setup, controls, commands, network scenarios, and deployment instructions required by §11. This guide tracks the construction process and the use of AI during that work.
