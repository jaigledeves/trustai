# Proposal: Add Drag-and-Drop to the Upload Step

## Intent

The certify wizard's upload dropzone looks and reads like a drag-and-drop
target — dashed border, `UploadCloud` icon, hover state — but has no drag
event handlers wired up. Dropping a file onto it does nothing. Wire up real
drag-and-drop, make the affordance discoverable with hint text, and show
file size alongside the filename after selection, so the component finally
matches what its own design (and its own test comments) already imply.

## Scope

**Packages**: `apps/web` only. No `apps/api`, `dtr-core`, `utils`, or
`smart-contracts` changes. No schema, no new dependencies.

### In Scope

- `apps/web/components/certify/UploadStep.tsx`: `onDrop`/`onDragOver`/
  `onDragEnter`/`onDragLeave` handlers on the dropzone `<label>`, sharing
  validation with the existing file-picker path via an extracted
  `validateAndSetFile(file)` helper.
- Drag-over visual feedback (border/background swap) while a file is
  dragged over the zone.
- Hint text below the dropzone label (`certifyDictionary.upload.dropHint`).
- Human-readable file size shown below the filename after selection, either
  path (`certifyDictionary.upload.fileSizeLabel`).
- `apps/web/dictionaries/es/certify.ts`: two new keys under `upload`.
- `apps/web/components/certify/UploadStep.test.tsx`: new drag-and-drop,
  size-display, and drag-visual-feedback tests (strict TDD — written before
  the implementation).
- New capability spec `web-upload-step` (component had none before).

### Out of Scope

- Multi-file drag-and-drop (still single-file, matching current behavior).
- Drag-and-drop for any other upload surface in the app (none exists today).
- Changing the 20 MB soft-warning threshold or the PDF-only MIME rule
  themselves — both are preserved as-is, just reused for the drop path.
- Extracting `formatSizeBytes` into a shared `apps/web/lib` util —
  `DocumentContextHeader.tsx` keeps its own local copy per its existing
  comment ("kept local... reuse if one exists, otherwise format inline");
  this change adds a second local copy in `UploadStep.tsx` rather than
  refactoring a shared helper, to keep the diff scoped to this component.

## Capabilities

### New Capabilities

- `web-upload-step`: the certify wizard's upload dropzone — file-picker and
  drag-and-drop selection, PDF-only validation, size soft-warning, and
  post-selection confirmation UI. No prior spec existed for this surface (it
  was implicitly covered by `web-certify-flow`'s wizard shell but the
  dropzone's own behavior was never specced).

### Modified Capabilities

- None. `web-certify-flow` (stepper, document context, navigation) is
  unaffected — this change is scoped entirely to the upload step's own
  component tree.

## Approach

Extract the file-picker's validation (`handleFileChange`'s body after
reading `event.target.files?.[0]`) into a `validateAndSetFile(file: File)`
helper shared by both `onChange` and the new `onDrop`. Add `isDragging`
boolean state driven by `onDragEnter`/`onDragOver` (`preventDefault` +
`setIsDragging(true)`) and `onDragLeave` (guarded by
`!e.currentTarget.contains(e.relatedTarget as Node)` so child-element
boundary crossings don't cause flicker). Apply the four handlers to the
existing `<label>`. Add a local `formatFileSize` helper (B/KB/MB) in
`UploadStep.tsx`, mirroring `DocumentContextHeader.tsx`'s pattern without
extracting a shared util (see Out of Scope). Two new dictionary keys
(`dropHint`, `fileSizeLabel`) render the new copy.

## Affected Areas

| Area | Impact |
|------|--------|
| `components/certify/UploadStep.tsx` (web) | Drag handlers, `isDragging` state, `validateAndSetFile` extraction, size display |
| `components/certify/UploadStep.test.tsx` (web) | New drag-and-drop, size, and visual-feedback tests |
| `dictionaries/es/certify.ts` (web) | New `upload.dropHint`, `upload.fileSizeLabel` keys |
| `openspec/specs/web-upload-step/spec.md` (new) | Baseline capability spec |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `onDragOver` missing `preventDefault()` silently breaks `onDrop` (browser default is to reject drops) | Medium | Explicit test asserting drop actually sets the file; design.md calls this out |
| `onDragLeave` false-fires on child hover, causing visual flicker | Medium | `relatedTarget.contains` guard + dedicated test |
| `jsdom`'s `DataTransfer`/drag event support is incomplete | Low | Verify with the exact `fireEvent.drop` + `new DataTransfer()` pattern during the RED phase before relying on it |
| New dictionary keys break the `dictionaries.test.ts` leaf-string guard | Low | Both new keys are plain non-empty strings, no template functions |

## Rollback Plan

Fully additive and isolated to one component + one dictionary file. `git
revert` the implementation commit(s) to return `UploadStep.tsx` to
file-picker-only behavior; no data, no API, no migration involved.

## Dependencies

None external. No dependency on other in-flight changes.

## Success Criteria

- [ ] Dropping a valid PDF onto the dropzone sets the file and shows
      filename + size, matching the file-picker path.
- [ ] Dropping a non-PDF file shows `certifyDictionary.upload.errorNotPdf`
      and does not set a file.
- [ ] The dropzone shows a visible drag-over state while a file is dragged
      over it, and clears it when the drag leaves the zone boundary.
- [ ] `certifyDictionary.upload.dropHint` renders below the dropzone label.
- [ ] After selection (either path), the human-readable file size renders
      alongside the filename via `certifyDictionary.upload.fileSizeLabel`.
- [ ] The 3 existing `UploadStep.test.tsx` tests still pass unmodified in
      behavior.
- [ ] `pnpm --filter @trustai/web test`, `lint`, `typecheck`, `build` all
      green.
