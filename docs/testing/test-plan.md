# Test plan

Sources: [CHALLENGE.md](../../CHALLENGE.md), especially §§8–9; the [ADR index](../adr/README.md); [Gameplay](../specs/gameplay.md), [API contracts](../specs/api-contracts.md), and [Network scenarios](../specs/network-scenarios.md).

This is a plan, not evidence that the full suite is implemented or passing. Filenames, case names, browser project settings, and artifact locations are **proposed**, unless an implementation update below states otherwise. Vitest core tests supplement the required Playwright coverage; the challenge does not mandate Vitest. Assertions for proposed spec choices remain subject to acceptance of those choices.

Implementation update: the configuration suite now runs with Vitest 4 and covers defaults, Options boundaries, invalid numbers/containers, integer HP, spawn weights, Shooter reach, and immutable snapshots. It passes 52 parameterized tests in `src/core/config.test.ts`; browser suites and other core files remain planned. See the [construction guide](../README.md#increment-1-configuration-and-unit-test-foundation) for the delivered increment and local verification commands.

U1 remains unchecked until boundary cases for every balancing field are exercised; the first increment verifies the exposed Options boundaries and representative balancing limits.

Increment 2 update: `tests/e2e/options.spec.ts` contains 13 cases, executed on Chromium desktop and Pixel 7 emulation (26 passing executions). It covers Options navigation, validation, persistence, identity, unsaved edits, keyboard focus, storage failures/recovery, and responsive layout. The active-match configuration-snapshot assertion remains pending until gameplay exists, so row 1 remains unchecked. Other E2E files and visual baselines are still planned.

## Traceability matrix

Increment 5 update: `src/core/enemies.test.ts` adds 15 seeded spawn/safety/route/behavior cases and `src/core/damage.test.ts` adds 7 team/damage/scoring/end-order cases. Browser coverage adds 6 enemy cases, 3 match-end cases and 2 real-input kill cases; assets covers both enemy textures as well. Coincident completion now follows documented proposed time-first ordering, and the initial type sequence advances on successful spawns. The full challenge remains unchecked where planned variants, persistence, network, visuals or delivery evidence are pending. Current executable counts live in [TESTING.md](../../TESTING.md#current-coverage).

Increment 4 update: navigation and engine units remain implemented; `src/core/collisions.test.ts` adds 9 swept obstacle/arena cases and `src/core/combat.test.ts` adds 12 player-weapon cases. `tests/e2e/combat.spec.ts` adds 7 cases driven by real keyboard/touch input for shot geometry, independent cooldowns, rendered feedback, obstacle removal, expiry, pause and restart. Assets now has 5 cases (four required texture failures/recovery plus abandoned loading). Damage, teams, kills and duplicate-free scoring are still pending, so requirement 4 and unit combat/collision groups are not fully verified. Current counts and execution evidence live in [TESTING.md](../../TESTING.md#current-coverage).

Each numbered row maps directly to the corresponding item in §8. Status ☐ means planned and not verified. V1–V3 cover the separate visual requirement; U1–U5 group the proposed `src/core/**/*.test.ts` Vitest suite. §9 measurements belong to the [Profiling template](../performance/profiling.md), rather than timing assertions in E2E tests.

| # | Requirement (section reference) | Test file | Type | Status |
| --- | --- | --- | --- | --- |
| 1 | Options navigation, validation, and persistence (§8.1; §3) | tests/e2e/options.spec.ts | E2E | ☐ |
| 2 | Asset loading, failures, and retry (§8.2; §4; §7) | tests/e2e/assets.spec.ts | E2E | ☐ |
| 3 | Match start, movement, rotation, arena limits, and islands (§8.3; §2) | tests/e2e/movement.spec.ts | E2E | ☐ |
| 4 | Front/side fire, damage, cooldowns, and duplicate-free scoring (§8.4; §2) | tests/e2e/combat.spec.ts | E2E | ☐ |
| 5 | Chaser/Shooter behavior and spawn interval (§8.5; §2) | tests/e2e/enemies.spec.ts | E2E | ☐ |
| 6 | Time/death completion, stopped simulation, and clean restart (§8.6; §2) | tests/e2e/match-end.spec.ts | E2E | ☐ |
| 7 | Pause, focus loss, and resume without timer jumps (§8.7; §2) | tests/e2e/pause.spec.ts | E2E | ☐ |
| 8 | Result display and persistence after refresh (§8.8; §3) | tests/e2e/result.spec.ts | E2E | ☐ |
| 9 | Abandonment, repeated navigation, and touch controls (§8.9; §3; §4; §7) | tests/e2e/navigation.spec.ts | E2E | ☐ |
| 10 | Ranking/history queries, pagination, loading, empty, and errors (§8.10; §§5–6) | tests/e2e/leaderboard.spec.ts | E2E | ☐ |
| 11 | Registration, both-tab updates, and pending recovery after refresh (§8.11; §§5–6) | tests/e2e/submission.spec.ts | E2E | ☐ |
| 12 | Post-timeout deduplication and stale-response protection (§8.12; §§5–6) | tests/e2e/resilience.spec.ts | E2E | ☐ |
| V1 | Main Menu visual baseline (§8, visual regression) | tests/e2e/visual.spec.ts | Visual / Playwright | ☐ |
| V2 | Stable arena visual baseline (§8, visual regression) | tests/e2e/visual.spec.ts | Visual / Playwright | ☐ |
| V3 | Result visual baseline (§8, visual regression) | tests/e2e/visual.spec.ts | Visual / Playwright | ☐ |
| U1 | Configuration validation and snapshots (§3) | src/core/config.test.ts | Unit / Vitest | ☐ |
| U2 | Time-based transitions and terminal state (§§2, 4) | src/core/simulation.test.ts | Unit / Vitest | ☐ |
| U3 | Arena, island, and projectile collisions (§2) | src/core/collisions.test.ts | Unit / Vitest | ☐ |
| U4 | Weapons, damage, and scoring (§2) | src/core/combat.test.ts; src/core/damage.test.ts | Unit / Vitest | ☐ |
| U5 | Enemy behavior and safe spawns (§2) | src/core/enemies.test.ts | Unit / Vitest | ☐ |

## Test cases

The `it('...')` notation names planned cases; it is not test implementation. Counts refer to logical cases, before project runs or parameterized variants. For gameplay cases, arrange deterministic initial state before starting the match, drive browser controls, step the clock, and assert observed state plus visible feedback.

### tests/e2e/options.spec.ts

- `it('opens options from the menu')`: only the two specified gameplay fields are exposed, with labels and saved values.
- `it('saves valid option boundaries')`: accept sessionTime 60/180 and proposed spawn interval 1/10.
- `it('rejects invalid option values')`: reject empty, non-finite, out-of-range, and non-positive spawn inputs without persisting invalid data.
- `it('persists saved options after refresh')`: restore both fields from the versioned options key.
- `it('keeps the active configuration snapshot unchanged')`: saved changes apply to the next match, not an existing match snapshot.
- `it('supports keyboard validation and focus')`: navigate, save, and return with visible focus and associated accessible errors.
- `it('recovers from invalid persisted options')`: use documented defaults/recovery for malformed or unsupported stored values.

### tests/e2e/assets.spec.ts

- `it('shows loading before combat starts')`: delayed real asset responses show loading; the simulation stays inactive until ready.
- `it('loads and reuses supplied textures')`: ships, arena, effects, and indicators render; repeated entry reuses loaded resources.
- `it('shows an asset failure and retries successfully')`: fail one required asset request, then restore it and use Retry to start combat.
- `it('disposes an abandoned asset initialization')`: leaving during loading prevents late initialization from attaching a canvas or ticker.
- `it('fits the canvas to viewport and pixel density')`: resize and check proportions, arena/HUD visibility, and corresponding input coordinates.

Asset failures are scoped request failures for assets, not additional ranking/history MSW scenarios. Let successful loading use the supplied assets and real PixiJS initialization.

### tests/e2e/movement.spec.ts

- `it('starts with fresh player and arena state')`: expected HP, zero score, configured timer, water, and at least one blocking island.
- `it('moves forward along the heading')`: hold the forward control and compare position against executed simulation time.
- `it('rotates in both directions')`: drive each rotation control and observe heading and rendered ship rotation.
- `it('moves while rotating and firing')`: concurrent input changes position/heading and emits projectiles without losing held actions.
- `it('cannot leave any arena boundary')`: drive toward each edge and assert the whole ship stays inside.
- `it('cannot move through an island')`: drive into an island and assert non-penetration.
- `it('preserves world rules after viewport resize')`: resize during play and verify world limits, movement rate, and touch-coordinate mapping.

### tests/e2e/combat.spec.ts

- `it('fires one front projectile')`: one eligible front-fire action produces one forward projectile with configured properties.
- `it('fires three parallel projectiles on each side')`: each left/right action emits three projectiles pointing to the correct side.
- `it('respects independent weapon cooldowns')`: repeated held fire cannot exceed front, left, or right rates; one weapon does not block another.
- `it('applies projectile damage only once')`: a real hit reduces the correct target HP once and removes the projectile.
- `it('does not damage ships on the firing team')`: player/enemy projectiles only damage their opposing targets.
- `it('removes projectiles on islands and arena exit')`: real trajectories terminate without damaging a target behind the island.
- `it('removes projectiles at range or lifetime limits')`: advance normal simulation until the first configured limit is exhausted.
- `it('scores each player kill once')`: repeated or simultaneous real projectile hits cannot score the same destroyed enemy twice.
- `it('removes destroyed enemies from combat')`: no subsequent movement, fire, damage, or collision participation after destruction.
- `it('renders combat and health feedback')`: observe firing, impact, damage deterioration, explosion, ship HP indicators, and semantic HUD changes.

### tests/e2e/enemies.spec.ts

- `it('spawns both enemy types in a standard match')`: observe Chaser and Shooter while the match remains active through the first two valid spawn intervals.
- `it('respects the configured spawn interval')`: check before/at interval boundaries and after a new configuration snapshot.
- `it('spawns only at safe free positions')`: validate bounds, obstacles, and configured minimum player distance for every observed spawn.
- `it('skips a spawn when no safe point exists')`: a pre-match blocked-spawn fixture never permits unsafe placement; see the review blocker below.
- `it('chases and self-destructs on player impact')`: Chaser approaches, deals one collision damage event, explodes, and adds no score.
- `it('approaches and fires within shooter range')`: Shooter approaches/rotates, respects attack range and cooldown, and its projectile can damage the player.
- `it('keeps both enemy types outside islands')`: their real movement cannot cross obstacles; both can be destroyed by player controls.

### tests/e2e/match-end.spec.ts

- `it('ends when active time expires')`: advance the normal loop to sessionTime and assert time-expired plus a completed result.
- `it('ends when the player loses all health')`: receive real enemy damage and assert player-death with the observed active duration.
- `it('stops all gameplay at completion')`: further clock advancement and controls cannot move, attack, damage, spawn, or change timer/score.
- `it('restarts with entirely fresh state')`: Play Again restores HP, score, entities, input, cooldowns, accumulator, and configured duration.
- `it('resolves coincident end conditions deterministically')`: blocked pending clarification of time-first versus death-first ordering; do not invent an expected winner.

### tests/e2e/pause.spec.ts

- `it('pauses manually using the active control')`: keyboard or touch Pause suspends all simulation systems.
- `it('pauses when the window loses focus')`: cause actual browser focus loss and observe paused state.
- `it('pauses when the document becomes hidden')`: cause actual visibility change and assert suspension; do not call the pause rule directly.
- `it('requires explicit player action to resume')`: returning focus/visibility alone does not resume.
- `it('preserves timer cooldowns and spawn schedule while paused')`: advance wall time independently and compare suspended values.
- `it('discards paused movement and fire input')`: held or newly pressed actions during pause do not replay on Resume.
- `it('clears accumulator and clock baseline on resume')`: a long pause produces no catch-up steps or timer jump; fresh controls work normally.

### tests/e2e/result.spec.ts

- `it('shows the completed match details')`: score, active duration, and end reason match observed gameplay for both completion modes.
- `it('shows registration status transitions')`: success, pending/sending, and error states reflect actual requests.
- `it('restores the latest completed result after refresh')`: restore the same matchId/payload and reconcile outbox state.
- `it('preserves the result when another match is abandoned')`: leaving or refreshing active combat does not replace the previous completed result.
- `it('supports result navigation and retry actions')`: Play Again, Main Menu, and applicable Retry actions are keyboard/touch accessible.

### tests/e2e/navigation.spec.ts

- `it('abandons combat on menu navigation')`: no submission, history record, or ranking entry for the abandoned match.
- `it('abandons combat on refresh')`: active combat is not resumed or registered on boot.
- `it('repeatedly enters and leaves without duplicate resources')`: one active canvas/loop/input binding, clean entities, no duplicate events or unhandled console errors.
- `it('initializes and disposes correctly in strict mode')`: run a proposed development StrictMode variant and leave no stale initialization or subscriptions.
- `it('moves and attacks with simultaneous touch contacts')`: mobile browser input holds movement while firing all supported weapon controls.
- `it('releases touch actions on cancellation and exit')`: canceled pointers cannot leave movement/fire stuck after pause or navigation.
- `it('captures gameplay keys only in gameplay')`: menus/forms retain ordinary keyboard behavior; gameplay does not steal their keys.
- `it('manages dialog focus and mobile layout')`: pause/dialog focus is usable; proposed portrait/landscape layouts keep controls, arena, and HUD visible.

### tests/e2e/leaderboard.spec.ts

- `it('loads both tabs with typed match data')`: success shows player identification, scores, and history date/duration/end reason.
- `it('shows empty states for both resources')`: empty reset has no records; loading and empty states remain distinct.
- `it('paginates ranking and history independently')`: multi-page yields 10/10/5 records with correct totals and absolute ranks.
- `it('shows loading and nonblocking background refresh')`: slow preserves cached data and exposes refresh state while gameplay remains available.
- `it('shows only ranking errors when ranking fails')`: ranking-failure leaves history and submission operational; retry can recover.
- `it('shows only history errors when history fails')`: history-failure leaves ranking and submission operational; retry can recover.
- `it('filters ranking by the full configuration key')`: different balancing snapshots do not share a group; matching snapshots do.
- `it('orders all ranking tie breakers deterministically')`: fixtures exercise score desc, durationMs asc, playedAt asc, and matchId asc.
- `it('refetches when either tab is shown again')`: refresh even within the proposed 30000 ms staleTime; retain independent page state.
- `it('keeps player histories isolated')`: history contains only the requested player's records and follows the proposed date/ID order.

### tests/e2e/submission.spec.ts

- `it('registers one completed match in both views')`: first PUT returns 201 and exactly one matching record/entry appears.
- `it('freezes and persists the complete submission payload')`: one matchId, player identity, UTC date, score, active duration, end reason, and full configuration are queued before dispatch.
- `it('deduplicates repeated submission actions')`: repeated real Retry clicks share the payload and cannot duplicate the record.
- `it('returns the stored record for a repeated identifier')`: repeat the confirmed PUT through Axios, including differing non-ID fields; 200 returns the first record unchanged.
- `it('invalidates both views after confirmation')`: obsolete reads are canceled; active tabs refetch and inactive tabs refresh when shown.
- `it('replays pending submissions after refresh')`: offline-at-match-end retains the outbox; boot/recovery confirms the same identifiers.
- `it('allows another match while submission is pending')`: starting/completing another match creates independent outbox entries without blocking gameplay.
- `it('removes only confirmed outbox entries')`: failed entries remain; confirming an earlier match never overwrites a newer last result.

The repeated-PUT case is an API integration assertion inside the browser suite after a match completed through real gameplay. It does not fabricate a combat outcome or replace handlers with client fixtures.

### tests/e2e/resilience.spec.ts

- `it('recovers from timeout after commit without duplicates')`: submit-timeout-after-commit commits once; retry returns 200, clears pending state, and leaves one entry in each view.
- `it('recovers a post-commit timeout after refresh')`: reload after commit but before acknowledgment; boot replay retrieves the same persisted record.
- `it('keeps uncommitted timeouts pending')`: timeout exhausts bounded retries without commit; switch to success and retry the same payload.
- `it('recovers connection failures without blocking gameplay')`: connection-failure retains pending data and permits game/options access until success recovery.
- `it('does not automatically retry nonretryable http errors')`: http-4xx shows ApiError, performs no automatic retries, and retains pending state.
- `it('bounds retries for server failures')`: http-5xx uses at most two retries with the proposed delays, then supports manual recovery.
- `it('repeats variable latency from the same seed')`: isolated variable-latency runs with identical request sequences yield identical delays/results.
- `it('ignores out-of-order page and group responses')`: the selected ranking/history view cannot be replaced by an older request from another key.
- `it('ignores stale refreshes after registration')`: delayed reads for the same key cannot erase newer confirmed data; cancellation is not a visible error.
- `it('recovers submission unavailability at match end')`: offline-at-match-end survives refresh and Recover connection immediately replays pending entries.
- `it('changes scenarios without deleting saved records')`: query parameter/panel selection preserves Options, results, confirmed records, and outbox; unknown IDs fall back visibly to success.
- `it('resets demo data without late response resurrection')`: explicit reset removes results/outbox/database and rebuilds scenario fixtures, preserves Options/identity, and invalidates delayed commits/reads.

### tests/e2e/visual.spec.ts

- `it('matches the main menu baseline')`: fixed fixture tabs and control instructions, fully loaded fonts/assets.
- `it('matches the stable arena baseline')`: deterministic live match reached through controls, showing ships, island, health indicators, and HUD.
- `it('matches the result baseline')`: deterministic completed match with confirmed submission status and both navigation actions.

### src/core/config.test.ts

- `it('accepts valid configuration boundaries')`: all documented numeric bounds, integer HP, and required sessionTime limits.
- `it('rejects invalid numeric configurations')`: non-finite values, invalid HP, negative/zero intervals, and out-of-range fields.
- `it('requires normalized enemy weights')`: proposed weights sum to 1 and stay within their bounds.
- `it('validates shooter range against projectile reach')`: proposed cross-field range/lifetime condition is enforced.
- `it('keeps match configuration snapshots independent')`: later option/configuration changes cannot mutate an existing snapshot.

### src/core/simulation.test.ts

- `it('produces identical transitions from identical inputs')`: same state, commands, fixed delta, and supplied random values yield the same result.
- `it('advances gameplay from elapsed simulation time')`: movement, active duration, and spawn/cooldown timers use passed time, not browser globals.
- `it('does not advance a paused state')`: a paused transition cannot alter combat or active timers.
- `it('completes at the configured active duration')`: time exhaustion yields a terminal transition.
- `it('completes when player health reaches zero')`: real damage resolution yields a terminal transition.
- `it('keeps terminal states unchanged')`: subsequent commands/time cannot mutate gameplay after completion.
- `it('creates independent fresh match state')`: a new match resets all core fields without retaining previous entities.

Accumulator, frame clamp, clock baseline, React subscriptions, storage, and HTTP are shell responsibilities, not Vitest core expectations. Navigation also has dedicated engine units in `src/engine/game-engine.test.ts` for the accumulator, proposed 250 ms clamp, clock baseline, input clearing and snapshot notifications. E2E verifies observable integration; profiling remains pending.

### src/core/collisions.test.ts

- `it('contains ships inside arena boundaries')`: all edges account for the implemented ship footprint.
- `it('blocks both ship types at islands')`: player and enemy movement cannot penetrate obstacles.
- `it('removes a projectile on its first blocking hit')`: no later target receives damage after an island hit.
- `it('resolves a target hit only once')`: multiple candidate overlaps cannot produce multiple damage events.
- `it('removes projectiles outside the arena')`: terminated projectiles cannot reenter collision processing.
- `it('resolves collision ordering deterministically')`: stable-ID equal-time resolution follows the accepted geometry/order policy.

### src/core/combat.test.ts

- `it('creates the required projectile counts and directions')`: front = 1; each side = 3 parallel projectiles.
- `it('enforces independent weapon cooldowns')`: no premature shot or accumulated burst; left/right/front remain independent.
- `it('applies configured damage to opposing targets only')`: friendly and invalid targets remain unchanged.
- `it('expires projectiles at the earliest configured limit')`: range and lifetime both terminate processing.
- `it('awards one point for each player-caused enemy death')`: multiple lethal candidates still produce one scoring event.
- `it('awards no points for chaser impact destruction')`: one damage event and no score.
- `it('excludes destroyed entities from all interactions')`: dead entities cannot move, fire, collide, or damage.

### src/core/enemies.test.ts

- `it('advances and rotates chasers toward the player')`: supplied positions and time produce bounded movement/rotation.
- `it('fires shooters only within range and cooldown')`: outside range, misalignment under the proposed aiming policy, and cooldown prevent firing.
- `it('selects safe spawn points from supplied randomness')`: placement respects boundaries, footprints, obstacles, and player distance.
- `it('selects enemy types from normalized weights')`: supplied draws reproduce the proposed first-two-spawn policy and later weighted selection.
- `it('skips spawning without weakening safety checks')`: no valid location yields no new entity, not an unsafe fallback.

## Determinism

Follow [ADR 0007](../adr/0007-seeded-rng-and-test-hooks.md). Proposed default seed: 42, supplied with `?e2e=1&seed=42&scenario=<id>`. Keep gameplay and network PRNG streams independent; configure initial scenarios before the match. Use fixed UTC fixture dates and stable identities for comparisons/screenshots; generated matchIds are observed and reused rather than regenerated by tests.

Expose window.__game only with `?e2e=1`; ordinary page loads must have no hook, including after teardown. Hooks observe state, configure deterministic initial conditions before play, and control the manual simulation clock. They must not teleport active entities, apply damage, award score, bypass collisions, or mark a match completed.

Combat tests press/hold actual keyboard controls on desktop and dispatch browser touch input on mobile, then observe the effects of the real simulation and PixiJS rendering. Proposed mobile helper: dispatch simultaneous contacts through Chromium's browser input protocol; do not call game action handlers directly. Core unit tests may call pure transitions with explicit state/commands because they test those rules themselves.

Advance the manual clock in fixed-step-sized increments through the real accumulator, rather than jumping several seconds into one clamped frame. Use a separate controlled scheduler for network latency, Axios timeouts, and retries. Avoid real-time sleeps and arbitrary frame waits; await observable states and a completed render. Seed setup must not bypass normal input or rule execution after start.

## Isolation

Each test starts with a fresh browser context, clean owned localStorage keys, a new MSW database, empty outbox/result, known Options/player identity, and a selected scenario before requests. Initialize empty/multi-page fixtures through their reset/setup contract; a scenario switch alone does not reseed records.

Reset PRNG streams, request counters, post-commit markers, clocks, held input, and query caches. Cancel requests and dispose hooks/resources when the test ends; workers/projects must not share mutable browser state. Reset Vitest fixtures and supplied random sequences for each unit test.

Refresh tests deliberately preserve storage within that one test. Retry/recovery tests deliberately preserve their outbox and confirmed records when switching to success. Do not use Reset demo data as a recovery action: it intentionally discards those pending entries. Capture unhandled page/console errors as failures, except explicitly asserted and handled scenario errors.

## Projects

Chromium desktop/mobile are configured for the implemented Options suite; remaining planned specs will run in those projects as they are added. The StrictMode development variant is still proposed. Mobile emulation is not evidence of performance on physical mobile hardware.

| Project | Environment | Specs and input |
| --- | --- | --- |
| chromium-desktop | Fixed 1280 × 720 viewport, deviceScaleFactor 1 | All 13 tests/e2e/*.spec.ts files; gameplay uses keyboard; mobile-only simultaneous-touch case belongs to mobile |
| chromium-mobile | Pixel 7 emulation, fixed viewport/device scale from a pinned descriptor | All 13 files; gameplay uses touch; exercise all seven touch actions and simultaneous contacts |
| chromium-desktop-strict | Proposed development-build variant with StrictMode enabled | Only the StrictMode lifecycle case in navigation.spec.ts; also verify loading/unmount behavior from assets.spec.ts |

All twelve required flows and the three visual states run on desktop and mobile. Keyboard accessibility cases can also use keyboard input in mobile emulation. Mobile portrait/landscape variants are proposed based on the current gameplay spec. Vitest runs the five core test files outside browser projects.

Prefer the optimized preview build for the main E2E/visual runs; use the explicitly separate development variant for React StrictMode lifecycle verification. [Profiling](../performance/profiling.md) uses the optimized build with real time, not E2E/manual-clock runs.

## Visual regression

Proposed baseline location: `tests/e2e/visual.spec.ts-snapshots/`, separated by project/platform. Pin browser version, OS, viewport, pixel density, fonts, locale, timezone, seed, fixtures, and screenshot target. Wait for real assets, fonts, network completion, and PixiJS render readiness.

Reach the desired arena/result through actual gameplay and deterministic clock steps. Stop the manual clock at an observed stable state, preserving the real game renderer. Disable CSS/Web Animations during capture and freeze PixiJS animation/effect time at a chosen frame through the same controlled clock; screenshot animation settings alone do not freeze a PixiJS canvas. Keep gameplay effects enabled in functional combat tests.

Once implemented, generate baselines with `npm run test:e2e -- tests/e2e/visual.spec.ts --update-snapshots`; review all three states in both projects and commit the resulting images. Update only for intentional visual changes, inspect diffs, and rerun without `--update-snapshots`. Do not regenerate baselines merely to silence an unexplained failure. Pixel-difference thresholds remain proposed and must be documented when configured.

## Reports

Proposed: generate the Playwright HTML report in `playwright-report/` and per-test artifacts in `test-results/`, with traces retained on failures (`retain-on-failure`) and failure screenshots. Attach seed, scenario, project, configuration, and relevant matchId to failed cases. These files are future run artifacts; none are generated by this documentation task.

Open the report using `npm run test:e2e:report`; inspect a failed case's trace from its report link, or use `npx playwright show-trace test-results/<case>/trace.zip`. Preserve the HTML report and failure traces in delivery artifacts (§8/§11). Proposed Vitest output is its console summary, with CI exit status indicating failures; an HTML unit report is not a challenge requirement.

## Commands

All four scripts below are implemented. E2E runs the available Options, assets, movement, weapons, enemies, match-end and pause suites; persistence/API/visual suites remain pending. Install Chromium with `npx playwright install chromium` before the first browser run. `test:unit:watch` and `typecheck` are also available.

| npm script | Proposed script body | Purpose |
| --- | --- | --- |
| test:e2e | npm run build && playwright test | Build the app, then run implemented Chromium desktop/mobile suites with HTML reporting and failure traces |
| test:e2e:ui | npm run build && playwright test --ui | Build the app, then open Playwright UI for interactive investigation |
| test:e2e:report | playwright show-report playwright-report | Open the latest local HTML report |
| test:unit | vitest run | Run src/core/**/*.test.ts once and fail on assertions |

Proposed targeted commands: `npm run test:e2e -- --project=chromium-mobile` for mobile and `npm run test:e2e -- tests/e2e/combat.spec.ts` for combat. The StrictMode variant requires its separate development server/project to be configured before use.

## Review blockers and unresolved details

- Proposed time-first boundary ordering replaces the earlier conflicting death-priority sentence. An earlier-step death stops remaining damage/contact/fire immediately; unit coverage checks the coincident boundary.
- Initial enemy type sequencing now advances only on successful spawns. Bounded candidate/grid attempts skip unsafe intervals; blocked recovery is covered by units.
- Proposed collision radii, broadside spacing, 0.15 rad aim tolerance and ring routes are implemented. Ship-to-ship separation beyond spawn safety and Chaser contact is not modeled; validate balance through playtesting.
- Persistence/API/visual suites, the dedicated StrictMode project, network scheduling, published-worker readiness and profiling still need implementation or verification. Development lifecycle reviews are recorded separately in the construction guide.
