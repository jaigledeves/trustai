# Tasks: Refocus Landing Marketing Copy

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~60–80 (copy-only, 4 files) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk (default) |
| Chain strategy | pending (not needed — low risk) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | RED tests + dictionary + components + verification | PR 1 | Single-purpose commit(s), plain `git revert` |

## Phase 1: Tests First (RED) — `dictionaries.test.ts`

- [x] 1.1 Repoint test #6 (L132) from `how.steps[0].description` to `how.technicalDetail`, matching `/AES-256-GCM/`.
- [x] 1.2 Repoint test #7 (L136) from `how.steps[2].description` to `how.technicalDetail`, matching `/canónic/i` and `/SHA-256/`.
- [x] 1.3 Run `pnpm --filter @trustai/web test` — confirm #6/#7 fail (RED), all else green.
- [x] 1.4 Confirm no new test needed for `hero.eyebrow`/`hero.ctaMicrocopy`/`how.technicalDetailLabel`: `collectLeafValues` (#2) and the leaf-value-guard `it.each` auto-cover any new leaf added in Phase 2.

## Phase 2: GREEN — Dictionary (`landing.ts`)

- [x] 2.1 `hero`: add `eyebrow` (pain line) and `ctaMicrocopy` (reassurance, no "2 minutos"/immediacy claim — see 4.4); reword `badge` as a strength (echo `faq.items`' "sin costos de red"); reword `title`/`subtitle` to drop "blockchain"/"hash"/"SHA-256". Leave `card.*`, `valueProps`, `primaryCta`, `secondaryCta` untouched.
- [x] 2.2 `how`: add `technicalDetail` (AES-256-GCM + SHA-256-of-canonical-RFC-8785-serialization, moved verbatim not reworded) and `technicalDetailLabel` (`<summary>` text); reword `steps[0].description` to drop "AES-256-GCM" and `steps[2].description` to drop "SHA-256"/"canónica", keeping benefit framing. Keep `steps` as the `[string,string,string,string]` tuple.
- [x] 2.3 Run `pnpm --filter @trustai/web test` — #6/#7 GREEN; leaf-value guard, terminology lock (#1), anchoring/content-audit (#2) still pass.

## Phase 3: GREEN — Components

- [x] 3.1 `Hero.tsx`: insert `<p>{t.eyebrow}</p>` between the badge `<a>` (L33) and `<h1>` (L35); insert `<p>{t.ctaMicrocopy}</p>` after the CTA `<div>` (L54), before `valueProps` `<ul>`. Leave `hero.card` JSX untouched. Stays a Server Component.
- [x] 3.2 `HowItWorks.tsx`: after `<ol>` closes (L44), add one `<details className="group ...">` reusing `Faq.tsx`'s `group`/`marker:content-none`/`group-open:rotate-45` classes, with `<summary>{t.technicalDetailLabel}</summary>` and `<p>{t.technicalDetail}</p>`. One disclosure, not per-step. Stays a Server Component.

## Phase 4: Verification Gate

- [x] 4.1 Run `pnpm --filter @trustai/web test` — full suite green, incl. `page.test.tsx` and `useClientBoundary.test.ts`.
- [x] 4.2 Run `pnpm --filter @trustai/web lint`.
- [x] 4.3 Run `pnpm --filter @trustai/web typecheck`.
- [x] 4.4 Manual honesty/accuracy review: `how.technicalDetail` accurately names AES-256-GCM and the SHA-256 hash of the canonical RFC 8785 serialization (never "the file's hash"); `hero.ctaMicrocopy` makes no immediacy claim (no "2 minutos") given `/register`'s email-verification gate behind a stub notifier.

## Phase 5: Final Copy Consistency (authored in apply, user-reviewed)

- [x] 5.1 Author final wording for `hero.eyebrow`, `hero.title`/`subtitle`, `hero.badge`, `hero.ctaMicrocopy`, `how.technicalDetail`, `how.technicalDetailLabel` toward the agreed direction (hero headline theme "Nadie tiene que creerte. Pueden comprobarlo."). **Note**: that exact phrase is already `verificationDemo.title` (L89) — do not duplicate verbatim in `hero.title`; pick a distinct headline with the same theme, or reconcile deliberately. Final strings are authored in `sdd-apply` and reviewed by the user before merge.

Resolution: `hero.title` uses "Nadie tiene que creerte. Pueden comprobarlo." (the agreed headline theme) and `verificationDemo.title` was reworded to "Cualquiera puede comprobarlo en segundos." to avoid the verbatim duplication flagged above.

## Phase 6: Refinement — Structured `how.technicalDetail` + Contract Link

Approved scope decision: "structured block + contract link, folded into this cycle" (post-review, before commit).

- [x] 6.1 Repoint `dictionaries.test.ts` #6/#7 (RED) from matching `how.technicalDetail` as a plain string to collecting its leaf strings (`collectLeafValues(how.technicalDetail).join(" ")`) — the leaf-value guard already recurses into nested objects/arrays with zero changes needed. Add new test #10 asserting `how.technicalDetail.items` is a non-empty array with non-empty `term`/`desc` on every entry. Run `pnpm --filter @trustai/web test -- dictionaries.test.ts` — confirm #10 fails (RED), #6/#7/rest still green (they tolerate the pre-refinement string shape via `collectLeafValues`'s primitive passthrough).
- [x] 6.2 (GREEN) Change `landing.ts`'s `how.technicalDetail` from a string to `{ intro, items: { term, desc }[], contractLinkLabel }` with the 6-item structured content (cifrado en reposo, contenido del DTR, serialización canónica RFC 8785, hash SHA-256, anclaje on-chain, verificabilidad independiente vía dtr-core/RPC). Keep `technicalDetailLabel` unchanged. Run tests — #6/#7/#10 GREEN.
- [x] 6.3 Wire `HowItWorks.tsx`: render `technicalDetail.intro` as a `<p>`, `technicalDetail.items` as a `<dl>` of `<dt>{term}</dt><dd>{desc}</dd>` pairs, and a real `<a href={contractUrl} target="_blank" rel="noopener noreferrer">{technicalDetail.contractLinkLabel}</a>` importing `contractUrl` from `./contractUrl` (same source as `Hero`/`Footer`). Stays a Server Component, no `'use client'`.
- [x] 6.4 Update `design.md` (dictionary shape, component rendering, testing strategy, accuracy guardrails) and `specs/public-landing/spec.md` (MODIFIED requirements' wording) to describe `how.technicalDetail` as a structured object rather than a single string. No new requirements added — accuracy invariants unchanged.
- [x] 6.5 Run full gate: `pnpm --filter @trustai/web test`, `lint`, `typecheck`, `build`. Confirm `/` still prerenders as a Server Component route with no new client JS (no `'use client'` added to `HowItWorks.tsx`).

## Phase 7: Visual Refinement — "Proposal B" Spec Sheet

Approved scope decision: turn the disclosure body's `<dl>` list into a scannable grid of mini technical cards plus a full-width datasheet contract card (post-review, before commit).

- [x] 7.1 (RED) Add `dictionaries.test.ts` #11 asserting `how.technicalDetail.contractLabel` is a non-empty string. Confirm it fails.
- [x] 7.2 (GREEN) Add `technicalDetail.contractLabel: "AnchorRegistry · Base Sepolia"` to `landing.ts`. `intro`, `items` (6, term/desc unchanged), and `contractLinkLabel` stay verbatim. Confirm #11 passes.
- [x] 7.3 Rewrite `HowItWorks.tsx`'s disclosure body: `<p>{intro}</p>` + a `grid gap-3 sm:grid-cols-2` of 6 mini-cards (icon chip via `DETAIL_ICONS = [Lock, FileJson, Braces, Hash, Anchor, ShieldCheck]` mapped by index, `term`, `desc`) + a full-width datasheet card (`contractLabel` + truncated `ANCHOR_CONTRACT` in `font-mono`, computed in-component — never hardcoded — plus a pill-style link to `contractUrl` with an `ArrowUpRight` icon). Verified all 8 lucide icon names resolve in the installed `lucide-react@0.468.0`. Stays a Server Component, no `'use client'`, no new dependencies.
- [x] 7.4 Update `design.md`'s dictionary-shape and component-rendering sections for `contractLabel` and the spec-sheet/datasheet layout. No delta-spec change — purely visual, AES/anchoring text unchanged.
- [x] 7.5 Run full gate: `pnpm --filter @trustai/web test`, `lint`, `typecheck`, `build`. Confirm `/` still prerenders `○ (Static)`.

## Phase 8: Copy Refinement — Hero Mock-DTR Card Jargon Softening

Approved scope decision: soften two jargon labels on the hero card for non-technical readers, keep the cryptographic texture (post-review, before commit).

- [x] 8.1 `landing.ts`: `hero.card.hashLabel` "Huella del DTR · SHA-256" → "Huella del DTR" (drop the algorithm suffix, `hashValue` unchanged). `hero.card.network` "Base Sepolia" → "Blockchain pública" (`networkLabel` stays "Red"); the real network name stays visible elsewhere (`hero.badge`, `how.steps[3]`, `how.technicalDetail`, `footer`). `label`/`statusBadge`/`hashValue`/`txLabel`/`txValue`/`footerNote`/`fileName`/`fileMeta` untouched. No `Hero.tsx` change — labels are dictionary-driven.
- [x] 8.2 Checked `dictionaries.test.ts` and other landing/page tests for hard assertions on the old `hero.card.hashLabel`/`hero.card.network` exact strings — none exist, so no test change was required. Full suite re-run to confirm nothing broke.
- [x] 8.3 Run full gate: `pnpm --filter @trustai/web test`, `lint`, `typecheck`, `build`. Confirm `/` still prerenders `○ (Static)`.
