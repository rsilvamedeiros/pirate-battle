# Profiling record template

Source: [CHALLENGE.md](../../CHALLENGE.md) §9 and §11; [ADR 0003](../adr/0003-fixed-timestep-simulation.md), [ADR 0004](../adr/0004-react-pixi-sync-strategy.md), and [Gameplay configuration](../specs/gameplay.md#game-configuration).

Status: Not measured. Fill every TODO with observations and link the raw evidence after running the implemented game. The challenge targets 60 FPS in a documented reference environment; it does not prescribe a p95 or heap threshold. Sampling, run procedures, and artifact paths below are **proposed** methods, not additional requirements.

## Reference environment

| Field | Recorded value |
| --- | --- |
| Run ID and date | TODO |
| Commit / deployed version | TODO |
| CPU / core count | TODO |
| GPU / driver | TODO |
| RAM | TODO |
| Hardware model / physical or emulated device | TODO |
| OS / version | TODO |
| Browser / full version | TODO |
| Display resolution / refresh rate | TODO |
| Viewport resolution | TODO |
| devicePixelRatio | TODO |
| Power mode / background workload / thermal conditions | TODO |
| Build type / build and serve commands | TODO: optimized production build; record actual commands and URL |
| Full match configuration / configKey | TODO: copy every gameplay parameter; use sessionTime = 180 s for the required three-minute run |
| Seed / arena layout / controls used | TODO |
| Network scenario / persisted fixture state | TODO: proposed success with known fixtures |
| Measurement tools / debug overlay state | TODO |
| Warm-up procedure / recording overhead | TODO |

Use real browser time and normal gameplay; keep `?e2e=1` and manual-clock test hooks disabled. Record any diagnostic overlay as proposed instrumentation and verify that it observes without changing rules. A desktop result does not establish physical-mobile performance.

## Metrics

Record render-frame timestamps, not fixed simulation ticks. Proposed average FPS = observed display-frame intervals / their elapsed wall-clock seconds. Frame time is the time between consecutive observed render frames; p95 uses the sorted intervals and nearest-rank index ceil(0.95 × sample count). Keep raw intervals and include stalls rather than clipping them to the simulation clamp.

The match must contain 180 s of active gameplay; record wall-clock duration separately because pause and discarded frame delays can make it longer. Exclude manual pauses from active windows and document any interruption. If the player dies early, label the run incomplete and repeat or document a valid balancing preset within the specified bounds; never disable damage or gameplay to manufacture a three-minute result.

| Active-time window | Sample count | Mean FPS | p95 frame time (ms) | Evidence |
| --- | --- | --- | --- | --- |
| 0–30 s | TODO | TODO | TODO | TODO |
| 30–60 s | TODO | TODO | TODO | TODO |
| 60–90 s | TODO | TODO | TODO | TODO |
| 90–120 s | TODO | TODO | TODO | TODO |
| 120–150 s | TODO | TODO | TODO | TODO |
| 150–180 s | TODO | TODO | TODO | TODO |
| Entire active match | TODO | TODO | TODO | TODO |

| Timing summary | Value |
| --- | --- |
| Active simulation duration | TODO |
| Wall-clock duration | TODO |
| Pauses / excluded intervals | TODO |
| Discarded frame time, if observable | TODO |
| Minimum / maximum observed FPS window | TODO |

Proposed entity counts include active player ships, Chasers, Shooters, projectiles, and visual effects, with categories reported separately. Take the final gameplay sample immediately before completion cleanup; also report the retained state after returning to the menu.

| Active time | Player ships | Chasers | Shooters | Projectiles | Effects | Total active entities |
| --- | --- | --- | --- | --- | --- | --- |
| 0 s | TODO | TODO | TODO | TODO | TODO | TODO |
| 30 s | TODO | TODO | TODO | TODO | TODO | TODO |
| 60 s | TODO | TODO | TODO | TODO | TODO | TODO |
| 90 s | TODO | TODO | TODO | TODO | TODO | TODO |
| 120 s | TODO | TODO | TODO | TODO | TODO | TODO |
| 150 s | TODO | TODO | TODO | TODO | TODO | TODO |
| 180 s, before cleanup | TODO | TODO | TODO | TODO | TODO | TODO |
| Menu, after cleanup | TODO | TODO | TODO | TODO | TODO | TODO |
| Peak over the match | TODO | TODO | TODO | TODO | TODO | TODO |

Category peaks can occur at different times; the peak total must be measured independently, not computed by summing category peaks. Keep raw samples at a proposed 1 s interval and annotate peak timestamps.

## Memory

Measure retained JavaScript heap after five start/play/exit cycles in the same browser session without refresh. Warm assets once before the baseline so one-time texture/cache allocation is visible separately from continuous growth. Use the same post-exit settling and garbage-collection procedure for baseline and all cycles; record it below.

Proposed standard cycle: start with the recorded configuration, play for 60 active seconds, return to Main Menu, allow 5 wall-clock seconds for cleanup, then collect garbage using DevTools and capture a heap snapshot. This exercises combat exit without submitting an abandoned match. If using completed matches instead, document the expected retained history/outbox data and apply that procedure consistently to all five cycles.

| Cycle | Active time played | Post-exit heap (MiB) | Change from baseline (MiB) | Retained resources / snapshot |
| --- | --- | --- | --- | --- |
| Baseline after warm-up | Not applicable | TODO | 0 | TODO |
| 1 | TODO | TODO | TODO | TODO |
| 2 | TODO | TODO | TODO | TODO |
| 3 | TODO | TODO | TODO | TODO |
| 4 | TODO | TODO | TODO | TODO |
| 5 | TODO | TODO | TODO | TODO |

| Memory procedure detail | Recorded value |
| --- | --- |
| Warm-up / baseline state | TODO |
| Settling time and garbage-collection procedure | TODO |
| Identical or changed match/seed/exit path per cycle | TODO |
| Post-exit canvases, listeners, ticker subscriptions, timers, and entities | TODO |
| Shared texture/cache ownership and expected retention | TODO |
| Evidence of sustained growth / retaining paths | TODO |

Compare snapshots for detached canvases/DOM, retained display objects, entity arrays, subscriptions, timers, and stale asynchronous initialization. Distinguish expected shared texture/cache or confirmed-record retention from unbounded growth. JavaScript heap measurements do not fully account for GPU textures, browser process memory, or service-worker memory; record complementary observations where available.

## Method

1. Build and serve the optimized app from the recorded commit, restore a known fixture state, set sessionTime to 180 s, and record the full configuration/environment. Leave the tab visible and focused; use actual controls and a real clock.
2. Warm assets and shader paths in a separate run. Proposed read-only debug overlay reports frame intervals and active entity counts; collect raw samples with minimal overhead and record whether the overlay is enabled.
3. Capture a Chrome DevTools Performance recording of representative combat, including dense entity periods and noticeable stalls. Inspect scripting, rendering, garbage collection, and long tasks; retain the export and screenshots supporting observations.
4. Calculate mean FPS and p95 from raw render intervals for each window and the full active match. Compare with the 60 FPS target and report entity load at slow periods. Do not use a headless E2E run or the fixed 60 Hz tick count as FPS evidence.
5. Run the five memory cycles with Chrome DevTools Memory, collect comparable post-exit heap snapshots, and inspect retaining paths when heap/resources grow. Keep the page session intact between cycles.
6. Proposed: collect a comparable lightweight run without a full Performance recording to estimate tool overhead. Record differences rather than treating a heavy recording as overhead-free.
7. Store raw samples, Performance exports, heap snapshots, and screenshots under a proposed `docs/performance/artifacts/<run-id>/` location or link equivalent delivery artifacts. This task creates only this Markdown template, not measurements or artifact files.

| Evidence | Location |
| --- | --- |
| Raw frame/entity samples | TODO |
| Calculation method / exported metrics | TODO |
| Performance recording | TODO |
| Baseline and five heap snapshots | TODO |
| Overlay / timeline screenshots | TODO |
| Build / commit identification | TODO |

## Observations

- TODO: whether mean FPS meets the 60 FPS target in the recorded environment, and where it degrades.
- TODO: p95 frame time, spikes, correlated entity counts, and bottleneck evidence.
- TODO: memory trend across all five cycles, expected retained resources, and investigated retaining paths.
- TODO: any fixes and the separately recorded verification run; never replace original measurements silently.

## Limitations

- TODO: environment scope, display refresh cap, mobile coverage, and repeatability.
- TODO: instrumentation/DevTools overhead, garbage-collection effects, missing samples, and incomplete runs.
- TODO: frame-clamp value and active-time versus wall-time divergence (ADR 0003).
- TODO: JavaScript heap versus GPU/browser/service-worker memory coverage.
- TODO: balancing changes needed to complete the run and whether they represent standard gameplay.
- TODO: conclusions unsupported by the available evidence; do not infer leak freedom from five heap values alone.
