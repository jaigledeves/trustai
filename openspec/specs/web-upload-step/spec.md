# web-upload-step

Scope: the certify wizard's upload dropzone
(`apps/web/components/certify/UploadStep.tsx`) — file-picker and
drag-and-drop file selection, client-side validation, and post-selection
confirmation UI. Does not cover the wizard shell (stepper, document context
header, navigation) — see `web-certify-flow` for that.

## Purpose

The upload step MUST let a user select a PDF via either the native file
picker or by dragging a file onto the dropzone, validate it client-side
before any network call, and clearly confirm what was selected.

## Requirements

### Requirement: PDF-Only Validation On Every Selection Path

The upload step MUST reject any file whose MIME type is not
`application/pdf`, regardless of whether the file arrived via the file
picker (`onChange`) or drag-and-drop (`onDrop`). Both paths MUST run the
same validation logic. On rejection, the component MUST display
`certifyDictionary.upload.errorNotPdf` and MUST NOT set the selected file or
issue any upload request.

#### Scenario: Non-PDF file rejected via the file picker

- GIVEN the upload step is rendered with no file selected
- WHEN the user selects a `.docx` file via the file input
- THEN `certifyDictionary.upload.errorNotPdf` is displayed
- AND no file is set and no upload request is made

#### Scenario: Non-PDF file rejected via drag-and-drop

- GIVEN the upload step is rendered with no file selected
- WHEN the user drops a `.docx` file onto the dropzone
- THEN `certifyDictionary.upload.errorNotPdf` is displayed
- AND no file is set and no upload request is made

### Requirement: Drag-and-Drop File Selection

The dropzone MUST accept a file dropped onto it. `onDrop` MUST call
`preventDefault()`, read the first file from
`event.dataTransfer.files`, clear any previous validation error, and run
the same validation as the file-picker path. A valid PDF dropped onto the
zone MUST be set as the selected file.

#### Scenario: Valid PDF accepted via drag-and-drop

- GIVEN the upload step is rendered with no file selected
- WHEN the user drops a valid PDF onto the dropzone
- THEN the file is set as selected
- AND the filename is displayed

### Requirement: Drag-Over Visual Feedback

The dropzone MUST visibly change appearance while a file is being dragged
over it (border and background), and MUST revert to its resting appearance
when the drag leaves the dropzone's boundary. A drag leaving to a child
element within the dropzone MUST NOT be treated as leaving the zone.

#### Scenario: Dropzone shows a drag-over state

- GIVEN the upload step is rendered
- WHEN the user drags a file over the dropzone
- THEN the dropzone's visual state changes to indicate an active drag target

#### Scenario: Drag-over state clears when the drag leaves the zone

- GIVEN the dropzone is showing its drag-over state
- WHEN the drag leaves the dropzone's outer boundary (not into a child
  element)
- THEN the dropzone reverts to its resting appearance

### Requirement: Discoverable Drop Hint

The dropzone MUST display hint text from
`certifyDictionary.upload.dropHint` below the main dropzone label, so the
drag-and-drop affordance is discoverable and not implied by styling alone.

#### Scenario: Drop hint is visible

- GIVEN the upload step is rendered with no file selected
- WHEN the dropzone renders
- THEN `certifyDictionary.upload.dropHint` is visible below the main label

### Requirement: File Confirmation Shows Name and Size

After a file is selected via either path, the component MUST display the
filename and a human-readable size (bytes/KB/MB) rendered through
`certifyDictionary.upload.fileSizeLabel`.

#### Scenario: Selected file shows name and size

- GIVEN no file is selected
- WHEN the user selects a valid PDF via either the file picker or
  drag-and-drop
- THEN the filename is displayed
- AND the human-readable file size is displayed via
  `certifyDictionary.upload.fileSizeLabel`

### Requirement: Size Soft-Warning Above Threshold

A selected file larger than 20 MB MUST still be accepted (no hard block)
but MUST show `certifyDictionary.upload.errorSizeWarning`.

#### Scenario: Large file is accepted with a warning

- GIVEN no file is selected
- WHEN the user selects a valid PDF larger than 20 MB
- THEN the file is set as selected
- AND `certifyDictionary.upload.errorSizeWarning` is displayed

### Requirement: Submit Disabled Until a File Is Selected

The submit button MUST be disabled when no file is selected or while an
upload is pending, and MUST be enabled once a valid file is selected and no
upload is in flight.

#### Scenario: Submit is disabled with no file selected

- GIVEN no file is selected
- WHEN the upload step renders
- THEN the submit button is disabled

#### Scenario: Submit is enabled after a valid file is selected

- GIVEN no file is selected
- WHEN the user selects a valid PDF
- THEN the submit button is enabled

### Requirement: All Copy From the Dictionary (RNF-041)

Every user-facing string in the upload step, including new hint and
file-size copy, MUST come from `certifyDictionary.upload`
(`apps/web/dictionaries/es/certify.ts`). No inline JSX string literals are
permitted for user-facing text.

#### Scenario: New copy resolves through the dictionary

- GIVEN `UploadStep.tsx` renders the drop hint and file-size label
- WHEN the component tree is inspected
- THEN both strings are sourced from `certifyDictionary.upload.dropHint`
  and `certifyDictionary.upload.fileSizeLabel`, not inline literals
