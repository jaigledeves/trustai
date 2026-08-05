## Exploration: refocus-landing-marketing-copy

### Current State

All public-landing copy lives in one file, `apps/web/dictionaries/es/landing.ts`
(`landingDictionary`, `as const`), grouped by section: `nav`, `hero`, `how`,
`verificationDemo`, `useCases`, `pillars`, `faq`, `cta`, `footer`. Every
section component under `apps/web/components/landing/` is a prop-less Server
Component that imports `landingDictionary` directly and renders `t.<key>`;
only `VerificationDemo.tsx` is `'use client'`. `app/page.tsx` composes the 9
sections in a fixed order.

Where the jargon actually lives today:
- `hero.subtitle` — "...genera su Registro Digital de Confianza (DTR): una
  huella criptográfica registrada en blockchain..." (mentions blockchain).
- `hero.card` — a visual "proof card" mock (label, status badge, hash,
  network, tx) whose fields *already* say "SHA-256", "Registrado en
  blockchain", "Base Sepolia". This is the audit's "supporting proof",
  shown directly in the hero, not lower on the page.
- `how.steps[0].description` — names AES-256-GCM.
- `how.steps[2].description` — names SHA-256 + "serialización canónica".
- `hero.badge` — "Piloto en vivo · Base Sepolia (testnet)" (framed as
  in-progress, not as a strength).
- No "problem" copy exists anywhere; `how.title`/`how.subtitle` and
  `useCases.subtitle` are the closest thing, and they're solution-framed
  ("Del archivo a la evidencia..."), not pain-framed.
- No CTA micro-copy exists under `hero.primaryCta`/`cta.button`.

Existing disclosure precedent: `Faq.tsx` already uses native
`<summary>/<details>` for progressive disclosure, explicitly to stay a
Server Component (no client JS) — this is the established pattern any new
HowItWorks disclosure should reuse.

Test surface (all in `apps/web/dictionaries/es/dictionaries.test.ts` unless
noted):
- **Leaf-value guard** — recursively walks `landingDictionary`, asserts
  every leaf is a non-empty string. This auto-covers any new group/field
  with zero test-file edits, but it also means any new field (e.g. a
  per-step technical-detail slot) **cannot be empty on steps that don't
  need it** — it must be a real string on every element of a `[string,
  string, string, string]`-shaped tuple, or modeled outside the tuple.
- **9-assertion copy audit** (`describe("landingDictionary copy audit...")`)
  — hardcodes paths: assertion #6 checks `how.steps[0].description` matches
  `/AES-256-GCM/`; assertion #7 checks `how.steps[2].description` matches
  `/canónic/i` and `/SHA-256/`. Both read `.description` specifically, not
  "anywhere in the step".
- `useClientBoundary.test.ts` — reads every `.tsx` file in the landing dir
  by directory listing (not a hardcoded file list), so a new section
  component is automatically checked for `'use client'` absence with zero
  edits.
- `app/page.test.tsx` — asserts 9 dictionary-string markers appear in DOM
  order. Resilient to copy changes (it reads `landingDictionary` values at
  test time), but inserting a new section requires adding a new marker to
  the ordered list by hand.
- No dedicated `Hero.test.tsx` or `HowItWorks.test.tsx` exist today — the
  established precedent for static-copy sections (`Pillars`, `UseCases`,
  `Faq`, `FinalCta`, `Footer` also have none) is that correctness is
  covered by the dictionary copy-audit + `page.test.tsx` ordering, not a
  per-component test file.

### Affected Areas

- `apps/web/dictionaries/es/landing.ts` — hero copy rewrite, `how.steps[0]`/`[2]`
  restructure to hide jargon, new CTA micro-copy, badge reframe, and (pending
  decision) a new `problem`-shaped group or field.
- `apps/web/dictionaries/es/dictionaries.test.ts` — copy-audit assertions #6
  and #7 hardcode `.description`; they MUST be rewritten in lockstep with any
  dictionary shape change (this is the strict_tdd RED before the shape
  change is GREEN).
- `apps/web/components/landing/Hero.tsx` — headline/subheadline text swap,
  CTA micro-copy render, badge copy swap; decision needed on whether the
  proof-card visual is touched.
- `apps/web/components/landing/HowItWorks.tsx` — needs a disclosure UI
  (likely `<details>`, matching `Faq.tsx`) for the technical detail.
- `apps/web/app/page.tsx` and `app/page.test.tsx` — only if a new standalone
  Problem section is introduced (composition list + DOM-order markers).
- `openspec/specs/public-landing/spec.md` — see requirement-level analysis
  below; this is the file with the real risk of a spec/scope mismatch.

### Spec Requirements Needing MODIFICATION

Read in full; here's the exact disposition per requirement:

1. **Central Artifact Terminology Lock — NOT tensioned, no MODIFY needed.**
   The requirement only constrains *how* the artifact is named wherever it's
   referenced ("MUST use the exact string"); it never requires the hero (or
   any specific section) to reference it. The only test is
   `JSON.stringify(landingDictionary)` containing the string once, anywhere.
   `hero.card.label` and `cta.subtitle` still carry it today and aren't in
   scope to remove — so dropping it from `hero.subtitle`'s prose does not
   break this lock. **Confirmed: leave this requirement as-is.**

2. **Accurate Anchoring Copy — MODIFY required.** Its scenario "HowItWorks
   step 3 states canonical-serialization hash" pins the claim to
   `landingDictionary.how.steps[2]`'s *description* specifically. Rec. 2
   moves that detail to a secondary disclosure, so the description leaf may
   no longer carry it. The delta must replace this requirement's body +
   scenario to say the accurate SHA-256/canonical-serialization claim MUST
   still exist verbatim (accuracy preserved) but MAY live in a
   `technicalDetail`-style disclosure field rather than the primary step
   `description`.

3. **Content-Audit Accuracy — MODIFY required.** Same tension, mirrored:
   its scenario "Step 1 names the real encryption algorithm" pins
   AES-256-GCM to `how.steps[0].description`. Needs the same relaxation —
   the algorithm name MUST still appear verbatim somewhere testable, but MAY
   be in the disclosure rather than the primary description.

4. **Landing Composition — MODIFY required ONLY IF the Problem framing
   becomes a new standalone section.** If it does, the section list grows
   from 9 to 10 and the ordering scenario must name the new section's
   position (before HowItWorks). If instead it's folded into existing
   `hero` or `how` copy, this requirement is untouched. **This is the single
   biggest open decision — see below.**

5. **Dictionary-Sourced Copy (RNF-041) — MODIFY required ONLY IF a new
   top-level `problem` group is added** (the requirement enumerates the
   required groups by name: `nav`, `hero`, `how`, ...). If the problem
   framing folds into an existing group (`hero` or `how`), no group-name
   change is needed here.

6. **Test Coverage (strict_tdd) — no MODIFY needed at the requirement-prose
   level** (it's generic: "leaf-value guard" + "terminology exact-copy
   lock" + page-level coverage). The concrete *test code* in
   `dictionaries.test.ts` (assertions #6/#7) will need rewriting regardless,
   but that's implementation, not a spec-requirement change.

7. **Honest Verification Demo, Light-Mode-Only Styling, Config-Driven
   Navigation & Links** — untouched by this change's approved scope (1,2,3,
   4,7); no jargon, no CTA structure, no theming decisions are in play here.

### Open Decisions to Resolve in the Proposal

1. **Problem framing: new section vs. folded copy (blocks Landing
   Composition / Dictionary-Sourced Copy MODIFYs).** Rec. 3 says "add a
   PROBLEM framing before HowItWorks," which reads as a new visual beat, but
   the change is explicitly scoped "copy-only." A genuinely new React
   component + a 9→10 section-count spec change is a structural addition,
   not a copy edit — even though it introduces no new business logic, no
   client JS, and no new dependency (mirrors `FinalCta.tsx`'s ~24-line
   pattern). Two real options:
   - **A. New `Problem.tsx` Server Component** + new `problem` dictionary
     group, inserted between Hero and HowItWorks. Strongest signal
     separation (matches "Problem → Solution" landing convention); requires
     MODIFYing Landing Composition + Dictionary-Sourced Copy, a new
     `page.test.tsx` order marker, and is auto-covered for free by
     `useClientBoundary.test.ts`'s directory scan and the leaf-value guard.
   - **B. Fold into existing copy** — e.g. extend `how.subtitle` (or add a
     `how.problem` lead-in line) to name the pain before pivoting to "Del
     archivo a la evidencia...". Zero spec-requirement changes, zero new
     files, smaller diff (helps the 400-line review budget), but a weaker,
     less scannable "problem" beat.
   - **Recommendation: A**, but flag it explicitly for orchestrator/user
     sign-off — it's the one piece of this change most likely to be
     contested as exceeding "copy-only."

2. **Does the hero "no jargon" instruction include the proof-card visual?**
   Rec. 1's literal approved copy only gives headline/subheadline text and
   says jargon "reappear[s] later as supporting proof" — but
   `hero.card` (hash/network/tx labels) is itself supporting proof, shown
   immediately in the hero, not later. Reading it as "prose only" (leave
   `hero.card` as-is) is the safer, lower-risk interpretation and matches
   the literal approved copy given. Reading it as "the whole Hero including
   the card" requires re-authoring 5 card fields with no given replacement
   text. **Needs explicit confirmation before sdd-propose.**

3. **HowItWorks disclosure shape — avoid the leaf-value-guard trap.** Two
   candidate shapes:
   - **Per-step field** (`how.steps[i].technicalDetail`): ties detail to its
     step, but the leaf-value guard requires every leaf to be a non-empty
     string, and `steps` is a `[…, …, …, …]` literal tuple — so all 4 steps
     need a real (non-placeholder) technical-detail string, including the
     two steps that have no jargon today, or the type/test contract breaks.
   - **Single consolidated block** (e.g. `how.technicalDetail: string`,
     one `<details>` after the 4-step grid, naming both AES-256-GCM and the
     SHA-256/canonical-serialization detail together): avoids the
     empty-leaf problem entirely, one disclosure instead of up to four.
   - **Recommendation: the consolidated block** — simpler shape, satisfies
     the leaf-value guard trivially, and matches Faq's single-disclosure-
     per-item precedent without forcing artificial content on steps 2/4.
     `<details>/<summary>` (matching `Faq.tsx`) keeps `HowItWorks.tsx` a
     Server Component.

4. **CTA micro-copy accuracy.** Rec. 4's suggested "gratis · sin tarjeta ·
   en 2 minutos" is new user-facing copy this change would introduce, but
   the audit's own thesis is "don't say things that aren't true." This
   exploration did not check the actual `/register` flow (fields required,
   whether payment info is ever requested, realistic completion time).
   **Needs confirmation against the real registration flow before locking
   this exact micro-copy in the proposal**, or the change repeats the
   audit's own complaint in reverse.

5. **Badge reframe wording.** `faq.items` already has an approved-sounding
   precedent line: "Estamos en fase piloto sobre la testnet Base Sepolia
   para validar el producto sin costos de red." Rec. 7's reframe of
   `hero.badge` should likely echo this exact framing ("validado on-chain,
   sin costos de red") rather than invent new phrasing — low-risk, just
   needs the proposal to pick exact words. Out of scope: `verifyDictionary
   .page.badge` on `/verify/[id]` has the same badge pattern but is a
   different dictionary/spec (`web-public-verify`, not `public-landing`) —
   not touched by this change; flag as a possible follow-up, not part of
   this change.

### strict_tdd Implications

`openspec/config.yaml` sets `strict_tdd: true` and `rules.apply.tdd: true`.
For this change that means, concretely:
- Any dictionary-shape change (moving jargon out of `.description`, adding
  a `problem` group/field, adding CTA micro-copy) needs its
  `dictionaries.test.ts` assertion written/updated FIRST in a failing state
  (e.g., rewrite assertion #6/#7 to check the new field paths, or to assert
  the OLD paths no longer match the jargon regex) before `landing.ts` is
  edited to make it pass.
- If a new `Problem` section is chosen (decision 1), the RED step is: add
  the new `page.test.tsx` order-marker assertion (pointing at
  `landingDictionary.problem.title` or similar) before `Problem.tsx` and the
  dictionary group exist.
- `useClientBoundary.test.ts` needs no RED/GREEN pair — it's a directory
  scan that passes automatically for any correctly-Server-Component new
  file, and fails loudly if someone accidentally adds `'use client'`.
- No new component test files are required by precedent (Hero/HowItWorks/
  Problem would follow Pillars/UseCases/Faq/FinalCta/Footer's existing
  "no dedicated `.test.tsx`" pattern) — coverage comes from the dictionary
  copy-audit + `page.test.tsx` DOM-order assertions, consistent with how
  this codebase already tests static-copy sections.

### Ready for Proposal

**Yes, with 2 blocking questions to resolve first** (decisions 1 and 2
above — standalone Problem section vs. folded copy, and whether the hero
proof-card is in scope). Decisions 3–5 are lower-risk implementation
choices sdd-propose/sdd-design can make and state explicitly without
needing a round-trip to the user. Recommend the orchestrator surface
decisions 1 and 2 to the user before sdd-propose locks scope, since both
affect which spec requirements get a `MODIFIED` delta.
