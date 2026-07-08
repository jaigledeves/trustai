# ADR-005: Arquitectura de detalle del frontend (App Router + Tailwind/shadcn + TanStack Query)

- **Estado:** Accepted
- **Fecha:** 2026-07-08
- **Decisores:** Jose (Product Owner), agente IA (arquitectura)
- **Relacionadas:** ADR-002 (stack full TypeScript, fija Next.js), docs/08-Architecture.md, docs/11-MVP-Definition.md

## Contexto

ADR-002 fijó **Next.js** como framework del frontend (`apps/web`), pero no bajó a las
decisiones de detalle necesarias para empezar a construir: router, sistema de
estilos/UI, gestión de estado servidor y manejo del token de sesión en el cliente.

Restricciones en juego:

- Equipo de una sola persona; el tiempo hasta una UI presentable es crítico (TFM).
- La página pública de verificación necesita SSR/metadata (ADR-002) y, por la
  consecuencia 1 de ADR-002, puede ejecutar `dtr-core` **en el navegador** para
  demostrar reproducibilidad client-side.
- El backend ya emite JWT (`POST /auth/login`) y expone `GET /auth/me`; los
  endpoints de negocio van JWT-guarded y org-scoped, salvo la verificación
  pública (UC-02) que es sin auth.
- RNF-041: interfaz en español en MVP, arquitectura preparada para i18n.

## Problema

¿Qué router, sistema de UI, capa de fetching y estrategia de sesión adoptar en
`apps/web` para maximizar UI entregada por hora sin sacrificar SSR, accesibilidad
ni la calidad del núcleo verificable?

## Alternativas consideradas

### Router

1. **App Router (elegido)** — RSC, layouts anidados, SSR/metadata de primera
   para la página pública; es el default de Next.js moderno. Contra: modelo
   mental más nuevo (server/client components).
2. **Pages Router** — más maduro y simple. Contra: en retirada, peor historia
   de SSR granular y metadata; construir hoy sobre él es deuda inmediata.

### UI / estilos

1. **Tailwind + shadcn/ui (elegido)** — componentes accesibles copiados al repo
   (no dependencia opaca), aspecto profesional sin diseñador, velocidad alta.
   Contra: verbosidad de clases.
2. **CSS/Sass a mano** — control total. Contra: lentísimo para un solo dev.
3. **Librería de componentes pesada (MUI/Chakra)** — Contra: bundle grande,
   estilo genérico, menos control sobre el markup.

### Fetching / estado servidor

1. **TanStack Query + Server Components (elegido)** — cache, reintentos, estados
   de carga/error resueltos; RSC para lecturas SSR, TanStack para interacción
   cliente (polling del estado del DTR mientras ancla). Contra: una dependencia
   más.
2. **fetch nativo + useState** — cero deps. Contra: reimplementar cache,
   reintentos y polling a mano, justo lo que la certificación asíncrona necesita.

### Sesión / JWT en cliente

1. **Cookie httpOnly (elegido)** — el token no es accesible a JS, mitiga XSS;
   requiere que el frontend hable con el backend vía un proxy/route handler que
   fije la cookie. Contra: algo más de plumbing.
2. **localStorage** — trivial. Contra: expuesto a XSS, mala práctica para
   documentación sensible de despachos (contexto del segmento).

## Decisión

`apps/web` se construye con **Next.js App Router + Tailwind CSS + shadcn/ui +
TanStack Query**, y la sesión se mantiene en una **cookie httpOnly** gestionada
por route handlers del propio Next.

Razón: es el combo que entrega más interfaz de calidad por hora para un equipo de
una persona, respeta el SSR/metadata que exige la página pública, y mantiene el
token fuera del alcance de JS (apropiado para el segmento despachos). TanStack
Query resuelve nativamente el polling del estado del DTR durante el anclaje
asíncrono, que es parte del camino dorado.

## Consecuencias

**Positivas**
- La página pública de verificación puede recomputar el hash con `dtr-core` en
  el navegador: la reproducibilidad sin confiar en TrustAI se demuestra en vivo.
- UI accesible y profesional sin diseñador dedicado.
- Polling de estados del DTR (DRAFT→…→CERTIFIED) resuelto por TanStack Query.
- Token protegido de XSS por la cookie httpOnly.

**Negativas / coste asumido**
- Curva del modelo server/client components del App Router.
- Plumbing extra para la cookie httpOnly (route handlers proxy al backend).
- shadcn/ui copia componentes al repo: hay que mantenerlos como código propio.

**Seguimiento**
- Si la app cliente creciera mucho, revisar si conviene un store global
  (Zustand) además de TanStack Query.
- i18n (RNF-041): el MVP va en español; al internacionalizar, adoptar
  `next-intl` o equivalente sobre App Router.
- Revisar la estrategia de cookie si se añade despliegue multi-dominio.
