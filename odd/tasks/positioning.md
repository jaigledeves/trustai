# Feature: positioning

**Locator:** `odd/tasks/positioning.md` (Engram mirror: `odd/positioning/tasks`)
**Branch:** `feat/phase-d-positioning`
**Source:** `docs/14-Roadmap.md`, phase D.

## Objective

Make every public claim match what a DTR actually proves, after phases A to C.

## Scope

- D1: landing and verification copy without absolutes ("imposible de falsificar",
  "permanente", "para siempre"); state that any later modification is
  cryptographically detectable; distinguish the block timestamp from a
  certified time; mention independent verification (browser, CLI) for dtr-2.
- D2: positioning document (what a DTR proves and does not prove; comparison
  with RFC 3161, PKI/FEA, OpenTimestamps, Blockcerts/VC, C2PA, eIDAS 2.0),
  backed by primary sources.
- D3: extend `docs/13-Security.md` with key management, upload security and
  organization isolation (controls already implemented).

Out of scope: TFM slides (`apps/web/public/slides`), new features.

## Constraints

- Copy in neutral professional Spanish; no legal claims beyond the sources.
- No eIDAS-qualified claims: Ancrux is not a qualified trust service.

## Checklist

- [x] D1 - Copy review (route: delegated writer)
- [x] D2 - Positioning document (route: research worker, then delegated writer)
- [x] D3 - Security doc extension (route: delegated writer)

## Checks

- apps/web: test, typecheck, lint (copy changes may break snapshot/text tests)
- Docs: structural readback, links resolve

## Progress

| Task | Commit | Review tier | Notes |
|---|---|---|---|
| D1 | (pending commit) | pending | 20 overclaim/inaccurate strings rewritten in 4 dictionaries (landing, verify, glossary, certify); honest-claims guard added to `dictionaries.test.ts` (RED 4 failing on old copy, GREEN after); web test 67 files/379 tests, typecheck and lint clean (1 pre-existing warning in generated `coverage/`) |
| D2 | (pending commit) | pending | `docs/15-Posicionamiento.md` from the verified research report (S1-S19); hedges kept (partially verified, unverified, inference, assumption); overclaims fixed in `docs/01-Product-Vision.md` (blockchain "certifica" -> later changes detectable; old full-DTR anchoring -> dtr-2 `anchorHash`, existence no later than the block). Structural readback only (passive docs). |
| D3 | (pending commit) | pending | `docs/13-Security.md` §7-§11: keys and secrets, upload security, organization isolation, rate limiting/proxy/CORS/headers, verification integrity; every cited path checked with `git ls-files`. Structural readback only (passive docs). |

## Next step

Open PR for phase D.
