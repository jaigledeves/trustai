# ADR-010: Verbo canónico para la acción on-chain — "anclar" sobre "registrar" (incluye el stepper de certify)

**Estado:** Aceptada
**Fecha:** 10/08/2026
**Decisores:** Jose (Product Owner), agente IA (arquitectura)
**Relacionadas:** cambio SDD `simplify-site-copy-jargon`; RNF-041 (todo string
de usuario vive en `apps/web/dictionaries`); spec `web-plain-language` ("One
Canonical On-Chain Verb Site-Wide"); spec `web-certify-flow` ("Five-Step
Progress Indicator", "Consistent On-Chain Verb Across Anchor Status
Messages"); ADR-001 (Anclar en blockchain el hash del DTR canónico completo)

## Contexto

- Antes de este cambio, el copy de `apps/web` mezclaba dos verbos distintos
  para describir la misma acción on-chain (escribir la huella del DTR en
  `AnchorRegistry`): "anclar"/"anclaje" en algunos lugares
  (`certifyDictionary.confirm.frozenHashDisclosure`,
  `historyDictionary.states.READY` → "Listo para anclar") y
  "registrar"/"registro" en otros (`certifyDictionary.anchor.anchoringMessage`
  → "Registrando…", `certifyDictionary.stepper.anchorLabel` → "Registro",
  `historyDictionary.detail.anchorNotAnchored` → "fue registrado",
  `verifyDictionary.landing.anchoredBadge` → "Registrado en blockchain").
- Esta mezcla confundía al usuario no técnico: la misma acción ("tu
  documento pasa a estar permanentemente guardado en la blockchain") se
  nombraba con dos palabras distintas según la pantalla, sin que ninguna
  fuera incorrecta en aislamiento — pero juntas rompían la consistencia
  terminológica que la spec `web-plain-language` exige.
- El propio `tasks.md`/`spec.md` de `web-certify-flow` (antes de este
  cambio) traía un texto ilustrativo parentético contradictorio: "Labels...
  never a raw technical mechanism name (e.g. 'Registro', not 'Anclaje', for
  the anchor step)" — es decir, recomendaba "Registro" como la etiqueta
  "plana" del stepper y "Anclaje" como el término técnico a evitar. Esa
  misma spec, en el mismo cambio, agregó un requisito de
  cross-consistencia nuevo: `certifyDictionary.stepper.anchorLabel` MUST
  match the verb used by `certifyDictionary.anchor.*` status messages. Los
  dos requisitos, tomados juntos, son contradictorios: no se puede usar
  "Registro" en el stepper Y compartir verbo con `anchor.anchoringMessage`
  si ese mensaje usa "anclar" (el verbo que el resto del sitio ya usaba
  mayoritariamente).

## Problema

¿Cuál de los dos verbos ("anclar" o "registrar") se adopta como el único
verbo canónico para la acción on-chain en todo el sitio — incluyendo el
label del paso 4 del stepper de certify, que el texto ilustrativo previo
de la spec sugería mantener en "Registro"?

## Alternativas consideradas

### A. "Registrar"/"registro" como verbo canónico

Unificar todo el sitio detrás de "registrar" (p. ej. "Registrando tu
documento…", `stepper.anchorLabel` = "Registro", "fue registrado").

- Pros: mantiene el texto ilustrativo original de `web-certify-flow`'s
  spec sin tocarlo; "registro" es una palabra más común/cotidiana en
  español rioplatense que "anclaje" para un usuario no técnico.
- Contras: "registro" ya es el sustantivo canónico e insustituible para el
  propio artefacto certificado ("Registro Digital de Confianza", DTR,
  bloqueado por `web-plain-language`'s "One Canonical DTR Name"
  requirement). Reusar la misma raíz léxica para el VERBO de la acción
  on-chain crea una ambigüedad real: "tu registro fue registrado" es
  confuso, y frases como `historyDictionary.list.title` = "Mis DTR" +
  "Registro Digital de Confianza" ya saturan la página de "registro" como
  sustantivo. Contradice además ADR-001, que ya fijó "anclar en blockchain
  el hash del DTR canónico" como el nombre técnico interno de la operación
  desde el día uno del proyecto — habría que reconciliar terminología
  técnica interna vs. copy de usuario en direcciones opuestas.
- **Descartada.**

### B. "Anclar"/"anclaje" como verbo canónico (elegida)

Unificar todo el sitio detrás de "anclar" (p. ej. "Anclando tu
documento…", `stepper.anchorLabel` = "Anclaje", "fue anclado"),
reservando "registro"/"Registro Digital de Confianza" exclusivamente como
sustantivo del artefacto certificado, nunca como verbo de la acción
on-chain.

- Pros: coincide con la terminología técnica ya establecida por ADR-001
  (`AnchorRegistry`, "anclaje on-chain"); elimina la ambigüedad
  sustantivo/verbo con "Registro Digital de Confianza"; ya era el verbo
  dominante en el sitio antes de este cambio (`confirm.frozenHashDisclosure`,
  `historyDictionary.states.READY`, `verifyDictionary.legal.disclaimer`'s
  contexto), así que exige menos reescritura neta; el landing ya introduce
  "anclar" antes de que el usuario llegue al wizard de certify (paso 4 de
  "Cómo funciona" + la FAQ), por lo que "Anclaje" no llega como término
  huérfano al stepper.
- Contras: reversa el texto ilustrativo parentético previo de la spec de
  `web-certify-flow` ("e.g. 'Registro', not 'Anclaje'"), que databa de
  antes de que esa misma spec agregara el requisito de cross-consistencia
  de verbo. Requiere tocar `certifyDictionary.stepper.anchorLabel`,
  `.anchor.anchoringMessage`, `.anchor.certifiedMessage`,
  `historyDictionary.detail.anchorNotAnchored`, y
  `verifyDictionary.landing.anchoredBadge`/`page.badge` — el blast radius es
  chico pero toca cinco strings en tres dictionaries.
- Effort: Bajo.

## Decisión

Se adopta la **Opción B**. "Anclar"/"anclaje" es el único verbo canónico
para la acción on-chain (escribir la huella del DTR en `AnchorRegistry`)
en todo `apps/web`, incluyendo `certifyDictionary.stepper.anchorLabel`
("Registro" → "Anclaje"). El requisito de cross-consistencia de
`web-certify-flow`'s spec (`stepper.anchorLabel` MUST match
`anchor.*Message`'s verb) prevalece sobre el texto ilustrativo parentético
previo, que quedó desactualizado por ese mismo requisito y por la
terminología ya fijada en ADR-001.

"Registro"/"registro" sigue siendo válido, exclusivamente, como el
sustantivo del artefacto certificado ("Registro Digital de Confianza
(DTR)") — nunca como verbo ni participio de la acción on-chain. Esta
distinción sustantivo/verbo queda enforced por un test automatizado
(`dictionaries.test.ts`'s "uses one canonical on-chain verb lemma" —
prohíbe la familia léxica "registra"/"registrando"/"registrado" en los
strings de acción/estado on-chain, permite "registro"/"registros" como
sustantivo).

## Consecuencias

**Positivas**

- Elimina la inconsistencia terminológica de dos verbos para la misma
  acción, cumpliendo `web-plain-language`'s "One Canonical On-Chain Verb
  Site-Wide".
- Alinea el copy de usuario con la terminología técnica interna ya fijada
  por ADR-001, reduciendo el riesgo de que un futuro cambio reintroduzca
  "registrar" por copiar del código/nombres de contrato.
- Resuelve, sin trabajo adicional, la inconsistencia preexistente
  "anclado" (verify) vs. "registrado" (dtrs) para el mismo estado
  "todavía no anclado" (spec `web-dtr-list` — "Detail View Terminology
  Consistency").

**Negativas / coste asumido**

- Reversa un texto ilustrativo previamente aceptado en la spec de
  `web-certify-flow`; cualquier documentación externa o captura de
  pantalla que muestre el stepper con "Registro" queda desactualizada.
- Coexisten, deliberadamente, dos raíces léxicas distintas en el sitio
  ("anclar" para el verbo, "registro" para el sustantivo del DTR) — un
  futuro colaborador debe conocer esta ADR para no "corregir" una hacia la
  otra por error.

**Seguimiento**

- Si en el futuro se introduce un locale adicional (`en/`), este mismo
  criterio sustantivo/verbo debe replicarse explícitamente (p. ej. "anchor"
  como verbo vs. "record" como sustantivo del DTR), no traducirse
  literalmente palabra por palabra.

## Referencias

- `openspec/changes/simplify-site-copy-jargon/design.md` (decisiones #1 y
  #2)
- `openspec/changes/simplify-site-copy-jargon/specs/web-plain-language/spec.md`
  ("One Canonical On-Chain Verb Site-Wide")
- `openspec/changes/simplify-site-copy-jargon/specs/web-certify-flow/spec.md`
  ("Five-Step Progress Indicator", "Consistent On-Chain Verb Across Anchor
  Status Messages")
- `apps/web/dictionaries/es/dictionaries.test.ts` (cross-dictionary
  consistency assertions)
- `apps/web/dictionaries/es/certify.ts`, `history.ts`, `verify.ts`
- ADR-001 (`docs/adr/ADR-001-anclaje-hash-dtr-canonico.md`)
