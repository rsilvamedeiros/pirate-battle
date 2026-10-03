# Final review stages

Source: [CHALLENGE.md](../../CHALLENGE.md), especially Sections 4, 7, 8, 9 and 11. This review separates executed checks from outstanding delivery requirements. It does not predict hiring results.

| Stage | Scope | Status / evidence |
| --- | --- | --- |
| 1. Reproduction and static checks | Install from lockfile; lint, strict types, units/integration and optimized build | Passed: 161 units/integration, lint, strict types and optimized build; installation from lockfile succeeded |
| 2. Production browser regression | Full Chromium desktop/Pixel 7 inventory; real controls, HTTP scenarios and six unchanged visual baselines | Passed: all 174 executions, zero failures/skips/retries; 10.9 minutes |
| 3. Lifecycle and documentation | Five session cycles, keyboard dialog focus, portrait/landscape; repeat against development StrictMode; English/default plus Portuguese README and completed architecture | Six StrictMode executions passed; English/default and Portuguese guides exist; architecture completed |
| 4. Evidence package | Versioned HTML report, failure traces, unit summary, reproducible environment/build identity and profiling links | Delivered in [review artifacts](artifacts/2026-10-03-final/README.md), including intermediate failures |
| 5. Public delivery | Deploy the exact reviewed source; validate HTTPS, worker startup, reload, records and pending recovery on public URL | Published on [Vercel](https://game-pirate-battle.vercel.app/); see [deployed verification](public-verification.md) for executed checks and remaining limits |

## Pre-deployment handoff

The developer has published on [Vercel](https://game-pirate-battle.vercel.app/). The original pre-deployment evidence remains historical; the [public verification record](public-verification.md) describes the subsequent deployed checks. The [English README](../../README.md#publish-on-vercel) contains installation, build/output settings, environment requirements, evaluator steps and network-failure reproduction. The [latest verification archive](artifacts/2026-10-03-release/README.md) records the application after the subsequent Sass, formatting, lint, CI, CSS Modules and component-extraction stages. The original 174-case reports below remain historical evidence and are not overwritten.

The final commit changes documentation and delivery evidence only. Public acceptance still requires the deployed URL and exact commit SHA; hosted CI must be inspected after pushing. Existing profiling belongs to its original measured build, not this later application revision.

## Reproduction

```sh
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npx playwright test --config=playwright.strict.config.ts
```

Keep ports 4173 and 4174 available. Desktop/mobile E2E runs the optimized preview; the dedicated lifecycle configuration runs development React to exercise StrictMode effect replay. Both use zero automatic retries. Controlled-clock browser tests are behavior checks, not performance benchmarks.

## Verification record

2026-10-03: npm ci passed with zero reported vulnerabilities; 161 unit/integration cases in 14 files passed. Initial installation failed because this repository's running Vite process held a native Windows binding. That process was stopped, and installation then succeeded. The lockfile was not changed. A preliminary lint run passed; final lint/type checks include the added lifecycle configuration and cases.

The final optimized-browser run passed all 174 executions (87 per project) in 10.9 minutes. No tests were skipped, flaky or retried automatically. All six visual comparisons passed without updating snapshots. Development StrictMode adds six separately passing executions; units/integration add 161 passing cases across 14 files.

The initial complete run passed 170 executions and failed four newly added assertions: dialog focus cycling and arena proportions, each on desktop/mobile. The focus loop is now explicit in both directions. Native focus restoration raced dialog cleanup, so restoration now follows the paused-to-running React effect after child cleanup. Two intermediate StrictMode runs passed four and failed two restoration assertions; the final StrictMode run passed all six in 43.7 s with zero retries.

The arena frame now applies its 10:7 aspect ratio to its content box, accounting separately for the 3 px border. This corrects slight stretching rather than weakening the orientation assertion. Visual update passed all six cases: desktop arena/result and mobile arena changed; both menu images and mobile result remained unchanged. All arena/result images were reviewed. The final full comparison runs without --update-snapshots.

The second full run passed 173 and failed one Shooter case before combat because the arena was not ready within the default 5 s assertion limit. The shared fixture now waits up to 15 s for the hook installed after assets/render/input initialization, then checks visible canvas and enabled Pause. Three explicit repetitions per layout passed (six executions); the subsequent complete run passed all 174. Combat damage, cooldown, pixel thresholds and automatic retry policy were unchanged. Reports preserve the cold-start failure.

## Documentation review

README.md is the English solution guide; README.pt-BR.md is a supplementary Portuguese guide with a mutual link. The complete original challenge remains unchanged in CHALLENGE.md. Architecture skeleton TODOs are replaced with implemented boundaries, update order, collision/resource ownership, persistence, cache/recovery and proposed balance values. ADRs remain Proposed for candidate review.

AI assistance is recorded honestly in the [construction guide](../README.md), including documentation, tests, implementation and evidence review. The candidate must understand and review the resulting rules and tradeoffs; repository evidence does not establish any separate hiring-process policy.

## Evidence and limitations

- [Challenge audit](challenge-audit.md): requirement-by-requirement review.
- [Test plan](../testing/test-plan.md) and [testing guide](../../TESTING.md): coverage, reproduction and reports.
- [Measured profiling](../performance/profiling.md): headed/native-time three-minute match, five memory cycles and raw trace/heap evidence.
- [Visual baseline record](../../tests/e2e/visual.spec.ts-snapshots/README.md): six platform-specific reference images.

The entry-chunk warning remains; combat profiling does not measure download/startup cost. Mobile uses emulation, not physical hardware. Heap observations do not prove leak freedom. Concurrent tabs are not coordinated. Public-worker/reload smoke checks are now recorded in [deployed verification](public-verification.md); physical/manual acceptance and final redeploy identity remain separate.

## Public acceptance checklist

- [ ] Record a public HTTPS URL and the exact delivered source revision/build identity.
- [ ] Open the URL in a fresh browser context and verify no unhandled console/page errors.
- [x] Confirm the supplied player ship asset, worker wrapper and generated MSW worker are accessible.
- [ ] Play with keyboard/touch; verify pause/resume and portrait/landscape.
- [x] Save Options, reload, and verify their values persist (Pixel 7 emulation).
- [x] Complete a match; verify one confirmed entry in both views and a confirmed result after reload.
- [x] Reproduce post-commit timeout and offline-at-match-end recovery without duplicates.
- [x] Verify root worker control, direct loading and refresh on the public origin.
- [ ] Review standard balance and physical touch usability where hardware is available.
- [ ] Confirm the URL remains accessible for evaluation; provide the final reports and profiling evidence.

Build command: npm run build. Static output: dist/. No private API, credentials or environment variables are needed. Do not substitute local preview evidence for the required deployed checks. The initial time estimate in the challenge introduction must be verified from the candidate's communication; it cannot be reconstructed retrospectively from test results.
