# Tasks: Unify App Visual Language

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~1370 (250+300+380+440) |
| 400-line budget risk | High overall; PR4 ~440 (Medium) |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | ask-on-risk (default) |
| Chain strategy | feature-branch-chain (fixed in proposal/design already) |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | PR | Notes |
|---|---|---|---|
| 1 | `card.tsx`, `status-panel.tsx`, `skeleton.tsx`, `alert-dialog.tsx`, `lib/format.ts` | PR1 | Base: tracker branch. ~250 lines |
| 2 | `(auth)/layout.tsx`, login/register/verify-email, form `StatusPanel` | PR2 | Base PR1. ~300 lines |
| 3 | Dashboard/DTR list+detail, `StateBadge`, `PublicVerifyShare`, dtrs loading/not-found | PR3 | Base PR2. ~380 lines |
| 4 | Wizard `StatusPanel`, `AnchorPoller`, discard dialog, global fallbacks, `verify/[id]` layout (Decision 7) | PR4 | Base PR3. ~440 lines |

## Phase 1: Foundation (PR 1)

- [x] 1.1 `lib/format.ts` (new): `truncateId(value, threshold=12)`; `HashOnlyCard.tsx` imports it, drops private `truncateHash`. Check: `HashOnlyCard.test.tsx` green, no behavior change.
- [x] 1.2 `ui/card.tsx`: `rounded-xl`→`rounded-2xl`, drop `ring-1`, add `border-border shadow-xl shadow-primary/5`. Check: `DtrDetailCard.test.tsx` green; re-verify `DtrDetailCard`/login/register visually.
- [x] 1.3 RED `status-panel.test.tsx`: each variant (`pending/success/error/info`) → correct role + icon + message/action.
- [x] 1.4 GREEN `ui/status-panel.tsx` implementing the 4 variants.
- [x] 1.5 `ui/skeleton.tsx` (new): `animate-pulse rounded-md bg-muted`. Check: typecheck only.
- [x] 1.6 `ui/alert-dialog.tsx` (new): thin wrapper over `radix-ui`'s `AlertDialog`, Content = Card recipe. Check: typecheck; no new npm dep.
- [x] 1.7 Verify PR1: `pnpm --filter @trustai/web test/typecheck/lint`. Confirm Card's 3 consumers unregressed before PR2.

## Phase 2: Auth (PR 2)

- [x] 2.1 RED `(auth)/layout.test.tsx`: gradient+`Wordmark` render once around `children`.
- [x] 2.2 GREEN `app/(auth)/layout.tsx` (new, gradient `70%_60%_at_50%_-10%`); login/register/verify-email drop own wrapper, keep only `Card`/content.
- [x] 2.3 `verify-email/page.tsx`: success→`StatusPanel success` (action=Link `/login`); error `p role="alert"`→`StatusPanel error`. Check: `page.test.tsx` green, no rewrite.
- [x] 2.4 `LoginForm.tsx`: `formError`→`StatusPanel error`; disable submit + pending feedback in flight. Check: `LoginForm.test.tsx` green.
- [x] 2.5 `RegisterForm.tsx`: success block (fixes double-heading)→`StatusPanel success` action=Link `/login`; form error→`error`. Check: `RegisterForm.test.tsx` green.
- [x] 2.6 Verify PR2: `pnpm --filter @trustai/web test/typecheck/lint`. No new dictionary keys.

## Phase 3: Dashboard + History (PR 3)

- [ ] 3.1 `dtrs/page.tsx`: wrap `DtrTable` in `Card`.
- [ ] 3.2 RED extend `DtrTable.test.tsx` empty-state: assert CTA `link` to `/dtrs/new`.
- [ ] 3.3 GREEN `DtrTable.tsx`: add CTA (new `historyDictionary.list` key); apply `truncateId` + `font-mono` + `aria-label={item.id}` to row link. Check: existing id-render case stays green (fixtures under 12-char threshold; `aria-label` is the UUID safety net).
- [ ] 3.4 `DtrDetailCard.tsx`: verdict moment (`StatusPanel success` on `CERTIFIED`) + back-link to `/dtrs`. Check: extend `DtrDetailCard.test.tsx` with a new back-link assertion, no rewrite.
- [ ] 3.5 `StateBadge.tsx`: `CERTIFIED`→`bg-emerald-50 text-emerald-600`, drop unreachable `dark:` pair. Check: no test asserts classNames.
- [ ] 3.6 RED `PublicVerifyShare.test.tsx` (new): mock `navigator.clipboard.writeText`; copy writes `verifyUrl`, label swaps to `copiedLabel`.
- [ ] 3.7 GREEN `PublicVerifyShare.tsx`: copy button (`Copy`/`Check` icons). New keys: `historyDictionary.publicShare.copyLabel/copiedLabel`.
- [ ] 3.8 `dtrs/loading.tsx` (new): Card-wrapped skeleton (header + 5 rows). Check: presence test.
- [ ] 3.9 `dtrs/[id]/loading.tsx` (new): skeleton mimicking `DtrDetailCard`. Check: presence test.
- [ ] 3.10 `dtrs/[id]/not-found.tsx` (new): message + recovery Link to `/dtrs` (dashboard header persists). Check: presence test.
- [ ] 3.11 Dictionaries: add list CTA key (3.3) + `publicShare.copyLabel/copiedLabel` (3.7). Run `dictionaries.test.ts` — leaf-guard is generic, confirm green, no manual edit expected.
- [ ] 3.12 Verify PR3: `pnpm --filter @trustai/web test/typecheck/lint`. Confirm both `DtrTable.test.tsx` cases green.

## Phase 4: Certify Wizard + Global (PR 4)

- [ ] 4.1 `UploadStep.tsx`: `validationError`/`submitError`→`error`; `sizeWarning`→`info`. Check: `UploadStep.test.tsx` green.
- [ ] 4.2 `ReviewStep.tsx`: analysis-failed→`error`(title); `formError`→`error`; `saved`→`success`. Check: `ReviewStep.test.tsx` green.
- [ ] 4.3 `CertifyWizard.tsx`: discard/duplicate notices→`info`; polling status→`pending`/`info`. Check: `CertifyWizard.test.tsx` green.
- [ ] 4.4 `ConfirmButton.tsx`: error→`error`. Check: `ConfirmButton.test.tsx` green.
- [ ] 4.5 `AnchorPoller.tsx`: delete `ProgressStatus`/`SlowNotice`, consume `StatusPanel` (`READY`-error→error, in-progress→pending, cap-reached→info, `CERTIFIED`→success+explorer action). Check: `AnchorPoller.test.tsx` green.
- [ ] 4.6 `certify.ts`: add `discard.dialogTitle/cancel/confirmAction` (distinct from `discard.action`).
- [ ] 4.7 RED rewrite `DiscardDraftButton.test.tsx`: drop `window.confirm` spy entirely. Case 1: open→`getByRole("alertdialog")` w/ `confirmPrompt`→click "Sí, descartar"→MSW discard fired + `pushMock("/dtrs/new")`. Case 2: open→click "Cancelar"→no request, no push.
- [ ] 4.8 GREEN `DiscardDraftButton.tsx` rewrite using `ui/alert-dialog.tsx` (1.6) + 4.6/4.7 keys.
- [ ] 4.9 `app/error.tsx`: `<button>`→`Button`(`unstable_retry`) in `StatusPanel error` (keeps `role="alert"`); add gradient. Check: `error.test.tsx` green (exact text + "Reintentar" button preserved).
- [ ] 4.10 `app/loading.tsx` (new): self-contained centered spinner. Check: presence test.
- [ ] 4.11 `app/not-found.tsx` (new): self-contained gradient+`Wordmark`+recovery Link `/`. Check: presence test.
- [ ] 4.12 RED `verify/[id]/layout.test.tsx` (new): header (`Wordmark`+section nav) renders once around `children`.
- [ ] 4.13 GREEN — **Decision 7 (Option B, user-resolved)**: `app/verify/[id]/layout.tsx` (new) extracts the header from `page.tsx:56-78`; `page.tsx` drops inline `<header>`, keeps `<main>`+`<Footer/>`. Check: `verify/[id]/page.test.tsx` stays green (asserts text/absence-of-login-link only, not header markup) and 4.12 passes.
- [ ] 4.14 `verify/[id]/loading.tsx` (new): renders under 4.13's layout — header free, content = card skeletons. Check: presence test asserts header + skeleton.
- [ ] 4.15 `verify/[id]/not-found.tsx` (new): renders under 4.13's layout — header free, content = recovery message + Link `/`. Check: presence test asserts header + message.
- [ ] 4.16 Dictionaries: confirm `discard.*` (4.6) is the only new key; run `dictionaries.test.ts`, confirm green.
- [ ] 4.17 Verify PR4 (final): `pnpm --filter @trustai/web test/typecheck/lint/build`, then `pnpm -r build`. Confirm `DiscardDraftButton`/`DtrTable`/`verify/[id]/page`/`error` tests green; no new deps; no `dark:` additions.
