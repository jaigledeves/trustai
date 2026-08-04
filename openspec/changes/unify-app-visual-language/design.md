# Design: Unify App Visual Language

## Technical Approach

Primitive-first, per the exploration/proposal decision: restyle `ui/card.tsx`
once, extract one `StatusPanel` component from `AnchorPoller`'s proven
`ProgressStatus`/`SlowNotice` pattern, and apply the landing/verify recipe's
**exact class strings** (below) everywhere else — no new tokens, no new npm
deps. `radix-ui` (unified package, already a dependency) supplies
`AlertDialog` the same way `button.tsx`/`badge.tsx` already consume `Slot`
from it. Ships as 4 chained PRs (see Delivery/Rollout) against
`feat/unify-app-visual-language`, foundation first.

## Design Tokens & Canonical Recipes

Verbatim class strings, pulled from the reference files. Implementers copy
these; do not re-derive.

| Recipe | Class string | Source |
|---|---|---|
| Reference Card | `rounded-2xl border border-border bg-card p-6 shadow-xl shadow-primary/5` | `Hero.tsx:71`, `HashOnlyCard.tsx:38` |
| Gradient overlay wrapper | outer: `relative overflow-hidden`; overlay div: `aria-hidden="true"` + `pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_-10%,var(--accent),transparent)]` | `Hero.tsx:18-22` |
| Sticky nav | `sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur` | `Nav.tsx:29`, `verify/[id]/page.tsx:61` |
| Section header (page h1) | `text-2xl font-semibold tracking-tight` | pattern from `Hero.tsx:35`, scaled to page level |
| Pill badge (outline) | `inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm` + `<span className="size-2 rounded-full bg-emerald-500" />` | `Hero.tsx:25-33` |
| Pill badge (status/filled) | `inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600` + `<Check className="size-3.5" />` | `Hero.tsx:76-79`, `HashOnlyCard.tsx:44-47` |
| Canonical emerald success | container adds `bg-emerald-50 text-emerald-600`; icon `<Check>` (inline) or `<ShieldCheck>` (standalone badge), `size-4`/`size-5` | `HashOnlyCard.tsx:64-74`, `UploadVerdictPanel.tsx:140,144` |
| Destructive error panel | `bg-destructive/10 text-destructive` + `<ShieldAlert>`, `role="alert"` | `UploadVerdictPanel.tsx:140,144`, `HashOnlyCard.tsx:66,72` |
| Icon tile | `flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary` (use `size-11` for the larger dropzone variant) | `Hero.tsx:83-85`, `UploadVerdictPanel.tsx:77-80` |
| Uppercase label | `text-xs font-medium uppercase tracking-wide text-muted-foreground` | `Hero.tsx:73`, `HashOnlyCard.tsx:40` |
| Dropzone | label: `mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 px-6 py-10 text-center transition-colors hover:border-primary/40 hover:bg-accent/40`; hidden input: `sr-only` + explicit `aria-label` | `UploadVerdictPanel.tsx:72-91` |
| External link | `inline-flex items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline` + trailing `<ExternalLink className="size-4" />` | `HashOnlyCard.tsx:94-102` |
| Hash/mono block (canonical) | `block break-all rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-sm` | `CertifyWizard.tsx:72-74` (chosen over `DtrDetailCard`/`PublicVerifyShare`'s borderless `rounded-md bg-muted` variant — those two converge to this one, low-risk visual tweak, both already in scope) |
| Spinner | `size-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent` | `AnchorPoller.tsx:147` (`ProgressStatus`) |

## Architecture Decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Card primitive | Restyle base classes only; API (`CardHeader/Title/Content/Footer`) unchanged | 3 consumers (`DtrDetailCard`, `login`, `register`) get the reference look for free; no call-site changes needed |
| 2 | Shared status/error component | New `components/ui/status-panel.tsx`, `variant: "pending"\|"success"\|"error"\|"info"` | Generalizes `AnchorPoller`'s proven pattern; single implementation for ~12 call sites |
| 3 | Discard confirmation | Radix `AlertDialog` via existing `radix-ui` package (no new dep) | Matches reference polish; `Slot` from the same package is already used in `button.tsx`/`badge.tsx` |
| 4 | Loading/skeleton | New `components/ui/skeleton.tsx` (`animate-pulse rounded-md bg-muted`) + per-route `loading.tsx` | Lightest possible primitive; no new dep |
| 5 | `(auth)/layout.tsx` | New route-group layout wrapping gradient+Wordmark once | `app/layout.tsx` is a bare `<html>/<body>` shell (verified) — route-group layout nesting is valid, no header collision |
| 6 | ID truncation | New `truncateId`/`truncateHash` helper relocated to `lib/format.ts` | `truncateHash` today is module-private in `HashOnlyCard.tsx` only — no shared `lib/` util exists yet |
| 7 | `verify/[id]` header persistence (resolves prior open question) | Extract `app/verify/[id]/layout.tsx` carrying the header out of `page.tsx` | **User decision (Option B)**: `loading.tsx`/`not-found.tsx` must render WITH the persistent header/nav, not as bare self-contained fallbacks — see below and Open Questions |

## Card Primitive Restyle (Decision 1)

**Before** (`components/ui/card.tsx:5-21`):
```tsx
className={cn(
  "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
  className
)}
```

**After**: swap `rounded-xl` → `rounded-2xl`, drop `ring-1 ring-foreground/10`,
add `border border-border shadow-xl shadow-primary/5`. Keep the
`--card-spacing`/`data-size` machinery untouched (only `login`/`register`
pass `size="default"` explicitly, `DtrDetailCard` uses defaults — neither
relies on the ring look for meaning, only appearance):
```tsx
className={cn(
  "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-2xl border border-border bg-card py-(--card-spacing) text-sm text-card-foreground shadow-xl shadow-primary/5 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
  className
)}
```
`CardHeader`/`Title`/`Description`/`Action`/`Content`/`Footer` are unchanged.
Re-verify visually: `DtrDetailCard` (flat → shadowed/bordered — strict
improvement), `login`/`register` (`Card size="default" className="p-2"` —
`p-2` override still composes fine via `cn`'s last-wins merge).

## Shared StatusPanel Component (Decision 2)

`components/ui/status-panel.tsx`:

```tsx
type StatusPanelVariant = "pending" | "success" | "error" | "info";

interface StatusPanelProps {
  variant: StatusPanelVariant;
  title?: string;
  children?: React.ReactNode;   // message/description
  action?: React.ReactNode;     // e.g. explorer link button
  className?: string;
}
```

| Variant | Container | Default icon | Role |
|---|---|---|---|
| `pending` | `flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4` | spinner (`ProgressStatus` recipe above) | `status` |
| `success` | `flex flex-col items-center gap-3 rounded-xl bg-emerald-50 p-4 text-center text-emerald-600` | `<Check className="size-5" />` | `status` |
| `error` | `rounded-xl bg-destructive/10 p-4 text-destructive` | `<ShieldAlert className="size-5" />` | `alert` |
| `info` | `rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground` | none | `status` |

`AnchorPoller` refactors to consume `StatusPanel` directly (one
implementation, not two): `ANCHORING`/`FAILED`-in-progress → `pending`;
`FAILED`/`ANCHORING`-cap-reached → `info` (no spinner, matches today's
`SlowNotice`); `CERTIFIED` → `success` with `action={<Button ...>explorer
link</Button>}`; `READY`-error → `error`. `ProgressStatus`/`SlowNotice` are
deleted from `AnchorPoller.tsx` once `StatusPanel` covers both.

**Every call site to replace** (bare `<p role="alert|status">` / `<div
role="alert">` → `<StatusPanel variant=... >`):

| File:Lines | Current | New variant |
|---|---|---|
| `UploadStep.tsx:70,72` | `validationError`/`submitError` `role="alert"` | `error` |
| `UploadStep.tsx:71` | `sizeWarning` `role="status"` | `info` |
| `ReviewStep.tsx:46-53` | `hasAnalysisFailed` `role="alert"` div | `error` (title=`analysisFailedTitle`) |
| `ReviewStep.tsx:110` | `formError` `role="alert"` | `error` |
| `ReviewStep.tsx:111` | `saved` `role="status"` | `success` |
| `CertifyWizard.tsx:56` | `DISCARDED` message | `info` |
| `CertifyWizard.tsx:62` | duplicate notice | `info` |
| `CertifyWizard.tsx:81-85` | analysis polling status | `pending` (in progress) / `info` (cap reached) |
| `ConfirmButton.tsx:36` | `error` | `error` |
| `AnchorPoller.tsx:70` | `READY` error | `error` |
| `DiscardDraftButton` (post-dialog error) | `error` `role="alert"` | `error` |
| `LoginForm.tsx:92-99` | form-level `formError` | `error` |
| `RegisterForm.tsx` success block (66-77) | custom `role="status"` div | `success`, `action=<Link>` to login |
| `RegisterForm.tsx` form-level error (112-119) | `formError` | `error` |
| `verify-email/page.tsx` success (24-33) | plain h1/p/Link | `success`, `action=<Link>` |
| `verify-email/page.tsx` error (41) | `p role="alert"` | `error` |

**Not migrated** (out of scope, too granular): `LoginForm`/`RegisterForm`
per-field validation errors (`fieldErrors.email/password`) stay bare inline
`<p role="alert" className="text-sm text-destructive">` — the spec's call
sites list form-level banners only, not per-field text.

## Dialog for Discard (Decision 3)

**Dependency check (confirmed)**: `apps/web/package.json` has `"radix-ui":
"^1.6.2"` (the unified package) — no `@radix-ui/react-alert-dialog`
individually, and none is needed. `radix-ui` re-exports every primitive
(e.g. `import { AlertDialog } from "radix-ui"`), same pattern `button.tsx`/
`badge.tsx` already use for `Slot`. **No new dependency to add.**

New `components/ui/alert-dialog.tsx` (thin wrapper, shadcn-style, mirrors
`card.tsx`'s re-export shape):
```tsx
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
// Root, Trigger, Portal, Overlay, Content, Title, Description, Cancel, Action
// Overlay: fixed inset-0 z-50 bg-black/40
// Content: fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2
//          rounded-2xl border border-border bg-card p-6 shadow-xl shadow-primary/5
// (reference Card recipe, so the dialog itself matches the app's card language)
```

`DiscardDraftButton` rewrite: `AlertDialog.Trigger` (the existing `Button
variant="destructive"`) opens `AlertDialog.Content` with `role="alertdialog"`
(Radix sets this automatically); `Title` = new key
`certifyDictionary.discard.dialogTitle`; `Description` =
`certifyDictionary.discard.confirmPrompt` (existing key, reused); `Cancel`
= new key `discard.cancel`; `Action` (destructive, calls `handleDiscard`) =
new key `discard.confirmAction` — **deliberately distinct text** from the
trigger's `discard.action` label so tests can query trigger vs. in-dialog
confirm without `within()` disambiguation.

New dictionary keys (`certify.ts` → `discard`):
```ts
dialogTitle: "¿Descartar este borrador?",
cancel: "Cancelar",
confirmAction: "Sí, descartar",
```

**Paired test rewrite** (`DiscardDraftButton.test.tsx`): drop
`vi.spyOn(window, "confirm")`. Case 1: click trigger → assert
`screen.getByRole("alertdialog")` present with the `confirmPrompt` text →
click `getByRole("button", { name: "Sí, descartar" })` → assert the MSW
discard request fired and `pushMock` called with `/dtrs/new`. Case 2: click
trigger → click `getByRole("button", { name: "Cancelar" })` → assert no
request, dialog closes, `pushMock` not called.

## Skeleton / Loading / Not-Found / Error (Decision 4)

New `components/ui/skeleton.tsx`:
```tsx
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}
```

| File | Content |
|---|---|
| `app/loading.tsx` (new) | Root RSC-suspense fallback. `app/layout.tsx` is a bare `<html>/<body>` shell (verified) with no persistent nav, so this must be fully self-contained: centered spinner (canonical spinner recipe) in `min-h-screen flex items-center justify-center` |
| `app/not-found.tsx` (new) | Same reason — self-contained: gradient overlay + `Wordmark` (linking `/`) + heading + recovery `Link` to `/` |
| `app/(dashboard)/dtrs/loading.tsx` (new) | Dashboard layout persists (header stays); content area only: `Card`-wrapped table skeleton (header row + 5 `Skeleton` rows) |
| `app/(dashboard)/dtrs/[id]/loading.tsx` (new) | Dashboard layout persists; `Card`-wrapped skeleton mimicking `DtrDetailCard` (title bar + 3-4 skeleton lines) |
| `app/(dashboard)/dtrs/[id]/not-found.tsx` (new) | Dashboard layout persists; message + recovery `Link` to `/dtrs` inside the content area only |
| `app/verify/[id]/layout.tsx` (new — Decision 7) | Extracts the header currently inline in `page.tsx:56-78` (`Wordmark` + section-links `nav`, sticky/backdrop classes unchanged) into a route-group layout wrapping `{children}`. `page.tsx` drops the `<header>` JSX (keeps `<main>...</main>` + `<Footer />`); the `sectionLinks` array and its `landingDictionary`/`Wordmark`/`Link` imports move with it |
| `app/verify/[id]/loading.tsx` (new) | Now renders **under** `verify/[id]/layout.tsx`, so the header persists during suspense (resolves the open question below): card-shaped skeletons only in the content area, header comes from the layout for free |
| `app/verify/[id]/not-found.tsx` (new) | Now renders **under** `verify/[id]/layout.tsx` too — header persists. Content area only needs the recovery message + `Link` back to `/`; no longer needs to self-contain gradient/`Wordmark` (layout already provides the header, `notFound()` from `HashOnlyCard.tsx:126` only replaces the segment content, not the layout) |
| `app/error.tsx` (restyle) | Replace raw `<button>` with `Button` (`onClick={() => unstable_retry()}`); wrap message in `<StatusPanel variant="error">` (keeps `role="alert"` — `error.test.tsx` asserts exact text + `getByRole("button", {name: "Reintentar"})`, both preserved); add the gradient overlay wrapper for on-brand look |

## `(auth)/layout.tsx` (Decision 5)

New `app/(auth)/layout.tsx`:
```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_-10%,var(--accent),transparent)]" />
      <div className="relative flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="mx-auto"><Wordmark /></Link>
        {children}
      </div>
    </main>
  );
}
```
Note the gradient geometry converges to the reference `70%_60%_at_50%_-10%`
(replacing the auth pages' current `50%_50%_at_50%_0%`), per proposal's
"gradient unification". `login`/`register`/`verify-email` pages drop their
`<main>`/gradient/`Wordmark` wrapper and render only their `Card`/content —
**confirmed valid**: `app/layout.tsx` (root) is a bare `<html>/<body>` shell
with no header, so `(auth)/layout.tsx` nests cleanly with zero collision.

## ID Truncation (Decision 6)

**Finding**: `truncateHash` currently lives as a **module-private** function
in `HashOnlyCard.tsx:18-20` — not exported, not shared. No `lib/format.ts`
exists (`lib/` has `utils.ts`, `config.ts`, `session.ts`, `api/`,
`validation/` only).

New `apps/web/lib/format.ts`:
```ts
const DEFAULT_TRUNCATE_THRESHOLD = 12;

/** Shared with HashOnlyCard's hash truncation and DtrTable's id truncation. */
export function truncateId(value: string, threshold = DEFAULT_TRUNCATE_THRESHOLD): string {
  return value.length > threshold ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}
```
`HashOnlyCard.tsx` imports `truncateId` (renaming its local call site, same
behavior — `truncateHash` becomes a thin re-export or is dropped in favor of
the shared name; either way its threshold/format stays byte-identical so
`HashOnlyCard.test.tsx` is unaffected).

**`DtrTable.tsx:42-47` before**:
```tsx
<Link href={`/dtrs/${item.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
  {item.id}
</Link>
```
**After**:
```tsx
<Link
  href={`/dtrs/${item.id}`}
  className="font-mono text-sm font-medium text-primary underline-offset-4 hover:underline"
  aria-label={item.id}
>
  {truncateId(item.id)}
</Link>
```
`aria-label={item.id}` keeps the accessible name equal to the **full** id
regardless of truncation — `DtrTable.test.tsx`'s
`getByRole("link", { name: "tr-1" })` stays green (`"tr-1".length` = 4 ≤
threshold, so `truncateId` wouldn't even change the visible text; the
`aria-label` is the safety net for real UUIDs, which do get visually
truncated).

## Copy-to-Clipboard + Emerald Convergence (Item 8)

`PublicVerifyShare` gains a copy button next to `openLinkLabel`:
```tsx
const [copied, setCopied] = useState(false);
async function handleCopy() {
  await navigator.clipboard.writeText(verifyUrl);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
}
// <Button variant="outline" size="sm" onClick={handleCopy}>
//   {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
//   {copied ? t.copiedLabel : t.copyLabel}
// </Button>
```
New dictionary keys: `historyDictionary.publicShare.copyLabel` ("Copiar
enlace"), `.copiedLabel` ("¡Copiado!").

**Emerald convergence**: `AnchorPoller`'s `CERTIFIED` panel (custom inline
SVG check circle, `border-emerald-500/30 bg-emerald-500/5`) is replaced by
`StatusPanel variant="success"` (Decision 2) — one less bespoke recipe.
`StateBadge.CERTIFIED` (`bg-emerald-500/15 text-emerald-700
dark:bg-emerald-500/20 dark:text-emerald-300`) converges its **light-mode**
values to `bg-emerald-50 text-emerald-600` (drop the unreachable `dark:`
pair per exploration's dead-CSS note — no functional change, app is
light-only). `StateBadge`'s other states (`READY` sky, `ANCHORING` amber)
are **not** emerald and are **not** touched — they're sanctioned distinct
state semantics per the proposal's scope; only their `dark:` variants are
optionally droppable, not required this change.

## Chained-PR Decomposition (Item 9)

| PR | Contents | Rough LOC |
|---|---|---|
| **1. Foundation** | `ui/card.tsx` restyle, `ui/status-panel.tsx` (new), `ui/skeleton.tsx` (new), `ui/alert-dialog.tsx` (new), `lib/format.ts` (new) + re-verify `DtrDetailCard`/`login`/`register` render correctly | ~250 |
| **2. Auth** | `(auth)/layout.tsx` (new), `login`/`register`/`verify-email` pages simplified + restyled (`StatusPanel` success/error), `LoginForm`/`RegisterForm` form-level error → `StatusPanel`, pending-state disable (spec scenario) | ~300 |
| **3. Dashboard + History** | `(dashboard)/layout.tsx` nav-state polish, `dtrs/page.tsx` (Card wrap + CTA empty state), `DtrTable.tsx` (id truncation), `DtrDetailCard.tsx` (verdict moment + back-link), `StateBadge.tsx` (emerald convergence), `PublicVerifyShare.tsx` (copy button), `dtrs/loading.tsx`, `dtrs/[id]/loading.tsx`, `dtrs/[id]/not-found.tsx` | ~380 |
| **4. Certify Wizard + Global** | `UploadStep`/`ReviewStep`/`CertifyWizard`/`ConfirmButton` → `StatusPanel`, `AnchorPoller` refactor (delete `ProgressStatus`/`SlowNotice`, adopt `StatusPanel`), `DiscardDraftButton` (AlertDialog) + test rewrite, `app/error.tsx`, `app/loading.tsx`, `app/not-found.tsx`, **`verify/[id]/layout.tsx` extraction (Decision 7, Option B) + `page.tsx` refactor**, `verify/[id]/loading.tsx`, `verify/[id]/not-found.tsx` | ~440 |

Dependency: PR 2-4 all import from PR 1's primitives — PR 1 merges first,
its 3 re-verified consumers gate the rest.

## Test Impact (Item 10)

| File | Impact | Why |
|---|---|---|
| `DiscardDraftButton.test.tsx` | **Rewrite required** | `window.confirm` mock removed entirely; new dialog-open/confirm/cancel interaction |
| `DtrTable.test.tsx` | Safe | Fixture ids (`"tr-1"`, `"tr-2"`) are under the 12-char threshold — visually untruncated; `aria-label` makes the accessible-name assertion doubly safe |
| `error.test.tsx` | Safe | Asserts exact text + `getByRole("button", {name: "Reintentar"})` — both preserved (Button component keeps the accessible name) |
| `UploadStep.test.tsx`, `ReviewStep.test.tsx`, `CertifyWizard.test.tsx`, `ConfirmButton.test.tsx`, `AnchorPoller.test.tsx` | Safe (per exploration spot-check) | All assert accessible text/role from dictionary strings, not classNames/DOM structure |
| `LoginForm.test.tsx`, `RegisterForm.test.tsx` | Safe | Same — form-level error text and success message queried by text/role |
| `verify-email/page.test.tsx` | Safe | Success/error text and link name unchanged |
| `DtrDetailCard.test.tsx` | Safe, but **extend** | Existing assertions unaffected by Card restyle; new back-link needs a new assertion (not a rewrite) |
| `verify/[id]/page.test.tsx` | Safe | Renders the page component's return value directly (not through `layout.tsx`); doesn't assert on the `<header>` markup being dropped — only checks `HASH_ONLY_CARD`/`UPLOAD_VERDICT_PANEL` presence and absence of a login link |
| **New tests needed** | — | `status-panel.test.tsx` (variant→role/icon mapping), `alert-dialog` discard flow (folded into the rewritten `DiscardDraftButton.test.tsx`), `PublicVerifyShare.test.tsx` copy-to-clipboard (mock `navigator.clipboard.writeText`), presence checks for each new `loading.tsx`/`not-found.tsx` (render + key text), **`verify/[id]/layout.test.tsx`** (header/`Wordmark`/section-links render for `{children}`) |

Gate: run `pnpm --filter @trustai/web test` after each PR, not deferred to
`sdd-verify` only (per exploration).

## Migration / Rollout

No data migration. Each chained PR is independently revertable
(`git revert`) per the proposal's rollback plan; PR 1 (Foundation) is the
sole shared dependency and must be visually re-verified before PR 2-4 build
on it.

## Open Questions

- [x] **RESOLVED — Option B (user decision)**: `app/verify/[id]/loading.tsx`/
      `not-found.tsx` momentarily losing the page's inline header/nav was
      flagged as a tradeoff. User chose to expand scope: extract a proper
      `app/verify/[id]/layout.tsx` carrying the persistent header (moving it
      out of `page.tsx`, Decision 7 above) so `loading.tsx`/`not-found.tsx`
      render WITH the header/nav, not as bare self-contained fallbacks. Adds
      a `page.tsx` refactor (drop inline `<header>`) to PR 4's scope
      alongside the two new files — see Chained-PR Decomposition.
- [x] New dictionary keys introduced here (`discard.dialogTitle/cancel/
      confirmAction`, `publicShare.copyLabel/copiedLabel`) need
      `dictionaries.test.ts`'s leaf-value guard updated — sequenced in
      `tasks.md` as part of PR 3 (`publicShare.*`) and PR 4
      (`discard.*`), each alongside the task that introduces the keys, not
      a separate slice.
