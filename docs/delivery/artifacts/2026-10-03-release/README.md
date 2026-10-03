# Pre-deployment verification

This archive records the last local verification before the developer publishes on Vercel. The executed application is source revision `7da72fc` (full SHA and file hashes in `verification.json`), followed by documentation/evidence changes only. Public deployment, hosted CI and physical-mobile validation are separate checks.

## Verification

Recorded on 2026-10-03, Windows 10 x64, Node.js 20.19.0 and the lockfile's Playwright 1.63.0 Chromium. CI and the proposed Vercel deployment use Node.js 24; this local run does not verify those hosted environments.

| Check | Outcome | Evidence |
| --- | --- | --- |
| Lockfile installation | `npm ci` passed after stopping this repository's Vite process, which held a Windows native binding | No source or lockfile changes; existing development-tool audit warnings remain |
| Formatting, lint and strict types | Passed | `npm run format:check`, `npm run lint`, `npm run typecheck` |
| Units/integration | 161 passed across 14 files | [unit.json](unit.json) |
| Optimized build | Passed; existing entry-chunk warning | Build hashes in [verification.json](verification.json) |
| Complete desktop/mobile browser suite | 176 passed, 88 per project; zero failures, skips, flaky cases or retries; 13.0 minutes | [HTML archive](optimized/html-report.zip), [JSON](optimized/e2e-report.json), [checksums](optimized/checksums.json) |
| Visual regression | All six comparisons passed without updating baselines | Included in the complete browser report |
| Development StrictMode | Six passed; desktop/mobile lifecycle, focus and orientation | [HTML archive](strict-mode/html-report.zip), [JSON](strict-mode/report.json), [checksums](strict-mode/checksums.json) |
| Production dependency audit | Zero vulnerabilities with `npm audit --omit=dev` | Development chain has 10 high-severity entries; scope is documented in [TECHNICAL.md](../../../../TECHNICAL.md) |

The first unit JSON was cleared by Playwright's output-directory cleanup; the unit suite was rerun to preserve its native report here. Both runs passed 161 cases. Earlier failures and their traces remain in the [previous archive](../2026-10-03-final/README.md); this passing run generated no failure traces. [verification.json](verification.json) identifies the executed source/build and [checksums.json](checksums.json) covers the new archive.

## Open the reports

Extract each HTML archive to a fresh directory; the archive includes its viewer and attachments. From the repository root:

```powershell
Expand-Archive -LiteralPath docs/delivery/artifacts/2026-10-03-release/optimized/html-report.zip -DestinationPath test-results/release-optimized-report
npx playwright show-report test-results/release-optimized-report
Expand-Archive -LiteralPath docs/delivery/artifacts/2026-10-03-release/strict-mode/html-report.zip -DestinationPath test-results/release-strict-report
npx playwright show-report test-results/release-strict-report
```

Stop the first report server before opening the second. Reproduction commands and failure-trace instructions are in [TESTING.md](../../../../TESTING.md).

## Deployment handoff

Use the [README deployment settings](../../../../README.md#publish-on-vercel). Submit the public production URL, repository URL and exact deployed commit SHA after completing the [public acceptance checklist](../../final-review.md#public-acceptance-checklist). No public URL was available during this local run.

The [profiling measurements](../../../performance/profiling.md) belong to their documented earlier build and endurance preset. They have not been rerun or relabeled as measurements of this source revision.
