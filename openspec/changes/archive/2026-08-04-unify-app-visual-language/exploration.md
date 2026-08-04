# Exploration: unify-app-visual-language

## Scope confirmation

`apps/web` only. No changes to `apps/api`, `packages/dtr-core`, `packages/utils`,
or `smart-contracts`. UI copy stays Spanish via the existing
`apps/web/dictionaries/es/*.ts` modules (RNF-041).

## Current State

The public landing (`app/page.tsx` + `components/landing/*`) and public verify
page (`app/verify/[id]/page.tsx` + `components/verify/*`) already carry a
consistent visual language (radial-gradient hero backdrop, `rounded-2xl border
border-border bg-card p-6 shadow-xl shadow-primary/5` card recipe, sticky
translucent nav, pill badges, emerald success moments with lucide icons,
`font-mono` truncated hashes). This recipe is applied as **raw Tailwind
classNames on `<section>`/`<div>` elements**, not through the shadcn `Card`
primitive (`components/ui/card.tsx`) — landing/verify never import it.

The rest of `apps/web` (auth pages, dashboard shell, DTR history, certify
wizard, global error/404/loading surfaces) predates this language and is
visually and structurally inconsistent with it, and in the certify wizard's
case, with the rest of the app-space around it.

Design tokens (`--accent`, `--primary`, `--border`, `--card`, etc.) are defined
globally in `app/globals.css` `@theme inline`, not landing-scoped, so reuse
elsewhere is a pure Tailwind-class exercise — no token work needed.

`openspec/config.yaml` states **apps/web is light-mode only, no dark-mode
toggle**. `app/globals.css` still ships a shadcn-boilerplate `.dark` class
selector, and `StateBadge.tsx`/`button.tsx`/`badge.tsx`/`input.tsx`/`textarea.tsx`
carry unreachable `dark:` utility variants (no code ever adds a `.dark` class
to `<html>`). This is dead CSS, not a functional dark-mode gap — informational
only, no action required beyond optionally not adding more dead `dark:`
classes during this change.

## Audit Verification (spot-checked against real files)

All HIGH-severity findings were verified directly and hold:

1. **Certify wizard collapse** — confirmed. `UploadStep.tsx:64-69` is a bare
   native `<input type="file">` with an unstyled label; every status/error
   surface across `UploadStep`, `ReviewStep`, `CertifyWizard`, `ConfirmButton`,
   `AnchorPoller`, `DiscardDraftButton` is an unstyled `<p role="alert|status">`
   or bare `<div role="alert">`.
2. **`app/(auth)/verify-email/page.tsx`** — confirmed fully off-brand: no
   gradient, no `Wordmark`, no `Card`, plain `underline` link, no CTA on the
   error branch.
3. **Zero `loading.tsx` / `not-found.tsx`** — confirmed via glob, zero matches
   app-wide. Dead `/dtrs/:id` and public `/verify/:id` links fall through to
   Next's default unbranded 404.
4. **`app/error.tsx`** — confirmed: raw unstyled `<button>` (line 34).
5. **DTR list** (`app/(dashboard)/dtrs/page.tsx`) — confirmed: naked
   `<DtrTable>` not wrapped in a card; empty state
   (`DtrTable.tsx:26`, `role="status"`) is a bare sentence with no CTA to
   `/dtrs/new`.
6. **`DtrDetailCard.tsx`** — confirmed: uses the flat shadcn `Card` primitive
   (`ui/card.tsx`, `ring-1 ring-foreground/10`, no shadow), not the reference
   recipe; no emerald verdict moment; no back-link to `/dtrs`.

Medium/low findings also verified as described (three competing emerald
recipes in `StateBadge`/`AnchorPoller`/reference; `alert.tsx` primitive exists
with zero usages while ~10 raw `role="alert"` `<p>`s exist elsewhere;
`window.confirm()` in `DiscardDraftButton.tsx:17`; no copy-to-clipboard in
`PublicVerifyShare.tsx`; gradient geometry differs between
`(auth)/login|register` (`50%_50%_at_50%_0%`) and landing/verify
(`70%_60%_at_50%_-10%`); `DtrTable.tsx:42-47` renders full IDs, not
`font-mono`/truncated).

**One correction to the audit**: login/register (`app/(auth)/login/page.tsx`,
`register/page.tsx`) are **not** unstyled — they already use `Wordmark`, the
shadcn `Card` primitive, and a radial-gradient backdrop (just a different
gradient geometry and the un-restyled `Card` primitive). Only
`verify-email/page.tsx` is the fully off-brand one in the `(auth)` group.
Also, `RegisterForm.tsx`'s success state does **not** produce a literal
duplicate-`<h1>` DOM violation — `CardTitle` renders a `<div>`, not an `<h1>` —
but it does visually stack two title-styled text blocks (`CardTitle` "Crear
cuenta" above the success block's own `<h1>`), which reads as an odd double
heading. Worth fixing as a visual/semantic-heading issue, not an a11y
duplicate-heading bug.

## Dictionaries / RNF-041 spot-check

Contrary to the audit's speculative note ("dashboard/certify components may
have hardcoded Spanish"), a direct grep for Spanish text literals inside JSX
across `apps/web/components/**` returned **zero matches**. `certify.ts`,
`history.ts`, `auth.ts`, `shell.ts` dictionaries are comprehensive and every
component read (`UploadStep`, `ReviewStep`, `ConfirmButton`, `AnchorPoller`,
`DiscardDraftButton`, `DtrTable`, `DtrDetailCard`, `LoginForm`, `RegisterForm`)
sources its copy from a dictionary module. **The RNF-041 pattern is already
followed consistently outside landing/verify — this change is styling-only,
no copy/dictionary work needed**, beyond adding new dictionary keys for any
new copy this change introduces (e.g. a wizard step-indicator's step labels,
if in scope).

## Test-Breakage Risk (constraint — the most consequential finding)

Every component under `components/certify`, `components/history`,
`components/auth`, `app/error.tsx`, `app/(auth)/verify-email/page.tsx` has a
co-located Vitest + Testing Library spec. Spot-checked:
`UploadStep.test.tsx`, `DiscardDraftButton.test.tsx`, `CertifyWizard.test.tsx`,
`RegisterForm.test.tsx`, `DtrTable.test.tsx`, `DtrDetailCard.test.tsx`,
`error.test.tsx`, `verify-email/page.test.tsx`.

**Good news**: every one of these asserts on **accessible text/role**
(`screen.getByText(...)`, `getByRole("button"/"link"/"alert", { name })`,
`getByLabelText(...)`) sourced from dictionary copy — **not** on
Tailwind classNames or DOM structure. This means most restyling (swapping
`<p role="alert">` for a styled `Alert`/`AlertDescription`, wrapping steps in
`Card`, adding icons) is **safe by construction** as long as:
- the exact dictionary string stays the accessible text content (or becomes
  the `aria-label`/associated label text for the same query), and
- `role="alert"` / `role="status"` are preserved (several tests don't query
  the role directly, but the audit's own accessibility intent and existing
  patterns rely on it — dropping it would be a regression even if a specific
  test wouldn't catch it).

**One real, concrete breakage risk**: `DiscardDraftButton.test.tsx` asserts
`window.confirm` is called with the **exact dictionary prompt string**
(`vi.spyOn(window, "confirm")`, `expect(window.confirm).toHaveBeenCalledWith(...)`).
**Replacing `window.confirm()` with a Radix `AlertDialog` is a breaking test
change** — both test cases in that file would need a full rewrite (mock
removal, dialog-open/confirm-click interaction) as part of the same
task/commit. This is the single highest-risk item if "in scope."

**Secondary, low-but-real risk**: `DtrTable.test.tsx` asserts
`screen.getByRole("link", { name: "tr-1" })` — the accessible name must equal
the raw id. Test fixtures use short ids (`"tr-1"`, `"tr-2"`), so a
length-gated truncation helper (only truncates ids over some threshold, as
`HashOnlyCard.tsx`'s existing `truncateHash()` already does for hashes) would
not trip this specific test. A truncation approach that changes the
accessible name unconditionally, or that is tested against a realistic
long-UUID fixture, would need the test's fixtures/assertions updated in the
same commit.

No other structural/markup assertions were found in the spot-checked specs.
Full confidence would require running the actual suite
(`pnpm --filter @trustai/web test`) once real edits land — recommended as a
tasks-phase gate, not deferred to sdd-verify only.

## Available primitives / dependencies

`components/ui/` currently has: `button`, `input`, `label`, `textarea`,
`table`, `badge`, `card`, `alert` (the last **unused** anywhere). `radix-ui`
(the unified package, `^1.6.2`), `lucide-react`, `class-variance-authority`,
`clsx`, `tailwind-merge` are all already installed. **No new npm dependencies
are needed** to add shadcn-style `alert-dialog`, `dialog`, `skeleton`, or
`progress` wrapper components — `radix-ui` already exports all of Radix's
primitives; only new thin wrapper files under `components/ui/` (following the
existing `card.tsx`/`alert.tsx` pattern) would be required.

## Affected Areas

- `apps/web/components/certify/*.tsx` (+ co-located tests) — highest-risk,
  highest-payoff surface (audit finding #1)
- `apps/web/app/(auth)/verify-email/page.tsx` (+ test) — fully off-brand
- `apps/web/app/(auth)/login/page.tsx`, `register/page.tsx`,
  `components/auth/{Login,Register}Form.tsx` (+ tests) — partial alignment,
  needs gradient/geometry unification + spinner/pending affordance
- `apps/web/app/(auth)/layout.tsx` — **does not exist**; candidate to
  de-duplicate gradient+Wordmark+bg across the three `(auth)` pages
- `apps/web/app/error.tsx` (+ test) — raw button, unbranded
- `apps/web/app/loading.tsx`, `app/not-found.tsx`,
  `app/(dashboard)/**/loading.tsx` — **do not exist anywhere**
- `apps/web/app/(dashboard)/layout.tsx` — flat bg, no gradient, no active-route
  nav state
- `apps/web/app/(dashboard)/dtrs/page.tsx`, `components/history/DtrTable.tsx`
  (+ tests) — naked table, no-CTA empty state
- `apps/web/components/history/DtrDetailCard.tsx` (+ test) — flat `Card`,
  no verdict moment, no back-link
- `apps/web/components/history/StateBadge.tsx`,
  `components/certify/AnchorPoller.tsx` — competing emerald recipes to
  converge on one
- `apps/web/components/ui/card.tsx` — primitive vs. wrapper decision (see
  Open Decisions)
- `apps/web/components/history/PublicVerifyShare.tsx` — no copy-to-clipboard
- `apps/web/components/certify/DiscardDraftButton.tsx` (+ test) —
  `window.confirm()`, in/out of scope decision

## Approaches

1. **Primitive-first (restyle `components/ui/card.tsx` + introduce shared
   status/alert wrapper components)**
   - Restyle the `Card` primitive to match the reference recipe
     (`rounded-2xl border-border shadow-xl shadow-primary/5`) so
     `DtrDetailCard`, `login`/`register` pages get it for free; extract
     `AnchorPoller`'s `ProgressStatus`/`SlowNotice` into a shared
     `components/ui/status-panel.tsx` (or similar) reused by every wizard
     step's status/error surface, replacing raw `<p role="alert|status">`.
   - Pros: single source of truth, landing/verify unaffected (they don't use
     the primitive), lowest long-term drift risk, smallest future diff for
     new pages.
   - Cons: touches a primitive used in 3 files today (`DtrDetailCard`,
     `login`, `register`) — must verify all three still look right; slightly
     more upfront design work to generalize the status/error pattern.
   - Effort: Medium.

2. **Wrapper-per-surface (leave `ui/card.tsx` alone, apply the raw
   Tailwind recipe locally everywhere, like landing/verify already do)**
   - Pros: zero risk to the 3 existing `Card` primitive consumers; mirrors the
     exact pattern already proven twice (landing, verify).
   - Cons: perpetuates the "raw className recipe copy-pasted N times" pattern
     the audit is trying to fix; `DtrDetailCard`/login/register would need to
     stop using `<Card>` (a visible regression path if not done carefully) or
     end up in a hybrid state.
   - Effort: Low-Medium.

**Recommendation**: Approach 1 (restyle the primitive). Blast radius is only
3 files, all of which the audit already flags as needing the same visual
fix anyway — restyling the primitive fixes `DtrDetailCard` "for free" and
gives login/register the exact same recipe landing/verify use, converging
on one definition instead of one more copy-pasted className string.

## Open Decisions (need user input at proposal time)

1. **Card primitive restyle vs. wrapper** — recommend restyle (see above).
   Confirm before `sdd-propose` locks scope, since it changes 3 files outside
   the "obviously broken" list.
2. **Single emerald recipe** — three exist today: `StateBadge`
   (`bg-emerald-500/15 text-emerald-700`), `AnchorPoller`'s inline-SVG check
   circle (`border-emerald-500/30 bg-emerald-500/5`), and the reference
   (`bg-emerald-50 text-emerald-600` + lucide `Check`/`ShieldCheck`). Need a
   decision on which becomes canonical (recommend the reference recipe, since
   it's the one already proven on two pages and uses the installed
   `lucide-react` icon set instead of a bespoke inline SVG).
3. **Shared status/error component** — introduce a
   `StatusPanel`/`ErrorPanel` (or similarly named) component in
   `components/ui/` generalizing `AnchorPoller`'s `ProgressStatus`/
   `SlowNotice`, reused by every `role="alert"`/`role="status"` surface in the
   certify wizard and auth forms? Recommend yes — it's the single biggest
   lever on finding #1, and the pattern already exists and is well-designed
   in `AnchorPoller.tsx`, just not shared.
4. **`loading.tsx`/`not-found.tsx` scope** — root-level only
   (`app/loading.tsx`, `app/not-found.tsx`) or also nested per-route
   (`app/(dashboard)/dtrs/loading.tsx`, `app/(dashboard)/dtrs/[id]/loading.tsx`)?
   Root-level covers the "unbranded 404" and "blank screen during RSC fetch"
   complaints; nested loading states are a UX nicety with more surface area
   (more files, more tests) for this change.
5. **`window.confirm()` replacement** — in scope (replace with a Radix
   `AlertDialog`, matching the reference's polish) or deferred? This is a
   **known, concrete test-breaking change** (`DiscardDraftButton.test.tsx`
   asserts on `window.confirm` directly) — flagging explicitly so it's a
   conscious proposal-time choice, not a surprise during apply.
6. **`(auth)/layout.tsx` extraction** — introduce one to de-duplicate the
   gradient+Wordmark+`max-w-sm` wrapper currently repeated in `login` and
   `register` and missing in `verify-email`? Low risk, recommend yes — pure
   structural move, no test currently asserts on the wrapper markup directly
   (tests target dictionary text via `screen.getByText`/`getByRole`).
7. **Record ID truncation** — truncate DTR ids in `DtrTable`
   (font-mono + ellipsis) the same way `HashOnlyCard.truncateHash()` already
   does for hashes? Low risk per the test spot-check above (existing fixture
   ids are short), but needs an explicit truncation-threshold decision
   consistent with real UUID length.

## Risks

- **`window.confirm()` removal breaks `DiscardDraftButton.test.tsx`
  unconditionally** if that decision goes to "in scope" — must be its own
  task/commit with a paired test rewrite, not silently rolled into a broader
  wizard-styling commit.
- **`Card` primitive restyle touches 3 files** (`DtrDetailCard`, `login`,
  `register`) outside the explicitly-broken list — must visually re-verify
  all three, not just the ones named in the audit.
- Reviewer-budget risk: this change spans ~15+ components plus new
  `loading.tsx`/`not-found.tsx`/`layout.tsx` files across 4 different route
  groups. `sdd-tasks` should plan for chained/stacked PRs (per-surface: auth,
  dashboard shell + history, certify wizard, global error/loading/404) rather
  than one large diff — flagging now so the delivery-strategy decision isn't
  deferred to a surprise at apply time.
- No functional/business-logic risk: every read confirms styling-only edits
  are achievable without touching hooks, API clients, or the wizard's state
  machine — the actual state-transition logic (`AnchorPoller`,
  `analysis-poll-interval`, `anchor-poll-interval`) should not need to change.

## Ready for Proposal

**Yes** — with the 7 open decisions above surfaced to the user before
`sdd-propose` locks scope, since decisions 1, 2, 3, 5, and 6 materially change
which files are touched and whether any existing test needs a paired rewrite.
