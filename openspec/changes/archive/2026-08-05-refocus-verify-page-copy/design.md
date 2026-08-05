# Design: Refocus Verify Page Copy

## Technical Approach

Copy/UI-only, confined to `apps/web`. `verify.ts` becomes the sole display
source of truth for verdict copy and the eIDAS disclaimer (Option W,
**ADR-009**); `apps/api`'s `EXPLANATIONS`/`EIDAS_DISCLAIMER` stay untouched,
legacy-only on the wire. Three Server Components get copy-only edits;
`ClientHashRecompute.tsx` (already `'use client'`) gains a native
`<details>` — no new client boundary.

## Architecture Decisions

| Question | Decision | Rationale |
|---|---|---|
| Verdict copy shape | Single `verdicts.*.message`, no split | Avoids a 3rd text block; matches existing one-title-one-message render |
| Explanation block | **Dropped entirely** | Only consumer was `HashOnlyCard`; fold intent into `message`, not a 4th field |
| Disclaimer placement | New top-level `legal` group | Makes "treat as legal text" explicit; `explanationLabel` removed, `disclaimerLabel` moves here |
| Pending sign-off marker | Internal source comment only | A 2nd "not finalized" caveat on an honest disclaimer adds doubt for no RF-045/eIDAS benefit |
| Recompute disclosure trigger | New `recompute.caveatLabel` | Mirrors `how.technicalDetailLabel` — `<summary>` text needs its own key |
| API string on the wire | Untouched, legacy per ADR-009 | Zero `apps/api` blast radius or `strict_tdd` cost with no display consumer |

## Dictionary Shape Changes (`verify.ts`)

| Field | Status | Note |
|---|---|---|
| `verdicts.{V}.title` | unchanged | Keep the 4 existing titles |
| `verdicts.{V}.message` | **reworded** | Plain language, no bare "DTR"/"hash canónico"/"SHA-256"; one sentence; final wording in `apply` |
| `landing.explanationLabel` | **removed** | Explanation block dropped from `HashOnlyCard` |
| `landing.disclaimerLabel` | **moved** → `legal.disclaimerLabel` | Same heading text, new group |
| `legal.disclaimer` | **new** | Names eIDAS/"firma electrónica cualificada"; states integrity + AI-analysis provenance only; **no authorship/ownership claim**; pending-sign-off is a source comment (ADR-009), never rendered |
| `page.badge` | **reworded** | Testnet-as-strength, mirrors `landingDictionary.hero.badge`; must still name Base Sepolia/testnet |
| `page.disabledMessage` (flat) | → `page.disabled.message` + `page.disabled.homeLinkLabel` | Component adds a real `<Link href="/">` (no retry action exists; recovery = a way out) |
| `recompute.caveat` | unchanged field, content may tighten (drop dead-end dtr-core doc reference) | Now lives inside `<details>` |
| `recompute.caveatLabel` | **new** | `<summary>` trigger text |
| `notFound.title` | **new** group | Link-specific "broken/expired" copy, replaces `shellDictionary.errors.notFound` for this route only |

**Shared-surface constraint (confirmed in code):** `VerificationDemo.tsx`
reads `verdicts[key].title`/`.message` directly — both stay present and
non-empty. It does **not** read `verify.ts`'s `recompute.caveat` (its own
independent `landingDictionary.verificationDemo.recompute.caveat`) — the
`<details>` wrap has zero landing blast radius.

## Component Changes

| File | Change |
|---|---|
| `HashOnlyCard.tsx` | Remove the `explanationLabel`/`result.explanation` `<div>` entirely. Re-source disclaimer: `t.disclaimerLabel`→`legal.disclaimerLabel`, `result.disclaimer`→`legal.disclaimer`. Badge/pill/tx row/`verifiedAt` untouched. Stays Server; DTO type unchanged |
| `ClientHashRecompute.tsx` | Wrap the caveat `<p>` in `<details><summary>{recompute.caveatLabel}</summary><p>{recompute.caveat}</p></details>`, `HowItWorks.tsx`/`Faq.tsx` pattern. `title`/`hashLabel`/hash stay outside |
| `not-found.tsx` | `shellDictionary.errors.notFound` → `verifyDictionary.notFound.title`. Recovery link keeps `shellDictionary.appName` (brand wordmark, not error copy) |
| `page.tsx` (disabled branch) | `{t.disabledMessage}` → `{t.disabled.message}` + new `<Link href="/">{t.disabled.homeLinkLabel}</Link>` |

## Testing Strategy (strict_tdd — RED before GREEN)

| Order | File | Change |
|---|---|---|
| 1 RED | `dictionaries.test.ts` | New verify audit: no `verdicts.*.message` matches `/\bDTR\b/i`/`SHA-256`; `legal.disclaimer` matches eIDAS/"firma electrónica cualificada", never `/autor\|pertenece\|propiedad/i`; `recompute.caveat` still matches the existing no-reconstruction regex; leaf-value guard auto-covers new leaves (no edit) |
| 2 GREEN | `verify.ts` | Apply shape/value changes; makes step 1 pass |
| 3 RED | `HashOnlyCard.test.tsx` | Mock `explanation`/`disclaimer` distinctively, assert `queryByText` finds neither; assert `legal.disclaimer` + reworded `verdicts.VALID.message` appear |
| 4 GREEN | `HashOnlyCard.tsx` | Remove explanation block, repoint disclaimer source |
| 5 RED | `ClientHashRecompute.test.tsx` | Caveat assertion (line 64) first asserts hidden pre-toggle, visible after clicking `getByText(caveatLabel)` |
| 6 GREEN | `ClientHashRecompute.tsx` | Add `<details>/<summary>` wrapper |
| 7 RED | `not-found.test.tsx` | Repoint `shellDictionary.errors.notFound` → `verifyDictionary.notFound.title` |
| 8 GREEN | `not-found.tsx` | Repoint the key |
| 9 RED | `page.test.tsx` (disabled test, ~line 40) | Repoint literal to `page.disabled.message`; assert the home recovery link |
| 10 GREEN | `page.tsx` | Wire `page.disabled.message` + `homeLinkLabel` Link |
| confirm | `VerificationDemo.test.tsx` | Unmodified — reads `verdicts.*` live, stays green with reworded `message` |
| confirm | `apps/api` suites | Zero changes/reruns — no DTO/controller/use-case touched |

## Honesty Guardrails (restated)

- **INV-41**: no `analysis` field on `VerifyHashResponse` — untouched.
- **No hash-reconstruction claim**: relocated `recompute.caveat` still asserts independent file-hash computation only, never on-chain reconstruction.
- **No authorship claim**: `legal.disclaimer` certifies integrity + AI-analysis provenance only.
- **Badge honesty**: reframing still names Base Sepolia/testnet — never implies mainnet/production.
- **GET/POST 404 asymmetry**: untouched — GET 404s via `not-found.tsx`, POST always 200s with `INVALID_RECORD`.

## Migration / Rollout

No migration required. Single-purpose commit(s): `verify.ts`, `dictionaries.test.ts`, the 3 components(+tests), `docs/adr/ADR-009-*.md`, `docs/architecture/decisions.md`. Plain `git revert`; no `apps/api` state to unwind.

## Open Questions

None blocking. Final wording for `verdicts.*.message`/`legal.disclaimer` (constraints only, above) is authored in `apply`; the disclaimer needs product/legal sign-off before its pending-marker comment is removed (ADR-009 gate).
