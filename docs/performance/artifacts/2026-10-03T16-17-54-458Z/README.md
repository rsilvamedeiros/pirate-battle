# Reference profiling evidence

This directory preserves the completed 2026-10-03 headed Chromium/native-clock collection. Read the [measured report](../../profiling.md) for hardware, configuration, calculations and limitations. The five memory cycles follow the completed 180-second match without refreshing.

Compressed frame/trace/heap files preserve raw evidence. Decompress with `node scripts/unpack-profile.mjs docs/performance/artifacts/2026-10-03T16-17-54-458Z` from the repository root. Load the resulting trace in Chrome DevTools Performance and heap snapshots in Memory. The default extraction directory is ignored by Git.

[sha256.json](sha256.json) records file checksums; environment.json also records the measured optimized entry hash and source state. summary.json, heap-investigation.json and trace-summary.json are derived analyses, not additional benchmark runs. Screenshots show the reference combat and terminal result. No manual E2E clock was used for this collection.
