# ADR-014: Clasificador de severidad de veredicto compartido y token semántico `--warning`

**Estado:** Aceptada
**Fecha:** 12/08/2026
**Decisores:** Jose (Product Owner), agente IA (arquitectura)
**Relacionadas:** cambio SDD `honest-verdicts-and-landing-copy`; specs
`web-public-verify` ("Four Verdicts", "Accessible Verdict Outcome Roles"),
`public-landing` ("Honest Verification Demo"), `web-theme` ("Semantic
Warning Token"); ADR-011 (theming cookie + Server Component, introduce el
dark mode de toda la app); requisito canónico `public-landing` — "Light-
Mode-Only Styling"

## Contexto

- `UploadVerdictPanel.tsx` (`/verify/[id]`) y `VerificationDemo.tsx`
  (landing) implementan, cada uno por su cuenta, una función local
  `isErrorVerdict` que reduce los cuatro veredictos reales del backend
  (`VALID`, `PENDING_ANCHOR`, `ASSET_MISMATCH`, `INVALID_RECORD`) a un
  split binario verde/rojo. `PENDING_ANCHOR` —que significa "todavía no
  hay nada anclado ni probado"— cae en el lado "no error" y se renderiza
  idéntico a `VALID`: mismo verde, mismo ícono `Check`. Esto contradice
  la tesis central del producto (verificación honesta y sin depender de
  confianza): un estado "en progreso" no puede leerse como "éxito".
- El proyecto ya tiene precedente de un token semántico de dos piezas
  (`--success`/`--success-foreground`, `:root` + `.dark` + mapeo en
  `@theme inline`) para exactamente este propósito — comunicar un estado
  de negocio sin hardcodear una utilidad de color.
- El requisito canónico `public-landing` — "Light-Mode-Only Styling"
  (sin `.dark`, sin `--success*`, solo `emerald-*`) ya está violado hoy
  por código en producción (`Hero.tsx` y `VerificationDemo.tsx` usan
  `bg-success/10 text-success`): predata tanto la adopción del token
  `--success` como el dark mode de toda la app (ADR-011).

## Problema

Dos decisiones de diseño con un tradeoff real cada una:

1. ¿Dónde vive la lógica de clasificación de severidad — duplicada en
   cada componente (estado actual), o extraída a un módulo compartido?
2. ¿Cómo se resuelve el requisito canónico "Light-Mode-Only Styling",
   que este cambio necesita violar deliberadamente (agregando
   `bg-warning` junto al ya-existente `bg-success`) para poder tratar
   `PENDING_ANCHOR` como un tercer estado honesto?

## Alternativas consideradas

### Ubicación del clasificador

**A. Mantener la duplicación** (cada componente con su propio
`isErrorVerdict`, ahora extendido a 3 estados). Descartada: el problema
original (honestidad del veredicto) es exactamente lo que se está
arreglando; perpetuar dos copias de la misma regla de negocio es
repetir el mismo riesgo de que diverjan en un futuro cambio de copy o
de estados.

**B. Colocar el clasificador en uno de los dos componentes e importarlo
desde el otro** (p. ej. definirlo en `verify/` e importarlo desde
`landing/`). Descartada: crea un acoplamiento direccional entre dos
árboles de features que hoy son independientes (`components/landing` y
`components/verify`), y ese acoplamiento no tiene ninguna razón de
dominio — la clasificación de veredicto no le "pertenece" más a verify
que a landing, le pertenece al dominio de verificación en general.

**C. Extraer a `apps/web/lib/verify/verdict.ts` (elegida).** Sigue el
mismo patrón ya validado por `lib/theme.ts` y `lib/validation/auth.ts`:
función pura + test colocado, sin dependencias de React/DOM en la
función de clasificación. `lib/` es neutral respecto a ambos árboles de
componentes.

### Resolución del requisito "Light-Mode-Only Styling"

**A. Registrar `bg-warning`/`bg-success` en `VerificationDemo` como
excepción documentada, sin tocar el texto del requisito canónico.**
Descartada: dejaría un requisito canónico permanentemente falso (ya lo
está hoy) con una lista de excepciones creciendo cambio a cambio, en
vez de corregir la causa — el requisito quedó desactualizado por
decisiones posteriores del proyecto (adopción de `--success`, ADR-011).

**B. Angostar el alcance del requisito en el archive de este cambio
(elegida).** El texto pasa a reflejar la realidad ya vigente: los
indicadores de éxito/pendiente de landing usan los tokens semánticos
`--success`/`--warning` (light + dark), igual que el resto de la app.
Se retira el mandato `emerald-*`/solo-light-mode. Esta reescritura
ocurre en `sdd-archive`, no en este documento de diseño — está fuera de
alcance para `honest-verdicts-and-landing-copy` hacer una auditoría de
tokens más amplia.

## Decisión

Se adopta la **Opción C** para el clasificador: `classifyVerdict(verdict):
"success" | "pending" | "error"` y la tabla de presentación
`VERDICT_SEVERITY_STYLES` (clase Tailwind, ícono `lucide-react`, rol ARIA)
viven en `apps/web/lib/verify/verdict.ts`, consumidos sin duplicación por
`UploadVerdictPanel` y `VerificationDemo`.

Se adopta la **Opción B** para el requisito canónico: al archivar este
cambio, `openspec/specs/public-landing/spec.md` — "Light-Mode-Only
Styling" se reescribe para autorizar `--success`/`--warning` en vez de
prohibirlos, en lugar de agregar una excepción puntual a un texto que ya
no describe la intención real del proyecto.

## Consecuencias

**Positivas**

- Una sola fuente de verdad para "qué severidad tiene este veredicto" y
  "qué feature lo transmite" (clase/ícono/rol), reutilizable si aparece
  un tercer consumidor (p. ej. un futuro dashboard de veredictos).
- El requisito canónico vuelve a ser verdad después del archive, en vez
  de seguir acumulando divergencia entre lo documentado y lo shippeado.
- El nuevo par `--warning`/`--warning-foreground` sigue exactamente el
  mismo mecanismo de `--success` (mismo lugar en `:root`/`.dark`/`@theme
  inline`), sin introducir un segundo patrón de tokens en el proyecto.

**Negativas / costo asumido**

- `lib/verify/` es un directorio nuevo dentro de `lib/`; small overhead
  de navegación hasta que tenga más de un archivo.
- La reescritura del requisito canónico es un cambio de alcance
  ligeramente mayor al de un `design.md` típico — requiere coordinación
  explícita en `sdd-archive` para no perder de vista qué motivó el
  cambio de texto.

**Seguimiento**

- Si aparece un tercer color semántico (p. ej. "info"), evaluar si
  amerita generalizar `VERDICT_SEVERITY_STYLES` a un helper de tokens
  más genérico en `lib/`, en vez de seguir copiando el patrón `--success`
  a mano por cada par.

## Referencias

- `openspec/changes/honest-verdicts-and-landing-copy/design.md`
  (tabla de severidad, wiring exacto de `--warning`, valores oklch)
- `openspec/changes/honest-verdicts-and-landing-copy/proposal.md`
- `apps/web/app/globals.css` (patrón `--success`/`--success-foreground`)
- `docs/adr/ADR-011-cookie-server-component-theming-sobre-next-themes.md`
