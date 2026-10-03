# Pirate Battle

[Portuguese guide](README.pt-BR.md) | [Original challenge](CHALLENGE.md)

A browser-only naval shooter built with React, strict TypeScript and PixiJS. Sail around the island, fight Chasers and Shooters, and earn one point per enemy destroyed. React owns menus and semantic HUD/dialogs; the pure simulation owns combat. Axios and TanStack Query consume REST APIs mocked by MSW in development and optimized builds.

## Delivery status

The local implementation includes gameplay, persistent Options/results, paginated records, idempotent submission/recovery, 14 network scenarios, desktop/mobile E2E and versioned visual baselines. [Measured profiling](docs/performance/profiling.md) includes a three-minute match and five memory cycles with raw evidence.

**Public deployment is pending.** A public URL and deployed-worker/reload validation are required by the challenge before submission. Follow the [final review stages](docs/delivery/final-review.md). Test counts and local preview are not evidence that publication is complete.

## Setup and environment

Use Node.js 20.19+ in the 20.x line, 22.12+ in the 22.x line, or 24+. Install from the committed lockfile:

~~~sh
npm ci
npx playwright install chromium
npm run dev
~~~

Open the URL printed by Vite. No environment variables, credentials or private services are required. Match records and pending submissions belong to this browser/origin; this is a local API demonstration, not a shared online leaderboard. Service Workers require HTTPS or localhost. If npm ci reports a Windows native-binding file lock, stop this repository's Vite server and retry.

## Commands

| Command | Purpose |
| --- | --- |
| npm run dev | Run the development server with React StrictMode |
| npm run build | Type-check and generate dist/ |
| npm run preview | Serve the optimized build locally |
| npm run lint | Check source/tooling lint rules |
| npm run typecheck | Check application, tooling and browser-test types |
| npm run test:unit | Run core, engine, persistence, API and mock tests |
| npm run test:e2e | Build and run desktop/mobile browser and visual suites |
| npm run test:e2e:ui | Build and open Playwright UI |
| npm run test:e2e:report | Open the latest browser HTML report |
| npx playwright test --config=playwright.strict.config.ts | Run lifecycle/accessibility checks against development StrictMode |
| node scripts/profile.mjs | Measure the optimized build in headed Chromium with native time; run build first |

Browser tests own ports 4173 (preview) and 4174 (StrictMode development). Keep them available. Failure traces/screenshots are retained under test-results/; HTML reports are under playwright-report/. The [testing guide](TESTING.md) explains reproduction, visual baseline updates and delivery reports.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move forward | W / ArrowUp | Hold Forward |
| Rotate left | A / ArrowLeft | Hold Rotate Left |
| Rotate right | D / ArrowRight | Hold Rotate Right |
| Front fire | Space | Hold Front Fire |
| Left broadside | Q | Hold Left Fire |
| Right broadside | E | Hold Right Fire |
| Pause | Esc / P | Tap Pause |

Movement, rotation and fire can run simultaneously. Front fire emits one projectile; each broadside emits three parallel projectiles. Desktop and mobile portrait/landscape layouts are supported; mobile tests use emulation. Loss of focus or hiding the tab pauses combat. Resume requires explicit action and fresh inputs. Refresh or leaving active combat abandons it without creating a match record.

## Configuration and persistence

Options exposes Game session time (60-180 seconds, default 120) and Enemy spawn time (proposed 1-10 seconds, default 3). Save persists values; unsaved edits are discarded. Every match takes an immutable snapshot of all 31 typed balance parameters. Full defaults, units and proposed bounds are in the [gameplay specification](docs/specs/gameplay.md#game-configuration).

Completed results persist and can be opened with Last Result after refresh. Each receives one matchId, saved to the outbox before submission. PUT retries reuse it and recover the first confirmed record without duplication. Pending registration never prevents another match. Local-write failures and HTTP failures have separate Retry Save and Retry Registration actions.

Owned localStorage keys: pirate-battle.options.v1, pirate-battle.last-result.v1, pirate-battle.outbox.v1 and pirate-battle.msw-db.v1. Do not clear unrelated data. Reset demo data discards owned results, pending submissions and confirmed fixtures, preserving Options/player identity. Storage failures are visible; refresh recovery is not guaranteed when writes are blocked.

## Network scenarios and failure reproduction

Open /?scenario=<id>&seed=42 or expand Network scenarios, select a schedule and choose Apply. Applying a schedule preserves records. Empty/multi-page fixtures are seeded on first initialization or explicit Reset demo data. The 14 IDs are success, empty, multi-page, slow, variable-latency, out-of-order, timeout, connection-failure, http-4xx, http-5xx, ranking-failure, history-failure, submit-timeout-after-commit and offline-at-match-end.

1. Open /?scenario=offline-at-match-end&seed=42, finish a match, and observe pending registration.
2. Return to Main Menu, refresh, then select Recover connection in Network scenarios.
3. Open Last Result and both record tabs; registration confirms with the same matchId and no duplicate entry.
4. Repeat with submit-timeout-after-commit: the mock commit occurs before the lost response; retry recovers the existing record.

Queries use bounded retries, background-refresh states and cancellation; network errors leave gameplay/Options usable. See the [scenario matrix](docs/specs/network-scenarios.md) and [manual test guide](TESTING.md#network-scenario-reproduction) for all failure schedules.

Only ?e2e=1 exposes copied-state/manual-clock test hooks; tests still use real rules and controls. Separate ?profile=1 diagnostics observe native-time render frames. The explicit preset=endurance profiling option changes survival parameters and must not be confused with default balance or ordinary E2E.

## Architecture, evidence and limitations

- [Architecture](ARCHITECTURE.md), [technical guide](TECHNICAL.md) and [ADR index](docs/adr/README.md).
- [Test plan](docs/testing/test-plan.md), [practical testing](TESTING.md) and [final review](docs/delivery/final-review.md).
- [API contracts](docs/specs/api-contracts.md), [network scenarios](docs/specs/network-scenarios.md) and [challenge audit](docs/delivery/challenge-audit.md).
- [Measured profiling](docs/performance/profiling.md), [raw artifacts](docs/performance/artifacts/2026-10-03T16-17-54-458Z/) and [reusable template](docs/performance/profiling-template.md).
- [Construction and AI-assistance record](docs/README.md).

Known limits include one circular island/routing scheme, uncoordinated simultaneous-tab storage writes, no shared backend, a large entry chunk, Windows-specific visual baselines and no physical-mobile performance measurement. Profiling records post-render cadence rather than display presentation; five post-GC cycles do not prove leak freedom.

## Assets and AI assistance

The supplied [assets](public/assets/) are the visual basis. The [original challenge](CHALLENGE.md) is preserved without edits; its original asset paths are historical, while the application serves public/assets/. Source assets are included with the repository.

AI assisted documentation, test planning/implementation, application changes, debugging and evidence review, as recorded per increment in the construction guide. The candidate remains responsible for reviewing the implementation, understanding the decisions and validating the final delivery. This record describes the actual scope of assistance.
