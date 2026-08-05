# Tasks: Add Drag-and-Drop to the Upload Step

Single PR — one component, one dictionary file, well under review budget.
Branch: `feat/upload-drag-and-drop`. Strict TDD — write the failing test
first for each new behavior. Gate: `pnpm --filter @trustai/web test`,
`lint`, `typecheck`, `build`.

## Phase 1 — Dictionary copy

- [x] 1.1 Add `dropHint: "o arrástralo aquí"` and
  `fileSizeLabel: "Tamaño: {size}"` to `upload` in
  `apps/web/dictionaries/es/certify.ts`.

## Phase 2 — Drag-and-drop + size display (test-first)

- [x] 2.1 (test-first, RED) Add test: "accepts a PDF via drag-and-drop and
  shows the filename" — `fireEvent.drop` with a `DataTransfer` containing a
  PDF.
- [x] 2.2 (test-first, RED) Add test: "rejects a non-PDF file via
  drag-and-drop with the validation error" — same pattern with a `.docx`.
- [x] 2.3 (test-first, RED) Add test: "shows the file size alongside the
  filename after selection" — upload a PDF via the picker, assert size text
  renders.
- [x] 2.4 (test-first, RED) Add test: "applies drag-over visual class when
  dragging over the dropzone" — `fireEvent.dragOver`, assert
  `border-primary` class (or equivalent) present.
- [x] 2.5 (test-first, RED) Add test: "removes drag-over visual when drag
  leaves the dropzone boundary" — `dragEnter` then `dragLeave` with
  `relatedTarget` outside, assert the drag-over class is gone.
- [x] 2.6 Confirm all 5 new tests fail for the right reason (no handlers /
  no size text / no hint yet) before implementing.
- [x] 2.7 (GREEN) Extract `validateAndSetFile(file: File | null)` from
  `handleFileChange`'s body; `handleFileChange` calls it with
  `event.target.files?.[0] ?? null`.
- [x] 2.8 (GREEN) Add `isDragging` state + `handleDrop`/`handleDragOver`/
  `handleDragEnter`/`handleDragLeave`, wired onto the dropzone `<label>`;
  `handleDrop` calls `validateAndSetFile(e.dataTransfer.files[0] ?? null)`.
- [x] 2.9 (GREEN) Apply `isDragging`-conditional classes to the `<label>`
  via `cn()` (`apps/web/lib/utils.ts`, already used elsewhere in
  `components/`).
- [x] 2.10 (GREEN) Add local `formatFileSize(bytes: number): string`
  helper; render filename + `certifyDictionary.upload.fileSizeLabel`
  (token-replaced) in the confirmation UI.
- [x] 2.11 (GREEN) Render `certifyDictionary.upload.dropHint` below the
  existing drop label span.
- [x] 2.12 Run the 5 new tests — confirm GREEN.
- [x] 2.13 Run the 3 existing `UploadStep.test.tsx` tests — confirm still
  GREEN, unmodified.

## Phase 3 — Gate & verify

- [x] 3.1 `pnpm --filter @trustai/web test` — full suite green.
- [x] 3.2 `pnpm --filter @trustai/web lint` — clean.
- [x] 3.3 `pnpm --filter @trustai/web typecheck` — clean.
- [x] 3.4 `pnpm --filter @trustai/web build` — succeeds.
- [x] 3.5 Write `verify-report.md`; confirm all success criteria in
  `proposal.md`.
- [x] 3.6 Open PR on `feat/upload-drag-and-drop`; archive the change after
  merge (promote `specs/web-upload-step/spec.md` →
  `openspec/specs/web-upload-step/spec.md`).
