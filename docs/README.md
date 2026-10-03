# Construction guide and AI assistance

This document records the project's construction process and how AI supports documentation and test design. Requirements come from [CHALLENGE.md](../CHALLENGE.md); the workflow below is a proposed way to organize their implementation.

## AI assistance

AI has supported the preparation of architecture records, functional specifications, the test plan, and the profiling template. Its contributions include drafting concise documents, mapping requirements to planned tests, proposing alternatives and balancing values, checking links and consistency, and identifying unresolved decisions.

The developer sets the scope and constraints. Proposed decisions and generated material require developer review before adoption; implementation, correctness, and delivery remain the developer's responsibility. AI suggestions do not establish new challenge requirements.

The documentation preparation covered test cases, determinism, isolation, failure scenarios, and reporting, with changes limited to Markdown. The test plan enumerates 124 logical cases; it is not a claim that the full suite is implemented or passing. The reusable profiling template contains placeholders; increment 9 records actual measurements separately.

Implementation started at the developer's request. AI assisted with configuration, menus/persistence, navigation/PixiJS, weapons, seeded enemies/damage, completed results, HTTP integration, shared MSW scenarios, registration recovery, tests, requirement audits, visual regression and now measured real-time profiling. Public deployment remains pending.

As testing is implemented, AI may also support writing tests, reviewing assertions, and investigating failures. Record that assistance here when it occurs, together with the commands actually executed and their results. Claims of coverage and performance must be supported by executable tests, reports, traces, and measurements.

## Construction steps

“Drafted” means the documentation exists; it does not mean the associated feature is implemented or the proposed decision is accepted.

| Step | Work | Current status | Reference / completion evidence |
| --- | --- | --- | --- |
| 1 | Read the challenge and document architecture boundaries and alternatives | Implemented architecture documented; ADRs remain Proposed | [ADR index](adr/README.md), [architecture](../ARCHITECTURE.md) |
| 2 | Specify gameplay, configuration, screens, API contracts, and network scenarios | Drafted; design choices remain proposed | [Gameplay](specs/gameplay.md), [API contracts](specs/api-contracts.md), [network scenarios](specs/network-scenarios.md) |
| 3 | Map requirements to tests and define profiling procedures | Drafted plan with implementation updates | [Test plan](testing/test-plan.md), [profiling template](performance/profiling-template.md) |
| 4 | Resolve open decisions and implement the core, engine, input, PixiJS rendering, and React interface | In progress: local combat and persisted result implemented | [Simulation](../src/core/simulation.ts), [game screen](../src/ui/GameScreen.tsx), [result details](../src/ui/ResultDetails.tsx) |
| 5 | Implement persistence, Axios/TanStack Query integration, MSW handlers, and recovery scenarios | Implemented locally; public worker verification pending | [Runtime](../src/api/runtime.ts), [coordinator](../src/api/submissions.ts), [handlers](../src/mocks/handlers.ts), [database](../src/mocks/database.ts) |
| 6 | Implement and execute core/E2E tests and review visual baselines | Functional and visual suites implemented; six baseline PNGs added for versioning | [Visual E2E](../tests/e2e/visual.spec.ts), [baseline record](../tests/e2e/visual.spec.ts-snapshots/README.md); execution records below |
| 7 | Profile the optimized build, document limitations, and complete delivery | Desktop profiling measured; public deployment/final packaging pending | [Measured record](performance/profiling.md), raw frame/trace/heap evidence, public deployment and final guides |

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

## Increment 7: HTTP records and recovery

Delivered: real Axios GET/PUT through an always-enabled MSW worker and TanStack Query reads/mutations; typed paginated Ranking/Match History, configuration grouping and deterministic ordering; shared persisted confirmed records and fixtures. The outbox dispatches only after readiness/durable queue writes, shares in-flight work per ID, retries bounded transient failures and supports boot/manual recovery. Older acknowledgments cannot overwrite newer results. Failed initialization/storage does not block gameplay.

All 14 network schedules have query-parameter/UI selection, per-endpoint seeded randomness and generation guards. Ordinary selection preserves records; explicit reset describes and clears only owned demo match data, keeping Options/identity. Recovery replays pending identifiers. Tests cover post-commit timeout, pending refresh, errors, page/tab refresh, stale reads and reset without late data resurrection. Core rules and continuous state remain outside React/network layers.

Verification: `npm run test:unit` passes all 158 unit/integration cases across 13 files. `npm run lint` and the optimized build pass; the build also performs TypeScript checking and reports an entry chunk above 500 kB. The final `npm run test:e2e` run passes all 158 executions (79 cases per desktop/mobile project) in 12.1 minutes, with no automatic test retries. The latest HTML report is in `playwright-report/index.html`; open it with `npm run test:e2e:report`.

Earlier runs exposed a too-short retry assertion, page routing that missed Service Worker-owned assets, unguarded MSW imports under blocked storage and automatic worker-startup reloads that erased recovery notices. The assertion now covers specified retries; context routing, guarded imports and explicit worker activation/control address those problems. All 40 targeted assets/Options executions passed before the final complete run. Solution Markdown links resolve; four original challenge asset links retain their historical paths, with working solution links documented in TECHNICAL.md. The original challenge text remains unchanged.

Development StrictMode review completed five completion/exit cycles per desktop/mobile layout: five confirmed non-fixture records, no pending entries, one canvas during each match, no canvas/hooks after exit and no unhandled page errors. Hard refresh triggered exactly one navigation and preserved eight local history entries (five completions plus three fixtures); the last-configuration ranking contained the five completions. Desktop/mobile result and ranking screenshots, including landscape, were captured for review. These are not versioned visual baselines or memory profiling.

AI assisted with implementation, tests, investigation, documentation and a [challenge compliance audit](delivery/challenge-audit.md). No score or hiring outcome is inferred. Before final submission, create versioned visual baselines, measure actual frame/memory behavior, deploy publicly, translate the developer-requested Portuguese solution introduction and package reports/final documentation. The original challenge remains unchanged.

## Increment 8: Visual regression

Delivered: `tests/e2e/visual.spec.ts` with Menu, stable arena and confirmed result comparisons on both Chromium projects; six PNG baselines ready to include in Git, plus a [reference environment/update record](../tests/e2e/visual.spec.ts-snapshots/README.md). No application code, gameplay rules, packages or global browser configuration changed.

Each case starts in a fresh context with seed 42 and the success network scenario. Menu exposes control instructions. The arena advances to 3100 ms through the fixed-step engine and actual keyboard front/left fire, then asserts four projectiles, a live enemy and unchanged state throughout capture. Result completion uses real Chaser collision and waits for HTTP confirmation. The browser date is fixed, network timers continue running, the simulation clock remains stopped during capture, assets/fonts are awaited, CSS animations are disabled and no elements are masked.

Verification: baseline generation passed all six executions, and the final `npm run test:e2e -- tests/e2e/visual.spec.ts --repeat-each=3` passed all 18 comparisons in 2.2 minutes without updating snapshots or automatic retries. All six images were visually reviewed. `npm run lint` and the optimized build/type checking passed; the existing large-chunk warning remains. Markdown links resolve and all six PNGs are ready for versioning. The latest HTML report contains the repeated visual run, not a new full functional run.

Early cold-start runs exceeded screenshot or total-test deadlines; the suite now allows 15 seconds per screenshot assertion and 60 seconds per visual test. Pixel criteria and baseline images were not relaxed to resolve those failures. The final repeated comparison passed after these bounded timeout changes.

AI assisted with test design, implementation, execution, timeout investigation, image review and documentation. Existing increment 7 functional/unit results remain historical; this increment adds six executions to the browser inventory (164 total), and revalidates the changed visual subset. Performance measurements, public deployment and final English/default plus Portuguese README/report packaging remain pending.

## Increment 9: Real-time profiling

Delivered: opt-in post-render diagnostics, bounded numeric samples and validated proposed endurance tuning; headed Chromium/native-time reproduction and analysis scripts; a [measured record](performance/profiling.md), [reusable template](performance/profiling-template.md) and compressed raw frame, Performance/heap evidence. Ordinary gameplay, manual E2E mode, defaults, package dependencies and visual baselines remain unchanged.

Reference collection completed a 180-active-second match and five additional 60-second start/play/exit cycles without refreshing the page. The real hardware GPU is Intel HD Graphics 620 on an i5-7200U laptop. Observed post-render cadence is 74.933/s, p95 interval 14.700 ms and peak total entities 44. Memory after explicit collection ranges from baseline 6.957 MiB to cycle 5 at 7.323 MiB, with a decrease at cycle 3, stable 266 DOM nodes/180 listeners and no attached canvases or diagnostic hooks after exit. Heap-property signatures show no retained session objects; the largest shallow-byte increase is V8 code. These are scoped observations, not proof of leak freedom or physical display FPS. The report explicitly records the proposed 500 HP/damage 1 preset and instrumentation overhead.

Verification: all 161 unit/integration cases across 14 files pass; lint, optimized build and type checking pass. The final 34-execution desktop/mobile run passes diagnostics, visual, movement, pause and navigation suites, including all six unchanged baseline comparisons. The complete browser inventory is 168 executions; other functional suites retain their earlier full-run evidence.

Initial validation caught a missing global type import in the new browser spec, then six failures in the first 34-case run, including long headless continuous-render timeouts and a cold asset-start wait. The diagnostics behavior test now controls browser RAF/time, keeping real engine rules and input while avoiding an unbounded headless SwiftShader loop; this test is not a benchmark. The final complete targeted rerun passes all 34 cases without automatic retries or changes to prior test timeouts/baselines. Real performance collection separately used a visible hardware-accelerated browser and native time.

AI assisted with instrumentation, scripts, collection, calculations, heap/trace investigation, test debugging and documentation. The profiler measures without changing core transitions; the full endurance preset is explicit, validated and reproducible. Public deployment, final English/default and Portuguese README versions, architecture cleanup and test-report packaging remain pending.

## Increment 10: Final regression and delivery review

This increment separates lockfile/static/unit verification, optimized-browser regression, development StrictMode checks, evidence packaging and public publication. The [final review](delivery/final-review.md) records executed outcomes and outstanding checks.

Added three lifecycle cases per layout and dedicated development projects. The first complete run passed 170 of 174 executions; four new assertions exposed dialog focus escape and slight canvas stretching from border-box sizing. The explicit Tab/Shift+Tab cycle, post-cleanup focus restoration and content-box arena layout address those findings. Two development runs exposed a restoration race; the final six StrictMode executions passed without retries. Reviewed visual regeneration changed three PNGs while leaving both menus and mobile result unchanged; pixel criteria were retained.

The second complete run passed 173 and failed one Shooter case at the five-second arena-readiness timeout before combat assertions. Its trace is preserved. The shared fixture now waits up to 15 seconds for initialized game hooks and confirms visible canvas/enabled Pause. Three explicit repetitions per layout passed, followed by the complete final run: all 174 executions passed in 10.9 minutes, with zero failures/skips/flaky cases/automatic retries and all six unchanged visual comparisons. Unit verification passed all 161 cases across 14 files; lint, strict types and optimized build passed. Reports and source/build identity are versioned in the final-review artifacts.

README.md is now the English solution guide, with a supplementary README.pt-BR.md and mutual links. The original CHALLENGE.md is preserved. Architecture skeleton text is replaced with implementation details; ADRs remain Proposed. HTML reports, traces, JSON summaries and reproducible build/source identity accompany the review; public deployment remains outstanding.

AI assisted requirement review, regression design/execution, diagnosis and correction of focus/scaling defects, visual review, final documentation and evidence packaging. The developer remains responsible for understanding the changes, validating balance and completing public delivery.

## Final documentation and publication handoff

After the implementation review, the repository gained Sass modules, shared formatting and stylesheet linting, a GitHub Actions workflow, and separate MainMenu/SessionDialog components. A real-navigation regression verifies that retained menu tabs/pages and focus survive Options and gameplay navigation. These changes preserve the existing gameplay and visual baselines.

The final documentation stage reviews the complete challenge, keeps the default README in English and the requested supplementary guide in Portuguese, and adds evaluator/deployment instructions. The [pre-deployment archive](delivery/artifacts/2026-10-03-release/README.md) records current verification separately from older full runs and the original profiling build. AI assisted documentation review, test execution and evidence packaging; the developer will commit, push and publish on Vercel, then validate the public URL before submission.

## Decisions to validate during implementation

Latest delivery update: visual baselines are implemented in increment 8, desktop profiling is measured in increment 9, and final regression/documentation is recorded in increment 10. English README.md and Portuguese README.pt-BR.md now exist with mutual links; the original challenge remains in CHALLENGE.md.

- Time-first boundary ordering and successful-spawn type sequencing are implemented as proposed choices; validate their documented behavior.
- Collision footprints, projectile spacing, aiming tolerance and island routes are implemented; validate balancing, mobile usability and safe-spawn availability.
- HTTP dispatch/confirmation and remote scenarios are implemented locally; public deployment and final documentation/report packaging remain required delivery work.

These points are recorded in the [test plan](testing/test-plan.md#review-blockers-and-unresolved-details). Review the affected proposed decisions/specifications before setting final assertions.

## Keeping the record current

For each completed step, record what changed, which requirements it addresses, how it was verified, and any AI contribution. Distinguish documentation checks from executed application tests. Update ADR status only after review, and link actual reports or measurements when available.

The root [README.md](../README.md) is the English solution guide; [README.pt-BR.md](../README.pt-BR.md) is supplementary Portuguese documentation and [CHALLENGE.md](../CHALLENGE.md) preserves the original challenge. [TECHNICAL.md](../TECHNICAL.md) describes the implementation, while [TESTING.md](../TESTING.md) contains setup and practical verification instructions. This guide tracks construction and AI assistance. Add the public URL and deployed verification evidence when publication is complete.
