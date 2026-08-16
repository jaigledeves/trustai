# 11 - MVP Definition

**Proyecto:** Ancrux
**Versión:** 1.0
**Estado:** Approved (gate de salida de la Fase 1)
**Fecha:** Julio 2026

## Objetivo

Definir exactamente qué se construye para el MVP presentable (TFM +
primera validación de producto), como recorte consciente sobre los
requisitos (06) con la arquitectura (07-10) ya decidida. Este documento
cierra la Fase 1: a partir de aquí, código.

## El MVP en una frase

> Un usuario certifica un documento (análisis IA + DTR anclado en
> testnet) y cualquier tercero lo verifica escaneando un QR, sin
> cuenta y sin confiar en Ancrux.

## Alcance

### Dentro (el camino dorado)

| Capacidad | UC | Requisitos | Notas de recorte |
|---|---|---|---|
| Auth simple | UC-07 | RF-001..003 | Organización unipersonal creada en el registro |
| Certificar | UC-01 | RF-010/011/013/014, RF-020/021/024/025, RF-030..033 | IA: resumen + clasificación (sin entidades); anclaje individual en Base Sepolia |
| Verificar público | UC-02 | RF-040/041/043/044/045/046 | La demo estrella: QR → veredicto sin cuenta |
| Historial básico | UC-03 | RF-050/051 | Lista + detalle + estados; filtros mínimos |
| Núcleo verificable | — | RNF-032/033 | `dtr-core` con canonicalización + verificación, cobertura exhaustiva |

### Fuera (consciente y documentado)

| Recorte | Era | Por qué sale | Cuándo vuelve |
|---|---|---|---|
| Versiones de activos (UC-04) | Should | No cambia la tesis del producto | Post-MVP temprano |
| Multiusuario/roles (UC-06, RF-005/006) | Should | Organización unipersonal basta para demo y primeros usuarios | Al primer despacho real |
| Extracción de entidades (RF-022) | Should | Resumen + clasificación ya demuestran la capa IA | Post-MVP |
| Certificado PDF (RF-052) | Should | El QR/URL ya materializa el valor | Post-MVP |
| Segundo proveedor IA real (Mistral) | ADR-004 | Ver enmienda ADR-004: MVP = 1 real + stub | Pre-lanzamiento comercial |
| Batching Merkle | RF-035 diseño | El diseño ya lo soporta (INV-30); operarlo no aporta a la demo | Producción con volumen |
| OCR de escaneados (RF-023) | Should | PDFs con capa de texto cubren la demo; visión si sobra tiempo | Post-MVP |
| Cupo/billing (RF-053) | Should | Sin clientes de pago no hay cupo que gestionar | Con H3 validada |

Los Won't del 06 siguen Won't (búsqueda semántica, IPFS, API pública,
multiempresa, SSO, comparación de versiones).

## Las dos IAs del proyecto (aclaración de alcance)

| Rol | Qué es | Dónde se demuestra |
|---|---|---|
| **IA del proceso** | Desarrollo asistido por IA (discovery, arquitectura, código, tests) — lo que evalúa el máster "Desarrollo con IA" | En el propio repo (docs/, ADRs, historia de commits) y en la memoria del TFM, que documentará el proceso como caso de estudio |
| **IA del producto** | Análisis documental del DTR — lo que diferencia el producto del timestamping gratuito (02) | UC-01: resumen + clasificación congelados en la evidencia |

Decisión: ambas permanecen en el MVP. La del producto en su versión
mínima (un adaptador real + stub); la del proceso documentada
deliberadamente para la memoria.

## Criterios de aceptación del MVP

El MVP está terminado cuando, en un despliegue accesible por URL:

1. Un usuario nuevo se registra, verifica su email y entra.
2. Sube un PDF, revisa el análisis IA, certifica, y ve el DTR pasar
   por sus estados hasta `CERTIFIED` (con la tx visible en el
   explorador de Base Sepolia).
3. Un tercero SIN cuenta escanea el QR, sube el mismo PDF y obtiene
   veredicto **Válido** con explicación clara y enlace a la tx.
4. El mismo PDF con un byte cambiado obtiene veredicto **No
   corresponde/alterado**.
5. La verificación es reproducible sin Ancrux: la spec de
   canonicalización y `dtr-core` permiten verificar contra el contrato
   directamente (documentado en el README).
6. `dtr-core` y el contrato tienen su suite de tests verde en CI
   (cobertura exhaustiva en canonicalización, hashing y contrato).

Los criterios 3-5 son la demo del tribunal: certificar en vivo,
verificar en vivo, romper un documento en vivo.

## Entregables TFM (BIG School) cubiertos

| Requisito TFM | Cómo lo cubre el MVP |
|---|---|
| README completo | Descripción, stack, instalación, estructura, funcionalidades, usuario de prueba |
| Repo público GitHub | Monorepo con docs/ (esta documentación es parte del valor) |
| Despliegue funcionando | MVP desplegado (~€15-20/mes, 04 §2) |
| Slides | Derivables de 01/02/04/08 (visión, mercado, viabilidad, arquitectura) |
| Vídeo con demo | El guion ES el criterio de aceptación 1-4 |

## Decisiones

1. El MVP incluye certificación + verificación completas (UC-01/02):
   son el producto, no features. El recorte alternativo (solo gestión
   documental) se evaluó y descartó — dejaba el MVP compitiendo en la
   categoría más comoditizada del 02 sin diferenciación.
2. Blockchain en testnet (gas €0) con anclaje individual: el miedo
   operativo al gas no aplica en MVP y el diseño (09) ya protege la UX
   ante fallos de red.
3. IA del producto mínima pero presente: sin ella el DTR es un
   OpenTimestamps con interfaz (02 §implicación crítica).
4. ADR-004 enmendado: MVP = 1 adaptador real + stub de desarrollo;
   Mistral entra pre-lanzamiento comercial.
5. La memoria del TFM documentará el proceso de desarrollo con IA
   (Fase 1 incluida) como caso de estudio del máster.

## Riesgos del recorte

- Organización unipersonal: si un despacho real quiere probar con
  equipo, UC-06 sube de prioridad — es el primer recorte que revierte.
- Sin OCR, los PDFs escaneados fallan la extracción: la UI debe
  comunicarlo con claridad ("este documento no tiene capa de texto")
  en lugar de fallar en silencio.
- La demo depende de Base Sepolia y del proveedor IA en vivo: plan B
  documentado — vídeo pregrabado del flujo + entorno local con stub
  (el mismo stub del ADR-004 sirve de contingencia de demo).

## Estado de implementación (actualizado tras revisión de código, 2026-07)

Verificado directamente contra `apps/api`, `apps/web` y `smart-contracts`:

| Capacidad del alcance | Estado |
|---|---|
| Auth simple (UC-07) | Implementado, incluida recuperación de contraseña (RF-003): `auth.controller.ts` (register/verify-email/login/forgot-password/reset-password/me), JWT + Argon2, tokens de reset hasheados (SHA-256, TTL 24h, un solo uso), `app/(auth)/{login,register,verify-email,forgot-password,reset-password}` |
| Certificar (UC-01) | Implementado end-to-end: `assets.controller.ts` (upload) → job `analyze-document` (IA) → `trust-records.controller.ts` (review/confirm/anchor) → jobs `anchor-dtr`/`confirm-anchor` → `CERTIFIED`. UI: `components/certify/{UploadStep,ReviewStep,ConfirmButton,AnchorPoller}` |
| Verificar público (UC-02) | Implementado: `public-verification.controller.ts` (GET hash-only + POST upload), página `app/verify/[id]`, componentes `HashOnlyCard`/`UploadVerdictPanel`/`ClientHashRecompute` |
| Historial básico (UC-03) | Implementado: `GET /trust-records` paginado + `app/(dashboard)/dtrs` (lista y detalle) |
| Núcleo verificable (`dtr-core`) | Implementado: `packages/dtr-core` (canonicalización + hashing + verificación), usado por API y web |
| Contrato `AnchorRegistry` en Base Sepolia | Desplegado: `0xe6738fb0aF94822a3831c8e0a65b5C6d20607C22` (ver docs/09) |
| Segundo adaptador IA real (Mistral) | Sigue fuera, como prevé la enmienda de ADR-004 más abajo: solo `openai` + `stub` en el código |

Los criterios de aceptación 1-2 del MVP (registro/verificación de email,
certificación hasta `CERTIFIED` con tx visible) son ejecutables hoy en el
código; los criterios 3-5 (verificación de terceros, detección de alteración,
reproducibilidad sin Ancrux) dependen de la demo en vivo y no se han
verificado en esta pasada documental (requeriría ejecutar la aplicación, no
solo leer el código).

## Referencias

- docs/06-Requirements.md (MoSCoW base del recorte)
- docs/05-Personas-UseCases.md (UC-01/02/03/07)
- docs/08-Architecture.md, docs/09, docs/10 (diseño que se implementa)
- docs/adr/ADR-004-doble-adaptador-ia.md (enmienda MVP)

## Checklist

- [x] Alcance dentro/fuera con justificación por ítem
- [x] Criterios de aceptación = guion de la demo
- [x] Entregables TFM mapeados
- [x] Plan B de demo ante fallos de terceros
- [x] Recortes con fecha/condición de retorno
- [x] Fase 2 (desarrollo) planificada y ejecutada — ver §Estado de implementación

## Próximo paso

Fase 2 — Desarrollo: bootstrap del monorepo, `dtr-core` primero
(TDD sobre canonicalización), luego contrato + suite Foundry, luego
API/worker, luego web. **Actualización:** las cuatro etapas están
implementadas (ver §Estado de implementación); el siguiente paso real es
la validación de los criterios de aceptación 3-5 en un entorno desplegado
(docs/12-Deployment.md) y la demo del tribunal.
