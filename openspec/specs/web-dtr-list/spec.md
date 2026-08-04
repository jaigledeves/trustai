# web-dtr-list

Scope: browsing the org's DTR list at `/dtrs` — pagination controls,
filename search, and state filter. Spans the `apps/web` list UI and the
`apps/api` `GET /trust-records` query contract it depends on.

## Purpose

The list MUST let a user page through all of the organization's records and
narrow them by document name or lifecycle state, org-scoped and validated.

## Requirements

### Requirement: Filtered & Paginated List Query

`GET /trust-records` MUST accept optional query params `page` (integer, default
1, clamped `>= 1`), `pageSize` (integer, default 20, clamped `1..100`),
`search` (string, filename filter), and `state` (one of `TrustRecordState`:
`DRAFT`, `READY`, `ANCHORING`, `CERTIFIED`, `FAILED`, `DISCARDED`). Params MUST
be validated by a query DTO; an invalid `state` MUST return `400`, never `500`.
Filtering MUST be applied at the query level within the caller's organization
(RNF-004) — never by post-filtering an unscoped result. `search` MUST match
`DigitalAsset.filename` case-insensitively (`contains`). The response shape MUST
remain `{ items, total, page, pageSize }`, where `total` reflects the filtered
count.

#### Scenario: Filter by state returns only matching records

- GIVEN an org with records in `DRAFT` and `CERTIFIED`
- WHEN `GET /trust-records?state=CERTIFIED`
- THEN only `CERTIFIED` records are returned and `total` counts only those

#### Scenario: Case-insensitive filename search

- GIVEN a record whose asset filename is `Contrato.pdf`
- WHEN `GET /trust-records?search=contrato`
- THEN that record is returned

#### Scenario: Invalid state is rejected

- GIVEN any authenticated caller
- WHEN `GET /trust-records?state=BOGUS`
- THEN the API responds `400` (not `500`)

#### Scenario: Filters never leak across organizations

- GIVEN org B owns a record named `Secreto.pdf`
- WHEN org A calls `GET /trust-records?search=secreto`
- THEN org A receives no items for org B's record

#### Scenario: Search with no match returns an empty page, not 404

- GIVEN an org with records, none matching `zzz`
- WHEN `GET /trust-records?search=zzz`
- THEN the response is `{ items: [], total: 0, page: 1, pageSize: 20 }`

### Requirement: List Search & Filter Controls

The `/dtrs` page MUST render a filename search input and a state filter control
above the table. Their state MUST be reflected in the URL query string
(`searchParams`), so a filtered view is deep-linkable and survives reload.
Changing a control MUST navigate to the same page with updated params and reset
to page 1. All labels/placeholders MUST come from
`historyDictionary.list` (`apps/web/dictionaries/es/history.ts`), never inline
literals (RNF-041).

#### Scenario: Deep-linking a filtered URL renders that filter

- GIVEN a user opens `/dtrs?state=CERTIFIED&search=contrato`
- WHEN the page renders
- THEN the controls show that state and search, and the table shows the matching page

#### Scenario: Changing a filter resets to page 1

- GIVEN the user is on `/dtrs?page=3`
- WHEN they apply a state filter
- THEN the URL becomes page 1 with the new `state` param

### Requirement: Pagination Controls

The `/dtrs` page MUST render pagination controls driven by `page`, `pageSize`,
and `total`. "Previous" MUST be disabled on page 1; "Next" MUST be disabled when
the current page is the last (`page * pageSize >= total`). The controls MUST
show the current position (e.g. page X of N). Navigating MUST update the `page`
URL param and preserve active `search`/`state`. Labels MUST come from
`historyDictionary.list`.

#### Scenario: Next disabled on the last page

- GIVEN `total = 25`, `pageSize = 20`, `page = 2`
- WHEN the controls render
- THEN "Next" is disabled and "Previous" is enabled

#### Scenario: Navigating preserves active filters

- GIVEN `/dtrs?state=CERTIFIED&page=1` with more than one page
- WHEN the user clicks "Next"
- THEN the URL becomes `state=CERTIFIED&page=2`

### Requirement: Distinct Empty States

When a filtered/searched query returns zero items, the table MUST show a
"no matches" message distinct from the onboarding empty-state (which invites
certifying a first document). The onboarding empty-state MUST show only when the
org has no records AND no active filter/search. Both messages MUST come from
`historyDictionary.list`.

#### Scenario: Filtered no-match shows the no-matches message

- GIVEN an org with records but none matching the active search
- WHEN the list renders
- THEN it shows the "no matches" message, not the "certify your first document" CTA

#### Scenario: Truly empty org shows onboarding CTA

- GIVEN an org with zero records and no active filter
- WHEN the list renders
- THEN it shows the onboarding empty-state with the certify CTA
