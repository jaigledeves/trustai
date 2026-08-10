# ADR-011: Theming con cookie + Server Component en vez de `next-themes` (SSR sin FOUC)

**Estado:** Aceptada
**Fecha:** 10/08/2026
**Decisores:** Jose (Product Owner), agente IA (arquitectura)
**Relacionadas:** cambio SDD `add-dark-mode-toggle`; spec `web-theme`
("SSR Renders Correct Theme Class (No FOUC)", "System Theme Follows OS
Preference"); `apps/web/lib/session.ts` (precedente de funciones puras
extraídas para testabilidad sin mockear `next/headers`)

## Contexto

- `apps/web` ya tiene un bloque `.dark {}` completo en `globals.css` (tokens
  shadcn) pero ningún mecanismo lo activa — no hay toggle, ni lectura de
  preferencia, ni lógica de resolución de tema en ningún punto del código.
- El requisito no es solo "agregar un botón": la spec `web-theme` exige
  explícitamente que `app/layout.tsx` (Server Component) renderice la clase
  `dark` correcta **antes de la hidratación** (sin flash de tema incorrecto,
  sin warning de mismatch de hidratación) y que `system` se resuelva vía un
  script bloqueante pre-paint.
- `apps/web` es 100% App Router (Next.js 16) con Server Components como
  default; el resto del proyecto favorece lógica del lado del servidor
  cuando es posible (p. ej. `getSession()`/`lib/session.ts` para la sesión,
  nunca un store de cliente para ese estado).

## Problema

¿Se resuelve la preferencia de tema con la librería `next-themes` (el
estándar de facto en el ecosistema Next.js) o con un mecanismo propio de
cookie + lectura server-side en `layout.tsx`?

## Alternativas consideradas

### A. `next-themes`

Agregar la dependencia `next-themes`, envolver `Providers` con su
`ThemeProvider`, usar su hook `useTheme()` para el toggle.

- Pros: API probada y ampliamente usada; maneja `system` y el listener de
  `matchMedia` internamente; su propio script de inyección ya resuelve el
  caso FOUC.
- Contras: es una dependencia nueva para un problema que la propia spec ya
  reduce a "una cookie + un script pequeño" — el override explícito de la
  proposal es justamente "no next-themes" (Out of Scope). `next-themes`
  guarda la preferencia en `localStorage` por defecto (no en una cookie),
  lo que rompe el requisito de que `app/layout.tsx` (Server Component) lea
  la preferencia **server-side**: `localStorage` no existe en el servidor,
  así que `next-themes` sin más SIEMPRE renderiza sin clase en el servidor
  y corrige 100% client-side — es decir, el propio "no FOUC" de
  `next-themes` depende igual de un script bloqueante pre-paint, pero sin
  que el servidor participe en absoluto. Para hacerlo leer de cookie
  server-side hay que reimplementar manualmente la lectura de cookie en
  `layout.tsx` de todos modos (no es gratis), quedando con **dos** fuentes
  de verdad para el mismo problema (la librería + nuestra lectura manual).
  Su `ThemeProvider` también exige `suppressHydrationWarning` en `<html>`
  — el mismo costo que la opción B, sin evitarlo.
- **Descartada.**

### B. Cookie + Server Component (elegida)

`app/layout.tsx` lee la cookie `theme` vía `next/headers` `cookies()` y
resuelve la clase server-side; un script bloqueante propio (≈10 líneas) en
`<head>` resuelve `system`/cookie ausente pre-paint; un componente cliente
`ThemeToggle` escribe la cookie y muta `documentElement.classList`
directamente, sin pasar por React state global ni por un provider nuevo.

- Pros: cero dependencias nuevas; una única fuente de verdad (la cookie,
  legible tanto en servidor — `next/headers` — como en cliente, al no ser
  `httpOnly`); el server-side ownership real que la spec exige llega
  gratis, en vez de ser un parche sobre una librería pensada para
  resolución client-first; la lógica de resolución (`parseThemePreference`,
  `resolveServerHtmlClassName`) queda como funciones puras testeables sin
  mocks, siguiendo el mismo patrón ya establecido por
  `buildSessionCookieOptions` en `lib/session.ts`.
- Contras: hay que escribir y mantener a mano la lógica que `next-themes`
  ya tiene empaquetada (parsing de cookie, script de resolución, listener
  de `matchMedia` para cambios de OS en vivo) — el "blast radius" en código
  propio es mayor que agregar una dependencia. Cualquier edge case que
  `next-themes` ya resolvió (multi-tab sync, `prefers-color-scheme`
  cross-browser) queda a cargo del equipo.
- Effort: Bajo-Medio (≈1 archivo nuevo `lib/theme.ts` + cambios puntuales en
  `layout.tsx` y 2 navs).

## Decisión

Se adopta la **Opción B**. `apps/web` resuelve el tema con una cookie
`theme` (`light|dark|system`) leída server-side en `app/layout.tsx` y
escrita client-side por `ThemeToggle`, sin `next-themes`. El mismo criterio
de "funciones puras extraídas para testabilidad" que `lib/session.ts` ya
estableció para la cookie de sesión se replica en `lib/theme.ts` para la
cookie de tema.

## Consecuencias

**Positivas**

- Cero dependencias nuevas (coherente con el Out of Scope explícito de la
  proposal).
- El Server Component es la fuente de verdad real del tema en el primer
  render, no un parche añadido sobre una librería client-first.
- Reutiliza un patrón de testabilidad ya validado en el proyecto
  (`lib/session.ts`), reduciendo la curva de aprendizaje para quien lea
  `lib/theme.ts` después.

**Negativas / costo asumido**

- El equipo mantiene a mano la lógica de resolución de `system` (listener
  de `matchMedia`, limpieza en `useEffect`) que una librería madura ya
  probó en producción en muchos proyectos.
- **Todas las rutas pasan a renderizado dinámico (`ƒ Dynamic`)**: leer
  `cookies()` dentro de `app/layout.tsx` (Server Component raíz) hace
  que Next.js marque cada ruta como dinámica, desactivando la generación
  estática (`○ Static`). Esto es esperado y no regresivo para este
  proyecto (Vercel + Railway pueden servir SSR sin restricción), pero
  elimina la ventaja de HTML pre-generado en la landing pública. Si en el
  futuro el rendimiento de la landing importa, la alternativa sería leer
  el tema solo en layouts de ruta que lo necesiten, o mover la clase al
  `<body>` mediante el script bloqueante exclusivamente.
- Un futuro requisito más complejo (p. ej. temas por organización, más de
  2 variantes, sincronización entre pestañas) puede justificar revisar
  esta decisión y adoptar `next-themes` u otra librería en ese momento.

**Seguimiento**

- Si en el futuro se agrega un tercer locale o un tema adicional a
  `light|dark|system`, revisar si el costo de mantenimiento manual sigue
  siendo menor que adoptar una librería.

## Referencias

- `openspec/changes/add-dark-mode-toggle/design.md` (decisión #3, contrato
  de cookie, script de inicialización, reconciliación de hidratación)
- `openspec/changes/add-dark-mode-toggle/specs/web-theme/spec.md`
- `apps/web/lib/session.ts` (precedente `buildSessionCookieOptions`)
