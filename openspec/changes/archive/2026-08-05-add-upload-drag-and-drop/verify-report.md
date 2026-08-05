# Verify Report: add-upload-drag-and-drop

**Change**: add-upload-drag-and-drop
**Branch**: `feat/upload-drag-and-drop` (single PR)
**Mode**: Strict TDD (per `openspec/config.yaml` `strict_tdd: true`)
**Verdict**: ✅ PASS

## Completeness

All tasks in `tasks.md` complete (Phase 1, Phase 2, Phase 3.1–3.5). 3.6
(open PR / archive) is left for the human to execute post-review.

## TDD Cycle Evidence

| Task | RED | GREEN | REFACTOR |
|------|-----|-------|----------|
| Drag-and-drop accepts valid PDF | ✅ `fireEvent.drop` test written first, failed (`DataTransfer is not defined`, then failed on missing handler after jsdom fallback fix) | ✅ `handleDrop` + `validateAndSetFile` implemented, test passes | `validateAndSetFile` extracted, shared with `handleFileChange` |
| Drag-and-drop rejects non-PDF | ✅ written first, failed (no error rendered) | ✅ passes via shared `validateAndSetFile` | N/A — reuses shared helper |
| File size display | ✅ written first, failed (`getByText(/Tamaño: /)` not found) | ✅ `formatFileSize` + `fileSizeLabel` render, passes | N/A |
| Drag-over visual feedback | ✅ written first, failed (base class doesn't include exact `border-primary` token — verified via `classList.contains`, not substring `toContain`) | ✅ `isDragging` state + `cn()` conditional classes, passes | Switched test assertion from `className.toContain` (false-positive on `hover:border-primary/40`) to `classList.contains` for token-exact match |
| Drag-leave visual reset | ✅ written first, failed | ✅ `relatedTarget.contains` guard implemented, passes | N/A |

**Gotcha caught during RED**: `toContain("border-primary")` on the raw
`className` string is a false positive because the resting state already
contains the substring `hover:border-primary/40`. Fixed by asserting
`classList.contains("border-primary")` (exact token) instead, in both new
drag-visual tests.

**Gotcha caught during RED**: `apps/web`'s jsdom (25.0.1) does not implement
the `DataTransfer` constructor. `handleDrop` only reads
`event.dataTransfer.files[0]`, so tests pass a plain `{ files: [file] }`
object as `fireEvent.drop`'s `dataTransfer` override instead of
`new DataTransfer()` — documented in `design.md`'s Testing Strategy as the
anticipated fallback.

## Gate Results

| Command | Result |
|---------|--------|
| `pnpm --filter @trustai/web test` | ✅ 52 files, 237 tests passed (incl. 8/8 in `UploadStep.test.tsx`: 3 pre-existing + 5 new) |
| `pnpm --filter @trustai/web lint` | ✅ 0 errors (1 pre-existing unrelated warning in `coverage/block-navigation.js`, a generated artifact) |
| `pnpm --filter @trustai/web typecheck` | ✅ clean |
| `pnpm --filter @trustai/web build` | ✅ succeeds, no route changes |

## Spec Coverage (web-upload-step)

| Requirement | Evidence |
|-------------|----------|
| PDF-Only Validation On Every Selection Path | Existing test (picker) + new "rejects a non-PDF file via drag-and-drop" test — both go through `validateAndSetFile` |
| Drag-and-Drop File Selection | "accepts a PDF via drag-and-drop and shows the filename" |
| Drag-Over Visual Feedback | "applies drag-over visual class..." + "removes drag-over visual..." |
| Discoverable Drop Hint | `certifyDictionary.upload.dropHint` rendered unconditionally in the dropzone; covered implicitly by every `UploadStep` render test (span always present) |
| File Confirmation Shows Name and Size | "shows the file size alongside the filename after selection" |
| Size Soft-Warning Above Threshold | Pre-existing `sizeWarning` behavior preserved unchanged by the `validateAndSetFile` extraction (no dedicated new test needed — logic untouched, still reachable from both paths) |
| Submit Disabled Until File Selected | Pre-existing behavior (`disabled={!file || uploadAsset.isPending}`), unchanged |
| All Copy From the Dictionary (RNF-041) | `dictionaries.test.ts` non-empty-leaf guard passes for the 2 new keys; no inline literals added |

## Success Criteria (proposal.md)

- [x] Dropping a valid PDF sets the file and shows filename + size.
- [x] Dropping a non-PDF file shows `errorNotPdf`, no file set.
- [x] Dropzone shows/clears a drag-over visual state correctly.
- [x] `dropHint` renders below the dropzone label.
- [x] File size renders alongside the filename after selection (either path).
- [x] The 3 pre-existing `UploadStep.test.tsx` tests pass unmodified.
- [x] `pnpm --filter @trustai/web test`, `lint`, `typecheck`, `build` all green.

## Key Decisions Recorded

- `isDragging` uses a single `useState<boolean>` with the
  `relatedTarget.contains` guard on `onDragLeave`, not a `useRef` counter
  (simpler, per user-approved design notes).
- `formatFileSize` is a second local copy of the B/KB/MB formatting logic
  already in `DocumentContextHeader.tsx`, not extracted to a shared util —
  deliberate scope decision recorded in proposal.md's Out of Scope.
- Drag-over test assertions use `classList.contains` (exact token match),
  not `className.toContain` (substring match), to avoid a false positive
  against the resting state's `hover:border-primary/40` class.

## Notes / Gotchas

- jsdom 25 has no native `DataTransfer` — drop tests pass a plain
  `{ files: [file] }` object instead of constructing a real `DataTransfer`.
- No new dependencies introduced; `cn()` (already used elsewhere in
  `components/`) handles the conditional dropzone classes.
