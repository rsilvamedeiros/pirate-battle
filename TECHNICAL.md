# Technical project guide

The root [README.md](README.md) is the English solution and deployment guide; [CHALLENGE.md](CHALLENGE.md) preserves the original challenge. This document describes the implementation; [TESTING.md](TESTING.md) provides setup, commands, and practical verification steps.

The preserved challenge uses original `assets/` relative links. In this Vite repository, the supplied files are in [public/assets/](public/assets/), including [the UI atlas](public/assets/spritesheet/ui_sheet.json), [the retina atlas](public/assets/spritesheet/ui_sheet_retina.json) and [sounds](public/assets/sounds/).

## Current implementation

| Area | Implemented | Pending |
| --- | --- | --- |
| Core / engine | Typed configuration, navigation, weapons, seeded safe spawns, Chaser/Shooter behavior, damage, score, pause/restart, completion and opt-in post-render profiling | Standard-balance playtesting and physical-mobile profiling |
| React / PixiJS | Menus, Options, arena, controls/HUD/feedback, results, paginated Ranking/Match History and network panel | Final accessibility/visual review |
| Local persistence / HTTP | Options/identity, last result, pending outbox, confirmed database, idempotent PUT and boot/manual replay | Simultaneous-tab coordination; deployment verification |
| Tests | Core/engine/persistence/API/mock units and integration; all twelve functional browser flows; six menu/arena/result visual baselines; versioned HTML reports and prior failure traces | Expanded adversarial variants; hosted CI verification |
| Delivery | Production build, local verification reports and headed desktop profiling with raw evidence | Public deployment and deployed acceptance checks |

Play starts combat with both enemy types, three weapons, HP and scoring. Completed results survive refresh and are available through Last Result. Registration uses real mocked HTTP, with sending/confirmed/error states and retry. Ranking and Match History are active menu tabs; both derive from confirmed records. This remains a local browser demonstration, not a shared online leaderboard.

## Technology roles

| Technology | Current role |
| --- | --- |
| Vite | Development server and production build |
| Sass | SCSS compilation with explicit `@use` modules and a shared palette |
| React | Menus, Options, HUD snapshots, session dialogs and record/scenario panels; StrictMode at the entry point |
| TypeScript | Strict checking for application, tooling, and E2E files |
| Vitest 4 | Core, engine and persistence tests in Node with injected storage |
| Playwright | Browser tests against the optimized preview build |
| PixiJS | Arena, supplied ship/projectile/effect sprites and ship health indicator |
| Axios / TanStack Query | GET/PUT transport, paginated queries, keyed mutations, retries, cancellation and invalidation |
| MSW | Browser worker in development/optimized builds; shared REST handlers, fixtures, persisted records and scenarios |

## Source organization

| File | Responsibility |
| --- | --- |
| [src/core/config.ts](src/core/config.ts) | Parameter definitions, Options bounds, validation, detached frozen snapshots |
| [src/core/simulation.ts](src/core/simulation.ts) | Pure navigation, geometry, active timer and time completion |
| [src/core/geometry.ts](src/core/geometry.ts) | World dimensions, collision footprints and swept obstacle contacts |
| [src/core/weapons.ts](src/core/weapons.ts) | Front/broadside shots, independent cooldowns, projectile removal and timed effects |
| [src/core/enemies.ts](src/core/enemies.ts) | Safe scheduled spawns, enemy steering, island routes and aiming policy |
| [src/core/random.ts](src/core/random.ts) | Pure xorshift32 transitions and seed normalization |
| [src/engine/scenarios.ts](src/engine/scenarios.ts) | Pre-match deterministic fixture preparation |
| [src/engine/game-engine.ts](src/engine/game-engine.ts) | Injectable clock, fixed-step accumulator, input state and stable HUD snapshots |
| [src/render/arena-view.ts](src/render/arena-view.ts) | Async texture loading, private PixiJS application, drawing and teardown |
| [src/input/keyboard.ts](src/input/keyboard.ts) | Gameplay bindings, focus/visibility pause and listener cleanup |
| [src/ui/GameScreen.tsx](src/ui/GameScreen.tsx) | Canvas/session lifecycle, touch pointers, semantic HUD and gated test hooks |
| [src/ui/SessionDialog.tsx](src/ui/SessionDialog.tsx) | Pause/completion dialog, focus containment, result subscription and action callbacks |
| [src/ui/MainMenu.tsx](src/ui/MainMenu.tsx) | Menu controls, record tabs/configuration, pagination callbacks and network panel |
| [src/persistence/options.ts](src/persistence/options.ts) | Versioned storage envelope, local player identity, loading/saving/recovery |
| [src/api/contracts.ts](src/api/contracts.ts) | Immutable MatchRecord, full configuration grouping and persisted-record validation |
| [src/api/client.ts](src/api/client.ts) | Axios GET/PUT, 5-second timeout, cancellation, normalized errors and retry policies |
| [src/api/submissions.ts](src/api/submissions.ts) | Keyed TanStack mutations, one in-flight request per match, boot/manual replay and invalidation |
| [src/api/runtime.ts](src/api/runtime.ts) | One-time QueryClient/worker bootstrap, readiness, scenario changes and reset |
| [src/mocks/database.ts](src/mocks/database.ts) | Shared confirmed-record collection, fixtures, first-write-wins PUT, sorting and pagination |
| [src/mocks/handlers.ts](src/mocks/handlers.ts) | Shared MSW handlers and generation-guarded delayed requests |
| [src/mocks/activate-worker.ts](src/mocks/activate-worker.ts) | Bounded worker activation and explicit page control before MSW startup |
| [src/mocks/scenarios.ts](src/mocks/scenarios.ts) | Fourteen selectable schedules, seeded endpoint RNG and reset generations |
| [src/persistence/results.ts](src/persistence/results.ts) | Completion capture, versioned last result/outbox, restore and storage retry |
| [src/ui/ResultDetails.tsx](src/ui/ResultDetails.tsx) | Semantic score, duration, reason, date, registration status and save retry |
| [src/ui/RecordsPanel.tsx](src/ui/RecordsPanel.tsx) | Loading/empty/error/refresh states and paginated record views |
| [src/ui/NetworkPanel.tsx](src/ui/NetworkPanel.tsx) | Scenario selection/recovery, explicit demo reset and pending retries |
| [src/ui/OptionsScreen.tsx](src/ui/OptionsScreen.tsx) | Two-field form, associated errors, Save/Main Menu actions, focus |
| [src/App.tsx](src/App.tsx) | Screen navigation, saved-state subscriptions and retained menu tab/page/group state |
| [src/main.tsx](src/main.tsx) | One-time storage bootstrap and React StrictMode mount |
| [src/App.module.scss](src/App.module.scss) | Shared screen shell and supplied panel assets |
| [src/styles/ui.module.scss](src/styles/ui.module.scss) | Explicitly shared button, message and table styles |
| [playwright.config.ts](playwright.config.ts) | Desktop/mobile projects, preview server, reports, failure traces |
| [vitest.config.ts](vitest.config.ts) | Node-based core, engine and persistence test discovery |

The core has no React, PixiJS, browser time, storage, or network dependencies. Storage belongs to the imperative shell. Bootstrap runs outside StrictMode so its development mount cycle does not regenerate the local player identity.

## Formatting

Run `npm run format` to format application source, SCSS, tests, scripts, GitHub workflows and root JavaScript/TypeScript/JSON/HTML files. Run `npm run format:check` to verify formatting without writing files. Prettier is pinned to an exact development dependency version; `eslint-config-prettier` disables conflicting formatting rules while ESLint keeps checking code correctness.

[.prettierrc.json](.prettierrc.json) defines single quotes, no optional semicolons, trailing commas and a 100-column wrapping preference. [.editorconfig](.editorconfig) defines UTF-8, two-space indentation and LF endings; [.gitattributes](.gitattributes) preserves LF for formatted source across checkouts. [.prettierignore](.prettierignore) excludes Markdown documentation, supplied assets, generated workers, visual baselines and archived profiling/test evidence. Formatting does not replace linting, type checks or tests.

## Continuous integration

[.github/workflows/ci.yml](.github/workflows/ci.yml) separates quality checks on Ubuntu from optimized-browser and development StrictMode jobs on Windows, all using Node.js 24 and npm ci. Windows preserves the platform suffix of the existing visual baselines; hosted-image rendering compatibility requires confirmation in the first GitHub run. Dependencies are cached through npm, while browsers come from the locked Playwright package. Actions use pinned commit SHAs and read-only repository permissions. See [TESTING.md](TESTING.md#continuous-integration) for triggers, report artifacts, failure review and limitations. CI runs tests and builds; public deployment remains a separate delivery step.

## Styling

[src/index.scss](src/index.scss) owns global typography, resets, keyboard focus and the `visually-hidden` accessibility utility. Component styles use SCSS Modules with explicit class imports. Vite generates scoped class names and compiles the source to CSS; no additional runtime styling dependency is needed.

| Stylesheet | Responsibility |
| --- | --- |
| [src/App.module.scss](src/App.module.scss) | Shared screen shell and panel layout |
| [src/ui/MainMenu.module.scss](src/ui/MainMenu.module.scss) | Menu actions, control instructions, record tabs and configuration selection |
| [src/ui/GameScreen.module.scss](src/ui/GameScreen.module.scss) | Arena, HUD, touch controls and orientation layouts |
| [src/ui/SessionDialog.module.scss](src/ui/SessionDialog.module.scss) | Pause/completion dialog and backdrop |
| [src/ui/OptionsScreen.module.scss](src/ui/OptionsScreen.module.scss) | Options form, validation feedback and field layout |
| [src/ui/ResultDetails.module.scss](src/ui/ResultDetails.module.scss) | Result summary and pending-registration message |
| [src/ui/RecordsPanel.module.scss](src/ui/RecordsPanel.module.scss) | Ranking/history panel and pagination |
| [src/ui/NetworkPanel.module.scss](src/ui/NetworkPanel.module.scss) | Scenario selection and pending registrations |
| [src/styles/ui.module.scss](src/styles/ui.module.scss) | Shared buttons, notices, actions and explicitly styled tables |

Components import their own module and the shared UI module when needed; they do not rely on App loading their styles. Table rules are scoped to the shared table class instead of global element selectors. Palette values come from [src/styles/_tokens.scss](src/styles/_tokens.scss), which emits no CSS. Browser tests locate UI through roles, accessible names and semantic containers rather than generated class names.

App retains menu state while MainMenu unmounts for Options, gameplay or Last Result. A successful Options save resets only the ranking page. MainMenu updates the controlled state through functional callbacks. GameScreen supplies SessionDialog with status, end reason and resume/restart/exit callbacks; the dialog receives no engine instance. Its result-store subscription updates pending/confirmed/error feedback independently, while its native dialog effect owns opening and cleanup. GameScreen retains focus restoration after dialog cleanup.

Keep selectors shallow and preserve stylesheet order and responsive breakpoints. Add shared tokens when a value has a common visual role; keep one-off layout values next to their component. Vite compiles SCSS using the development dependency installed by `npm ci`; no additional plugin or runtime dependency is required.

[stylelint.config.js](stylelint.config.js) extends `stylelint-config-standard-scss` to check CSS/SCSS correctness and conventions, including unknown properties, duplicate declarations and class naming. Nesting is limited to two levels. Media queries retain the existing `max-width`/`max-height` syntax for browser compatibility. Prettier handles formatting; both tools must pass. Run `npm run lint:styles` for SCSS alone or `npm run lint` for ESLint and Stylelint together. Review `npm run lint:styles:fix` changes, then run `npm run format` and lint again.

Dependency audit on October 3, 2026 reports ten high-severity package entries stemming from one unpatched [braces denial-of-service advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) in Stylelint's development-only glob dependencies. The supplied lint commands use a fixed repository glob rather than user-provided patterns. This limits exposure in the documented workflow; it does not fix the dependency. `npm audit --omit=dev` reports zero vulnerabilities. Recheck upstream releases before updating the pinned lint dependencies; retain this limitation until a patched dependency chain is available.

## Configuration and persistence

Only sessionTime and enemySpawnInterval are exposed in Options. sessionTime defaults to 120 seconds and accepts the required 60–180 range. enemySpawnInterval defaults to 3 seconds and accepts the proposed 1–10 range. Decimal values are accepted. Other proposed defaults/bounds are listed in the [gameplay specification](docs/specs/gameplay.md#game-configuration).

The form reuses core validation without coercing persisted values. Only a successful explicit Save updates stored Options. Main Menu discards unsaved edits; a failed storage write preserves the previous saved state. Each session uses a validated immutable snapshot, independent of later edits.

The `pirate-battle.options.v1` localStorage envelope contains version, playerId, playerName, sessionTime, and enemySpawnInterval. The local display name defaults to Player. Valid identity persists across refresh; malformed/unsupported data restores defaults with feedback. Storage failures are handled visibly, without claiming persistence succeeded.

Completed-match capture runs in the shell on the engine's terminal transition. It generates one cryptographic UUID and UTC completion timestamp, freezes the full configuration and records floor(elapsedMs), score, player identity and end reason. Repeated notifications for the same terminal state reuse that record. `configKey` is `v1:` plus compact JSON of all validated configuration fields in lexical order; seed and presentation are excluded.

The results store bootstraps outside StrictMode and exposes stable snapshots. It writes `pirate-battle.outbox.v1` first (`{ version: 1, entries }`, keyed by matchId, each entry holding record, attempts and optional lastError), then `pirate-battle.last-result.v1` (`{ version: 1, record, submissionStatus, lastError? }`). Sending attempts increment before dispatch. Recovery restores transient states as pending; the outbox overrides stale confirmed status and recovers interrupted writes. Confirmation saves the matching last result before queue removal; acknowledged IDs cannot reappear in later storage merges.

Storage failure keeps records in memory and shows Retry Save without claiming refresh recovery. Retry preserves identifiers and merges readable existing pending records. Unreadable or invalid outbox data is preserved and blocks overwrite: inspect/export it in DevTools before removing only the corrupted owned key and retrying. Invalid last results have visible feedback and can be recovered from valid pending records. Automatic migration and simultaneous-tab coordination are not implemented.

Refresh or leaving active combat abandons it without creating a record or replacing an earlier result. Pending matches never prevent another match. Last Result offers Play Again/Main Menu and registration retry; page loading returns to the menu rather than resuming combat. `pirate-battle.msw-db.v1` stores version, records keyed by matchId, fixture player IDs and revision. A successful PUT persists before acknowledgment; a duplicate ID returns the first stored payload unchanged. Ranking and history read this same collection.

## Ranking, history and network recovery

The MSW worker starts without a development-only guard and serves the same three endpoints in development and optimized preview. Startup gates HTTP, while game/menu/Options remain available on failure. Retry Connection retries initialization; Reset demo data can replace corrupt owned demo state. Public deployment and worker delivery there remain unverified.

The small `public/pirate-battle-worker.js` wrapper imports the unchanged generated MSW worker and supports explicit page claiming. Bootstrap establishes control before starting MSW, preventing an automatic reload that could erase recovery notices or interrupt a game. MSW modules load inside guarded startup because their cookie store may access localStorage during module evaluation; unavailable storage must leave the menu and gameplay usable.

TanStack Query owns ranking/history cache and submission mutations. Query keys contain configuration/player identity, page and pageSize; staleTime is 30 seconds. Tab mount refetches even fresh cached data. Axios consumes query AbortSignals and enforces a 5000 ms timeout. At most two retries follow connection/timeout/429/5xx failures, after 1000 and 2000 ms; other 4xx do not retry automatically. A MutationObserver and outbox coordinator share work by matchId independently of screen lifecycle. Confirmation cancels reads and invalidates both resource families.

Ranking compares the full configuration and sorts score descending, duration ascending, playedAt ascending and matchId lexically. History sorts newest first for the local player. Each tab retains its page; ranking can select current Options or the last result's configuration. Empty data, initial loading, background refresh and query errors are separate UI states. Confirmation of an older match does not replace a newer result.

Use `?scenario=<id>&seed=42`, or expand Network scenarios and Apply a choice. All 14 schedules in the [scenario specification](docs/specs/network-scenarios.md) are implemented. Scenario selection preserves stored records; only explicit Reset demo data reseeds empty/multi-page fixtures and clears last result/outbox, retaining Options and identity. Recovery switches offline-at-match-end to success and replays pending IDs. Generation checks and aborts prevent delayed reads/commits/acknowledgments from crossing a reset. Endpoint-specific network RNG streams never alter simulation RNG.

Implementation references: [TanStack cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation), [TanStack mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations), [Axios cancellation](https://axios-http.com/docs/cancellation) and [MSW worker startup](https://mswjs.io/api/setup-worker/start). Their APIs are used alongside the installed source/types.

Asset-failure tests use `browserContext.route`, which can intercept Service Worker-owned requests; page-level interception alone misses those requests. See [Playwright Service Worker testing](https://playwright.dev/docs/service-workers).

## Assets and interface

Provided assets now live in `public/assets/`. The menu uses the supplied scene background, title, panel, and button images. The restored challenge keeps its original asset path references; implementation paths are documented here.

The interface is in English and supports keyboard navigation, visible focus, labeled fields, associated errors, status feedback and mobile portrait/landscape layouts. Movement, fire and pause bindings are active. Chasers use a dark sail and Shooters a red sail; health bars, reduced-health tints, impacts and explosions communicate combat state.

## Navigable session

The proposed arena is 1000 × 700 logical units with a circular island at (500, 350), radius 100, and a conservative player footprint of radius 40. Coordinates are clamped to arena bounds; movement overlapping the island is rejected. Rotation remains possible while blocked. The supplied hull is 44 × 64 logical units. CSS preserves arena proportions while PixiJS uses devicePixelRatio for its backing canvas.

The engine accumulates injected-clock deltas, clamps each frame to 250 ms, and advances at 60 Hz. The active timer counts executed steps and clips the final step to the configured duration. Pause clears held actions and the accumulator; resume resets the clock baseline. Window blur and document hiding pause automatically and require explicit resume.

React subscribes through useSyncExternalStore to stable snapshots of health, score, remaining whole seconds and session status. PixiJS owns continuous positions. Async initialization has disposal guards; exit destroys the private ticker, display objects and canvas, removes input listeners and deletes owned hooks. Assets retains the shared ship texture for reuse.

Only `?e2e=1` exposes `window.__game.getState()` (a detached copy) and `advance(milliseconds)` through the normal engine. Manual mode renders on controlled advances rather than running a display ticker. `seed` controls pure xorshift32 state (zero maps to 1); normal gameplay gets a seed from browser crypto. An optional gated `fixture` prepares initial entities/configuration before the session. Hooks cannot move ships, apply damage or award outcomes during play.

## Player weapons

Space holds front fire (one projectile); Q/E hold left/right fire (three parallel projectiles each). Touch buttons support independent pointers alongside movement/rotation. Front cooldown is 350 ms and each side cooldown is 1000 ms by default. Cooldowns store the next eligible active timestamp, start ready, and do not bank unused shots. New input after pause is required; keyboard repeats cannot reactivate a cleared action.

Proposed geometry: projectiles have radius 4 lu; muzzle centers sit 46 lu from the firing ship center; broadside origins are spaced 16 lu along the hull. Each projectile snapshots heading, team, speed, damage, range and lifetime. Swept contacts select the earliest opposing target, island or arena exit along the reachable trajectory. Obstacles win contact ties, then stable target IDs; removing a hit projectile and dead targets prevents repeated damage/score. Range/lifetime limits still apply.

Firing flashes last a proposed 120 ms and obstacle impacts 180 ms of active time. PixiJS loads the supplied cannon_ball, fire_1 and explosion_1 textures before starting. Sprite maps reuse live entity sprites and destroy removed sprites while preserving cached textures. Pause freezes projectiles, cooldowns and effects; completion freezes weapon state and restart restores empty entities/cooldowns.

## Enemies and completion

Spawns follow active-time intervals, trying 32 seeded candidates and an 80 lu grid fallback. Positions must contain the 40 lu enemy footprint, avoid islands/ships and satisfy minSpawnDistance. Failed attempts advance the schedule without weakening safety or consuming the initial Chaser/Shooter sequence; weighted selection starts after two successful spawns.

Enemy steering uses 16 waypoints on a 160 lu ring when the direct path is blocked. Rotation is bounded by configuration and movement waits until heading error is at most π/3. Chasers pursue and deal one configured impact before removal, with no score. Shooters approach, stop within attack range and fire toward their heading when aligned within 0.15 rad and their independent cooldown permits; the first shot waits a cooldown after spawn.

Each active step checks time expiry first, then player movement, spawn, enemy movement, projectile damage, surviving Chaser contact and surviving Shooter fire. Every enemy killed by player shots earns one point. Lethal player damage stops remaining damage/contact/fire processing. Time expiry wins at the duration boundary; earlier death wins in its own step. Completion shows score, active duration, reason, date and pending registration, then captures the result and outbox in the shell.

Ship tint deteriorates at HP ratios 0.65 and 0.3; each ship has a proportional health bar. Damage feedback lasts 180 ms and destruction feedback 400 ms of active time. Effects freeze with terminal simulation state. These thresholds, routing and collision geometry are proposed tuning, not additional challenge requirements.

## Verification and limitations

Verification results for this increment are recorded in [TESTING.md](TESTING.md#current-coverage). This evidence covers the implemented features, not the complete challenge. Browser tests use SwiftShader to avoid headless GPU-driver stalls; this does not establish hardware performance.

Mobile emulation does not establish performance on a physical device. The six versioned visual baselines are distinct from ad hoc review screenshots. The [profiling record](docs/performance/profiling.md) contains measured headed desktop render intervals/entities and five post-exit memory cycles, with compressed raw evidence and the exact measured build identity. Public deployment remains unverified.

## Decisions and next work

ADRs remain Proposed. Frame clamping, collision geometry, routing, aiming, successful-spawn sequencing and time-first terminal ordering are implemented as proposed choices. Validate tuning through gameplay and profiling. Ship-to-ship separation beyond spawn checks and Chaser impact is not modeled; routes assume the current circular island.

Visual regression uses six [baseline PNGs and an environment record](tests/e2e/visual.spec.ts-snapshots/README.md). Captures use real rules and input, seed 42, stopped simulation time, fixed dates, completed assets/fonts and confirmed HTTP results. Final review corrects dialog focus cycling and the arena content-box proportion, with matching lifecycle checks and reviewed visual updates.

Profiling is opt-in with `?profile=1&seed=42`; `preset=endurance` explicitly selects validated 180 s, 500 HP and damage 1. Ordinary gameplay and manual E2E mode retain their existing behavior. The diagnostic bridge observes/exports numeric frame samples without changing simulation time. `node scripts/profile.mjs` drives actual input in headed Chromium with native time; short E2E behavior checks instead control the browser RAF clock and must not be used as FPS evidence. Cleanup removes the bridge and post-render ticker listener.

Final README versions and report packaging are tracked in the [staged review](docs/delivery/final-review.md). Public deployment and validation on its HTTPS origin remain required. The build's large entry chunk remains a startup/download concern; the scoped combat profile does not assess startup loading or prove physical display presentation cadence. See the [challenge audit](docs/delivery/challenge-audit.md) for remaining delivery work and the [construction guide](docs/README.md) for AI assistance and verification history.

## Documentation references

- [Architecture](ARCHITECTURE.md) and [ADR index](docs/adr/README.md)
- [Gameplay](docs/specs/gameplay.md), [API contracts](docs/specs/api-contracts.md), and [network scenarios](docs/specs/network-scenarios.md)
- [Requirement traceability and test plan](docs/testing/test-plan.md)
- [Measured profiling record](docs/performance/profiling.md) and [reusable template](docs/performance/profiling-template.md)
- [Practical testing guide](TESTING.md)
