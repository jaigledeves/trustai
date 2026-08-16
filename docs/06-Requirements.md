# 06 - Requirements

**Proyecto:** Ancrux
**Versión:** 1.0
**Estado:** Draft
**Fecha:** Julio 2026

## Objetivo

Especificar los requisitos funcionales (RF) y no funcionales (RNF) del
producto, priorizados con MoSCoW y trazados a los casos de uso (05),
para que la definición del MVP (11) sea un recorte con criterio y no
una lista arbitraria.

## Alcance

- RF y RNF del producto completo, con prioridad MoSCoW.
- **Must** = imprescindible para el MVP; **Should** = deseable en MVP si
  el calendario lo permite; **Could** = post-MVP temprano; **Won't** =
  explícitamente fuera del MVP (visión 01 §11).
- Trazabilidad UC → RF.

## Contexto

Derivan de: casos de uso (05), decisiones del ADR-001, restricciones
RGPD del segmento (03 §Riesgos) y control de scope de la Constitución
(00 §MVP Scope Control).

## Requisitos Funcionales

### Autenticación y usuarios

| ID | Requisito | Prioridad | UC |
|---|---|---|---|
| RF-001 | Registro con email y contraseña, con verificación de email | Must | UC-07 |
| RF-002 | Inicio y cierre de sesión seguros | Must | UC-07 |
| RF-003 | Recuperación de contraseña | Must | UC-07 |
| RF-004 | Organizaciones: cada usuario pertenece a una organización (despacho/consultora) | Must | UC-06 |
| RF-005 | Invitar y desactivar miembros de la organización | Should | UC-06 |
| RF-006 | Roles admin / miembro | Should | UC-06 |
| RF-007 | SSO corporativo | Won't (MVP) | — |

### Gestión de activos

| ID | Requisito | Prioridad | UC |
|---|---|---|---|
| RF-010 | Subida de PDF e imágenes (JPG/PNG) con límite de tamaño por plan | Must | UC-01 |
| RF-011 | Cálculo de hash SHA-256 del activo en la subida | Must | UC-01 |
| RF-012 | Detección de hash duplicado dentro de la organización, ofreciendo ver el DTR existente o crear versión | Should | UC-01 |
| RF-013 | Almacenamiento cifrado del activo | Must | UC-01 |
| RF-014 | Estados explícitos del ciclo de vida: borrador → pendiente de anclaje → certificado / fallido, visibles en todo momento | Must | UC-01, UC-03 |
| RF-015 | Eliminación de activos y DTRs por el propietario (off-chain) | Must | UC-03 |
| RF-016 | Otros formatos (Office, audio, vídeo, repositorios) | Won't (MVP) | — |

### Análisis IA

| ID | Requisito | Prioridad | UC |
|---|---|---|---|
| RF-020 | Resumen automático del contenido | Must | UC-01 |
| RF-021 | Clasificación automática por tipo documental | Must | UC-01 |
| RF-022 | Extracción de entidades relevantes (personas, organizaciones, fechas, importes) | Should | UC-01 |
| RF-023 | OCR para imágenes y PDFs escaneados | Should | UC-01 |
| RF-024 | Revisión y corrección humana del análisis ANTES del anclaje | Must | UC-01 |
| RF-025 | Registro de proveedor, modelo y versión usados en el análisis, incluido en el DTR (AI provenance) | Must | UC-01 |
| RF-026 | Búsqueda semántica sobre el contenido | Won't (MVP) | — |
| RF-027 | Comparación inteligente de versiones | Won't (MVP) | — |

### DTR y certificación

| ID | Requisito | Prioridad | UC |
|---|---|---|---|
| RF-030 | Construcción del DTR canónico (JSON determinista) con versión de esquema explícita | Must | UC-01 |
| RF-031 | Cálculo del hash SHA-256 del DTR canónico | Must | UC-01 |
| RF-032 | Anclaje del hash del DTR en blockchain (testnet en MVP) | Must | UC-01 |
| RF-033 | Reintento automático ante fallo de anclaje, con estado visible | Must | UC-01 |
| RF-034 | Versionado de activos: cadena de DTRs enlazados, cada versión con su propio anclaje | Should | UC-04 |
| RF-035 | Estrategia de anclaje intercambiable (individual ↔ batching Merkle) a nivel de diseño | Must (diseño) | — |
| RF-036 | Anclaje en múltiples cadenas (Bitcoin + EVM) | Won't (MVP) | — |

### Verificación pública

| ID | Requisito | Prioridad | UC |
|---|---|---|---|
| RF-040 | Verificación pública sin cuenta ni pago | Must | UC-02 |
| RF-041 | Verificación completa: subir documento + DTR → veredicto de integridad | Must | UC-02 |
| RF-042 | Consulta por hash: prueba de existencia y timestamp (sin exponer contenido ni análisis) | Should | UC-02 |
| RF-043 | QR y URL pública de verificación por cada DTR | Must | UC-05 |
| RF-044 | Enlace a la transacción blockchain para verificación independiente de Ancrux | Must | UC-02 |
| RF-045 | Veredicto en lenguaje claro para no técnicos, explicitando qué se garantiza y qué no (sin implicar validez eIDAS) | Must | UC-02 |
| RF-046 | Registro de cada verificación realizada (métrica clave del negocio) | Must | UC-02 |

### Historial y panel

| ID | Requisito | Prioridad | UC |
|---|---|---|---|
| RF-050 | Listado de certificaciones con filtros por estado, clasificación y fecha | Must | UC-03 |
| RF-051 | Vista de detalle completa de cada DTR | Must | UC-03 |
| RF-052 | Descarga de certificado en PDF (hash, timestamp, tx, QR) | Should | UC-05 |
| RF-053 | Visualización del consumo de cupo de DTRs del plan | Should | UC-03 |
| RF-054 | API pública para integraciones | Won't (MVP) | — |

## Requisitos No Funcionales

### Seguridad

| ID | Requisito | Prioridad |
|---|---|---|
| RNF-001 | TLS en todas las comunicaciones | Must |
| RNF-002 | Cifrado de activos en reposo (AES-256 o equivalente) | Must |
| RNF-003 | Hashing de contraseñas con algoritmo moderno (Argon2/bcrypt) | Must |
| RNF-004 | Aislamiento estricto entre organizaciones (un despacho jamás ve activos de otro) | Must |
| RNF-005 | Gestión de secretos fuera del código (variables de entorno / vault) | Must |
| RNF-006 | Registro de auditoría de acciones sensibles | Should |

### Cumplimiento (RGPD)

| ID | Requisito | Prioridad |
|---|---|---|
| RNF-010 | Datos y procesamiento alojados en la UE | Must |
| RNF-011 | Derecho de supresión: el borrado off-chain (activo + DTR) es completo; en blockchain solo existe un hash, que no constituye dato personal recuperable | Must |
| RNF-012 | Consentimiento explícito sobre el procesamiento del contenido por proveedores de IA, identificando al proveedor | Must |
| RNF-013 | Acuerdos de tratamiento de datos (DPA) con proveedores de IA y cloud | Must (pre-lanzamiento comercial) |

### Rendimiento y disponibilidad

| ID | Requisito | Prioridad |
|---|---|---|
| RNF-020 | Verificación pública en < 5 segundos (percentil 95) | Must |
| RNF-021 | Análisis IA + preparación del DTR en < 60 segundos para documentos de hasta 20 páginas | Should |
| RNF-022 | El anclaje es asíncrono: la UX nunca se bloquea esperando la blockchain | Must |
| RNF-023 | Disponibilidad objetivo 99% en MVP (sin SLA formal) | Should |

### Mantenibilidad y arquitectura

| ID | Requisito | Prioridad |
|---|---|---|
| RNF-030 | Proveedor de IA intercambiable tras una abstracción (puerto/adaptador) | Must |
| RNF-031 | Cadena blockchain y estrategia de anclaje intercambiables tras una abstracción | Must |
| RNF-032 | La verificación de un DTR es reproducible fuera de la plataforma con herramientas estándar (documentada públicamente) | Must |
| RNF-033 | Cobertura de pruebas en el núcleo de certificación/verificación (hashing, canonicalización, anclaje) cercana al 100% | Must |
| RNF-034 | Observabilidad básica: logs estructurados y métricas de negocio (DTRs, verificaciones) | Should |

### Usabilidad

| ID | Requisito | Prioridad |
|---|---|---|
| RNF-040 | El flujo de certificación es completable sin manual por un usuario no técnico (persona P3) | Must |
| RNF-041 | Interfaz en español en MVP; arquitectura preparada para i18n | Should |
| RNF-042 | La página de verificación es usable desde el celular (el QR se escanea con el teléfono) | Must |

## Decisiones

1. **RF-025 (AI provenance) es Must**: registrar modelo y versión en el
   DTR es coherente con ADR-001 (el análisis es evidencia congelada) y
   con la tendencia AI Act detectada en el 02.
2. **RF-042 separa existencia de contenido**: la consulta por hash solo
   prueba existencia; el resumen IA y los metadatos solo se exponen a
   quien recibió el enlace/QR del propietario. Privacidad por diseño.
3. **RNF-011 resuelve la tensión RGPD vs inmutabilidad**: en la cadena
   solo vive un hash; el derecho de supresión se satisface off-chain.
4. **RNF-032 es el requisito más importante del producto**: si la
   verificación solo funciona dentro de Ancrux, no somos mejores que
   la evidencia propietaria de DocuSign (02 §DocuSign).

## Alternativas consideradas

- Numerar requisitos secuencialmente (RF-001..N): descartado; la
  numeración por bloques (010, 020...) deja espacio para insertar sin
  renumerar.
- Definir SLAs formales en MVP: descartado (RNF-023); sin clientes de
  pago no hay base para comprometer disponibilidad.

## Riesgos

- Scope creep sobre los Should: la regla de la Constitución (00 §MVP
  Scope Control) manda — un Should solo entra si no compromete el
  calendario.
- RNF-021 depende del proveedor de IA y del tamaño real de documentos
  del segmento: medir en cuanto exista el pipeline.

## Referencias

- docs/05-Personas-UseCases.md (casos de uso y personas)
- docs/adr/ADR-001-anclaje-hash-dtr-canonico.md
- docs/04-Viability.md (batching, proveedores UE)
- docs/00-Project-Constitution.md (MVP Scope Control)

## Checklist

- [x] RF trazados a casos de uso
- [x] Priorización MoSCoW completa
- [x] Won't explícitos alineados con 01 §11
- [x] RNF de seguridad, RGPD, rendimiento, mantenibilidad y usabilidad
- [ ] Revisión de prioridades tras validación con usuarios (pendiente)

## Próximo Documento

07-Domain-Model.md
