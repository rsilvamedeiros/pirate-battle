# Construction guide and AI assistance

This document records the project's construction process and how AI supports documentation and test design. Requirements come from [CHALLENGE.md](../CHALLENGE.md); the workflow below is a proposed way to organize their implementation.

## AI assistance

AI has supported the preparation of architecture records, functional specifications, the test plan, and the profiling template. Its contributions include drafting concise documents, mapping requirements to planned tests, proposing alternatives and balancing values, checking links and consistency, and identifying unresolved decisions.

The developer sets the scope and constraints. Proposed decisions and generated material require developer review before adoption; implementation, correctness, and delivery remain the developer's responsibility. AI suggestions do not establish new challenge requirements.

The documentation preparation covered test cases, determinism, isolation, failure scenarios, and reporting, with changes limited to Markdown. The test plan enumerates 124 logical cases; it is not a claim that the full suite is implemented or passing. Profiling tables contain placeholders, not measured results.

Implementation started at the developer's request. AI assisted with configuration and tests; menu/Options and persistence; navigation and PixiJS lifecycle; weapons and obstacle contacts; seeded enemies, damage/scoring and feedback; and now completed-result persistence, a pending outbox and corresponding tests. HTTP registration and remote data remain pending.

As testing is implemented, AI may also support writing tests, reviewing assertions, and investigating failures. Record that assistance here when it occurs, together with the commands actually executed and their results. Claims of coverage and performance must be supported by executable tests, reports, traces, and measurements.

## Construction steps

“Drafted” means the documentation exists; it does not mean the associated feature is implemented or the proposed decision is accepted.

| Step | Work | Current status | Reference / completion evidence |
| --- | --- | --- | --- |
| 1 | Read the challenge and document architecture boundaries and alternatives | Drafted; ADRs remain Proposed | [ADR index](adr/README.md), [architecture skeleton](../ARCHITECTURE.md) |
| 2 | Specify gameplay, configuration, screens, API contracts, and network scenarios | Drafted; design choices remain proposed | [Gameplay](specs/gameplay.md), [API contracts](specs/api-contracts.md), [network scenarios](specs/network-scenarios.md) |
| 3 | Map requirements to tests and define profiling procedures | Drafted | [Test plan](testing/test-plan.md), [profiling template](performance/profiling.md) |
| 4 | Resolve open decisions and implement the core, engine, input, PixiJS rendering, and React interface | In progress: local combat and persisted result implemented | [Simulation](../src/core/simulation.ts), [game screen](../src/ui/GameScreen.tsx), [result details](../src/ui/ResultDetails.tsx) |
| 5 | Implement persistence, Axios/TanStack Query integration, MSW handlers, and recovery scenarios | In progress: Options/result/outbox persistence implemented | [Results store](../src/persistence/results.ts), [typed records](../src/api/contracts.ts); HTTP dispatch, handlers and scenarios remain pending |
| 6 | Implement and execute core/E2E tests and review visual baselines | In progress: local combat and result/browser suites | [Persistence units](../src/persistence/results.test.ts), [result E2E](../tests/e2e/result.spec.ts), [navigation E2E](../tests/e2e/navigation.spec.ts); API suites and baselines remain pending |
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

## Increment 3: Navigable arena and fixed-step session

Delivered: a pure navigation simulation, injectable-clock engine at 60 Hz with a proposed 250 ms clamp, PixiJS water/island/ship and health indicator, semantic HUD snapshots, keyboard and simultaneous touch movement, manual/focus-loss/hidden-tab pause, explicit resume, clean menu exit and restart. Options are captured at session start. Time expiry stops navigation and shows a temporary completion dialog; combat, the full persisted result and submission remain pending.

The proposed arena is 1000 × 700 lu with an island at (500, 350), radius 100 lu, and a player radius of 40 lu. Loading has visible feedback, retry and menu exit. Async initialization uses disposal guards; teardown removes the private ticker, canvas and input listeners while retaining the cached ship texture. Hooks only exist with `?e2e=1` and provide copied-state observation and manual time advance through the real rules. Seeded randomness is pending because navigation has no random behavior.

Verification: 72 units pass (52 configuration, 11 navigation, 9 engine) and 48 browser executions pass (24 cases on each of desktop/mobile: 13 Options, 2 assets, 5 movement, 4 pause). Lint, type checking and production build pass. A development StrictMode review completed five navigation cycles per layout with one canvas per session and no unhandled page errors. Desktop, mobile portrait and landscape screenshots were reviewed; profiling and versioned visual baselines remain pending.

AI assisted with implementation, test design/execution, lifecycle investigation and documentation updates. Headless WebGL stalls were resolved by forcing SwiftShader in Playwright. The full Chromium channel permits the focus-loss test to switch to another actual page. For review, run `npm run dev`, select Play, move with W/arrows and A/D, try the island/boundaries, pause with Esc/P, switch tabs, resume and return to the menu. Touch controls allow forward movement and rotation together.

## Increment 4: Player weapons and obstacle contacts

Delivered: one forward projectile and three parallel shots per side, held fire with independent cooldowns, simultaneous keyboard/touch navigation and attacks, fixed shot headings and configured speed/damage/range/lifetime. Projectiles use swept island/arena contacts and expire at the first range/lifetime limit. Proposed geometry is radius 4 lu, muzzle distance 46 lu and broadside spacing 16 lu. Ship, projectile and effect textures must all load before starting; each failure supports retry. Firing and obstacle impacts use supplied assets and active-time visual effects.

Pause freezes shots, effects and cooldowns; cleared inputs require a fresh press after resume. Completion stops weapon state and restart clears entities/cooldowns. Enemies, target damage and scoring remain pending, so this increment does not fully satisfy challenge §8.4.

Verification: 93 unit tests pass across five files. The desktop/mobile E2E suite passes 68 executions (34 cases per project: 13 Options, 5 assets, 5 movement, 7 weapons, 4 pause). Lint, type checking and production build pass. Development StrictMode review completed five movement/fire/exit cycles per layout without duplicate canvases or unhandled page errors; desktop, mobile portrait and landscape screenshots were reviewed. This is not memory profiling or versioned visual regression. Manual review instructions and suite counts are maintained in [TESTING.md](../TESTING.md).

AI assisted with pure weapon/geometry implementation, PixiJS sprite lifecycle and feedback, mobile controls, test design/execution and documentation updates. For review, run `npm run dev`, select Play, hold Space for front fire and Q/E for broadsides, fire at the island, pause while shots are active and retry with simultaneous touch controls.

## Increment 5: Seeded enemies, damage and scoring

Delivered: deterministic xorshift32 spawns with free/distant position validation, 32 attempts and a grid fallback; the first two successful spawns are Chaser and Shooter. Both steer/rotate and avoid the island using a conservative ring route. Chasers apply one impact and self-destruct without scoring. Shooters approach, aim within 0.15 rad and fire on individual cooldowns. Player kills score once; team filtering, swept contacts and immediate dead-target removal prevent repeated damage/scoring. HP bars, tint deterioration, damage and destruction effects expose combat state.

Time expiry wins at the configured boundary before movement/combat; death in an earlier step stops remaining damage/contact/fire immediately. This resolves the previous contradictory proposed order. Completion now displays reason, score and active duration, but persisted results and registration remain pending. Normal matches use browser crypto for seeds; `?e2e=1` permits seeded clocks and startup fixtures without running-state mutation. Time-expiry fixtures keep combat/spawns enabled with validated high-HP/low-damage tuning.

Verification: 115 units pass across seven files, and 94 E2E executions pass (47 cases per desktop/mobile project: 13 Options, 7 assets, 5 movement, 9 combat, 6 enemies, 3 match-end, 4 pause). Lint, type checking and production build pass. Development StrictMode review completed five seeded enemy/exit cycles per layout, with one canvas and no unhandled page errors. Combat, damage and death screenshots were reviewed; these are not visual baselines or memory measurements. The [testing guide](../TESTING.md) records fixture setup, commands and remaining coverage.

AI assisted with simulation/render implementation, enemy routing, seed and fixture design, real-input browser tests and documentation updates. For review, run `npm run dev`, survive two spawn intervals, observe both sail colors, fire at enemies, compare player/enemy HP changes, verify scoring and finish a match by time or death. Proposed balance still requires playtesting and profiling.

## Increment 6: Persisted results and pending outbox

Delivered: immutable completed MatchRecord with shell-generated UUID, UTC date, score, floor-rounded active duration, end reason, stable player identity and all 31 configuration values. The configuration group serializes validated fields in lexical order. The store captures each terminal state once, writes the outbox before the last result, retains multiple pending matches and recovers interrupted writes on boot. The completion dialog and Last Result menu view expose semantic details and pending registration. Play Again remains available; abandonment never overwrites an earlier result.

Storage failures retain in-memory payloads and offer Retry Save with the same identifiers. Unreadable/invalid outbox data is preserved instead of overwritten; valid pending entries merge when reads recover. This increment performs no HTTP requests and does not claim registration confirmation, boot dispatch or server deduplication. Those depend on the next API/MSW increment.

Verification: 128 units pass across eight files; lint, type checking and optimized build pass. The full 114-execution desktop/mobile browser run passed 112 and exposed two duplicate-status failures when storage was blocked. The menu was corrected to avoid overlapping notices. The affected Options/result/navigation suites were rebuilt and rerun: all 46 executions passed, including both previously failing cases. The latest HTML report contains this targeted revalidation; the other suites passed in the full run. No known failing case remains.

Development StrictMode review completed five completion/exit cycles per layout with exactly five pending entries, one canvas per session, deleted hooks after exit, restored result after refresh and no unhandled page errors. Desktop/mobile portrait/landscape screenshots were reviewed; they are not versioned visual baselines or memory measurements. Original README challenge text remains intact and documentation links resolve. Executable counts and practical review instructions are maintained in [TESTING.md](../TESTING.md#current-coverage).

AI assisted with typed records, persistence/recovery implementation, semantic result UI, unit/browser tests and documentation. For review, complete a match, return to the menu, refresh and open Last Result; start a new voyage while the previous result is pending, then abandon it and check that the old result remains.

## Decisions to validate during implementation

- Time-first boundary ordering and successful-spawn type sequencing are implemented as proposed choices; validate their documented behavior.
- Collision footprints, projectile spacing, aiming tolerance and island routes are implemented; validate balancing, mobile usability and safe-spawn availability.
- Pending result/outbox storage is implemented; HTTP dispatch/confirmation, remote scenarios, visual baselines, profiling and deployment remain required delivery work.

These points are recorded in the [test plan](testing/test-plan.md#review-blockers-and-unresolved-details). Review the affected proposed decisions/specifications before setting final assertions.

## Keeping the record current

For each completed step, record what changed, which requirements it addresses, how it was verified, and any AI contribution. Distinguish documentation checks from executed application tests. Update ADR status only after review, and link actual reports or measurements when available.

The root [README.md](../README.md) preserves the original challenge. [TECHNICAL.md](../TECHNICAL.md) describes the current implementation, while [TESTING.md](../TESTING.md) contains setup and practical verification instructions. This guide tracks the construction process and the use of AI during that work. Expand the solution guides with remaining scenario and deployment instructions as those features are delivered.
