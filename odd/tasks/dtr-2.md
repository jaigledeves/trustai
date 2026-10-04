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
- [x] B2 - dtr-2 in dtr-core (route: delegated (2+ non-trivial files); `enrichment.asset` always present with optional `filename`)
- [x] B3 - API emission, shared rebuild, verification of both versions (route: delegated (2+ non-trivial files); emission constant `EMITTED_DTR_SCHEMA_VERSION` in the Prisma asset repository)
- [x] B4 - Upload verification compares the recomputed hash with the certified one (route: delegated)

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
| B2 | d9a87c6 (golden), de62d50, (follow-up) | medium, granted, approved; follow-up makes verifyDtr2Proof total over untrusted input | dtr-1 golden test pinned and passing on unchanged code (hash `1ad1295b...25ce`, cross-checked with Python hashlib). RED: `build.test.ts`/`dtr2.test.ts` failed to load `../src/build.js`, `../src/dtr2-hash.js`. GREEN: 79/79 tests, coverage 100%. dtr-2 golden: coreHash `4e0e672d...4802`, enrichmentHash `b19f7fe9...c514`, anchorHash `9f8c2d77...e0c9`. API typecheck and 288 tests pass. |
| B3 | 9d74d6f, 412947c, (no-filename test) | medium, granted, approved (slice 1fe2fc5..412947c) | RED: 5 unit tests failed on unchanged code (3 confirm-review dtr-2, 2 verify-document dtr-2). GREEN: API 294 passed / 1 skipped, typecheck clean; dtr-core build clean; e2e 68 passed / 1 failed (known flake S-DTR-18 "Timed out waiting for analyze-document") / 2 skipped; certification-flow 2/2 (dtr-2 anchors and verifies on Anvil); S-DTR-1 and S-PV-6 pin anchorHash. Web 355 tests, typecheck clean. Concern: POST verify does not compare the recomputed hash with the stored canonicalHash. |
| B4 | (pending commit) | pending | RED: 5 new verify-document unit tests failed on unchanged code (dtr-2/dtr-1 altered analysis, READY/ANCHORING mismatch, null stored hash -> VALID/PENDING_ANCHOR instead of INVALID_RECORD). GREEN: API 302 passed / 1 skipped, typecheck clean; dtr-core build clean; e2e 69 passed / 1 failed (known flake S-DTR-18) / 2 skipped, including new S-PV-2b (aiSummary altered via Prisma -> INVALID_RECORD). Upload fixtures now store the hash dtr-core computes; golden test stores the literal golden hash. |

## Open concern

Partly resolved in B4: upload verification returns INVALID_RECORD when the recomputed hash differs from the stored canonicalHash (record altered after certification).

Still open, chain-side and pre-existing:
- A CERTIFIED record whose certified hash is not found on-chain still gets verdict VALID; only `chainAnchor.anchored` is false.
- When the RPC read fails, `chainAnchor` falls back to the DB Anchor status, flagged with `chainReadUnavailable`.

Both belong to phase C (verification independent of the provider), where the browser reads the chain directly.

## Next step

Open PR.
