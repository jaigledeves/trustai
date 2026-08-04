# web-visual-coherence

Scope: `apps/web` auth, dashboard, history, and certify-wizard surfaces,
aligned to the landing/verify reference recipe.

## Requirements

### Requirement: Consistent Card Container

`DtrDetailCard` and the auth pages' form card MUST use the `Card` primitive
(`components/ui/card.tsx`) as one shared container.

#### Scenario: Detail and auth surfaces share one Card recipe

- GIVEN `DtrDetailCard`, `login`, `register`
- WHEN each renders its content
- THEN each is wrapped in the shared `Card` primitive

### Requirement: Canonical Success/Error Visual Semantics

Success (DTR certified, email verified) MUST use one emerald +
`lucide-react` `Check`/`ShieldCheck` recipe. Errors MUST use destructive
styling, announced via `role="alert"`.

#### Scenario: Success uses the canonical emerald recipe

- GIVEN a DTR reaches `CERTIFIED` or email verification succeeds
- WHEN the success state renders
- THEN it matches `StateBadge`/`AnchorPoller`'s emerald + icon recipe

#### Scenario: Error state is destructive and announced

- GIVEN any wizard, auth, or global error
- WHEN it renders
- THEN it uses destructive styling and `role="alert"`

### Requirement: Shared Status/Error Panel Usage

Status/error surfaces in the certify wizard, auth forms, and
`app/error.tsx` MUST use one shared panel (extracted from `AnchorPoller`'s
`ProgressStatus`/`SlowNotice`), never a bare `<p role="alert|status">` or
raw `<button>`.

#### Scenario: Wizard/auth status surfaces use the shared panel

- GIVEN a status/error in `UploadStep`, `ReviewStep`, `ConfirmButton`,
  `AnchorPoller`, or `DiscardDraftButton`
- WHEN it renders
- THEN it uses the shared panel, keeping its dictionary message and `role`

#### Scenario: Global error boundary offers a retry button

- GIVEN a route segment throws
- WHEN `app/error.tsx` renders
- THEN a `Button` invoking `unstable_retry` shows, announced via
  `role="alert"`

### Requirement: Route-Level Loading and Not-Found Fallbacks

`/`, `/dtrs`, `/dtrs/[id]`, `/verify/[id]` MUST each render a branded
`loading.tsx` while fetching. The root, a dead `/dtrs/[id]`, and a dead
public `/verify/[id]` MUST each render a branded `not-found.tsx` with a
recovery link.

#### Scenario: Async route shows a branded fallback

- GIVEN navigation to one of these routes with a pending fetch
- WHEN Next.js suspends the segment
- THEN that route's `loading.tsx` renders

#### Scenario: Dead record renders branded not-found with recovery

- GIVEN a nonexistent DTR id, an unmatched verify id, or an unmatched root
  route
- WHEN the route resolves to not-found
- THEN a branded view renders with a link back to `/dtrs` or `/`

### Requirement: Auth Surface Cohesion

`(auth)/layout.tsx` MUST render the shared gradient + `Wordmark` once for
`login`, `register`, `verify-email`; `verify-email` MUST show a distinct
success/error state with a recovery link; auth forms MUST disable submit
and show pending feedback in flight.

#### Scenario: Wordmark and gradient render once per auth page

- GIVEN `/login`, `/register`, or `/verify-email`
- WHEN the page renders
- THEN `Wordmark` and gradient appear once, from `(auth)/layout.tsx`

#### Scenario: verify-email shows success/error state with recovery

- GIVEN `/verify-email` opened with a valid or invalid/expired token
- WHEN the page resolves
- THEN the matching `authDictionary.verifyEmail` state renders with a link
  back into the auth flow

#### Scenario: Submitting an auth form shows pending state

- GIVEN a visitor submits `LoginForm` or `RegisterForm`
- WHEN the request is in flight
- THEN submit is disabled and shows pending feedback

### Requirement: History Navigation Affordances

`DtrTable`'s empty state MUST include a link to `/dtrs/new`; `DtrDetailCard`
MUST include a link back to `/dtrs`.

#### Scenario: Empty history renders a create-DTR CTA

- GIVEN `total === 0`
- WHEN `DtrTable` renders
- THEN `historyDictionary.list.emptyState` plus a link to `/dtrs/new` show

#### Scenario: Detail view links back to the list

- GIVEN the DTR detail route renders `DtrDetailCard`
- WHEN inspected
- THEN a link with an accessible name pointing to `/dtrs` is present

### Requirement: Dialog-Based Discard Confirmation

`DiscardDraftButton` MUST confirm via an accessible dialog
(`role="alertdialog"`), not `window.confirm()`, using
`certifyDictionary.discard.confirmPrompt` as its message.

#### Scenario: Confirming discards the draft

- GIVEN the discard dialog is open
- WHEN the user confirms
- THEN the draft is discarded and routed to `/dtrs/new`

#### Scenario: Dismissing keeps the draft

- GIVEN the discard dialog is open
- WHEN the user cancels or closes it
- THEN no discard request is sent

### Requirement: Truncated Yet Accessible Record IDs

`DtrTable` MUST truncate ids over a length threshold in `font-mono`; ids at
or under it (`"tr-1"`-style fixtures) MUST NOT be truncated. The row link's
accessible name MUST equal the full id.

#### Scenario: Long id is truncated but fully accessible

- GIVEN an id longer than the threshold
- WHEN `DtrTable` renders its row link
- THEN the text is truncated but the accessible name equals the full id

### Requirement: Copy-to-Clipboard for Public Verify URL

`PublicVerifyShare` MUST offer a copy action for the verify URL, distinct
from its "open link" action, with copy-success feedback.

#### Scenario: Copy action copies the URL and confirms

- GIVEN `PublicVerifyShare` renders with a `verifyUrl`
- WHEN the visitor activates the copy action
- THEN the exact `verifyUrl` is written to the clipboard and confirmed
