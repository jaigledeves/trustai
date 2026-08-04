# Proposal: Unify App Visual Language

## Intent

`apps/web`'s landing (`components/landing/*`) and public verify page
(`app/verify/[id]`, `components/verify/*`) already share one coherent visual
language (radial-gradient backdrop, `rounded-2xl border-border shadow-xl
shadow-primary/5` card recipe, emerald success moments, `font-mono` truncated
hashes). Every authenticated/secondary surface — auth pages, dashboard shell,
DTR history, certify wizard, global error/404/loading — predates that
language and reads as a visually different, less-polished product. This
change brings those surfaces on-brand with the already-proven recipe.

## Scope

**Package**: `apps/web` only. No changes to `apps/api`, `packages/dtr-core`,
`packages/utils`, or `smart-contracts`. UI copy stays Spanish via existing
`dictionaries/es/*.ts` modules (RNF-041) — styling-only change, no new copy
except dictionary keys for any new labels this change introduces.

### In Scope
- Restyle the `Card` primitive (`components/ui/card.tsx`) to the reference recipe.
- Canonical emerald success recipe (`bg-emerald-50 text-emerald-600` + lucide `Check`/`ShieldCheck`) across `StateBadge` and `AnchorPoller`.
- Shared status/error panel component extracted from `AnchorPoller`'s `ProgressStatus`/`SlowNotice`, replacing unstyled `<p role="alert|status">` across the certify wizard and auth forms.
- Root-level + fetch-route `loading.tsx`/`not-found.tsx` (`/`, `/dtrs`, `/dtrs/[id]`, `/verify/[id]`).
- Replace `window.confirm()` in `DiscardDraftButton` with a Radix `AlertDialog`, with a paired rewrite of `DiscardDraftButton.test.tsx`.
- New `(auth)/layout.tsx` deduping gradient+`Wordmark` across login/register/verify-email.
- Length-gated, font-mono truncation of DTR record IDs in `DtrTable` (accessible name preserved for short test fixtures).
- On-brand restyle: `app/error.tsx`, `app/(dashboard)/layout.tsx`, `dtrs/page.tsx` empty state, `DtrDetailCard` verdict moment + back-link, `PublicVerifyShare` copy-to-clipboard.

### Out of Scope
- `apps/api`, `packages/dtr-core`, `packages/utils`, `smart-contracts`.
- Dark-mode support (app is light-mode only per `openspec/config.yaml`; dead `dark:` classes are not removed proactively).
- Any change to certify wizard state machine, polling intervals, or API clients — styling only.
- Nested per-route `loading.tsx` beyond the four listed fetch routes.

## Capabilities

### New Capabilities
- `web-visual-coherence`: Cross-surface Tailwind/shadcn recipe (Card primitive, canonical success state, shared status/error panel, branded global error/404/loading, auth layout, ID truncation) applied to `apps/web`'s authenticated/secondary surfaces.

### Modified Capabilities
- None — no existing `openspec/specs/` capability covers landing/verify's visual language today; this introduces the first formal spec for it, scoped to the non-landing surfaces.

## Approach

Primitive-first (exploration's recommended Approach 1): restyle `ui/card.tsx`
itself rather than copy-pasting the raw Tailwind recipe per surface, so
`DtrDetailCard`, login, and register inherit the fix for free. Extract the
proven `AnchorPoller` status pattern into a shared component instead of
leaving ~10 raw `role="alert"` paragraphs uncoordinated. Convention over
one-off styling: every touched surface reuses the same primitives landing/
verify already validated.

## Affected Areas

| Area | Impact | Description |
|------|--------|--------------|
| `components/ui/card.tsx` | Modified | Reference recipe; affects `DtrDetailCard`, login, register |
| `components/ui/status-panel.tsx` (new) | New | Shared alert/status panel extracted from `AnchorPoller` |
| `components/certify/*` | Modified | Styled upload/review/confirm/discard/poller surfaces |
| `app/(auth)/layout.tsx` (new), `login`, `register`, `verify-email` | New/Modified | Deduped gradient+Wordmark, on-brand verify-email |
| `app/(dashboard)/layout.tsx`, `dtrs/page.tsx`, `history/*` | Modified | Active-nav state, card-wrapped table, CTA empty state, DTR detail verdict |
| `app/error.tsx`, `app/loading.tsx`, `app/not-found.tsx`, `dtrs/loading.tsx`, `dtrs/[id]/loading.tsx`, `verify/[id]/loading.tsx` | New/Modified | Branded global error/404/loading |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `window.confirm()` removal breaks `DiscardDraftButton.test.tsx` | High (known) | Own commit, paired test rewrite in same slice, per user-approved decision 5 |
| `Card` primitive restyle regresses 3 existing consumers | Medium | Visually re-verify `DtrDetailCard`, login, register after the primitive change, before other slices build on it |
| DTR ID truncation breaks accessible-name assertions | Low | Length-gated truncation (mirrors `truncateHash`); short test fixtures stay untruncated |
| Reviewer-budget overrun (~15+ components, 4 route groups) | Medium | Chained PRs per delivery strategy below |

## Rollback Plan

Each chained PR is an independently revertable, self-contained slice (own
tests green, own commit). Revert the specific slice's PR via `git revert` if
a regression surfaces post-merge; earlier/later slices are unaffected since
each targets a distinct surface (Card primitive slice is the sole shared
dependency and is merged first, with explicit re-verification of its 3
consumers before proceeding).

## Delivery Strategy — Chained PRs (~400-line budget each)

Following the `rebuild-public-landing` precedent, this change ships as 4
chained PRs against `feat/unify-app-visual-language`, each targeting the
previous slice's branch:

1. **Foundation**: `Card` primitive restyle + shared status/error panel (touches `DtrDetailCard`, login, register — re-verify all 3).
2. **Auth**: `(auth)/layout.tsx` extraction, verify-email restyle, gradient unification.
3. **Dashboard + history**: dashboard shell nav state, DTR list/table (CTA empty state, ID truncation), `DtrDetailCard` verdict + back-link, `PublicVerifyShare` copy-to-clipboard.
4. **Certify wizard + global**: wizard steps restyle via the shared status panel, `DiscardDraftButton` dialog + test rewrite, `error.tsx`, root/fetch-route `loading.tsx`/`not-found.tsx`.

## Dependencies

- Slices 2–4 depend on Slice 1's `Card`/status-panel primitives merging first.
- No new npm packages — `radix-ui`, `lucide-react`, `class-variance-authority` already installed.

## Success Criteria

- [ ] Auth, dashboard, history, and certify-wizard surfaces visually match the landing/verify reference recipe.
- [ ] Single canonical emerald success recipe used app-wide (no competing `StateBadge`/`AnchorPoller` variants).
- [ ] `pnpm --filter @trustai/web test` green after each slice, including the rewritten `DiscardDraftButton.test.tsx`.
- [ ] Root and the 3 fetch routes (`/dtrs`, `/dtrs/[id]`, `/verify/[id]`) have branded `loading.tsx`/`not-found.tsx`.
