# ADR-009: Web es dueña del copy de veredictos y del aviso eIDAS (Opción W)

**Estado:** Aceptada
**Fecha:** 05/08/2026
**Decisores:** Jose (Product Owner), agente IA (arquitectura)
**Relacionadas:** cambio SDD `refocus-verify-page-copy`; RNF-041 (todo string
de usuario vive en `apps/web/dictionaries`); RF-045 (veredicto en lenguaje
claro, sin implicar validez eIDAS)

## Contexto

- `/verify/[id]` (`HashOnlyCard.tsx`) renderiza hoy dos strings en inglés
  que vienen del backend bajo etiquetas en español: `result.explanation`
  (una de 4 frases fijas, `EXPLANATIONS` en
  `verify-document.use-case.ts`) y `result.disclaimer`
  (`EIDAS_DISCLAIMER`, una sola frase, en `eidas-disclaimer.ts`).
- El propio comentario de `eidas-disclaimer.ts` ya anticipaba esto: *"a
  future copy change — pending product/legal sign-off — touches exactly
  one place."*
- Auditoría confirmada (`exploration.md`): el disclaimer actual dice que la
  verificación "certifies document integrity and authorship metadata", pero
  el schema DTR (`packages/dtr-core/src/schema.ts`) sólo captura
  `provenance` de **análisis de IA** (`provider/model/modelVersion/...`),
  nunca autoría humana. Es un overclaim.
- `HashOnlyCard.tsx` es el **único** consumidor que muestra estos dos
  campos a un usuario final; `UploadVerdictPanel.tsx` recibe los mismos
  campos en su respuesta pero ya los ignora hoy, renderizando en cambio
  `verifyDictionary.verdicts[verdict]` (copy propio del dictionary).

## Problema

¿Dónde debe vivir el texto en español de (a) el copy explicativo de cada
veredicto y (b) el aviso legal eIDAS, sin violar RNF-041 ni introducir
trabajo de `strict_tdd` en capas que no son las dueñas reales del
requisito (RF-045 es un requisito de **qué ve el usuario**, no de qué capa
posee el string)?

## Alternativas consideradas

### A. Traducir las constantes de `apps/api`

Traducir `EXPLANATIONS`/`EIDAS_DISCLAIMER` a español en `apps/api`,
manteniendo una única fuente de verdad servida por el backend.

- Pros: un solo string, sin riesgo de drift.
- Contras: mete una preocupación de presentación/i18n en la capa de
  aplicación, violando RNF-041 literalmente (el string no viviría en
  `apps/web/dictionaries`) y la regla de límites hexagonales de
  `openspec/config.yaml` ("no adapter logic in ports/use-cases" — el copy
  es lógica de presentación); exige ciclos RED/GREEN `strict_tdd` en
  `verify-document.use-case.spec.ts` y `public-verification.e2e-spec.ts`
  (ambos hoy comparan `EIDAS_DISCLAIMER` por igualdad exacta) para un
  cambio cuyo único consumidor real es la vista web; si el frontend suma
  más locales en el futuro, el backend necesitaría strings por locale
  también, duplicando el patrón de dictionary un nivel más abajo.
- **Descartada.**

### B. Web es la fuente de verdad del copy (Opción W, elegida)

`verify.ts` gana el copy de veredicto (consolidado en `verdicts.*.message`)
y un nuevo grupo `legal.disclaimer`; `HashOnlyCard.tsx` deja de leer
`result.explanation`/`result.disclaimer`. La API/DTO no se toca: sigue
devolviendo sus strings en inglés en el wire (cualquier consumidor no-web
los sigue recibiendo), pero la web los ignora para mostrar.

- Pros: cumple RNF-041 literalmente; cero cambios en `apps/api` (sin
  riesgo de límites hexagonales, sin trabajo `strict_tdd` del lado API);
  replica el patrón que `verdicts` ya usa hoy (el propio comentario de
  `verify.ts` ya anticipa este split); blast radius mínimo confirmado en
  `exploration.md` (un componente, su test, un dictionary); la corrección
  "sin autoría" del disclaimer queda como copy puramente web, así que una
  futura corrección legal nunca toca código de dominio.
- Contras: coexisten dos "disclaimers" (el string en inglés de la API,
  legado/no usado por la web, y el string en español de `verify.ts`,
  fuente de verdad de display) — riesgo real, aunque menor, de que un
  futuro engineer "corrija" sólo un lado y el otro quede desactualizado en
  silencio.
- Effort: Bajo.

## Decisión

Se adopta la **Opción W**. `apps/api`'s `EXPLANATIONS`/`EIDAS_DISCLAIMER`
quedan **legado, sólo de contrato** (el DTO los sigue exponiendo por
estabilidad de contrato con consumidores no-web), nunca renderizados por
`apps/web`. `apps/web/dictionaries/es/verify.ts` es la única fuente de
verdad de display para el copy de veredicto y el aviso eIDAS.

El texto en español final del aviso eIDAS (`legal.disclaimer`) queda
**pendiente de sign-off legal/producto**: la marca es un comentario interno
en el código fuente (mismo patrón que el comentario ya existente en
`eidas-disclaimer.ts`), nunca un texto visible al usuario final — el
propio aviso ya le dice al usuario que la verificación no es una firma
electrónica cualificada; agregar una segunda nota de "y este texto no está
finalizado" suma duda sin beneficio de confianza claro, y ni RF-045 ni el
Reglamento eIDAS exigen exponer el estado de sign-off interno.

## Consecuencias

**Positivas**

- RNF-041 se cumple sin excepciones nuevas.
- Cero cambios/tests en `apps/api` para este ciclo.
- El overclaim de autoría se corrige sólo en la capa que realmente lo
  muestra al usuario.

**Negativas / coste asumido**

- Drift risk: dos disclaimers (API legado en inglés vs. web en español)
  deben documentarse claramente (comentario en `verify.ts` + esta ADR) para
  que una futura corrección no actualice sólo uno.
- El texto final del disclaimer en español queda pendiente de sign-off
  legal — bloqueo de producto, no técnico; gate documentado aquí.

**Seguimiento**

- Si en el futuro se confirma que ningún consumidor no-web necesita
  `explanation`/`disclaimer` en el DTO, evaluar deprecarlos — fuera de
  alcance de este cambio.
- Cuando `apps/web` soporte más de un locale, este mismo patrón
  (dictionary por locale) es el que debe replicarse — no volver a la
  Opción A.

## Referencias

- `openspec/changes/refocus-verify-page-copy/design.md`
- `openspec/changes/refocus-verify-page-copy/specs/web-public-verify/spec.md`
- `openspec/changes/refocus-verify-page-copy/exploration.md`
- `apps/web/dictionaries/es/verify.ts`
- `apps/web/components/verify/HashOnlyCard.tsx`
- `apps/api/src/application/verification/verify-document.use-case.ts`,
  `eidas-disclaimer.ts` (no modificados — legado de contrato)
- RNF-041, RF-045 (`docs/06-Requirements.md`)
