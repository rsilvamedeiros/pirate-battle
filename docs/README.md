# Construction guide and AI assistance

This document records the project's construction process and how AI supports documentation and test design. Requirements come from [CHALLENGE.md](../CHALLENGE.md); the workflow below is a proposed way to organize their implementation.

## AI assistance

AI has supported the preparation of architecture records, functional specifications, the test plan, and the profiling template. Its contributions include drafting concise documents, mapping requirements to planned tests, proposing alternatives and balancing values, checking links and consistency, and identifying unresolved decisions.

The developer sets the scope and constraints. Proposed decisions and generated material require developer review before adoption; implementation, correctness, and delivery remain the developer's responsibility. AI suggestions do not establish new challenge requirements.

The documentation preparation covered test cases, determinism, isolation, failure scenarios, and reporting, with changes limited to Markdown. The test plan enumerates 124 logical cases; it is not a claim that the full suite is implemented or passing. Profiling tables contain placeholders, not measured results.

Implementation has now started at the developer's request. AI assisted with the pure TypeScript gameplay configuration module, its validation and immutable snapshots, and the Vitest configuration tests. The first increment also enables TypeScript strict mode and adds unit-test/type-check commands. The second increment adds the React menu/Options interface, local persistence, and browser tests. Further game systems and other browser suites remain pending.

As testing is implemented, AI may also support writing tests, reviewing assertions, and investigating failures. Record that assistance here when it occurs, together with the commands actually executed and their results. Claims of coverage and performance must be supported by executable tests, reports, traces, and measurements.

## Construction steps

“Drafted” means the documentation exists; it does not mean the associated feature is implemented or the proposed decision is accepted.

| Step | Work | Current status | Reference / completion evidence |
| --- | --- | --- | --- |
| 1 | Read the challenge and document architecture boundaries and alternatives | Drafted; ADRs remain Proposed | [ADR index](adr/README.md), [architecture skeleton](../ARCHITECTURE.md) |
| 2 | Specify gameplay, configuration, screens, API contracts, and network scenarios | Drafted; design choices remain proposed | [Gameplay](specs/gameplay.md), [API contracts](specs/api-contracts.md), [network scenarios](specs/network-scenarios.md) |
| 3 | Map requirements to tests and define profiling procedures | Drafted | [Test plan](testing/test-plan.md), [profiling template](performance/profiling.md) |
| 4 | Resolve open decisions and implement the core, engine, input, PixiJS rendering, and React interface | In progress: configuration, menu, and Options implemented | [Configuration module](../src/core/config.ts), [Options screen](../src/ui/OptionsScreen.tsx); gameplay systems remain pending |
| 5 | Implement persistence, Axios/TanStack Query integration, MSW handlers, and recovery scenarios | In progress: Options persistence implemented | [Options storage](../src/persistence/options.ts); remote contracts, outbox, and handlers remain pending |
| 6 | Implement and execute core/E2E tests and review visual baselines | In progress: configuration and Options suites implemented | [Configuration tests](../src/core/config.test.ts), [Options E2E](../tests/e2e/options.spec.ts); other suites and baselines remain pending |
| 7 | Profile the optimized build, document limitations, and complete delivery | Planned | Filled profiling record, public deployment, and project setup/reproduction instructions |

Steps may overlap. Update statuses and link evidence as work is completed; keep implementation details in the corresponding specifications and architecture documents.

## Increment 1: Configuration and unit-test foundation

Delivered: 31 typed gameplay parameters matching the proposed specification, numeric and cross-field validation, independent frozen match configuration snapshots, Vitest 4 with a Node test environment, and TypeScript strict mode. The UI and combat systems are subsequent increments.

Verification: `npm run test:unit` passes 52 parameterized tests in one file; `npm run typecheck`, `npm run lint`, and `npm run build` pass. The generated MSW worker is excluded from linting. These checks do not establish E2E coverage or game performance.

For local review, run `npm ci`, then those four commands. Use `npm run test:unit:watch` to rerun unit tests as configuration code changes. This increment is ready for developer review; no commit is created automatically.

## Increment 2: Main Menu and persistent Options

Delivered: an English React menu using the supplied background, title, panel, and button assets; keyboard/touch control instructions; two Options fields validated against the core rules; accessible errors, save feedback, and focus restoration. Save persists a versioned `pirate-battle.options.v1` envelope with stable local player identity. Leaving without Save discards edits. Invalid saved data restores defaults; failed storage writes report an error and preserve previous settings.

Play, Ranking, and Match History are visibly unavailable until their corresponding gameplay/API increments. Saving options does not start a match. Combat, the result screen, and remote data integration remain pending.

Verification: 13 Options E2E cases passed in each of Chromium desktop and Pixel 7 emulation, for 26 executions against the optimized build. Cases cover boundaries, decimals, invalid/empty values, refresh and identity persistence, unsaved edits, keyboard focus, malformed storage, read/write failures, retry, and responsive layouts. The 52 core tests, lint, type checking, and production build also pass. Desktop/mobile screenshots were reviewed; they are review artifacts, not versioned visual baselines.

AI assisted with interface/persistence implementation and browser-test design and execution. For developer review, run `npm run dev`, open Options, save valid values, refresh, and retry with invalid values. Run `npx playwright install chromium` once if needed, then `npm run test:e2e`; open its HTML report with `npm run test:e2e:report`. Browser artifacts remain untracked.

## Decisions to resolve before implementation

- Clarify simultaneous match-end ordering: the gameplay spec checks time exhaustion before combat but also gives death precedence when both coincide.
- Clarify enemy type sequencing when unsafe spawn attempts are skipped; the first-two-interval guarantee depends on valid spawn positions.
- Choose the frame clamp, collision geometry, aiming tolerance, and projectile spacing; validate proposed balancing and mobile layouts.

These points are recorded in the [test plan](testing/test-plan.md#review-blockers-and-unresolved-details). Review the affected proposed decisions/specifications before setting final assertions.

## Keeping the record current

For each completed step, record what changed, which requirements it addresses, how it was verified, and any AI contribution. Distinguish documentation checks from executed application tests. Update ADR status only after review, and link actual reports or measurements when available.

The root [README.md](../README.md) preserves the original challenge. [TECHNICAL.md](../TECHNICAL.md) describes the current implementation, while [TESTING.md](../TESTING.md) contains setup and practical verification instructions. This guide tracks the construction process and the use of AI during that work. Expand the solution guides with remaining scenario and deployment instructions as those features are delivered.
