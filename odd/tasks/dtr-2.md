# Feature: dtr-2

**Locator:** `odd/tasks/dtr-2.md` (Engram mirror: `odd/dtr-2/tasks`)
**Branch:** `feat/dtr-2`
**Source:** `docs/14-Roadmap.md`, phase B.

## Objective

Split the Digital Trust Record into a Trust Core that anyone can rebuild
from the file and an AI enrichment, so a third party can verify an anchor
without trusting the content Ancrux serves.

## Problem and why

In `dtr-1` the anchored value is the SHA-256 of the whole canonical record,
AI summary included. Verifying it requires the exact AI output stored by
Ancrux. Phase C (client-side verification, proof package, CLI) needs a
record whose core is reproducible from the file alone.

## Decision (user, 2026-10-04)

Anchor a combined envelope:
`anchorHash = sha256(JCS({ schemaVersion: "dtr-2", issuedAt, coreHash, enrichmentHash }))`.
Rejected: anchoring only the core, and two separate anchors.

## Scope

- B1: ADR-015 superseding ADR-001.
- B2: `dtr-2` in `packages/dtr-core` (schema, core/enrichment/anchor hashing,
  version dispatcher for parse and verify), keeping `dtr-1` readable and
  verifiable byte-for-byte.
- B3: API emits `dtr-2` for new records; the duplicated record rebuild
  (confirm-review and verify-document) moves into dtr-core; public
  verification handles both versions; docs updated.

Out of scope: phase C (proof package, client-side recompute, CLI), contract
changes (AnchorRegistry is immutable), migrating anchored `dtr-1` records.

## Constraints

- Existing `dtr-1` records keep their exact canonical hash (golden-hash tests).
- No contract change: one `bytes32` per anchor.
- Canonicalization (in-house JCS) is unchanged.

## Delivery

- Forecast: about 700 to 900 authored changed lines (B2 ~350, B3 ~450).
- Strategy: `ask-on-risk`; slice per task (B1, B2, B3) as chained PRs if the
  running count passes about 400 lines.

## Checklist

- [x] B1 - ADR-015 (route: inline, single document; ADR-001 marked superseded; docs index completed with ADR-012..015)
- [ ] B2 - dtr-2 in dtr-core (route: TBD)
- [ ] B3 - API emission, shared rebuild, verification of both versions (route: TBD)

## Acceptance criteria

- A dtr-1 fixture hashes to a pinned golden value before and after the change.
- dtr-2 coreHash is computable from the file bytes, MIME type and size only.
- Changing any AI field changes enrichmentHash and anchorHash, not coreHash.
- New records are emitted as dtr-2; existing dtr-1 records still verify.

## Checks

- `pnpm --filter @trustai/dtr-core test` (+ coverage threshold 90%)
- `pnpm --filter @trustai/api test`, `typecheck`, `test:e2e`
- `pnpm --filter @trustai/web test`, `typecheck`

## Progress

| Task | Commit | Review tier | Notes |
|---|---|---|---|

## Next step

B2.
