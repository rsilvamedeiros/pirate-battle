# Technical project guide

The root [README.md](README.md) preserves the original challenge. This document describes the evolving implementation; [TESTING.md](TESTING.md) provides setup, commands, and practical verification steps.

## Current implementation

| Area | Implemented | Pending |
| --- | --- | --- |
| Core | 31 typed gameplay parameters, defaults, numeric/cross-field validation, immutable configuration snapshots | Movement, weapons, collisions, enemies, score, match lifecycle |
| React interface | Main Menu, control instructions, Options, validation feedback, keyboard focus, responsive layout | Combat HUD, pause/result screens, ranking/history views |
| Local persistence | Versioned Options and local player identity; invalid-data recovery and storage errors | Last completed result, outbox, confirmed mock records |
| Tests | Configuration unit tests and Options E2E on Chromium desktop/mobile | Remaining suites, visual baselines, dedicated StrictMode development checks |
| Delivery | Production build verified locally | Public deployment and profiling evidence |

Play, Ranking, and Match History are disabled with visible availability messages. Saving Options does not start a match. Installed packages alone do not mean their corresponding features are implemented.

## Technology roles

| Technology | Current role |
| --- | --- |
| Vite | Development server and production build |
| React | Menu and Options interface; StrictMode is enabled at the entry point |
| TypeScript | Strict checking for application, tooling, and E2E files |
| Vitest 4 | Pure configuration unit tests in a Node environment |
| Playwright | Browser tests against the optimized preview build |
| PixiJS | Installed; combat rendering pending |
| Axios / TanStack Query | Installed; ranking/history integration pending |
| MSW | Installed with its generated worker; handlers, startup, and scenarios pending |

## Source organization

| File | Responsibility |
| --- | --- |
| [src/core/config.ts](src/core/config.ts) | Parameter definitions, Options bounds, validation, detached frozen snapshots |
| [src/persistence/options.ts](src/persistence/options.ts) | Versioned storage envelope, local player identity, loading/saving/recovery |
| [src/ui/OptionsScreen.tsx](src/ui/OptionsScreen.tsx) | Two-field form, associated errors, Save/Main Menu actions, focus |
| [src/App.tsx](src/App.tsx) | Menu/Options navigation and saved Options state |
| [src/main.tsx](src/main.tsx) | One-time storage bootstrap and React StrictMode mount |
| [src/App.css](src/App.css) | Supplied menu assets and responsive screen styling |
| [playwright.config.ts](playwright.config.ts) | Desktop/mobile projects, preview server, reports, failure traces |
| [vitest.config.ts](vitest.config.ts) | Node-based core test discovery |

The core has no React, PixiJS, browser time, storage, or network dependencies. Storage belongs to the imperative shell. Bootstrap runs outside StrictMode so its development mount cycle does not regenerate the local player identity.

## Configuration and persistence

Only sessionTime and enemySpawnInterval are exposed in Options. sessionTime defaults to 120 seconds and accepts the required 60–180 range. enemySpawnInterval defaults to 3 seconds and accepts the proposed 1–10 range. Decimal values are accepted. Other proposed defaults/bounds are listed in the [gameplay specification](docs/specs/gameplay.md#game-configuration).

The form reuses core validation without coercing persisted values. Only a successful explicit Save updates stored Options. Main Menu discards unsaved edits; a failed storage write preserves the previous saved state. A future match will use a validated immutable snapshot, independent of later edits.

The `pirate-battle.options.v1` localStorage envelope contains version, playerId, playerName, sessionTime, and enemySpawnInterval. The local display name defaults to Player. Valid identity persists across refresh; malformed/unsupported data restores defaults with feedback. Storage failures are handled visibly, without claiming persistence succeeded.

## Assets and interface

Provided assets now live in `public/assets/`. The menu uses the supplied scene background, title, panel, and button images. The restored challenge keeps its original asset path references; implementation paths are documented here.

The interface is in English and supports keyboard navigation, visible focus, labeled numeric fields, associated errors, status feedback, and mobile portrait/landscape layouts. Gameplay bindings are currently instructions for the planned combat controls.

## Verification and limitations

The latest completed increment passed 52 configuration unit tests and 26 Options E2E executions: 13 cases on Chromium desktop and the same 13 on Pixel 7 emulation. Lint, type checking, and production build passed. This evidence covers the current increment, not the complete challenge.

Mobile emulation does not establish performance on a physical device. Review screenshots are not versioned visual baselines. Profiling tables remain unfilled; no FPS, memory, or deployment result is claimed.

## Decisions and next work

ADRs remain Proposed. Resolve simultaneous time/death ordering, enemy type sequencing after skipped spawns, the frame clamp, collision geometry, aiming tolerance, and projectile spacing before implementing affected rules. Validate proposed tuning through gameplay and profiling.

Next implementation areas are the simulation/engine, input and PixiJS combat, remaining React screens, and ranking/history integration with idempotent recovery. See the [construction guide](docs/README.md) for incremental delivery and AI assistance.

## Documentation references

- [Architecture](ARCHITECTURE.md) and [ADR index](docs/adr/README.md)
- [Gameplay](docs/specs/gameplay.md), [API contracts](docs/specs/api-contracts.md), and [network scenarios](docs/specs/network-scenarios.md)
- [Requirement traceability and test plan](docs/testing/test-plan.md)
- [Profiling template](docs/performance/profiling.md)
- [Practical testing guide](TESTING.md)
