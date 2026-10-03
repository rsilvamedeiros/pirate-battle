# Final review evidence

The [staged review](../../final-review.md) explains source scope, corrections and delivery limits. Reports below preserve intermediate failures as well as passing verification. A repeated case is an explicit repetition, not an automatic retry.

| Record | Result | Evidence |
| --- | --- | --- |
| Units/integration | 161 passed across 14 files | [unit.json](unit.json) |
| Initial complete preview run | 170 passed, 4 failed; focus loop and content proportions | [initial HTML/traces](initial/html-report.zip) |
| First development StrictMode run | 4 passed, 2 failed; resume focus restoration | [HTML/traces](strict-initial/html-report.zip) |
| Intermediate StrictMode run | 4 passed, 2 failed; native cleanup/restoration race | [HTML/traces](strict-intermediate/html-report.zip), [JSON](strict-intermediate/report.json) |
| Final development StrictMode run | 6 passed; desktop/mobile, zero retries | [HTML](strict-final/html-report.zip), [JSON](strict-final/report.json) |
| Reviewed visual regeneration | 6 passed; 3 intentional baseline updates | [HTML](visual-update/html-report.zip), [JSON](visual-update/e2e-report.json) |
| Second complete preview run | 173 passed, 1 failed before combat at 5 s arena readiness | [HTML/trace](second-full/html-report.zip), [JSON](second-full/e2e-report.json) |
| Readiness repetition | 6 passed; Shooter case repeated 3 times per layout | [HTML](readiness-repeat/html-report.zip), [JSON](readiness-repeat/e2e-report.json) |
| Final complete preview run | 174 passed; no failures/skips/flaky cases/retries | [HTML](final-full/html-report.zip), [JSON](final-full/e2e-report.json) |

The final complete run passed all 174 optimized-preview executions plus the separately reported 6 development StrictMode cases. All six final visual comparisons passed without regenerating baselines. Regeneration is distinct from unchanged-baseline comparison. Unit/source/build summaries are in [verification.json](verification.json).

## Open a report

Extract the selected html-report.zip into a fresh directory. Each archive includes index.html and all linked attachments/viewer files; earlier failing reports include trace ZIPs. Serve the extracted report with Playwright:

```powershell
Expand-Archive -LiteralPath docs/delivery/artifacts/2026-10-03-final/strict-final/html-report.zip -DestinationPath test-results/delivery-strict-report
npx playwright show-report test-results/delivery-strict-report
```

Use the same steps with a different archive and fresh destination for other runs. Failure traces open through the HTML report; extracted trace ZIPs can also be opened with npx playwright show-trace. JSON is available where the reporter wrote a file; the initial run emitted its JSON to the terminal, so its preserved HTML is the complete run record.

Every run directory has checksums.json with byte counts and SHA-256 hashes for packaged files. New reports can be archived without overwriting these runs:

```sh
node scripts/package-test-reports.mjs playwright-report docs/delivery/artifacts/<new-run-directory> test-results/e2e-report.json
```

The output directory must be new; create its parent first. The script reuses the ZIP writer from the lockfile's Playwright installation, adds report attachments and records checksums. Local report folders remain ignored by Git; these selected delivery archives are versioned intentionally.

The separate [profiling artifacts](../../../performance/profiling.md) preserve the earlier measured build. They do not measure the later focus/layout correction. No public deployment is recorded here.
