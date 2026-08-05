# web-dtr-list (delta)

## ADDED Requirements

### Requirement: DTR Acronym Explanation on the List Page

The `/dtrs` page MUST render a one-line subtitle below the `<h1>` heading
expanding what "DTR" means, reusing the established Spanish term already
used by the public landing/verify pages ("Registro Digital de Confianza
(DTR)"), so a first-time user landing on their own record list
immediately understands the acronym. The subtitle text MUST come from
`historyDictionary.list.subtitle` (`apps/web/dictionaries/es/history.ts`),
never an inline literal (RNF-041).

#### Scenario: List page shows the DTR expansion subtitle

- GIVEN a user opens `/dtrs`
- WHEN the page renders
- THEN a subtitle rendering `historyDictionary.list.subtitle` appears
  below the `<h1>{historyDictionary.list.title}</h1>` heading, regardless
  of whether the list has records or is empty
