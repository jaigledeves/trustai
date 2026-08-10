# Delta for Web Auth Flow

## ADDED Requirements

### Requirement: Login and Register Subtitles Use Plain Language and the Canonical DTR Name

`authDictionary.login.subtitle` and `authDictionary.register.subtitle`
MUST be understandable by a non-technical user without prior knowledge of
"blockchain" as an unexplained term, and MUST NOT contain the English
form "Digital Trust Records"; any reference to the certified record MUST
use the canonical "Registro Digital de Confianza (DTR)" name established
by `web-plain-language`.

#### Scenario: Login subtitle has no unexplained jargon or English DTR name

- GIVEN `authDictionary.login.subtitle`
- WHEN read on its own by a first-time visitor
- THEN it conveys what logging in gives access to in plain language, and
  it does not contain the literal substring "Digital Trust Records"

#### Scenario: Register subtitle has no unexplained jargon or English DTR name

- GIVEN `authDictionary.register.subtitle`
- WHEN read on its own by a first-time visitor
- THEN it conveys what creating an account enables in plain language, and
  it does not contain the literal substring "Digital Trust Records"

#### Scenario: Any DTR mention in auth copy uses the canonical Spanish name

- GIVEN `authDictionary.login.subtitle` and `authDictionary.register.subtitle`
- WHEN either references the certified record
- THEN it uses the canonical Spanish name in its singular ("Registro
  Digital de Confianza") or natural plural ("Registros Digitales de
  Confianza") form, with the "(DTR)" acronym expansion required only where
  the bare "DTR" acronym is later used on the same page, and it NEVER uses
  the English form "Digital Trust Records"
