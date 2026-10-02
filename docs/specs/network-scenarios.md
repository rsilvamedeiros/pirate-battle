# Network scenarios specification

Sources: [CHALLENGE.md](../../CHALLENGE.md) §6, §8, and §11; [ADR 0006](../adr/0006-msw-in-production.md) and [ADR 0007](../adr/0007-seeded-rng-and-test-hooks.md). Contracts and retry policies are defined in [API contracts](api-contracts.md).

All scenario categories are required by §6. IDs, timing, selection controls, failure schedules, and reset behavior below are **proposed**. MSW runs at the network boundary in development, tests, and the published build; all scenarios leave gameplay and Options available.

## Scenario matrix

Endpoint abbreviations: R = GET /api/ranking; H = GET /api/players/:playerId/matches; S = PUT /api/matches/:matchId. All three still use Axios and TanStack Query.

| ID (kebab-case) | Description (proposed schedule) | Endpoints affected | Expected UI behavior |
| --- | --- | --- | --- |
| success | Normal fixture/confirmed data; 100 ms response delay | R, H, S | Lists load; registration confirms and refreshes both tabs |
| empty | On reset, seed no match fixtures; subsequent commits remain queryable | R, H; S succeeds | Show empty states, then show a newly confirmed match in both tabs |
| multi-page | On reset, seed 25 comparable records, including 25 for the local player; 100 ms delay | R, H; S succeeds | Default pageSize 10 yields three pages; navigation and totals agree |
| slow | Fixed 2000 ms delay, below the 5000 ms request timeout | R, H, S | Show loading/sending or background refresh; controls remain usable |
| variable-latency | Seeded delays between 100 and 1500 ms | R, H, S | Loading duration varies reproducibly; render only the current request's data |
| out-of-order | Capture query data at request start; delay the first read 2000 ms and the next 100 ms per endpoint, repeating pairs | R, H; S succeeds | Newer page/group/refresh results survive an older completion; canceled requests do not show errors |
| timeout | Delay beyond 5000 ms; do not commit submissions | R, H, S | Bounded retries, then accessible timeout state; keep submission pending |
| connection-failure | Return a simulated network failure without an HTTP response or commit | R, H, S | Show connection error after retries; keep outbox and retry action |
| http-4xx | Return HTTP 400 with ApiError; do not commit | R, H, S | Show non-retryable validation error automatically; retain pending payload for recovery |
| http-5xx | Return HTTP 503 with ApiError; do not commit | R, H, S | Bounded retries then error; preserve cached data and outbox |
| ranking-failure | R returns HTTP 500; other operations succeed | R only | Ranking shows retryable error; history and submissions continue working |
| history-failure | H returns HTTP 500; other operations succeed | H only | History shows retryable error; ranking and submissions continue working |
| submit-timeout-after-commit | First PUT per new matchId commits immediately, persists, then delays response 6000 ms; later PUTs return stored record in 100 ms | S; R and H read committed data | Submission can time out despite successful commit; automatic/manual retry confirms the same match without duplicates |
| offline-at-match-end | Reject submission as connection failure before commit until recovery; reads remain available | S only | Result remains pending through failures/refresh; another match can start; recovery resends the same identifiers and updates both tabs |

For empty and multi-page, fixture changes happen only on explicit reset, not on every request or scenario selection. Otherwise confirmed records must remain visible after successful PUT. Proposed baseline for other scenarios: 12 records for the default configuration, including 3 local-player matches, with fixed dates and IDs.

Pending state is not evidence of a failed commit. In submit-timeout-after-commit, confirm that both resources contain exactly one entry for the identifier before and after retry, including across refresh.

## Select a scenario (proposed)

Use the query parameter `?scenario=<id>`; absent or unknown IDs fall back to success, with an accessible message for an unknown ID. Read the parameter before network initialization. With other parameters, combine them normally, for example `?scenario=variable-latency&e2e=1&seed=42`.

Provide a labeled Network scenarios panel in the Main Menu with a scenario selector, active scenario description, Apply, Reset demo data, and a Recover connection action for offline-at-match-end. Applying a choice updates the URL parameter and cancels/clears affected query caches before refetching. Ordinary selection never clears confirmed records, options, results, or the outbox. This keeps the selected scenario reproducible after refresh without requiring another storage key.

Proposed recovery: Recover connection switches offline-at-match-end to success, updates the URL, and requests immediate replay of pending entries through the existing outbox coordinator. Switching to success or booting into success also permits replay; manual retry remains available. Scenario delays/errors never bypass API handlers or insert client-side fake results.

## Restore initial state (proposed)

Reset demo data is available outside active combat. Describe its effect before activation: it discards saved demo match records, the last result, and pending submissions. Keep saved Options and local player identity; this is a demo reset, not an Options reset.

Cancel affected reads, stop outbox dispatch, and invalidate outstanding mutation/handler generations so late responses or delayed commits cannot repopulate cleared state. Clear only last-result, outbox, and MSW database keys listed in [Local persistence](api-contracts.md#local-persistence-proposed). Rebuild fixtures for the selected scenario, reset latency counters, seed streams, and post-commit failure markers; clear query caches and resume requests only after reset completes.

For isolated E2E tests, use a fresh browser context with empty owned storage, initialize known Options/identity and fixtures, and select the scenario before requests. This differs from the user-facing demo reset, which intentionally preserves Options.

## Deterministic randomness and latency (proposed)

Use a dedicated seeded PRNG for network schedules, independent of gameplay randomness. Proposed seed input: integer `?seed=` parameter, default 42, validated as an unsigned 32-bit integer. The same seed, scenario, and request sequence produce the same delays; per-endpoint streams and counters prevent unrelated calls from changing another endpoint's schedule.

Use explicit fixed delays for success, slow, timeout, and post-commit timeout; use seeded draws only for variable-latency. The out-of-order schedule uses counters rather than random timing. Inject the network scheduler in tests so latency, timeout boundaries, and retry delays can be advanced deterministically; simulation uses its separate manual clock and the same real 60 Hz rules path.

Only expose window.__game with `?e2e=1`, as in ADR 0007. It observes state, configures scenarios before a match, and controls simulation time without shortcuts to damage, score, or collisions. Network timing control belongs to the test scheduler, not an always-exposed game hook. Combat tests use real keyboard/touch controls; visual baselines use fixed fixtures, seeds, viewport, and an observed stable game state.

Test reset must restore storage, PRNG streams, request counters, failure markers, clocks, and input. Verify loading, empty, pagination, query errors, stale-response protection, persistent outbox recovery, and duplicate-free post-commit retry through the actual HTTP integration.

## Open questions

The challenge leaves selection UI, delay ranges, fixture sizes, seed transport, and reset scope open. The policies above are proposed; service-worker startup and reset cancellation must be verified in the published deployment as well as local tests.
