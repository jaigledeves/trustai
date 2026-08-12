# ADR-012: Guardia global de rate limiting (`APP_GUARD`) con tracker por usuario

**Estado:** Aceptada
**Fecha:** 12/08/2026
**Decisores:** Jose (Product Owner), agente IA (arquitectura)
**Relacionadas:** cambio SDD `add-global-rate-limiting`; spec
`api-rate-limiting`; comentarios previos en
`public-verification.module.ts`/`public-verification.controller.ts`
(citaban un `design.md` inexistente y mal-etiquetaban RF-042)

## Contexto

- `public-verification` es hoy el único endpoint con throttling
  (60/min GET, 20/min POST), vía un guard **module-local**
  (`@UseGuards(ThrottlerGuard)` + `ThrottlerModule.forRoot` propio del
  módulo). No existe ningún guard global (`APP_GUARD`) en la aplicación.
- Esa decisión estaba documentada únicamente como un comentario en
  código, nunca en un ADR ni en un `design.md` real:

  > "never a global `APP_GUARD` (would throttle every authenticated
  > route in the app too)"

  y otro comentario relacionado citaba "RF-042" como origen del límite
  60/20 — RF-042 es en realidad una regla de seguridad de hashes,
  **no** de rate-limiting; la cita estaba mal etiquetada desde el
  origen.
- **La razón original era válida en su momento**: con un tracker
  únicamente por IP (la única opción antes de `@nestjs/throttler` v6),
  un guard global habría compartido balde entre usuarios autenticados
  distintos detrás del mismo NAT corporativo — falso throttling. En ese
  momento, `public-verify` era la única ruta anónima de la API, así que
  limitar el problema a un guard module-local era la solución correcta
  y suficiente.
- Ese contexto cambió: `POST /assets` ahora encola `analyze-document`
  contra el adaptador de OpenAI de pago (~€0,008/doc), es una ruta
  **autenticada**, y el repositorio va a hacerse público (credenciales
  de prueba en el README) — cualquier usuario autenticado puede agotar
  crédito de la cuenta sin límite alguno. `@nestjs/throttler` v6 expone
  `getTracker` (`Promise<string> | string`), lo que permite trackear
  por identidad de usuario (`sub` del JWT) y no solo por IP.

## Problema

¿Cómo cubrir con un límite por defecto **todas** las rutas de la API
(incluida la nueva ruta de pago) sin (a) reintroducir el problema de
NAT compartido que la decisión original evitaba deliberadamente, y (b)
sin romper el comportamiento 60/20 ya testeado de `public-verification`?

## Alternativas consideradas

### A. Mantener el status quo (sin guard global)

- Pros: cero riesgo de regresión; cero cambio.
- Contras: `POST /assets` queda sin ningún límite frente al adaptador
  de OpenAI de pago; `anchor` queda sin límite frente al gasto de gas
  on-chain. No resuelve el problema que motiva este cambio.
- **Descartada.**

### B. Guard global con tracker solo por IP

- Pros: cambio mínimo, `getTracker` por defecto de la librería.
- Contras: reintroduce exactamente el riesgo que el comentario original
  advertía — dos usuarios autenticados distintos detrás del mismo NAT
  compartirían balde en **toda** la app, no solo en `public-verify`.
  Además viola directamente el requisito "Auth-Aware Request Tracking"
  de la spec.
- **Descartada.**

### C. Guard global único con tracker por usuario + overrides por ruta (elegida)

`UserAwareThrottlerGuard extends ThrottlerGuard`, registrado como
`APP_GUARD` junto a un `ThrottlerModule.forRootAsync` con throttler
nombrado `"global"` (env `THROTTLE_TTL_SECONDS`/`THROTTLE_LIMIT`).
`getTracker` decodifica el JWT del header `Authorization` con
`JwtService` (inyectado desde `AuthModule`) y devuelve `user:<sub>` si
es válido, o `ip:<ip>` en caso contrario. **TODAS** las rutas con límites
propios los declaran como overrides por ruta sobre ese único throttler:
`POST /assets` (5/min) y `POST /trust-records/:id/anchor` (10/min) con
`@Throttle({ global: {...} })`, y **`public-verification` con
`@Throttle({ global: {...} })` de 60/min GET y 20/min POST** — sus
límites históricos, ahora sobre el guard global en vez de un
`ThrottlerModule` propio. Un override por ruta siempre gana sobre el
default global `THROTTLE_LIMIT`, así que esos 60/20 no pueden ser
aflojados NI endurecidos por ese valor. Solo `GET /health` queda
totalmente exento (`@SkipThrottle({ global: true })`).

**Por qué un guard único y no dos coexistiendo:** el diseño inicial
mantenía el `ThrottlerModule` module-local de `public-verification` y lo
eximía del global con `@SkipThrottle({ global: true })`. En la práctica,
dos `ThrottlerModule` colisionan en el token de inyección de opciones de
`@nestjs/throttler`: el guard local terminaba resolviendo las opciones
del throttler `"global"` y, al pedirle que saltara `"global"`, **saltaba
todo** — desactivando silenciosamente el 60/20 (detectado por los e2e
S-PV-7/S-PV-8). Consolidar en un solo guard elimina la colisión y deja
un único mecanismo de rate limiting en toda la app.

- Pros: neutraliza el problema de NAT compartido (el tracker es por
  `sub`, no por IP, para toda ruta autenticada); cubre por defecto
  cualquier ruta futura sin override explícito (requisito "Global
  Default Throttle Coverage"); cierra la brecha de coste real
  (OpenAI, gas) que motivó este cambio.
- Contras: `getTracker` debe verificar el JWT por sí mismo — un guard
  global se ejecuta **antes** que los guards a nivel de controller
  (`@UseGuards(JwtAuthGuard)`), confirmado por el ciclo de vida de
  NestJS, así que `req.user` todavía no existe cuando el guard global
  corre. La alternativa (mover `JwtAuthGuard` a global) fue descartada
  porque rompería el requisito de "sin auth" de `public-verification`
  y `health`. Verificar el token dentro de `getTracker` es de bajo
  riesgo: es de solo lectura, no side-effects, y un token inválido cae
  a IP sin bloquear nada — la request sigue su curso y es
  `JwtAuthGuard` quien la rechaza con 401 más adelante, como siempre.

## Decisión

Se adopta la **Opción C**. Esta decisión **contextualiza y sustituye**
la regla no documentada anterior ("never a global `APP_GUARD`"): esa
regla deja de aplicarse porque su premisa (tracker solo por IP, sin
rutas autenticadas de coste real) ya no es cierta. El nuevo guard vive
en `modules/throttling/` (módulo propio, mismo patrón que
`modules/auth/`), respetando los límites hexagonales — nunca en
`ports/`/`application/`. `public-verification` deja de registrar su
propio `ThrottlerModule` y pasa a declarar sus 60/20 como overrides por
ruta sobre el guard global. Los comentarios obsoletos en
`public-verification.module.ts`/`.controller.ts` (que citaban el
`design.md` inexistente y RF-042 mal etiquetado) se corrigen para citar
este ADR-012.

## Consecuencias

**Positivas**

- Red de seguridad de coste/abuso para la ruta de pago (`POST /assets`
  → `analyze-document` → OpenAI) y para `anchor` (gas on-chain),
  ausente hasta ahora.
- El tracker por usuario neutraliza por completo la preocupación
  original de NAT compartido — dos usuarios autenticados en la misma
  IP nunca comparten balde, en ninguna ruta de la app.
- `public-verification` conserva demostrablemente sus 60/20 (override por
  ruta que siempre gana sobre el default global, no una coincidencia
  numérica; verificado en runtime por los e2e S-PV-7/S-PV-8/S-PV-9).
- Un único mecanismo de rate limiting en toda la app (un guard, un
  throttler nombrado), sin `ThrottlerModule` duplicados que colisionen.

**Negativas / coste asumido**

- El almacenamiento del throttler es en memoria y de instancia única
  (`ThrottlerStorage` por defecto) — aceptable para el piloto de una
  sola instancia, pero los contadores no se comparten si la API
  escala horizontalmente, y se reinician en cada redeploy. Un backend
  Redis-backed queda **explícitamente fuera de alcance** de este
  cambio; es un ítem de escalado futuro.
- `getTracker` duplica (de forma acotada y de solo lectura) la
  verificación de JWT que `JwtAuthGuard`/`JwtStrategy` ya hacen — dos
  puntos de verificación del mismo token en el ciclo de una request
  autenticada. Se acepta porque el guard global nunca sustituye a
  `JwtAuthGuard` como autoridad de autenticación (nunca 401 por sí
  mismo, solo cae a IP).

**Seguimiento**

- Si el proyecto pasa a múltiples instancias, revisar almacenamiento
  Redis-backed para `ThrottlerStorage` antes de confiar en los límites
  en producción.
- Si se añaden límites específicos para `/auth/*` en el futuro, seguir
  el mismo patrón de `@Throttle({ global: {...} })` por ruta.

## Referencias

- `openspec/changes/add-global-rate-limiting/design.md`
- `openspec/changes/add-global-rate-limiting/specs/api-rate-limiting/spec.md`
- `apps/api/src/modules/throttling/user-aware-throttler.guard.ts`
- `apps/api/src/modules/public-verification/public-verification.controller.ts`
  (comentario corregido)
- `@nestjs/throttler` v6 — `getTracker`, `@SkipThrottle`, `@Throttle`
