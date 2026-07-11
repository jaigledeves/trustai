# API Endpoints — TrustAI

**Fuente:** código real de `apps/api/src/modules/**` (leído en la fecha de esta
pasada de documentación). Cualquier discrepancia futura entre este documento y
el código es drift — corregir aquí, no inventar.

Base URL en despliegue: la de Railway (ver `docs/12-Deployment.md`). Todas las
rutas van prefijadas tal cual las expone Nest (sin prefijo global adicional).
Documentación interactiva: Swagger/OpenAPI vía `@nestjs/swagger` en `main.ts`.

## Convenciones transversales

- **Auth**: JWT Bearer (`JwtAuthGuard`) en todos los módulos salvo
  `public-verification` y `health`. El payload (`JwtPayload`) incluye
  `sub` (userId) y `organizationId` — todo endpoint autenticado escopa por
  `organizationId` (RNF-004): un recurso de otra organización responde
  **404**, nunca 403 (para no filtrar existencia).
- **Errores**: `BadRequestException` (400), `NotFoundException` (404),
  conflictos de estado de un `TrustRecord` (409, ver casos de uso).
- **Público**: solo `POST/GET /public/verify/:id` no requiere auth; está
  protegido por `ThrottlerGuard` (rate limit propio, no el guard global).

## `health`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/health` | No | Liveness check. Devuelve `{ status: "ok", version }`. |

## `auth`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/register` | No | Crea `Organization` + usuario admin; dispara email de verificación (adaptador stub en MVP). |
| GET | `/auth/verify-email?token=` | No | Verifica el email con el token enviado. |
| POST | `/auth/login` | No | Login con email+password (Argon2). Devuelve JWT. |
| GET | `/auth/me` | JWT | Perfil del usuario autenticado (echo del payload del JWT). |

## `assets`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/assets` | JWT | Sube un PDF (`multipart/form-data`, campo `file`). Solo `application/pdf`. Hashea (SHA-256) y cifra (AES-256-GCM), crea `DigitalAsset` + `TrustRecord` en `DRAFT`. Si la organización ya tiene un asset con el mismo SHA-256, devuelve el DTR existente (RF-012, idempotencia). |
| GET | `/assets/:id` | JWT | Detalle de un asset, escopado a la organización del caller (404 cross-org). |

## `trust-records`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/trust-records?page=&pageSize=` | JWT | Lista paginada (RNF-004, escopado en la query, nunca post-filtrado). `pageSize` clamp a 100. Org sin registros devuelve `{ items: [], total: 0 }`, nunca 404. |
| GET | `/trust-records/:id` | JWT | Detalle completo: estado, `canonicalHash`, campos IA, anchor (txHash/blockTimestamp/status) si existe, y `analysisFailureReason` si el job `analyze-document` falló. |
| PATCH | `/trust-records/:id/review` | JWT | Edita campos IA (`summary`/`classification`/`language`) mientras el registro está en `DRAFT`. 409 fuera de `DRAFT` (INV-21). Patch parcial. |
| POST | `/trust-records/:id/confirm` | JWT | Ensambla y canonicaliza el DTR (RFC 8785 + SHA-256 vía `dtr-core`), fija `canonicalHash` una única vez (INV-22/24). `DRAFT -> READY`. 409 si no está en `DRAFT`, ya confirmado, o falta análisis/procedencia (RF-025/INV-26). |
| POST | `/trust-records/:id/discard` | JWT | `DRAFT -> DISCARDED`. 409 desde cualquier otro estado. |
| POST | `/trust-records/:id/anchor` | JWT | `READY -> ANCHORING`. Encola el job `anchor-dtr` y responde de inmediato (no bloqueante, RF-032/RNF-022): la tx on-chain se envía en background. 409 si no está `READY` o falta `canonicalHash`. |

## `public-verification` (montado solo si `PUBLIC_VERIFICATION_ENABLED=true`)

Sin `JwtAuthGuard`; módulo estructuralmente separado de `trust-records`/`assets`
(RF-040). Único guard: `ThrottlerGuard` de su propio `ThrottlerModule` (nunca
global, para no limitar rutas autenticadas).

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/public/verify/:id?channel=QR\|URL\|HASH` | No (throttled, límite configurable por `PUBLIC_VERIFY_GET_THROTTLE_LIMIT`, default 60/min) | Verificación solo por hash: existencia, estado y veredicto de anclaje. Nunca devuelve análisis IA ni contenido (INV-41). `id` desconocido -> **404**. |
| POST | `/public/verify/:id?channel=QR\|URL\|HASH` | No (throttled, límite configurable por `PUBLIC_VERIFY_POST_THROTTLE_LIMIT`, default 20/min) | Verificación completa subiendo el documento (`multipart/form-data`, campo `file`). Recalcula SHA-256 y compara contra el asset certificado; corrobora on-chain. `analysis` solo si el veredicto es `VALID`/`PENDING_ANCHOR`. `id` desconocido -> **200 `INVALID_RECORD`**, nunca 404 (asimetría deliberada GET vs POST). |

Veredictos posibles (`VerificationAttemptVerdict`): `VALID`,
`ASSET_MISMATCH`, `PENDING_ANCHOR`, `INVALID_RECORD`.

## Flujos de punta a punta

### Certificación (UC-01)

Diagrama fuente: [`docs/diagrams/sequence/certify-flow.mmd`](../diagrams/sequence/certify-flow.mmd)

```mermaid
sequenceDiagram
    title Flujo de certificación (UC-01) — verificado contra el código

    actor U as Usuario (org)
    participant W as Web (CertifyWizard)
    participant API as API (AssetsController / TrustRecordsController)
    participant Q as pg-boss (worker in-process)
    participant AI as AiAnalysisPort (OpenAI / stub)
    participant DB as PostgreSQL (Prisma)
    participant CH as AnchorPort (viem) / Base Sepolia

    U->>W: Sube PDF (UploadStep)
    W->>API: POST /assets (multipart/form-data)
    API->>DB: crea DigitalAsset + TrustRecord DRAFT (idempotente por sha256, RF-012)
    API->>Q: encola job analyze-document
    API-->>W: 201 UploadAssetResponseDto

    Q->>AI: analiza texto extraído (unpdf.adapter)
    AI-->>Q: resumen + clasificación + idioma
    Q->>DB: guarda aiSummary/aiClassification/aiLanguage

    U->>W: Revisa análisis (ReviewStep)
    W->>API: PATCH /trust-records/:id/review (opcional, edita campos)
    API->>DB: actualiza campos IA en DRAFT

    U->>W: Confirma (ConfirmButton)
    W->>API: POST /trust-records/:id/confirm
    API->>API: dtr-core: canonicaliza (RFC 8785) + SHA-256 -> canonicalHash
    API->>DB: TrustRecord DRAFT -> READY (canonicalHash fijado, INV-22/24)
    API-->>W: 200 ConfirmTrustRecordResponseDto

    W->>API: POST /trust-records/:id/anchor
    API->>DB: TrustRecord READY -> ANCHORING
    API->>Q: encola job anchor-dtr (no bloqueante, RNF-022)
    API-->>W: 200 AnchorTrustRecordResponseDto (state ANCHORING)

    Q->>CH: submitAnchor(canonicalHash) (AnchorDtrHandler)
    CH-->>Q: txHash
    Q->>DB: Anchor.status = PENDING, guarda txHash

    loop confirm-anchor (poll cada 15s, timeout 10 min)
        Q->>CH: espera 2 confirmaciones (isAnchored / receipt)
    end
    Q->>DB: Anchor confirmado -> TrustRecord CERTIFIED (INV-32)

    W->>API: GET /trust-records/:id (polling, AnchorPoller)
    API-->>W: 200 detalle con anchor.txHash + state CERTIFIED
```

### Verificación pública (UC-02)

Diagrama fuente: [`docs/diagrams/sequence/verify-flow.mmd`](../diagrams/sequence/verify-flow.mmd)

```mermaid
sequenceDiagram
    title Flujo de verificación pública (UC-02) — verificado contra el código

    actor V as Verificador (sin cuenta)
    participant W as Web (/verify/[id])
    participant API as API (PublicVerificationController)
    participant UC as VerifyDocumentUseCase
    participant DB as PostgreSQL (Prisma)
    participant CH as AnchorPort.isAnchored / Base Sepolia

    Note over V,W: Camino A — solo hash (QR / URL, sin subir archivo)
    V->>W: Escanea QR o abre URL /verify/:id
    W->>API: GET /public/verify/:id?channel=QR
    API->>UC: verifyByHash({ trustRecordId, channel })
    UC->>DB: busca TrustRecord + Anchor
    UC->>CH: isAnchored(canonicalHash) (fallback a Anchor.status si falla la lectura on-chain)
    CH-->>UC: anchored=true/false
    UC-->>API: verdict VALID/PENDING_ANCHOR/ASSET_MISMATCH (id existe)
    API-->>W: 200 VerifyHashResponseDto (sin analysis, INV-41)
    Note right of API: id inexistente -> 404 (asimetría GET, INV-41)

    Note over V,W: Camino B — verificación completa (sube el mismo documento)
    V->>W: Sube el PDF a verificar
    W->>API: POST /public/verify/:id (multipart/form-data)
    API->>UC: verifyByUpload({ trustRecordId, fileBytes, channel })
    UC->>UC: recalcula SHA-256 del upload y compara con el DigitalAsset certificado
    UC->>DB: busca TrustRecord + Anchor
    UC->>CH: isAnchored(canonicalHash)
    UC-->>API: verdict + analysis (solo si VALID/PENDING_ANCHOR)
    API-->>W: 200 VerifyUploadResponseDto (id inexistente -> 200 INVALID_RECORD, nunca 404)
    W-->>V: Veredicto + explicación + enlace a basescan.org/tx/:txHash
```

## Referencias

- `apps/api/src/modules/**` (controladores y DTOs fuente de este documento)
- `docs/08-Architecture.md` (arquitectura hexagonal, puertos/adaptadores)
- `docs/09-Smart-Contract-Design.md` (contrato `AnchorRegistry`)
- `docs/06-Requirements.md` (RF-010..046 citados arriba)
- `docs/07-Domain-Model.md` (invariantes INV-21/22/24/26/32/41)
