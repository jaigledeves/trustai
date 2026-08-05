# Exploration: Add Drag-and-Drop to the Upload Step

## Question

The certify wizard's upload dropzone (`apps/web/components/certify/UploadStep.tsx`)
looks like a drag-and-drop target (`UploadCloud` icon, dashed border, hover
state) but has zero drag event handlers — dragging a file onto it silently
does nothing. What must change to make the affordance real, and what else is
missing around file confirmation?

## Current State (grounded in code)

- `UploadStep.tsx` renders a `<label>` styled as a dropzone wrapping a hidden
  `<input type="file">`. The only wired handler is `onChange` →
  `handleFileChange`, which validates MIME type (`application/pdf`) and a
  20 MB soft-size-warning threshold, then calls `setFile`.
- No `onDrop`/`onDragOver`/`onDragEnter`/`onDragLeave` exist anywhere in the
  component. The dashed border and hover styles (`hover:border-primary/40
  hover:bg-accent/40`) are load-bearing UI hints for a capability that isn't
  implemented.
- `UploadStep.test.tsx`'s first test already documents the intent in a
  comment: *"a user can still get a non-PDF file through (e.g.
  drag-and-drop), so the JS-level validation must catch it too"* — the test
  bypasses `userEvent`'s accept-attribute simulation specifically to prove
  the JS-level (not browser-picker-level) validation runs. Drag-and-drop was
  clearly intended from the start but never wired up.
- After a file is selected (via the only working path today, the file
  picker), the confirmation UI shows only `file.name` — no size. A sibling
  component, `DocumentContextHeader.tsx`, already has a local
  `formatSizeBytes` helper (B/KB/MB, not exported) used to show the asset's
  `sizeBytes` after upload — a close pattern to mirror.
- Copy lives in `certifyDictionary.upload` (`apps/web/dictionaries/es/certify.ts`,
  RNF-041). No `dropHint` or `fileSizeLabel` keys exist yet.
- No capability spec exists for this component. `web-certify-flow` covers the
  wizard shell (stepper, document context header, navigation, terminal-state
  CTAs) but explicitly does not cover the upload step's own validation/drag
  behavior.

## What makes this Easy vs Hard

**Easy:** the validation logic to reuse for `onDrop` already exists in
`handleFileChange` — it just needs extracting into a shared
`validateAndSetFile(file)` helper. No new dependencies; `fireEvent` from
`@testing-library/react` (already imported transitively via RTL) covers drag
event simulation.

**Watch out:**
- `onDragOver` MUST call `preventDefault()` or the browser will never fire
  `onDrop` at all (this is a a real DOM quirk, not a project quirk).
- `onDragLeave` fires on every child boundary crossing too — must guard with
  `!e.currentTarget.contains(e.relatedTarget as Node)` to avoid flicker.
- `jsdom`'s `DataTransfer` support must be verified when writing the drop
  tests (`new DataTransfer()` + `dt.items.add(file)`).

## Direction

New capability `web-upload-step` (component was previously unspecced). Three
fixes in one cycle, confirmed scope with the user:

1. Real drag-and-drop, sharing validation with the file-picker path.
2. `certifyDictionary.upload.dropHint` — visible hint text ("o arrástralo
   aquí") so the affordance is discoverable, not just implied by styling.
3. `certifyDictionary.upload.fileSizeLabel` — show human-readable file size
   next to the filename after selection (either path).

No API changes; `apps/web` only.
