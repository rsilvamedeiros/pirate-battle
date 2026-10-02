# Challenge compliance audit

Reviewed against the complete [CHALLENGE.md](../../CHALLENGE.md) during increment 7. This is an evidence-based delivery checklist, not a hiring prediction or a claim that every requirement is complete. Proposed balance, endpoint, pagination and tie-break choices are distinguished from challenge requirements in the [specifications](../specs/gameplay.md) and [ADRs](../adr/README.md).

## Requirement review

| Requirement | Current implementation / evidence | Remaining work |
| --- | --- | --- |
| Mandatory stack (§1) | React UI, strict TypeScript, PixiJS arena, Axios HTTP, TanStack Query reads/mutations, MSW browser handlers and Playwright suites participate in actual flows | Verify the same stack on the public deployment |
| Player movement and weapons (§2) | Pure core, arena/island constraints, single front shot, three parallel shots per side, independent cooldowns, simultaneous keyboard/touch controls; core and combat E2E suites | Final manual balance review |
| Chaser and Shooter (§2) | Seeded safe spawns, approach/rotation, island avoidance, Chaser impact without points, Shooter ranged attacks, HP/death removal and one point per player kill | Standard-play balance review; routes assume one circular island |
| Timer, completion, pause and restart (§2) | Active-time timer, time/death termination, frozen terminal state, fresh restart, manual/focus/visibility pause; engine/core/browser evidence | Manually verify hidden-tab behavior in the intended browser; no physical-device performance claim |
| Screens and Options (§3) | Menu, validated persistent Options, PixiJS combat, completed details/registration, paginated Ranking and Match History | Final UX and keyboard review of all states |
| Local match lifecycle (§3) | Immutable configuration/record, last result and queue persist; abandonment does not create a record or replace a result | Simultaneous browser-tab writes are not coordinated; document this local-demo limitation |
| English solution content (§3) | Code identifiers and app interface are English; technical/spec/test/audit documents are English | The developer requested a Portuguese root README introduction. That solution prose conflicts with §3; translate it before submission. Preserve the original challenge separately |
| React/PixiJS architecture (§4) | Core has no React/PixiJS/Date/Math.random dependencies; injected-clock engine; stable visible HUD snapshots; owned rendering/input lifecycle | Replace remaining architecture TODOs with final descriptions and reviewed ADR statuses |
| Textures, sizing and resources (§4) | Supplied textures load before combat, retry failures, cache reuse, proportional/DPR canvas and teardown guards; asset/movement/navigation suites | Formal memory evidence and final browser/resize review |
| Remote data and consistency (§5) | Shared typed REST records, configuration grouping, deterministic ordering, pagination, cache, bounded retries, refetch on tab return and invalidation after registration | Validate deployed-worker readiness and final cache/recovery demonstrations |
| Unique registration and recovery (§5) | Durable queue before PUT, one in-flight mutation per ID, first committed record wins, boot/manual retry, confirmation removes only the matching entry; submission/resilience tests | Final delivery report and manual recovery rehearsal |
| Network scenarios (§6) | All 14 specified scenario IDs selectable by query parameter and UI; seeded per-endpoint latency, isolated failures, post-commit timeout, offline recovery and generation guards for reset | Variable-latency browser repetition and more adversarial same-key/page-response variants remain useful coverage additions; shared scheduler/handler units cover determinism and obsolete commits |
| Production MSW (§6; §11) | Worker starts unconditionally in development and optimized preview; HTTP is gated on readiness while gameplay remains accessible | Public URL and reload verification are mandatory and still missing |
| Assets and accessibility (§7) | Supplied sprites/menu assets, visible loading/errors/focus, native dialogs, semantic result/HUD, labels, tabs and portrait/landscape controls | Final contrast/focus/physical touch review; emulation is not a physical-device audit |
| Twelve functional E2E flows (§8) | All 158 executions passed in the final optimized-build run on Chromium desktop and Pixel 7 emulation; Options/assets/movement/combat/enemies/match-end/pause/result/navigation/leaderboard/submission/resilience suites | Expanded planned variants are not automatically covered by a passing test count; visual baselines remain required separately |
| Visual regression (§8) | Review screenshots exist locally | Missing menu, stable arena and result baselines versioned in Git; review screenshots do not meet this requirement |
| Reports and traces (§8; §11) | HTML reporter and failure traces configured; commands documented | Export/package final reports for delivery; ignored local artifact folders alone are not delivered evidence |
| Frame and entity metrics (§9) | Fixed 60 Hz simulation and optimized build exist | Missing measured average FPS, p95 frame time and entity counts over a real three-minute match; 60 Hz simulation does not prove 60 FPS rendering |
| Memory profiling (§9) | Cleanup assertions and repeated lifecycle reviews exist | Missing measured heap after five start/play/exit cycles and investigation of growth; lifecycle tests are not memory profiling |
| Delivery and reproduction (§11) | Source, lockfile, assets, fixtures, handlers, tests, setup and reproduction guides in the repo | Missing public deployment, final profiling/report artifacts and final README/architecture cleanup |
| Original challenge asset links (§7) | Supplied files are served from `public/assets/`; the preserved challenge text still links to `assets/` | Retain the original wording and provide working solution links to `public/assets/`; do not mistake the original relative paths for missing game assets |
| Initial time estimate (challenge introduction) | Not verifiable from repository history supplied to this review | Verify whether the candidate already communicated it externally; do not fabricate a retrospective estimate |

## Findings addressed in increment 7

- Axios, TanStack Query and MSW were installed but unused. They now execute real browser HTTP flows for both reads and registration, including optimized preview.
- Registration previously stayed pending forever. Real confirmation, error, boot replay, manual retry and independent pending records now exist.
- Confirmed queue entries must not reappear during later local writes. In-memory confirmation IDs filter merged saved entries; confirmation saves the latest result before queue removal. If local acknowledgement persistence fails, boot safely retries the same ID against the confirmed database.
- Older submissions must not replace a newer last result. Confirmation/error updates are restricted to matching IDs.
- Scenario/reset transitions cancel reads and abort mutations, and generation checks reject obsolete handlers and acknowledgements. Reset preserves Options/identity and unrelated storage.
- Synchronous initialization failure must remain retryable. Bootstrap is scheduled before work starts, so a failed storage read does not leave a permanently latched initialization promise.
- MSW imports must not crash the interface when its cookie store encounters blocked localStorage. Imports now occur inside guarded startup, after checking the demo database.
- Worker startup must not reload the page during recovery. Explicit activation/control precedes MSW startup, keeping hard-refresh recovery notices and current navigation intact.
- Asset failures must remain testable with the worker enabled. Browser-context routing intercepts Service Worker-owned asset requests without bypassing production MSW behavior.
- Gameplay pause keys are no longer captured after completion. Result navigation retains normal keyboard behavior.

## Delivery decision

The project follows the intended gameplay and architectural direction, with documented proposed choices and executable evidence. It is **not ready for final submission** until visual baselines, real profiling, a public deployment, English solution README content and final report/documentation packaging are complete. Do not infer evaluation points from test totals.

The challenge requires the candidate to implement and explain gameplay rules (§4). AI assistance is recorded in the [construction guide](../README.md); the candidate must review the implementation, understand the tradeoffs and validate the delivered behavior. The challenge contains no explicit AI-use prohibition; separate hiring-process rules are not available in this repository.

## Verification record

Increment 7: all 158 unit/integration cases across 13 files passed, and all 158 browser executions passed (79 cases per project), including 8 leaderboard, 4 submission and 10 resilience cases per project. Lint and optimized build passed; the build reports a large entry chunk. Final execution outcomes and the separate StrictMode review are recorded in the [construction guide](../README.md#increment-7-http-records-and-recovery) and [TESTING.md](../../TESTING.md#current-coverage). Profiling values remain unmeasured.
