# Profiling record

Sources: [CHALLENGE.md](../../CHALLENGE.md) Sections 9/11, [ADR 0003](../adr/0003-fixed-timestep-simulation.md) and [ADR 0004](../adr/0004-react-pixi-sync-strategy.md). The reusable [profiling template](profiling-template.md) is retained separately.

Status: measured on 2026-10-03. The reference match completed 180 active seconds without pause; five subsequent start/play/exit memory cycles completed in the same browser session. This is a scoped desktop measurement, not proof of physical-mobile performance or leak freedom.

Source scope: this recorded build predates the final-review dialog focus loop and arena border-box correction. Raw measurements and the recorded entry hash are preserved; they are not measurements of the later corrected build. The [final review](../delivery/final-review.md) records subsequent behavior validation and delivery identity.

## Reference environment

| Field | Recorded value |
| --- | --- |
| Run ID | 2026-10-03T16-17-54-458Z (13:17:54 America/Sao_Paulo start) |
| Source | b51a5ad9327a63d6afe62a8895e05b00c883db71; uncommitted profiling changes listed in environment.json |
| Build identity | index-u77i1gZf.js; SHA-256 918d5b20e500c8ea0f91d0d455b1eca03d5b0a930ae54de2c89ce4e9037af343 |
| Hardware | Dell Inspiron 5566; physical desktop/laptop environment, not mobile emulation |
| CPU | Intel Core i5-7200U @ 2.50 GHz; 2 cores / 4 logical processors |
| RAM | 7.881 GiB reported physical memory |
| GPU / driver | Intel HD Graphics 620 / 27.20.100.9664; accelerated ANGLE Direct3D11 |
| OS | Windows 10, 10.0.19045, x64 |
| Browser / Node | Chromium 153.0.8010.12, full channel with visible window / v20.19.0 |
| Display | 1366 x 768; OS reports 59 Hz |
| Viewport / devicePixelRatio | 1280 x 720 / 1 |
| Power plan | High performance, queried with powercfg /getactivescheme; thermal state and AC/battery source not recorded |
| Workload | Dedicated visible/focused game tab; no E2E suites during the reference run. Background editor/agent/OS workloads were not fully controlled |
| Build / serve | npm run build; Vite optimized preview at localhost:4181, launched by scripts/profile.mjs |
| URL | ?profile=1&preset=endurance&seed=42&scenario=success; no e2e flag, fixture or manual clock |
| Locale / timezone | en-US / UTC |
| Arena / controls | 1000 x 700 logical units, circular island at (500,350), radius 100; held W, D, Space, Q and E through actual browser input |
| Warm-up | Separate 10.5-active-second combat session, then menu exit; textures and shader paths warmed |
| Instrumentation | Post-render numeric observer, real performance.now timestamps; CDP Performance trace during approximately 150-180 active seconds |
| Network / persistence | success, fresh browser context and local MSW fixtures; reference completion registered once; five memory matches were abandoned |

### Match configuration

The explicitly selected **proposed endurance preset** changes only sessionTime to 180, playerHp to 500, chaserCollisionDamage to 1 and shooterProjectileDamage to 1. Every value passes the existing typed bounds. Spawns, enemy AI, collisions, damage, cooldowns and three weapons remain enabled. This avoids early death without disabling rules and does **not** represent default difficulty. Options and default balance remain unchanged outside this opt-in URL.

Full immutable configuration (also in frames.json.gz and summary.json):

```json
{
  "sessionTime": 180,
  "enemySpawnInterval": 3,
  "chaserSpawnWeight": 0.5,
  "shooterSpawnWeight": 0.5,
  "minSpawnDistance": 250,
  "playerHp": 500,
  "chaserHp": 40,
  "shooterHp": 60,
  "playerMoveSpeed": 180,
  "chaserMoveSpeed": 100,
  "shooterMoveSpeed": 80,
  "playerRotationSpeed": 3,
  "chaserRotationSpeed": 2.5,
  "shooterRotationSpeed": 2,
  "frontProjectileDamage": 20,
  "sideProjectileDamage": 15,
  "shooterProjectileDamage": 1,
  "frontProjectileSpeed": 400,
  "sideProjectileSpeed": 350,
  "shooterProjectileSpeed": 250,
  "frontProjectileRange": 600,
  "sideProjectileRange": 450,
  "shooterProjectileRange": 500,
  "frontProjectileLifetime": 1.5,
  "sideProjectileLifetime": 1.5,
  "shooterProjectileLifetime": 2,
  "frontFireCooldown": 0.35,
  "sideFireCooldown": 1,
  "shooterAttackRange": 400,
  "shooterFireCooldown": 1.5,
  "chaserCollisionDamage": 1
}
```

Configuration group, calculated using the same lexical parameter ordering as the match contract:

```text
v1:{"chaserCollisionDamage":1,"chaserHp":40,"chaserMoveSpeed":100,"chaserRotationSpeed":2.5,"chaserSpawnWeight":0.5,"enemySpawnInterval":3,"frontFireCooldown":0.35,"frontProjectileDamage":20,"frontProjectileLifetime":1.5,"frontProjectileRange":600,"frontProjectileSpeed":400,"minSpawnDistance":250,"playerHp":500,"playerMoveSpeed":180,"playerRotationSpeed":3,"sessionTime":180,"shooterAttackRange":400,"shooterFireCooldown":1.5,"shooterHp":60,"shooterMoveSpeed":80,"shooterProjectileDamage":1,"shooterProjectileLifetime":2,"shooterProjectileRange":500,"shooterProjectileSpeed":250,"shooterRotationSpeed":2,"shooterSpawnWeight":0.5,"sideFireCooldown":1,"sideProjectileDamage":15,"sideProjectileLifetime":1.5,"sideProjectileRange":450,"sideProjectileSpeed":350}
```

## Metrics

| Active-time window | Intervals | Mean renders/s | p95 interval (ms) | Maximum interval (ms) | Recording |
| --- | ---: | ---: | ---: | ---: | --- |
| 0-30 s | 2235 | 74.850 | 14.200 | 67.900 | Lightweight observer |
| 30-60 s | 2251 | 75.025 | 14.000 | 16.500 | Lightweight observer |
| 60-90 s | 2251 | 75.024 | 14.100 | 16.400 | Lightweight observer |
| 90-120 s | 2250 | 75.024 | 14.000 | 19.500 | Lightweight observer |
| 120-150 s | 2251 | 74.986 | 16.200 | 27.000 | Lightweight observer |
| 150-180 s | 2240 | 74.689 | 15.000 | 163.700 | Trace + screenshot active |
| Entire observed active match | 13478 | 74.933 | 14.700 | 163.700 | Includes diagnostic overhead |

Average FPS here means completed PixiJS render-callback cadence: positive interval count / summed interval seconds. p95 uses the nearest-rank index ceil(0.95 x count) in sorted, **unclamped** intervals. The collector runs after the application's render callback at ticker priority -26, following PixiJS LOW (-25); it does not count fixed simulation ticks. GPU presentation/compositor delivery is not measured by this callback.

| Timing summary | Value |
| --- | --- |
| Active simulation duration | 180.000 s; completed by time expiry |
| Observed render wall-clock span | 179.867 s |
| First observed active timestamp | 0.133 s; initial synchronous draw/startup precedes this observation |
| Pauses / missing/truncated buffers | 0 / no truncation |
| Observed intervals above 250 ms clamp | 0; no excess inferred from recorded render intervals |
| Minimum / maximum 30 s window cadence | 74.689 / 75.025 renders/s |

The slight active/wall span difference follows the first sample starting after gameplay initialization; it is not evidence of accelerated time. The simulation uses performance.now and ordinary fixed-step execution throughout.

### Entities

Counts include live player, Chasers, Shooters, projectiles and effects. Counts come from every observed render frame; the table selects the first frame at/after each requested active timestamp.

| Active time | Player | Chasers | Shooters | Projectiles | Effects | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| First frame (0.133 s) | 1 | 0 | 0 | 0 | 0 | 1 |
| 30 s | 1 | 2 | 3 | 8 | 1 | 15 |
| 60 s | 1 | 2 | 2 | 4 | 5 | 14 |
| 90 s | 1 | 0 | 2 | 5 | 6 | 14 |
| 120 s | 1 | 1 | 5 | 12 | 5 | 24 |
| 150 s | 1 | 1 | 7 | 9 | 9 | 27 |
| 180 s | 1 | 2 | 6 | 10 | 7 | 26 |
| Menu after exit | 0 | 0 | 0 | 0 | 0 | 0 session entities accessible; no canvas or diagnostic hooks |

The 180 s sample is the frozen terminal state before leaving combat; its entities no longer interact. Independent category peaks were player 1, Chasers 3, Shooters 10, projectiles 23 and effects 16. The independently observed total peak was **44 at 175.400 s**; category peaks occur at different times and must not be summed. Raw frame samples preserve all timestamps.

## Memory

After the completed reference match, baseline and every cycle use the same five-second menu settling period, HeapProfiler.collectGarbage, Runtime.getHeapUsage and a full heap snapshot. Each of the five additional matches uses the same preset/seed and real controls for at least 60 active seconds, then pauses and returns to Main Menu without completion or submission. No refresh occurs. The baseline already includes warmed textures and one completed/confirmed record.

| Cycle | Active time played | Post-GC JS heap (MiB) | Delta from baseline (MiB) | DOM nodes | DOM listeners | Attached canvases |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Baseline | Warm + completed reference match | 6.957 | 0.000 | 266 | 180 | 0 |
| 1 | 60.133 s | 7.161 | 0.204 | 266 | 180 | 0 |
| 2 | 60.100 s | 7.265 | 0.307 | 266 | 180 | 0 |
| 3 | 60.083 s | 7.227 | 0.270 | 266 | 180 | 0 |
| 4 | 60.183 s | 7.264 | 0.307 | 266 | 180 | 0 |
| 5 | 60.183 s | 7.323 | 0.365 | 266 | 180 | 0 |

All rows have one document, no __game or __profiling bridge, and zero attached canvases. Display textures intentionally remain in the shared Assets cache. DOM node/listener counts remain 266/180 after every exit.

### Investigation

The final heap is 0.365 MiB above baseline; the sequence is not strictly increasing (cycle 3 is below cycle 2). This alone is insufficient to declare either a leak or leak freedom.

[Heap investigation](artifacts/2026-10-03T16-17-54-458Z/heap-investigation.json) examines property signatures that survive class-name minification: engine methods, runtime, profiler, simulation fields and application ownership fields. All six post-GC snapshots contain zero matches for these session-object signatures. These are heuristic checks, not formal reachability proofs.

The largest positive shallow-byte difference is V8 InstructionStream code (+292,352 bytes), followed by bytecode/feedback/code structures. This supports continued JIT/code warm-up as a contributor, rather than an accumulating session graph; it does not fully attribute the heap delta. Two HTMLCanvasElement-named objects and one object for each WebGL context interface retain identical counts. Their examined shortest strong root paths pass through Blink ScriptState/V8PerContextData browser roots, rather than a surviving engine; those retained browser wrappers are not the attached game canvas. Exact Pixi class-name zero counts in summary.json are inconclusive under minification.

Inspect all six decompressed snapshots in DevTools Memory for additional retaining paths if future longer runs grow. Five cycles, shallow-byte comparisons and shared-cache retention do not establish unbounded-growth absence. GPU/process/service-worker memory is outside this JS heap metric.

## Method and reproduction

```sh
npm ci
npx playwright install chromium
npm run build
node scripts/profile.mjs
node scripts/summarize-profile.mjs docs/performance/artifacts/<run-id>
node scripts/inspect-profile-heaps.mjs docs/performance/artifacts/<run-id>
node scripts/unpack-profile.mjs docs/performance/artifacts/<run-id>
```

Keep the opened reference browser visible and focused during the approximately nine-minute real-time run. A pause, premature death, insufficient duration or truncated buffer prevents summary generation. The collector has a bounded 120,000-sample buffer. Ordinary URLs and manual E2E mode do not install the profiler. The endurance flag is explicit and visibly labeled; diagnostics do not change core transitions or provide simulation-clock mutation.

The runner controls actual keyboard input through Playwright but runs **headed**, with the native clock and hardware GPU; it is separate from headless/manual-clock E2E. Its --quick mode is a smoke check and cannot produce this report. --software explicitly selects SwiftShader for a separately labeled run; it was not used here.

The raw trace uses the same Chrome DevTools Protocol Performance/HeapProfiler facilities as DevTools. After unpacking, load performance-trace.json in DevTools Performance and heap-0.heapsnapshot through heap-5.heapsnapshot in DevTools Memory. Unpacked large files default to ignored test-results/profile-evidence; compressed originals remain delivery artifacts in the repository.

### Evidence

| Evidence | Location |
| --- | --- |
| Environment, GPU, commit and optimized entry hash | [environment.json](artifacts/2026-10-03T16-17-54-458Z/environment.json) |
| Raw render intervals and entity counts | [frames.json.gz](artifacts/2026-10-03T16-17-54-458Z/frames.json.gz) |
| Aggregated calculations and configuration | [summary.json](artifacts/2026-10-03T16-17-54-458Z/summary.json) |
| Match completion and successful collection | [match summary](artifacts/2026-10-03T16-17-54-458Z/match-summary.json), [outcome](artifacts/2026-10-03T16-17-54-458Z/outcome.json) |
| Performance export and event summary | [compressed trace](artifacts/2026-10-03T16-17-54-458Z/performance-trace.json.gz), [trace summary](artifacts/2026-10-03T16-17-54-458Z/trace-summary.json) |
| Baseline / five post-exit heap snapshots | [artifact directory](artifacts/2026-10-03T16-17-54-458Z/) (heap-0 through heap-5.heapsnapshot.gz) |
| Heap counters and retaining-path investigation | [memory.json](artifacts/2026-10-03T16-17-54-458Z/memory.json), [heap-investigation.json](artifacts/2026-10-03T16-17-54-458Z/heap-investigation.json) |
| Dense combat / completed result | [combat](artifacts/2026-10-03T16-17-54-458Z/dense-combat.png), [result](artifacts/2026-10-03T16-17-54-458Z/match-end.png) |

## Observations

- Observed mean render cadence exceeds the 60 FPS target in this environment/preset. p95 is 14.700 ms and the entity peak is 44. This is not a claim about standard difficulty, larger loads, other devices or physical display presentation.
- The maximum 163.700 ms interval occurs at active time 150.317 s, around trace startup/screenshot capture. The trace contains a 137.106 ms CpuProfiler::StartProfiling event, consistent with instrumentation overhead. Minor GC and rendering work also appear; [trace-summary.json](artifacts/2026-10-03T16-17-54-458Z/trace-summary.json) includes event counts/durations. Nested trace events overlap, so their totals are not exclusive CPU time and must not be summed.
- The traced window averages 74.689 renders/s versus 74.850-75.025 in earlier windows. Entity load differs, so this comparison does not isolate recording overhead; no matching uninstrumented full run was collected.
- Heap rises modestly, with stable DOM/listener counts and no matching session-object shapes after GC. No corrective gameplay/render optimization was justified by this single reference run. The existing ~602 kB entry-chunk build warning remains a startup/download concern; this combat measurement does not assess startup loading performance.

## Limitations

One desktop, one control pattern, one seed and a proposed easier-survival preset were measured. There is no physical-mobile benchmark, repeat-run confidence interval, thermal/power-source measurement or complete background-workload control. The OS-reported 59 Hz display differs from observed ~75 Hz callback cadence; compositor/display presentation timing was not captured, so callback FPS must not be reported as monitor-presented FPS.

The observer allocates numeric samples and counts entities each render. CDP polling, screenshot capture, tracing, heap snapshots and forced GC add overhead. The first 0.133 active seconds precede the first frame sample. Frame intervals preserve stalls; simulation deltas remain subject to the 250 ms clamp. No recorded interval exceeded that clamp, but render intervals cannot independently quantify engine-delta discard.

Heap figures cover renderer JavaScript after explicit collection. Shared caches, browser wrappers, JIT code and one confirmed record may remain by design. GPU texture/process/MSW-worker memory and heap dominator retained sizes were not measured. Longer retention tests and standard-balance/mobile repetitions remain useful follow-ups. Public deployment and final delivery/report/documentation packaging are still pending.

Primary method references: [PixiJS Ticker](https://pixijs.download/release/docs/ticker.Ticker.html), [Chrome HeapProfiler](https://chromedevtools.github.io/devtools-protocol/tot/HeapProfiler/) and [Chrome Tracing](https://chromedevtools.github.io/devtools-protocol/tot/Tracing/).
