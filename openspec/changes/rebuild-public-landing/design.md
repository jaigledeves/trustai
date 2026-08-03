# Design: Rebuild Public Landing Page

## Technical Approach

Section-by-section port into `apps/web/components/landing/`, one file per
section, `app/page.tsx` reduced to an ordered composition. Spec's "Landing
Composition" requirement names **9** sections (Nav, Hero, HowItWorks,
VerificationDemo, UseCases, Pillars, Faq, FinalCta, Footer) — a scope
clarification vs. the proposal's 7 (Nav/Footer were left inline there);
spec is authoritative and later, so this design extracts all 9. Only
`VerificationDemo` is `'use client'`. Content corrections (terminology,
anchoring accuracy, use-case/FAQ claims) are applied during the port, not
after.

## Architecture Decisions

| Decision | Choice | Alternative rejected | Rationale |
|---|---|---|---|
| Component set | 9 files under `components/landing/`, incl. Nav/Footer | Keep Nav/Footer inline (proposal's original 7) | Spec's Requirement: Landing Composition explicitly names all 9 as sections "from `apps/web/components/landing/`" |
| Shared contract URL | New `components/landing/contractUrl.ts` exports `ANCHOR_CONTRACT`/`contractUrl` | Duplicate the constant in Hero and Footer | Both need it (hero badge link, footer link); today's `page.tsx` had one copy — one module keeps a single source |
| VerificationDemo recompute claim | Include a short honest static line stating the browser can independently recompute the file's SHA-256, with the same honest caveat pattern as `verifyDictionary.recompute.caveat` (no on-chain/canonical comparison claim); illustrative copy, not a working recompute | Omit it entirely (this design's prior decision, reversed per explicit user instruction) | Spec marks it `MAY`, not `MUST`, but the user decided the honest disclosure adds value here; the copy-audit test (assertions 8–9) guards against it drifting into a false on-chain-comparison claim; the real, functional recompute stays on `/verify/[id]` (`ClientHashRecompute`) |
| VerificationDemo "try a real example" link | None — only Hero's CTA links `/verify/${demoDtrId}` | Duplicate guarded link inside VerificationDemo too (mock has one) | Spec's Config-Driven Navigation scenario is scoped to "Hero renders"; one guarded link is one thing to keep correct |
| Verdict copy | Read `verifyDictionary.verdicts[key].title/message` directly at render time; no landing-local mirror | Copy verdict strings into `landingDictionary.verificationDemo` | Spec mandates sourcing "not re-authored" — zero drift risk, single source of truth |
| FAQ interactivity | Native `<details>/<summary>` (already the mock's pattern) | Controlled React accordion | No JS needed; keeps FAQ a Server Component |
| `--success` tokens | Not introduced; map to `emerald-*` utilities | Add `--success/--success-muted` to `:root` | Smaller footprint (exploration Open Q1); avoids a design-token change for one page |

## Server/Client Boundary

```
page.tsx (Server) ── Nav (Server)
                   ── Hero (Server, reads config.demoDtrId)
                   ── HowItWorks (Server)
                   ── VerificationDemo ('use client', useState<VerifyVerdict>)
                   ── UseCases (Server)
                   ── Pillars (Server)
                   ── Faq (Server, native <details>)
                   ── FinalCta (Server)
                   ── Footer (Server, reads contractUrl)
```

All components are prop-less — each reads `landingDictionary` (+ `verifyDictionary` in `VerificationDemo`) directly, matching the mock's/`page.tsx`'s existing pattern.

## Dictionary Shape (add to `landing.ts`, kept `as const`)

```ts
nav: { login, register }                                  // unchanged
hero: {
  badge, title, subtitle, primaryCta, secondaryCta, demoCta, // unchanged
  valueProps: [string, string, string],                      // "sin instalar", "gratuita", "archivo no se publica"
  card: {
    label, statusBadge, fileName, fileMeta,
    hashLabel,        // "Hash SHA-256 · serialización canónica"
    hashValue, networkLabel, network, txLabel, txValue,
    footerNote,       // corrected: no "recalculated matches" claim
  },
}
how: { title, subtitle, steps: [{title, description}] × 4 }  // steps[0] gets "AES-256-GCM"; steps[2] unchanged (already correct)
verificationDemo: {
  badge, title, description, verdictGroupLabel,
  recompute: {
    statement,  // "Tu navegador puede calcular de forma independiente el hash SHA-256 del archivo." — no "blockchain"/"coincide" wording
    caveat,     // honest disclaimer, same pattern as verifyDictionary.recompute.caveat: "no reconstruye ni verifica el hash canónico anclado en la blockchain"
  },
}
useCases: { title, subtitle, items: [{title, description}] × 6 }  // integrity/timestamp claims only
pillars: { title, items: [{title, description}] × 3 }        // unchanged content
faq: { title, subtitle, items: [{question, answer}] × 6 }     // pricing item reworded, no promise
cta: { title, subtitle, button }                              // unchanged
footer: { tagline, contractLabel, copyright }                 // unchanged
```

Icon refs and the 4-verdict order (`["VALID","ASSET_MISMATCH","PENDING_ANCHOR","INVALID_RECORD"]`) stay as component-local `const`s (structural, not copy) — mirrors the mock's `use-cases.tsx` icon array.

## Verification Demo Interaction

`VerificationDemo` holds `const [verdict, setVerdict] = useState<VerifyVerdict>("VALID")`. Four buttons (`role="radiogroup"`-style via `aria-pressed`), one per verdict, labelled with `verifyDictionary.verdicts[key].title`. Selecting one renders that verdict's `title`/`message` in a `role="status"`/`role="alert"` panel (mirrors `UploadVerdictPanel`'s `isErrorVerdict` split).

Below the verdict panel, a static two-line disclosure renders `landingDictionary.verificationDemo.recompute.statement` followed by `.caveat` — always visible, independent of the selected verdict. This is **descriptive/illustrative copy only**, not a working computation (no `useEffect`, no `sha256Hex` call, no file input): it tells the visitor that a real recipient's browser *can* independently recompute the file's SHA-256, while the caveat honestly states this does **not** reconstruct or compare against the on-chain/canonical hash. The real, functional recompute (`ClientHashRecompute`) remains exclusively on `/verify/[id]`.

## Copy-Audit Test (new mechanism for "no false claims")

New `describe` block in `dictionaries.test.ts` (co-located, matches the existing `authDictionary`/certify exact-copy pattern) flattening `landingDictionary` leaves and asserting, per spec requirement:

| # | Assertion | Spec scenario |
|---|---|---|
| 1 | `JSON.stringify(landingDictionary)` contains `"Registro Digital de Confianza (DTR)"` | Terminology Lock |
| 2 | No leaf matches `/hash del archivo/i`, `/huella del archivo/i`, `/(el archivo|se) ancla(?!.*canónic)/i` | Accurate Anchoring |
| 3 | No leaf co-occurs `/recalcul/i` AND `/blockchain\|cadena\|on-?chain/i` | No on-chain comparison claim |
| 4 | `useCases.items[].description` excludes `/era tuyo\|te pertenece\|quien firm[oó]\|el autor es/i` | Use-case authorship/ownership |
| 5 | `faq.items[].answer` excludes `/planes.*(anunciar\|futuro)\|precio\|costo futuro/i` | No pricing promise |
| 6 | `how.steps[0].description` matches `/AES-256-GCM/` | Real encryption algorithm |
| 7 | `how.steps[2].description` matches `/canónic/i` and `/SHA-256/` | Canonical-serialization hash |
| 8 | `verificationDemo.recompute.caveat` matches `/no\s+(reconstru\w*\|verific\w*).*(canónic\w*\|blockchain\|anclad\w*)/i` | Honest recompute disclaimer present (mirrors `verifyDictionary.recompute.caveat` pattern) |
| 9 | `` `${verificationDemo.recompute.statement} ${verificationDemo.recompute.caveat}` `` excludes `/coincide/i` | No "recomputed hash matches/verifies the anchored hash" claim |

Count: **9 assertions** (was 7 — rows 8–9 added for the reinstated recompute line).

## Styling / Token Mapping

Reuse existing oklch tokens as-is: `bg-card`, `border-border`, `text-muted-foreground`, `bg-primary`/`text-primary-foreground`, `bg-accent`, `bg-muted/40`. Mock's `text-success`/`bg-success-muted`/`bg-success` → `text-emerald-600`, `bg-emerald-50`, `bg-emerald-500`. No `--success*` custom property, no `.dark`/`prefers-color-scheme`. `Wordmark` (from `components/brand/`) reused in Nav (`<Wordmark />`) and Footer (`<Wordmark iconOnly />`) — no mock `logo.tsx` port. `Button` (`components/ui/button.tsx`) reused for all CTAs — no mock `ui/button.tsx` (`@base-ui/react`) port.

## Config-Driven Links

- Nav: `/login`, `/register` (unchanged).
- Hero: `/register` primary; `/verify/${config.demoDtrId}` guarded — `config.demoDtrId ? <Link>… : null` (unchanged pattern); `contractUrl` badge link.
- Footer: `contractUrl` link (unchanged).
- `contractUrl` centralized in new `components/landing/contractUrl.ts`, imported by Hero and Footer.

## Test Plan

| File | Covers |
|---|---|
| `VerificationDemo.test.tsx` | Toggling each of the 4 buttons renders that verdict's exact `verifyDictionary` title/message; default state is `VALID`; the recompute `statement`/`caveat` disclosure renders once, unaffected by which verdict is selected |
| `dictionaries.test.ts` | `landingDictionary` added to leaf-value guard; new copy-audit `describe` (9 assertions above) |
| `components/landing/useClientBoundary.test.ts` | Reads each `components/landing/*.tsx` source file; asserts only `VerificationDemo.tsx` starts with `"use client"` |
| `app/page.test.tsx` (new) | Mocks only `VerificationDemo` (marker div, like `verify/[id]/page.test.tsx` mocks its heavy children); renders the rest live; asserts heading order (hero→how→verificationDemo marker→useCases→pillars→faq→cta) via DOM order; two cases via `vi.stubEnv("NEXT_PUBLIC_DEMO_DTR_ID", …)` + `vi.resetModules()` + dynamic import, asserting the demo-CTA link is present/absent |

## Migration / Rollout

No migration required — static marketing content, single `web`-only commit set, plain `git revert` per proposal's rollback plan.

## Open Questions

- [ ] None blocking. Nav/Footer extraction (9 vs. 7 components) is a spec-vs-proposal scope note, resolved above in favor of spec — flag to orchestrator/user for explicit acknowledgment before tasks.
