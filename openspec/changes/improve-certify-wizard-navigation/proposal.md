# Proposal: Improve Certify Wizard Navigation

## Intent

The certify wizard (`/dtrs/[id]`, `CertifyWizard.tsx`) is a UX dead-end: no
progress indicator across upload → analysis → review → anchor → certified
(ANCHORING shows only a hash + spinner), no confirmation of which document
is being certified (detail DTO omits asset filename/size/date), and no exit
from terminal states (no back-link; CERTIFIED/DISCARDED have zero CTAs).
Adds a stepper, persistent document context, and exit CTAs.

## Scope

**Packages**: `apps/web` (wizard UI), `apps/api` (detail DTO + repo join).
No `dtr-core`/`utils`/`smart-contracts`; no anchoring flow changes.

### In Scope
- 5-step stepper (upload, analysis, review, anchor, certified); FAILED
  analysis/anchor render inline in the current step, never a separate step.
- Expose `filename`, `sizeBytes`, `createdAt` in `GET /trust-records/:id`
  via asset join in `findByIdForOrganization`; wizard shows this
  persistently across all steps.
- Back-link to `/dtrs` in every wizard phase.
- CERTIFIED panel (`AnchorPoller.tsx`): primary "view DTR detail",
  secondary "back to Mis DTR".
- DISCARDED: CTAs "certify another" (→ `/dtrs/new`) and "back to list".

### Out of Scope
- `/dtrs` pagination/filters/search, dark mode, anchoring backend internals.

## Capabilities

### New Capabilities
- `web-certify-flow`: wizard step progress, document context, exit
  affordances; spans `apps/web` UI and the `apps/api` DTO fields it needs.

### Modified Capabilities
- None. `web-visual-coherence` covers styling only, excludes `apps/api`.

## Approach

`WizardStepper` maps existing phase state to a step index — no new state
machine, FAILED renders inline. `DocumentContextHeader` reads the new DTO
fields above the stepper. CTA rows added to `AnchorPoller`'s
CERTIFIED/DISCARDED branches, plus a persistent back-link. Copy via
`dictionaries/es/certify.ts` (RNF-041).

## Affected Areas

| Area | Impact |
|------|--------|
| `trust-record-detail-response.dto.ts` (api) | Add asset fields |
| `trust-record.repository.ts` (api) | Join `DigitalAsset` |
| `certify/CertifyWizard.tsx` | Stepper + doc context + back-link |
| `certify/WizardStepper.tsx` (new) | 5-step indicator |
| `certify/DocumentContextHeader.tsx` (new) | Filename/size/date |
| `certify/AnchorPoller.tsx` | CTAs on CERTIFIED/DISCARDED |
| `dictionaries/es/certify.ts` | New copy keys |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Asset join regresses repo query | Low | Scoped `select`, existing tests |
| Stepper treats FAILED as a 6th step | Medium | Inline error state (settled) |
| DTO change breaks consumers | Low | Additive fields only |

## Rollback Plan

Additive on both sides — `git revert` the DTO/repository commit (no data
migration) or the frontend commit(s) independently; each restores prior
`CertifyWizard.tsx` behavior.

## Dependencies

None external.

## Success Criteria

- [ ] Current step (1–5) visible throughout; errors render inline, not as a phantom step.
- [ ] Filename, size, upload date visible in every phase.
- [ ] CERTIFIED/DISCARDED offer working exit CTAs; back-link in all phases.
- [ ] `@trustai/api` and `@trustai/web` unit tests green.
