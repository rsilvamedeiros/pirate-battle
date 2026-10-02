# 0005: Submit completed matches through an idempotent outbox

## Status

Proposed

## Date

2026-10-02

## Context

[CHALLENGE.md](../../CHALLENGE.md) §5 requires one history record and one ranking entry per completed match, duplicate-free retries, recovery after refresh, and continued gameplay while submissions are pending. §6 requires local persistence and recovery from timeout after registration. §3 excludes abandoned matches from registration.

## Decision

At the first completed-match transition, generate a matchId in the shell and freeze the submission payload, including player identity, date, score, effective duration, end reason, and configuration snapshot. Persist it in a localStorage outbox before sending; reuse the same matchId and payload for every retry. Abandonment creates no submission.

Use Axios through a TanStack Query mutation to PUT the record to a resource addressed by matchId. The MSW handler performs an upsert keyed by matchId and returns the existing record for repeated submissions without adding another ranking entry. History and ranking derive from the same confirmed records.

Remove an outbox entry only after confirmation. On boot, replay pending entries independently of gameplay and retain manual retry. A timeout after commit leaves the entry pending; retry retrieves the confirmed record. Refresh both query views after confirmation and when their tabs are shown, with cache keys and request handling that prevent older responses replacing newer data.

## Alternatives considered

- Append-only POST without an idempotency key: a lost response followed by retry creates duplicate records.
- POST with an idempotency header and a separate key registry: viable, but PUT to a match resource expresses identity directly and avoids a separate deduplication registry.
- An in-memory retry queue: loses pending submissions on refresh and fails the persistence requirement.

## Consequences

Retries and repeated clicks share one record identity, including after refresh. Storage schema, validation, failure handling, retry policy, player identity, and exact contracts remain to be implemented. PUT and localStorage are proposed choices; the challenge mandates the behavior rather than these mechanisms.
