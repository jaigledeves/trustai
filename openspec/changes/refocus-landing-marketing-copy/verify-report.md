# Verification Report

**Change**: refocus-landing-marketing-copy
**Branch**: feat/landing-copy-refocus
**Version**: N/A (re-verified after Phase 7: purely visual "Proposal B — spec sheet" refinement)
**Mode**: Strict TDD (openspec filesystem persistence)

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 25 (across 7 phases; Phase 7 added 5 visual-refinement tasks) |
| Tasks complete | 25 |
| Tasks incomplete | 0 |

All 25 checkboxes in `tasks.md` are marked `[x]`, including the 5 new Phase 7 tasks (7.1–7.5). Each was independently re-verified against source (not just trusted from the checkbox) — see Correctness table below.

## Build & Tests Execution

**Build**: ✅ Passed
```text
$ pnpm --filter @trustai/web build
▲ Next.js 16.2.10 (Turbopack)
✓ Compiled successfully in 1692ms
  Running TypeScript ... Finished TypeScript in 3.8s
✓ Generating static pages using 15 workers (11/11)

Route (app)
┌ ○ /                         <- landing route, still prerendered as STATIC content
├ ○ /_not-found
├ ƒ /api/...  ...
```
`/` is still listed as `○ (Static)` after the visual restyle — confirms the spec-sheet grid + datasheet contract card added zero client JS (`tsc` succeeding also proves all 11 imported `lucide-react` icon names resolve against the installed `lucide-react@0.468.0`, since an unresolved icon import would be a type error).

**Tests**: ✅ 226 passed / ❌ 0 failed / ⚠️ 0 skipped (52 test files) — up from 225 (new test #11)
```text
$ pnpm --filter @trustai/web test
 ✓ dictionaries/es/dictionaries.test.ts (19 tests) 49ms
 ✓ components/landing/useClientBoundary.test.ts (10 tests) 18ms
 ✓ app/page.test.tsx (3 tests) 2667ms
 ...
 Test Files  52 passed (52)
      Tests  226 passed (226)
```
(The two `stderr` blocks under `app/error.test.tsx` are intentional `console.error` output asserted by that pre-existing test — both its tests pass. Unrelated to this change.)

**Lint**: ✅ No errors (`pnpm --filter @trustai/web lint` → clean `eslint` run)

**Typecheck**: ✅ No errors (`pnpm --filter @trustai/web typecheck` → clean `tsc --noEmit` run)

**Coverage**: ➖ Not applicable — `openspec/config.yaml` sets `verify.coverage_threshold: 0` for this project; not run.

## Spec Compliance Matrix

> Delta spec (`specs/public-landing/spec.md`) is intentionally UNCHANGED by Phase 7 (purely visual) — re-read in full this pass, confirmed no diff. All scenarios below are re-verified against the current visual markup, not just the copy.

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Accurate Anchoring Copy | HowItWorks states canonical-serialization hash accurately | `dictionaries.test.ts` > "7. HowItWorks technical detail states the canonical-serialization hash is anchored" (`collectLeafValues(how.technicalDetail)` now also walks the unchanged `contractLabel` leaf — no false positive, no test edit needed) | ✅ COMPLIANT |
| Accurate Anchoring Copy | No "file hash is anchored" claim anywhere | `dictionaries.test.ts` > "2. accurate anchoring: hero/how/faq copy never claims the file's hash is anchored" | ✅ COMPLIANT |
| Content-Audit Accuracy | Use-case copy avoids authorship/ownership claims | `dictionaries.test.ts` > "4. use-case copy never asserts authorship, ownership, or issuer legitimacy" | ✅ COMPLIANT |
| Content-Audit Accuracy | FAQ has no pricing promise | `dictionaries.test.ts` > "5. faq copy never promises pricing or future paid plans" | ✅ COMPLIANT |
| Content-Audit Accuracy | HowItWorks names the real encryption algorithm | `dictionaries.test.ts` > "6. HowItWorks technical detail names the real encryption algorithm" | ✅ COMPLIANT |
| (structural) `technicalDetail.items` completeness | Every item has non-empty `term`/`desc` | `dictionaries.test.ts` > "10. technicalDetail.items is a non-empty array of complete term/desc entries" | ✅ COMPLIANT |
| (structural, new) `technicalDetail.contractLabel` completeness | `contractLabel` is a non-empty string | `dictionaries.test.ts` > "11. technicalDetail.contractLabel is a non-empty string" | ✅ COMPLIANT |

**Compliance summary**: 7/7 scenarios compliant (both MODIFIED requirements' scenarios still green against the now-visually-restyled structured shape, plus both structural completeness tests)

## Correctness (Static Evidence, cited file:line)

| # | Check | Status | Evidence |
|---|---|---|---|
| C1 | Anchoring claim text UNCHANGED, only the container changed from `<dl>` to a mini-card grid | ✅ Implemented | `landing.ts:106-112` (`items[3]`/`items[4]`, "Hash SHA-256"/"Anclaje on-chain") text is byte-identical to the prior pass (confirmed by re-reading and diffing against the previous verify report's C1 quote); `HowItWorks.tsx:79-97` now renders each item as a mini-card (`rounded-xl border ... p-4` with an icon chip) instead of `<dt>/<dd>`, but the rendered strings — `{item.term}`/`{item.desc}` — are the exact same dictionary values. |
| C2 | AES-256-GCM text unchanged | ✅ Implemented | `landing.ts:94-96` (`items[0]`, "Cifrado en reposo") — identical text to prior pass, now rendered inside a mini-card at `HowItWorks.tsx:82-95` with a `Lock` icon (`DETAIL_ICONS[0]`, `HowItWorks.tsx:21`). |
| C3 | No "the file's hash is anchored" phrasing anywhere in hero/how/faq | ✅ Implemented | Test `dictionaries.test.ts:92-104` (#2) re-passes with zero test-code changes; `collectLeafValues(how)` recurses into the new `contractLabel` leaf (`landing.ts:120`, "AnchorRegistry · Base Sepolia") automatically — that string doesn't match any of the 3 banned patterns either. |
| C4 | Two-hash distinction (document's own SHA-256 vs. the DTR's canonical hash) preserved | ✅ Implemented | `landing.ts:98-100` ("Qué contiene el DTR") vs. `landing.ts:106-108` ("Hash SHA-256") — text unchanged from the prior pass, still technically accurate against `packages/dtr-core/src/schema.ts` (`asset.sha256`) and `hash.ts`/`verify.ts` (`computeCanonicalHash`/`canonicalHash`), re-confirmed. |
| C5 | Independent-verification item still framed as a capability via dtr-core, not a shipped-UI claim | ✅ Implemented | `landing.ts:114-116` ("Verificable de forma independiente") text unchanged: "dtr-core es una librería abierta (MIT)... Cualquiera puede recalcular el hash canónico y consultar su anclaje en cualquier nodo RPC, sin confiar en nosotros." Third-person capability framing, rendered in the grid with a `ShieldCheck` icon (`DETAIL_ICONS[5]`) — icon choice doesn't alter the claim's meaning. |
| C6 | Only functional client recompute remains on `/verify/[id]` | ✅ Implemented | Grep for `use client` across `apps/web/components/landing/` still returns exactly one match: `VerificationDemo.tsx:1`. `ClientHashRecompute.test.tsx` (5/5 passing) confirms the real interactive recompute is untouched and still lives on `/verify/[id]`. |
| C7 | useCases / faq unaffected | ✅ Implemented | `landing.ts:139-170` (useCases), `:196-225` (faq) — zero hunks in this diff touch either group. |
| C8 | Terminology Lock: exact DTR term still present | ✅ Implemented | `landing.ts:51` (`hero.card.label`) carries `"Registro Digital de Confianza (DTR)"` verbatim, untouched. |
| C9 | Only VerificationDemo ships client JS — HowItWorks.tsx did NOT gain `'use client'` | ✅ Implemented | Full re-read of `HowItWorks.tsx` (129 lines) confirms no `'use client'` directive anywhere, despite the larger diff (+63/-1 lines, 11 new icon imports). The new grid (`:78-98`) and datasheet card (`:100-124`) are plain server-rendered `<div>`/`<a>` elements — no event handlers, no hooks, no interactivity. Build output confirms `/` still prerenders `○ (Static)`. |
| C10 | RNF-041: all visible text dictionary-sourced; truncated address is computed data, not marketing copy; contract URL is config-driven | ✅ Implemented | `HowItWorks.tsx:107` (`{t.technicalDetail.contractLabel}`) and `:121` (`{t.technicalDetail.contractLinkLabel}`) are dictionary reads. `TRUNCATED_CONTRACT` (`:23`) is a module-level `const` **derived** from `ANCHOR_CONTRACT.slice(...)` — a computed data transform of the real contract address, not authored copy, so it correctly lives outside the dictionary (same category as e.g. a formatted date or a truncated hash value elsewhere in the app). `contractUrl` (`HowItWorks.tsx:116`, imported from `./contractUrl`) resolves via `config.chainExplorerBaseUrl` (`apps/web/lib/config.ts:42-44`, defaults to `https://sepolia.basescan.org`) — config-driven, not hardcoded. |
| C11 | New `contractLabel` field is dictionary-sourced, not inline | ✅ Implemented | `landing.ts:120`: `contractLabel: "AnchorRegistry · Base Sepolia"`. `HowItWorks.tsx:107` reads `{t.technicalDetail.contractLabel}` — no inline literal. |
| C12 | No new dependencies | ✅ Implemented | Diff shows only additional named imports from the already-installed `lucide-react` (`package.json`: `"lucide-react": "^0.468.0"`, unchanged); no new `package.json` dependency entries. |
| C13 | Icon-to-item order correctness | ✅ Implemented | `HowItWorks.tsx:19-21` comment states icon order matches `items` order (Cifrado→Lock, DTR contents→FileJson, canonical serialization→Braces, hash→Hash, on-chain anchor→Anchor, independent verification→ShieldCheck); `DETAIL_ICONS[i]` is indexed by the same `i` used to `.map()` over `t.technicalDetail.items` (`:79-80`) — icons align to their corresponding item by construction, not by guesswork. |
| C14 | Hero, terminology, no-duplicated-headline — all unaffected by this visual-only pass | ✅ Implemented | `git diff HEAD -- apps/web/dictionaries/es/landing.ts` for this round touches only `how.technicalDetail.contractLabel` (one new line) — zero hunks in `hero.*` or `verificationDemo.title`. |

## Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| `technicalDetail.items` restyled from `<dl>` to a `grid gap-3 sm:grid-cols-2` of mini-cards with icon chips | ✅ Yes | `HowItWorks.tsx:78-98`; matches design.md's Component Changes section exactly. |
| Icons from module-level `DETAIL_ICONS`, same pattern as `STEP_ICONS` | ✅ Yes | `HowItWorks.tsx:21` — same array-by-index pattern already used for `STEP_ICONS` (`:17`). |
| New full-width "datasheet" contract card below the grid | ✅ Yes | `HowItWorks.tsx:100-124` — `contractLabel` + truncated address on the left, pill-style link with `ArrowUpRight` on the right, exactly as design.md's Component Changes section describes. |
| `ANCHOR_CONTRACT` truncation computed in-component, never hardcoded | ✅ Yes | `HowItWorks.tsx:23`: `` `${ANCHOR_CONTRACT.slice(0, 6)}…${ANCHOR_CONTRACT.slice(-4)}` `` — derived from the imported constant, matches design.md verbatim. |
| Stays a Server Component, no `'use client'`, no new dependencies | ✅ Yes | Confirmed via grep (C9) and `package.json` diff (C12). |
| `dictionaries.test.ts` #11 added (RED→GREEN) for `contractLabel`; #6/#7/#10 untouched and still pass | ✅ Yes | `dictionaries.test.ts:155-159` (#11); #6/#7/#10 (`:132-153`) have zero diff in this round yet still pass against the new leaf. |
| `design.md` updated for `contractLabel` + spec-sheet/datasheet layout; no delta-spec change | ✅ Yes | `design.md`'s Dictionary Shape Changes (`:38`), Component Changes (`:53-59`), and Testing Strategy (`:70-71`) sections all describe the Phase 7 shape; `specs/public-landing/spec.md` re-read in full — confirmed byte-identical to the prior pass (no hunk). |

## TDD Compliance

> **Note on evidence source** (unchanged across all 3 verify passes): pure openspec filesystem mode has no defined `apply-progress` artifact file per `openspec-convention.md`; TDD evidence for the original cycle and both refinements lives narratively in `tasks.md` (7.1 documents the RED addition of #11, 7.2 documents the GREEN dictionary field). Not a defect — reconstructed and cross-checked against the current test run below.

| Check | Result | Details |
|---|---|---|
| TDD Evidence reported | ⚠️ Partial | Found narratively in `tasks.md` Phase 7 (7.1–7.2); same structural gap as both prior cycles, not a regression. |
| All tasks have tests | ✅ | New leaf `technicalDetail.contractLabel` gets its own dedicated test (#11, `dictionaries.test.ts:155-159`) rather than relying solely on the leaf-value guard — stronger triangulation than the auto-cover pattern used for the Phase 6 leaves. |
| RED confirmed (tests exist) | ✅ | Test #11 exists at `dictionaries.test.ts:155-159`. |
| GREEN confirmed (tests pass) | ✅ | Full suite run above: all 226 tests pass, including `dictionaries.test.ts` (19/19) and specifically #11. |
| Triangulation adequate | ✅ | #6/#7/#10/#11 now cover 4 distinct facets of the structured `technicalDetail` object (algorithm-naming, canonical-hash-claim, items-completeness, contractLabel-completeness). |
| Safety Net for modified files | ✅ | `dictionaries.test.ts` pre-existing tests #1–#10 all still pass alongside new #11 — confirms zero regression from the visual restyle (which touched only `HowItWorks.tsx` rendering, not any dictionary content besides the additive `contractLabel`). |

**TDD Compliance**: 5/6 checks fully passed, 1 partial (same pre-existing structural artifact-location gap, not a new issue)

---

### Test Layer Distribution

| Layer | Tests | Files | Tools |
|---|---|---|---|
| Unit | 19 | 1 (`dictionaries.test.ts`, +1 test vs. prior pass) | Vitest |
| Integration | 10 | 1 (`useClientBoundary.test.ts` — re-ran clean against the visually-restyled `HowItWorks.tsx`, which is now 129 lines and imports 11 icons) | Vitest + Node `fs` |
| Integration (render) | 3 | 1 (`page.test.tsx` — renders full landing page tree, asserts section order incl. `HowItWorks`) | Vitest + Testing Library |
| E2E | 0 | 0 | Not exercised by this change |
| **Total (change-relevant)** | **32** | **3** | |

No dedicated component test was added for `HowItWorks.tsx`'s visual restyle — consistent with the established no-precedent pattern; `page.test.tsx` (renders the full tree without error, proving all 11 icon imports and the new grid/datasheet JSX are valid) plus the dictionary-completeness tests (#10, #11) cover the changed surface.

---

### Changed File Coverage

Coverage analysis skipped — `coverage_threshold: 0` in `openspec/config.yaml`.

---

### Assertion Quality

✅ All assertions verify real behavior. Re-scanned `dictionaries.test.ts` (only test file modified in this round): new test #11 (`dictionaries.test.ts:155-159`) asserts a real, non-trivial condition (`trim().length > 0`) against real exported dictionary data — not a mock, not a tautology. No loop is involved (single value), so no ghost-loop risk.

**Assertion quality**: 0 CRITICAL, 0 WARNING

---

### Quality Metrics

**Linter**: ✅ No errors
**Type Checker**: ✅ No errors (also proves all 11 `lucide-react` icon imports resolve against `lucide-react@0.468.0`)

## Issues Found

**CRITICAL**: None

**WARNING**:
- (carried over, unchanged across all 3 verify passes) No persisted `apply-progress` artifact exists for this change (openspec filesystem mode has no defined file for it per `openspec-convention.md`) — TDD evidence for the original cycle and both refinements lives only inside `tasks.md`'s prose. Not a defect in this change's implementation (verified correct by re-running tests all 3 times), but a gap in the SDD tooling's openspec-mode convention worth fixing.

**SUGGESTION**: None

## Verdict

**PASS**

All 25 tasks (15 original + 5 Phase 6 + 5 Phase 7 visual-refinement tasks) are genuinely complete, re-verified against current source. The Phase 7 "Proposal B — spec sheet" restyle is confirmed purely visual: every AES-256-GCM and SHA-256/RFC-8785-canonical-serialization string is byte-identical to the prior verified pass, only their container changed from a `<dl>` list to an icon-chip mini-card grid plus a full-width datasheet contract card. Both MODIFIED spec requirements still hold with passing covering tests (`specs/public-landing/spec.md` re-confirmed unchanged, as intended). The independent-verification item remains correctly framed as a third-party capability, not a shipped-UI claim, and the only functional client-side hash recompute remains on `/verify/[id]`'s `ClientHashRecompute` (`HowItWorks.tsx` still has zero `'use client'`). RNF-041 holds: `contractLabel` is dictionary-sourced, the truncated contract address is a computed data transform of the real `ANCHOR_CONTRACT` constant (not hardcoded marketing copy), and the contract URL remains config-driven via the shared `contractUrl` module. Terminology Lock and the no-duplicated-headline check remain intact and untouched by this round. Full verification gate (test/lint/typecheck/build) is green with zero failures — 226/226 tests, and `/` still prerenders as a Static Server Component route.
