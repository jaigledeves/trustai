# 14 - Roadmap post-TFM

**Estado:** aprobado (2026-10-02)
**Alcance:** backlog priorizado de mejoras derivadas del feedback recibido tras
la entrega del TFM. Documento vivo: marcar cada ítem al completarlo y mover
los descartados a la sección final en vez de borrarlos.

## 1. Origen

Tres fuentes de feedback, contrastadas contra el código real:

| Fuente | Fecha | Enfoque |
|---|---|---|
| Evaluación académica (BigSchool) | 2026-09-27 | Página de diagnóstico paso a paso del DTR |
| Análisis técnico y estratégico externo | 2026-08-20 | Posicionamiento, verificación independiente, Trust Core vs IA |
| Evaluación preliminar de seguridad externa | 2026-08-20 | Hardening de aplicación (revisión no intrusiva) |

Varios puntos marcados como "no comprobado" en la revisión externa ya estaban
implementados (aislamiento por organización con tests negativos, argon2,
reset de contraseña con anti-enumeración, throttling en upload y verify, JWT
en cookie `httpOnly`, salida de IA validada por esquema, contrato inmutable
con tests Foundry, procedencia del modelo en el DTR). Este documento recoge
solo los huecos reales.

## 2. Decisión de rumbo

Ancrux continúa como **proyecto de portfolio defendible como producto**: se
prioriza lo que demuestra la tesis central (verificación independiente del
proveedor) y el hardening de bajo costo. La infraestructura propia de un
producto con usuarios (MFA, mainnet, email transaccional, KMS) queda
documentada como siguiente etapa, no implementada.

## 3. Orden de ejecución

```
Fase A  P0 seguridad  →  Fase B  dtr-2  →  Fase C  verificación independiente  →  Fase D  copy y posicionamiento
```

La fase B va antes que la C porque el verificador client-side, el paquete de
prueba y el CLI leen el esquema del DTR; construirlos sobre `dtr-1` y luego
migrar implicaría hacerlos dos veces.

## 4. Backlog

### Fase A - P0 seguridad (cambios pequeños, riesgo alto)

| # | Mejora | Hallazgo | Estado |
|---|---|---|---|
| A1 | Eliminar el valor por defecto de `JWT_SECRET`; fallar al arrancar si falta | `auth.module.ts`, `jwt.strategy.ts` usan `"change-me-in-production"` como fallback | hecho |
| A2 | Límite de tamaño y verificación de magic bytes en el upload | El tipo MIME se toma del cliente; no hay `limits` en multer; todo el cuerpo se carga en memoria | hecho |
| A3 | Cabeceras de seguridad: `helmet` en la API; CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` en Next | No existe ninguna | hecho |
| A4 | CORS restringido al origen de la web | `app.enableCors()` sin opciones | hecho |
| A5 | Throttle específico en login, registro, forgot-password y reset-password | Solo aplica el límite global de 100/min | hecho: límite por cuenta en login y forgot-password, más reenvío firmado de la IP real del cliente desde el servidor de Next (`TRUSTED_PROXY_SECRET`) para que el límite global por IP no lo compartan todos los usuarios |

### Fase B - Esquema `dtr-2`: Trust Core separado del enriquecimiento IA

| # | Mejora | Estado |
|---|---|---|
| B1 | ADR que supersede a ADR-001: el hash anclado se compone de `coreHash` (campos deterministas reproducibles desde el archivo) y `enrichmentHash` (salida IA + procedencia) | hecho (ADR-015) |
| B2 | Implementar `dtr-2` en `packages/dtr-core` manteniendo soporte de lectura y verificación de `dtr-1` | hecho |
| B3 | Migrar la emisión de nuevos DTR a `dtr-2`; los ya anclados permanecen en `dtr-1` | hecho |

Motivación: hoy la salida de la IA (no determinista) forma parte del objeto
hasheado, por lo que un tercero no puede reconstruir el DTR desde el archivo
sin confiar en el DTR que entrega Ancrux.

### Fase C - Verificación independiente del proveedor

| # | Mejora | Estado |
|---|---|---|
| C1 | Persistir `chainId`, `blockNumber` y `blockTimestamp` junto al `txHash` | hecho (PR #46) |
| C2 | Verificación client-side completa: recomputar el DTR canónico y leer `AnchorRegistry` por RPC desde el navegador | hecho: `/verify/:id` descarga la prueba `ancrux-proof-1`, recalcula `coreHash` y `anchorHash` con `dtr-core` y lee `isAnchored`/`anchoredAt` por RPC público (`NEXT_PUBLIC_CHAIN_RPC_URL`), solo `dtr-2` |
| C3 | Paquete de prueba descargable (`dtr.json` con versión de esquema, algoritmos de canonicalización y hash, `chainId`, contrato, `txHash`, `blockNumber`, timestamp de bloque) | hecho: formato `ancrux-proof-1` en `GET /public/verify/:id/proof`, solo `dtr-2` (ADR-016) |
| C4 | Página de diagnóstico paso a paso: extracción → canonicalización → hash local → lectura on-chain → comparación final | hecho: cada paso (archivo, prueba, `coreHash`, `anchorHash`, red, contrato, anclaje) se muestra con sus datos y su resultado |
| C5 | CLI verificador sobre `dtr-core`, sin dependencia de la API | hecho: `ancrux-verify` (`packages/verify-cli`) ejecuta los mismos pasos que el navegador con la prueba `ancrux-proof-1` en disco (`--proof`) o descargada (`--id`), y lee el contrato por RPC; solo `dtr-2` |

### Fase D - Lenguaje y posicionamiento

| # | Mejora | Estado |
|---|---|---|
| D1 | Revisar el copy de la landing: sustituir "imposible de falsificar", "permanente" y "para siempre" por "cualquier modificación posterior es criptográficamente detectable"; distinguir timestamp de bloque de hora certificada | hecho |
| D2 | Documento de posicionamiento: qué demuestra y qué no demuestra un DTR; comparación con RFC 3161, PKI/FEA, OpenTimestamps, Blockcerts/VC, C2PA y eIDAS 2.0 | pendiente |
| D3 | Ampliar `13-Security.md` con gestión de claves, seguridad de upload y aislamiento entre organizaciones (controles ya implementados) | pendiente |

## 5. Siguiente etapa (documentado, no planificado)

Mejoras válidas para una operación con usuarios reales. Se registran para
completar la visión; no se implementarán sin esa necesidad.

| Área | Mejora |
|---|---|
| Cuentas | MFA (passkeys/WebAuthn o TOTP); contraseña mínima de 12 caracteres con chequeo contra listas de contraseñas filtradas; revocación server-side del JWT al cerrar sesión y expiración más corta que 7 días |
| Cuentas | Adaptador de notificaciones real (hoy `StubNotificationAdapter`: el reset de contraseña no envía correo) |
| Datos | `keyId` en el blob cifrado para permitir rotación; gestión de claves con KMS; aviso explícito pre-upload de que el texto se envía a OpenAI; instrucción anti prompt-injection en el system prompt |
| Producto | Modo *Private Proof*: certificar solo el hash sin que el archivo salga del dispositivo y sin análisis IA |
| Producto | Linaje de versiones (`parent` / `supersedes`); identidad del emisor (firma del DTR, DID o X.509) |
| Escala | Merkle batching (mencionado en ADR-003, sin implementar); migración a Base Mainnet con política de longevidad |
| Madurez | CodeQL, Dependabot, secret scanning y SBOM en CI; `security.txt` (RFC 9116); verificación del código fuente del contrato en Basescan |

## 6. Descartado

Ninguno por ahora.
