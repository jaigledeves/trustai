# Design: Add Drag-and-Drop to the Upload Step

## Technical Approach

Single component, single dictionary file, no new dependencies. Extract the
existing file-picker validation into a shared helper so both selection paths
(`onChange`, `onDrop`) run identical logic, then wire the four native drag
events onto the existing `<label>` dropzone.

## Component Changes (`UploadStep.tsx`)

### Shared validation

```ts
function validateAndSetFile(selected: File | null) {
  setValidationError(null);
  setSizeWarning(null);
  setSubmitError(null);
  setFile(null);

  if (!selected) return;
  if (selected.type !== PDF_MIME_TYPE) {
    setValidationError(certifyDictionary.upload.errorNotPdf);
    return;
  }
  if (selected.size > SIZE_WARNING_THRESHOLD_BYTES) {
    setSizeWarning(certifyDictionary.upload.errorSizeWarning);
  }
  setFile(selected);
}
```

`handleFileChange` and `handleDrop` both reduce to reading a `File | null`
from their respective event and calling `validateAndSetFile`. This is a
pure refactor of existing logic — no behavior change for the file-picker
path (covered by the 3 existing tests, which MUST keep passing unmodified).

### Drag handlers

```ts
function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
  e.preventDefault();
  setIsDragging(false);
  validateAndSetFile(e.dataTransfer.files[0] ?? null);
}

function handleDragOver(e: React.DragEvent<HTMLLabelElement>) {
  e.preventDefault(); // required — browsers reject drops without this
  setIsDragging(true);
}

function handleDragEnter(e: React.DragEvent<HTMLLabelElement>) {
  e.preventDefault();
  setIsDragging(true);
}

function handleDragLeave(e: React.DragEvent<HTMLLabelElement>) {
  if (e.currentTarget.contains(e.relatedTarget as Node)) return; // moved to a child, not a real leave
  setIsDragging(false);
}
```

`isDragging` is a single `useState<boolean>` — no `useRef` counter. The
`relatedTarget.contains` check on `onDragLeave` is the standard fix for the
well-known "dragleave fires on every child boundary crossing" DOM quirk;
using a ref-counter is an alternative but adds a second piece of state for
no behavioral gain here, so the simpler guard wins (per user-approved
design notes).

All four handlers attach to the existing `<label>`:

```tsx
<label
  htmlFor="upload-file"
  onDrop={handleDrop}
  onDragOver={handleDragOver}
  onDragEnter={handleDragEnter}
  onDragLeave={handleDragLeave}
  className={cn(
    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
    isDragging
      ? "border-primary bg-accent/40"
      : "border-border bg-muted/40 hover:border-primary/40 hover:bg-accent/40",
  )}
>
```

No `cn`/`clsx` helper currently exists in this file — check
`apps/web/lib` for an existing className-merge utility before adding one;
if none exists, a plain ternary on the `className` string is sufficient and
avoids introducing a new dependency.

### Size formatting

A local `formatFileSize(bytes: number): string` helper (B/KB/MB), same
shape as `DocumentContextHeader.tsx`'s `formatSizeBytes` but not imported
from it — see proposal.md's "Out of Scope" for why this change does not
extract a shared util. Rendered via the token-replace pattern already used
by `certify.ts` for other templated strings:

```ts
certifyDictionary.upload.fileSizeLabel.replace("{size}", formatFileSize(file.size))
```

### Confirmation UI

```tsx
{file ? (
  <p className="text-sm text-muted-foreground">
    <span className="font-medium text-foreground">{file.name}</span>
    <br />
    {certifyDictionary.upload.fileSizeLabel.replace("{size}", formatFileSize(file.size))}
  </p>
) : null}
```

### Hint text

Rendered as a second `<span>` inside the `<label>`, below the existing
`dropLabel` span:

```tsx
<span className="text-xs text-muted-foreground">{certifyDictionary.upload.dropHint}</span>
```

## Dictionary Changes (`dictionaries/es/certify.ts`)

```ts
upload: {
  // ...existing keys unchanged
  dropHint: "o arrástralo aquí",
  fileSizeLabel: "Tamaño: {size}",
},
```

Both are plain strings (satisfies the `dictionaries.test.ts` non-empty-leaf
guard); `fileSizeLabel`'s `{size}` token is replaced in the component, same
pattern as other templated dictionary strings in this repo.

## Testing Strategy (strict TDD)

Written RED (failing) before implementation, per `openspec/config.yaml`
`strict_tdd: true`:

1. `fireEvent.dragOver` on the dropzone label → asserts `border-primary`
   class present (drag-over visual feedback).
2. `fireEvent.dragEnter` then `fireEvent.dragLeave` with a `relatedTarget`
   outside the zone → asserts `border-primary` class is gone.
3. `fireEvent.drop` with a `DataTransfer` containing a valid PDF → asserts
   filename renders (drag-and-drop acceptance).
4. `fireEvent.drop` with a `DataTransfer` containing a `.docx` → asserts
   `errorNotPdf` renders, no file set (drag-and-drop rejection, mirrors the
   existing file-picker rejection test).
5. Upload a PDF via the existing `user.upload` path → asserts the size text
   is present alongside the filename (size display, path-agnostic).

`DataTransfer` construction pattern for jsdom (verify during RED — jsdom 25
per `apps/web/package.json`):

```ts
const dt = new DataTransfer();
dt.items.add(new File(["..."], "doc.pdf", { type: "application/pdf" }));
fireEvent.drop(dropzone, { dataTransfer: dt });
```

If jsdom's `DataTransfer.items.add` does not behave as expected, fall back
to passing a plain `{ files: [file] }` object as the `dataTransfer`
override on `fireEvent.drop` — `handleDrop` only reads
`e.dataTransfer.files[0]`, so either shape satisfies the component under
test.

The 3 existing tests (non-PDF rejection via picker, successful upload +
navigate, duplicate notice) MUST keep passing with no changes to their
assertions — the picker path's behavior is unchanged by the
`validateAndSetFile` extraction.

## Rollback

Fully additive; `git revert` the implementation commit returns
`UploadStep.tsx` and `certify.ts` to their pre-change state. No data, no
API, no migration.
