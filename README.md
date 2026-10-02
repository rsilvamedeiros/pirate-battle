# Pirate Battle

A browser-only naval combat game built with React, TypeScript, and PixiJS for [CHALLENGE.md](CHALLENGE.md).

The current increment includes the Main Menu, control instructions, validated Options, and local persistence. Play, Ranking, and Match History are unavailable while their gameplay and API features are implemented.

## Setup

Use Node.js 20.19+ (20.x), Node.js 22.12+ (22.x), or Node.js 24+.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. No environment variables or external services are required for the current increment.

## Options

Game session time accepts 60–180 seconds, defaulting to 120. Enemy spawn time accepts the proposed range of 1–10 seconds, defaulting to 3. Decimal values are accepted. Save validates both fields and persists them locally; Main Menu discards unsaved edits.

Options use `pirate-battle.options.v1` in localStorage, together with a local player ID and the display name Player. Invalid stored values restore defaults with visible feedback. Storage failures show an error; failed saves do not replace previous settings.

## Local verification

1. Open Options, save 150 seconds and a 2-second spawn interval, return to the menu, and refresh. Reopen Options and verify the saved values.
2. Try session times outside 60–180, a zero/negative spawn interval, or an empty field. Save must show an associated error and keep stored values unchanged.
3. Change a field and return to Main Menu without saving. Reopening Options must restore the saved value.
4. Navigate with Tab and Enter, checking visible focus and error focus. Check the layout in mobile portrait and landscape.

## Commands

| Command | Purpose |
| --- | --- |
| npm run dev | Start Vite development server |
| npm run build | Type-check and build the optimized app |
| npm run preview | Serve the existing production build |
| npm run lint | Run ESLint |
| npm run typecheck | Check application, tool configuration, and E2E TypeScript |
| npm run test:unit | Run configuration unit tests with Vitest |
| npm run test:unit:watch | Run unit tests in watch mode |
| npm run test:e2e | Build, then run the Options suite on Chromium desktop/mobile |
| npm run test:e2e:ui | Build, then open Playwright UI |
| npm run test:e2e:report | Open the latest Playwright HTML report |

Install the browser once before E2E testing:

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright starts a preview server on port 4173; keep that port available during tests. Reports are written to `playwright-report/`, with failure traces/screenshots in `test-results/`. Run artifacts are ignored by Git.

## Documentation

- [Construction guide and AI assistance](docs/README.md)
- [Architecture](ARCHITECTURE.md) and [ADRs](docs/adr/README.md)
- [Gameplay specification](docs/specs/gameplay.md)
- [API contracts](docs/specs/api-contracts.md) and [network scenarios](docs/specs/network-scenarios.md)
- [Test plan](docs/testing/test-plan.md) and [profiling template](docs/performance/profiling.md)

The menu uses supplied assets from `public/assets/`. Proposed gameplay bindings are listed in its Controls section. Combat, MSW scenario controls, ranking/history integration, visual baselines, profiling measurements, and deployment instructions will be completed in subsequent increments.
