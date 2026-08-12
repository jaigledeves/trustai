# ADR-013: Cluster de autenticación compartido (`HeaderAuthActions`) sin variantes por superficie

**Estado:** Aceptada
**Fecha:** 12/08/2026
**Decisores:** Jose (Product Owner), agente IA (arquitectura)
**Relacionadas:** cambio SDD `unify-auth-nav-entry`; specs `public-landing`,
`web-public-verify`, `web-visual-coherence`; `apps/web/lib/session.ts`
(precedente de funciones puras extraídas para testabilidad sin mockear
`next/headers` — mismo criterio que ADR-011 replicó para `lib/theme.ts`)

## Contexto

- `landing/Nav.tsx` siempre muestra un ícono `LogIn` + botón "Crear cuenta",
  incluso a usuarios ya logueados; `LogIn` visualmente refleja `LogOut`
  (usado para cerrar sesión), por lo que se confunde con "salir".
- `app/verify/[id]/layout.tsx` es session-aware pero no ofrece ningún CTA
  de auth cuando el visitante no tiene sesión, y muestra un shortcut
  "Certificar documento" propio cuando sí la tiene.
- `LoginForm.tsx` no tenía enlace a `/register` en el componente mismo
  (existía, pero duplicado a nivel de `login/page.tsx`).
- Cada superficie pública resuelve su propio cluster de auth de forma
  independiente, con markup, iconografía y criterios de tamaño distintos
  entre sí — no hay una única fuente de verdad visual ni de comportamiento.

## Problema

¿Cada superficie pública (landing, verify) mantiene su propio cluster de
auth inline con variantes ad-hoc (iconos, shortcuts, tamaños distintos), o
se extrae un único componente compartido, sin slots opcionales, que ambas
superficies consumen igual?

## Alternativas consideradas

### A. Mantener clusters inline por superficie, solo corrigiendo cada uno

Arreglar `Nav.tsx` (quitar `LogIn`, agregar detección de sesión) y
`verify/[id]/layout.tsx` (agregar CTA logged-out) por separado, sin
extraer un componente común.

- Pros: cambio más acotado por archivo, sin nuevo componente que mantener.
- Contras: perpetúa la causa raíz — nada impide que un futuro cambio
  reintroduzca inconsistencia (un ícono distinto, un shortcut distinto)
  entre superficies, porque no hay una única fuente de verdad que ambas
  compartan. El objetivo explícito de `web-visual-coherence` (mismo look
  en todas las superficies públicas) queda sujeto a disciplina manual, no
  a la estructura del código.
- **Descartada.**

### B. Componente compartido con slots/variant props por superficie

Un `HeaderAuthActions` que acepta props opcionales (`showCertifyShortcut`,
`size`, `iconVariant`, etc.) para que cada superficie personalice su
render.

- Pros: preserva comportamientos previos por superficie (p. ej. el
  shortcut "Certificar" en verify) sin negociar su remoción.
- Contras: las specs delta (`public-landing`, `web-public-verify`)
  requieren explícitamente que NINGUNA superficie muestre el shortcut
  "Certificar" en el cluster de auth, y que el tamaño/composición sea
  idéntico entre landing y verify — un slot por superficie reintroduce la
  misma divergencia que el cambio busca eliminar, solo que ahora
  formalizada como API en vez de duplicación de código.
- **Descartada.**

### C. Componente único, sin slots, misma composición en toda superficie (elegida)

`components/shell/HeaderAuthActions.tsx`: prop única `isAuthenticated:
boolean`, sin `variant`/slot props. Logueado-out → un único botón primario
"Acceder" (texto, nunca ícono) → `/login`. Logueado-in → "Mis DTR" (ghost)
+ `LogoutButton` existente. `ThemeToggle` queda fuera del componente,
renderizado por cada layout — no es parte del "cluster de auth" en sí.
`isAuthenticated` lo calcula cada caller con su propio `getSession()` ya
existente (o uno nuevo, en el caso de `Nav`); el componente no vuelve a
leer la cookie de sesión.

- Pros: una única fuente de verdad de markup, iconografía y tamaño para el
  cluster de auth público — imposible que landing y verify diverjan salvo
  que alguien edite este archivo. Elimina por completo la ambigüedad
  `LogIn`/`LogOut` (no hay ningún ícono de sign-in). El componente es una
  función de render pura sobre un booleano, testeable sin mockear
  `next/headers` en su propio test — extiende a un caso más simple el
  patrón de "funciones puras extraídas para testabilidad" de
  `lib/session.ts`/`lib/theme.ts` (ADR-011).
- Contras: verify pierde su shortcut "Certificar documento" de un clic
  para usuarios logueados (mitigado: "Mis DTR" → dashboard sigue siendo un
  clic); cualquier futura superficie pública que necesite un auth cluster
  distinto (p. ej. un shortcut adicional) obliga a decidir entre extender
  este componente sin variantes o crear deliberadamente uno nuevo — no hay
  camino de personalización silenciosa.
- Effort: Bajo (1 componente nuevo + 2 call sites modificados).

## Decisión

Se adopta la **Opción C**. El cluster de auth público vive en un único
componente `HeaderAuthActions`, sin props de personalización más allá de
`isAuthenticated`, consumido igual por `landing/Nav.tsx` y
`app/verify/[id]/layout.tsx`. `(dashboard)/layout.tsx` queda
deliberadamente fuera: es un shell autenticado con su propio nav completo,
no una superficie pública con estado de auth variable.

## Consecuencias

**Positivas**

- Cero divergencia estructural posible entre landing y verify para el
  cluster de auth — un solo archivo que editar si cambia el diseño.
- Elimina la ambigüedad de iconos `LogIn`/`LogOut` en todas las superficies
  públicas de una sola vez, no superficie por superficie.
- Extiende el patrón de componente puro/testeable sin mocks de
  `next/headers` que `lib/session.ts` y `lib/theme.ts` ya establecieron.

**Negativas / costo asumido**

- Verify pierde el shortcut "Certificar documento" para usuarios
  logueados; se acepta como tradeoff de coherencia (`web-visual-coherence`
  explícitamente lo requiere).
- Un futuro requisito de personalización por superficie (p. ej. un CTA
  adicional solo en una de las dos) requiere una decisión explícita de
  extender este ADR o crear un segundo componente — no hay slot "gratis"
  para ese caso.

**Seguimiento**

- Si una tercera superficie pública (p. ej. una página de precios) necesita
  este mismo cluster, debe consumir `HeaderAuthActions` tal cual, no
  bifurcar markup propio — de lo contrario, revisar este ADR.

## Referencias

- `openspec/changes/unify-auth-nav-entry/design.md`
- `openspec/changes/unify-auth-nav-entry/specs/public-landing/spec.md`
- `openspec/changes/unify-auth-nav-entry/specs/web-public-verify/spec.md`
- `openspec/changes/unify-auth-nav-entry/specs/web-visual-coherence/spec.md`
- `apps/web/lib/session.ts`, `apps/web/lib/theme.ts` (precedente de
  funciones puras testeables — ADR-011)
