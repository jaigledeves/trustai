# Feature: independent-verification

**Locator:** `odd/tasks/independent-verification.md` (Engram mirror: `odd/independent-verification/tasks`)
**Source:** `docs/14-Roadmap.md`, phase C.

## Objective

Let anyone verify a `dtr-2` record without trusting Ancrux: recompute the
hashes from the file and a public proof, and read the anchor directly from
the AnchorRegistry contract on Base Sepolia, in the browser or from a CLI.

## Decisions (user, 2026-10-04)

- Independent verification (browser, proof package, CLI) is for `dtr-2`
  only. A `dtr-1` record is shown as a legacy record verifiable by the
  server, with its anchor link; no AI analysis is exposed.
- Server verdict: when the chain read succeeds and the certified hash is not
  anchored, the verdict is `INVALID_RECORD` (no analysis). When the chain read
  fails, keep `VALID` flagged `chainReadUnavailable`.

## Scope and order

- C0 - Verdict semantics above (API, GET and POST).
- C1 - Persist chainId, blockNumber and contract address with each anchor;
  share the AnchorRegistry ABI and deployment constants in dtr-core.
- C3 - Public proof package for `dtr-2` (no AI analysis), downloadable as JSON,
  with a documented, versioned format (ADR).
- C2 + C4 - Browser verification with a step-by-step diagnosis view; RPC
  origin added to the CSP.
- C5 - CLI verifier on dtr-core, no API dependency.

## Delivery

- Strategy: one PR per step, merged to main in order (C0+C1, C3, C2+C4, C5).
- Forecast: about 1,500 to 2,000 authored lines in total.

## Checklist

- [x] C0 - Server verdict when the chain denies the anchor (route: delegated, with C1)
- [x] C1 - Full anchor data + shared contract constants (route: delegated)
- [x] C3 - Proof package endpoint and format (route: delegated; 2+ non-trivial files across dtr-core, API and docs)
- [x] C2/C4 - Browser verification and diagnosis view (route: delegated; 2+ non-trivial files across lib, components, CSP and docs)
- [ ] C5 - CLI verifier (route: TBD)

## Checks

- `pnpm --filter @trustai/dtr-core test`, `build`
- apps/api: unit tests, typecheck, e2e (Docker + Anvil)
- apps/web: tests, typecheck, lint, build

## Progress

| Task | Commit | Review tier | Notes |
|---|---|---|---|
| C0 | 337c02b | medium, granted, approved (slice with C1) | Chain read ok + hash not anchored -> INVALID_RECORD (GET and POST), attempt logged, warn with record id only; RPC failure keeps VALID + chainReadUnavailable. RED 2 failing -> GREEN 30/30 in verify-document spec. |
| C1 | c36ec63 | medium, granted, approved (slice with C0) | dtr-core exports AnchorRegistry ABI + Base Sepolia deployment (API re-exports it). Anchor gets nullable chainId, blockNumber (BigInt), contractAddress via db push; confirm-anchor persists all three, AlreadyAnchored persists chain + contract with null blockNumber. RED 7 failing -> GREEN; e2e certification-flow asserts the new columns. |
| C3 | (pending commit) | pending | dtr-core `ProofPackageV1Schema` (`ancrux-proof-1`, strict) + `verifyProofPackageAgainstFile`; `GET /public/verify/:id/proof` via `GetProofPackageUseCase` (dtr-2 CERTIFIED only; dtr-1/not anchored/tampered/unknown network -> 409; unknown -> 404; `download=1` attachment). RED 17 (dtr-core) + 15 (use case, missing module) + 6 (controller) -> GREEN; e2e S-PV-PROOF verifies the package against the file and `isAnchored` on Anvil. ADR-016. |
| C2/C4 | (pending commit) | pending | Pure orchestrator `lib/verify/independent-verification.ts` (steps file, proof, coreHash, anchorHash, network, contract, anchored; never throws; outcomes verified/failed/legacy/not_found/unavailable) + viem `chain-reader.ts` (lazy-loaded) + `getProofPackage` (409 dtr-1 -> legacy) + `IndependentVerificationPanel` on `/verify/[id]`; `NEXT_PUBLIC_CHAIN_RPC_URL` origin in CSP `connect-src`. RED: orchestrator suite (missing module) + 6 client + 3 CSP + component suite -> GREEN 387/387 web tests; live smoke vs sepolia.base.org: chainId 84532, random hash not anchored. |

## Notes for later steps

- C3 serializes `Anchor.blockNumber` (Prisma BigInt) as a decimal string in the proof package (done).
- C2/C5 should consume `ProofPackageV1Schema` and `verifyProofPackageAgainstFile` from dtr-core, then read `isAnchored(anchorHash)` on `anchor.contractAddress` at `anchor.chainId`.
- Known limitation: the chain-denial verdict (C0) reads the contract configured in the API, not the `contractAddress` stored with each anchor. AnchorRegistry is immutable and no migration is planned (ADR-003); if the contract ever changes, verification must use the stored address and chainId.

## Next step

Open PR for C2/C4, then C5.
