# Design: Refocus Landing Marketing Copy

## Technical Approach

Copy-only change across one dictionary and two Server Components. No new
files, no client JS, no composition change. `how.technicalDetail` /
`how.technicalDetailLabel` relocate — never invent — the AES-256-GCM and
SHA-256/RFC-8785-canonical facts already audited in `steps[0]/[2]`, behind a
native `<details>` mirroring `Faq.tsx`. `hero.eyebrow` / `hero.ctaMicrocopy`
are net-new, flat, dictionary-sourced strings (RNF-041).

## Decisions

| Question | Decision | Rationale |
|---|---|---|
| Disclosure shape | ONE `how.technicalDetail: string` (not per-step) | Avoids forcing placeholder jargon onto steps 2/4 to satisfy the leaf-value guard on the 4-tuple `steps` array (exploration decision 3). |
| Disclosure trigger label | New `how.technicalDetailLabel: string` sibling field | RNF-041 forbids inline JSX literals; the `<summary>` text is user-facing copy, so it needs its own dictionary key — it is not part of the moved technical fact itself. |
| Hero pain framing | `hero.eyebrow: string`, no new `Problem.tsx` | Folded into hero per proposal scope; no Landing Composition / RNF-041 group-list delta. |
| Hero proof card | `hero.card.*` untouched | "No jargon" governs prose only; card is out-of-scope supporting proof (exploration decision 2). |
| Badge/valueProps/CTA text | Same fields, reworded values only | Zero shape or test-selector impact. |

## Dictionary Shape Changes (`landing.ts`)

**`hero`**:

| Field | Status | Note |
|---|---|---|
| `hero.eyebrow` | **new** | Pain line ("today, proof depends on your word"), rendered above the headline. |
| `hero.ctaMicrocopy` | **new** | Reassurance line under the CTA buttons; no immediacy claim. |
| `hero.badge` | reword | Strength framing (echo `faq.items`' "validado on-chain, sin costos de red"). |
| `hero.title`, `hero.subtitle` | reword | Drop "blockchain"/"hash"/"SHA-256" from prose. |
| `hero.card.*`, `hero.valueProps`, `hero.primaryCta`, `hero.secondaryCta` | unchanged shape | `card.label` keeps the DTR term — satisfies terminology-lock test #1 regardless of `subtitle` edits. |

**`how`**:

| Field | Status | Note |
|---|---|---|
| `how.technicalDetail` | **new, structured object** | `{ intro: string, items: { term: string, desc: string }[], contractLinkLabel: string, contractLabel: string }`. Consolidates AES-256-GCM, DTR contents, RFC 8785 canonical serialization, SHA-256 hashing, and on-chain anchoring into a scannable grid of mini technical cards, plus a datasheet-style contract card (`contractLabel` = "AnchorRegistry · Base Sepolia") linking the real AnchorRegistry contract (via `contractUrl.ts`, same source as `Hero`/`Footer`). Refinement over the original single-string shape — user asked for a richer, structured block folded into this cycle; `contractLabel` added in a second visual-refinement pass ("Proposal B — spec sheet"). |
| `how.technicalDetailLabel` | **new** | `<summary>` trigger text (unchanged: "Ver el detalle técnico"). |
| `how.steps[0].description` | reword | Drop "AES-256-GCM"; keep benefit framing ("cifrado, nunca se publica"). |
| `how.steps[2].description` | reword | Drop "SHA-256"/"canónica"; keep benefit framing ("se genera una prueba única"). |
| `how.steps` | **unchanged shape** | Stays the `[string,string,string,string]` tuple — no per-step optional field, per leaf-value-guard trap noted in exploration. |

`how.technicalDetail.items` leaf-value-guard coverage: `collectLeafValues` in `dictionaries.test.ts` already recurses generically over nested objects/arrays via `Object.values(node).flatMap(collectLeafValues)`, so the structured shape needs zero changes to the guard itself — only to the two content-scan assertions that used to read `how.technicalDetail` as a plain string (see Testing Strategy below).

## Component Changes

**`Hero.tsx`** (Server Component, no `'use client'`):
- Insert `<p>{t.eyebrow}</p>` between the badge `<a>` and `<h1>{t.title}</h1>` (~line 33/35) — same plain-string render as the existing badge.
- Insert `<p>{t.ctaMicrocopy}</p>` right after the CTA button `<div>` (~line 54), before the `valueProps` `<ul>`.
- `hero.card` JSX (lines 66–115) untouched.

**`HowItWorks.tsx`** (Server Component, no `'use client'`):
- After the `<ol>` of 4 steps, add one `<details className="group ...">` — reusing `Faq.tsx`'s `group`/`marker:content-none`/`group-open:rotate-45` classes — with `<summary>{t.technicalDetailLabel}</summary>`. One disclosure (not per-step), inside the existing `<section>`, after the grid.
- Body ("Proposal B — spec sheet", visual refinement approved post-review):
  - `<p>{intro}</p>`.
  - A responsive spec-sheet GRID (`grid gap-3 sm:grid-cols-2`) of the 6 `items`, each a mini-card (`rounded-xl border border-border bg-background p-4`) with an icon chip (`flex size-8 items-center justify-center rounded-lg bg-accent text-primary`), `term`, and `desc`. Icons come from a module-level `DETAIL_ICONS = [Lock, FileJson, Braces, Hash, Anchor, ShieldCheck]` array mapped by index — same pattern as `STEP_ICONS`/`PILLAR_ICONS`.
  - A full-width "datasheet" contract card below the grid (`rounded-xl border border-border bg-muted/40 p-4`, `flex ... sm:flex-row sm:items-center sm:justify-between`): left side shows `contractLabel` + the truncated `ANCHOR_CONTRACT` address (`font-mono`, computed in-component as `` `${ANCHOR_CONTRACT.slice(0,6)}…${ANCHOR_CONTRACT.slice(-4)}` `` — never hardcoded), right side is a pill-style `<a href={contractUrl} target="_blank" rel="noopener noreferrer">{contractLinkLabel}</a>` with an `ArrowUpRight` icon. `ANCHOR_CONTRACT`/`contractUrl` imported from the shared `./contractUrl` module (same source as `Hero`'s badge link and `Footer`'s contract link).
  - Stays native HTML/Server Component — no client JS, no new dependencies (icons are additional `lucide-react` imports only, already a project dependency).

## Testing Strategy (strict_tdd — tests first)

| Order | File | Change |
|---|---|---|
| 1 (RED) | `dictionaries.test.ts` #6 | Repoint from `how.steps[0].description` to `how.technicalDetail` matching `/AES-256-GCM/`. Fails until step 2. |
| 1 (RED) | `dictionaries.test.ts` #7 | Repoint from `how.steps[2].description` to `how.technicalDetail` matching `/canónic/i` and `/SHA-256/`. Fails until step 2. |
| 2 (GREEN) | `landing.ts` | Add the 4 new fields, reword hero/badge/step prose. Makes #6/#7 pass. |
| 1b (RED, refinement) | `dictionaries.test.ts` #6/#7 | Repointed again to collect leaf strings of the now-structured `how.technicalDetail` (`collectLeafValues(how.technicalDetail).join(" ")`) instead of matching a plain string. New #10 asserts `technicalDetail.items` is non-empty with complete `term`/`desc` on every entry. Fails until step 2b. |
| 2b (GREEN, refinement) | `landing.ts` | `how.technicalDetail` becomes `{ intro, items[], contractLinkLabel }`. Makes #6/#7/#10 pass. |
| 1c (RED, visual refinement) | `dictionaries.test.ts` #11 | New assertion: `technicalDetail.contractLabel` is a non-empty string. Fails until step 2c. |
| 2c (GREEN, visual refinement) | `landing.ts` | Adds `technicalDetail.contractLabel: "AnchorRegistry · Base Sepolia"`. Makes #11 pass; leaf-value guard auto-covers it. |
| 3b (visual, no test) | `HowItWorks.tsx` | Re-renders `technicalDetail` as a spec-sheet grid + datasheet contract card (`DETAIL_ICONS` map, `ANCHOR_CONTRACT` truncation). Same no-dedicated-test precedent as the rest of `HowItWorks.tsx`. |
| 3 | `Hero.tsx` | Wire `eyebrow`/`ctaMicrocopy`. No dedicated test file (no precedent for one — `Pillars`/`UseCases`/`Faq`/`FinalCta`/`Footer` have none either). |
| 4 | `HowItWorks.tsx` | Wire `technicalDetailLabel`/`technicalDetail` disclosure. Same no-dedicated-test precedent. |
| — | leaf-value guard | Zero edits — recursive walk auto-covers all 4 new leaves. |
| — | copy-audit #2 (anchoring-phrase scan) | Zero edits — already spreads over `collectLeafValues(how)`, so `technicalDetail`/`technicalDetailLabel` are auto-scanned for forbidden phrasing. |
| — | copy-audit #1 (terminology lock) | Zero edits — `hero.card.label`/`cta.subtitle` still carry the DTR term untouched. |
| — | `page.test.tsx` | Zero edits — order markers use `hero.title`, `how.title`, `secondaryCta` (unchanged field names); section count/order unchanged. |
| — | `useClientBoundary.test.ts` | Zero edits — directory scan; both files stay Server Components. |

## Accuracy/Honesty Guardrails

- `how.technicalDetail` (across its `intro`/`items[].term`/`items[].desc`/`contractLinkLabel` leaves) MUST name AES-256-GCM (matches `apps/api/src/adapters/crypto/aes-gcm.adapter.ts`) and state the SHA-256 hash of the DTR's RFC 8785 canonical serialization is anchored — never "the file's hash" (spec: Accurate Anchoring Copy, Content-Audit Accuracy deltas already MODIFY this).
- `hero.ctaMicrocopy` MUST NOT claim immediacy (no "2 minutos") — the real `/register` flow has an email-verification gate behind a stub notifier, so no verified time-bound claim exists.
- `how.technicalDetail.items` ("Verificable de forma independiente") states that anyone CAN recalculate the canonical hash and check the anchor via `dtr-core` (an open MIT library) against any RPC node — a real, standalone capability. It MUST NOT be phrased as something the shipped browser UI does automatically; the only functional (non-descriptive) hash recompute in the product stays on `/verify/[id]`'s `ClientHashRecompute`, per the existing Honest Verification Demo guardrail on `verificationDemo`.

## Migration / Rollout

No migration required. Single-purpose commit(s) touching `landing.ts`,
`dictionaries.test.ts`, `Hero.tsx`, `HowItWorks.tsx` — plain `git revert`.

## Open Questions

None blocking.
