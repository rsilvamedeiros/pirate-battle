# Visual baselines

These PNGs cover Main Menu with expanded Controls, a stable arena after real front/left-fire keyboard input, and a completed result confirmed through Axios/TanStack Query/MSW. Each state has separate Chromium desktop and Pixel 7 emulation baselines, as required by CHALLENGE.md §8.

## Reference environment

| Setting | Value |
| --- | --- |
| Generated | 2026-10-03 |
| OS / architecture | Windows 10, release 10.0.19045 / x64 |
| Node / Playwright / Chromium | 20.19.0 / 1.63.0 / 153.0.8010.12 |
| Browser / renderer | Full Chromium channel, headless, SwiftShader |
| Build | Optimized Vite preview, localhost:4173 |
| Desktop | 1280 × 720 viewport, deviceScaleFactor 1 |
| Mobile | Pixel 7, 412 × 839 viewport, deviceScaleFactor 2.625; portrait |
| Locale / timezone | en-US / UTC |
| Date | Fixed 2026-10-03T12:00:00.000Z; network timers remain active |
| Gameplay / network seed | 42 / 42; independent random streams |
| Network scenario | success; fresh context and storage per test |
| Capture | Full page, CSS-pixel scale, hidden caret, disabled CSS animations |
| Comparison | maxDiffPixels 0; Playwright's default per-pixel threshold 0.2 |
| Screenshot assertion timeout | 15 seconds for two stable captures; no automatic retries |
| Per-test timeout | 60 seconds including cold browser/worker startup and capture |

The arena advances the production fixed-step rules to 3100 ms, then its manual clock stays stopped; PixiJS has drawn the observed state. The result uses the lethal-chaser startup fixture and real collision rules. No entity, score or outcome is mutated during a match. Dates are fixed without freezing Service Worker startup or HTTP/retry timers. Assets and fonts finish loading before capture; no elements are masked.

## Compare and update

```sh
npm ci
npx playwright install chromium
npm run test:e2e -- tests/e2e/visual.spec.ts
npm run test:e2e -- tests/e2e/visual.spec.ts --repeat-each=3
# Only after reviewing an intentional visual change:
npm run test:e2e -- tests/e2e/visual.spec.ts --update-snapshots
```

Review all six images and comparison diffs before committing an update. Rerun without the update flag. Keep the PNGs and this record in Git; generated reports and failure actual/diff images belong to ignored run-artifact directories. Baselines are named by project and platform using Playwright's default paths.

Run comparisons in this reference environment. Other operating systems/browser versions can render fonts or WebGL differently and need their own reviewed baselines; do not rename Windows images to bypass platform separation. Mobile emulation is not a physical-device performance measurement. Landscape behavior has functional coverage; these visual baselines cover portrait mobile.

The [Playwright visual comparison guide](https://playwright.dev/docs/test-snapshots) documents environment dependence, platform-specific snapshots and reviewed updates. [Screenshot assertions](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1) describe capture stability and comparison options.
