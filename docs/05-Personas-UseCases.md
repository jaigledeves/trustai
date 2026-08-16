# 05 - Personas y Casos de Uso

**Proyecto:** Ancrux
**Versión:** 1.0
**Estado:** Draft
**Fecha:** Julio 2026

## Objetivo

Definir quién usa Ancrux (personas) y qué hace con él (casos de uso),
para que los requisitos (06) y el diseño del MVP deriven de necesidades
concretas del segmento cabeza de playa y no de suposiciones.

## Alcance

- 3 personas primarias del segmento despachos/consultoras + 1 persona
  secundaria (el verificador externo).
- Casos de uso del MVP con flujo detallado para los dos núcleo.
- Trazabilidad con los objetivos del MVP (01 §10).

Fuera de alcance: personas de segmentos post-MVP (universidades,
aseguradoras, etc.).

## Contexto

Segmento cabeza de playa (01 §8): despachos profesionales y consultoras
de 2-50 empleados en España. La métrica de valor clave del negocio (03)
son las verificaciones por terceros: por eso el verificador externo es
una persona de primer nivel aunque nunca pague.

## Personas

### P1 — Marta, socia de despacho de abogados

- **Perfil**: 45 años, socia en un despacho de 12 personas
  (litigios, mercantil y propiedad intelectual). Decide las compras de
  software.
- **Contexto**: maneja evidencias, contratos con versiones, burofaxes y
  comunicaciones donde la fecha y la integridad importan legalmente.
- **Dolores**:
  - Demostrar que un documento existía en una fecha (hoy: notario o
    burofax, caro y lento).
  - Contrapartes que cuestionan versiones de contratos.
  - Desconfianza en evidencias que dependen de "confía en mi sistema".
- **Objetivos**: evidencia sólida y barata, presentable ante un juzgado
  o una contraparte; cero fricción para su equipo.
- **Criterio de éxito**: "puedo darle a la otra parte un QR y que
  verifique sola, sin llamarme".

### P2 — Jorge, gerente de consultora

- **Perfil**: 38 años, socio-gerente de una consultora de 8 personas
  (estrategia y compliance). Factura por entregables.
- **Contexto**: entrega informes, actas y diagnósticos a clientes;
  discusiones recurrentes sobre qué versión se entregó y cuándo.
- **Dolores**:
  - Disputas de alcance: "ese informe no es el que nos enviaste".
  - Tiempo perdido localizando y clasificando entregables antiguos.
  - Necesita demostrar diligencia ante auditorías de sus clientes.
- **Objetivos**: certificar cada entregable al enviarlo y encontrar
  cualquier documento por contenido, no por nombre de archivo.
- **Criterio de éxito**: "cada entregable sale con su certificado y el
  resumen IA me ahorra redactar la carátula".

### P3 — Lucía, oficial administrativa del despacho

- **Perfil**: 29 años, gestiona la operativa documental del despacho de
  Marta. Usuaria intensiva diaria; no técnica.
- **Contexto**: sube decenas de documentos por semana, mantiene el
  archivo y responde a "¿dónde está X?".
- **Dolores**: procesos con muchos pasos; herramientas que exigen
  conocimientos técnicos; miedo a "romper algo" irreversible.
- **Objetivos**: subir → certificar → archivar en menos de un minuto,
  con feedback claro de que todo salió bien.
- **Criterio de éxito**: "lo uso sin manual y sé siempre en qué estado
  está cada documento".

### P4 (secundaria) — El verificador externo

- **Perfil**: juez, perito, auditor, contraparte o cliente final.
  **No tiene cuenta ni la tendrá.**
- **Contexto**: recibe un documento + un DTR (o un QR) y necesita
  comprobar autenticidad sin depender de Ancrux como autoridad.
- **Dolores**: desconfianza por defecto; cero tolerancia a registrarse
  o pagar para verificar.
- **Objetivos**: veredicto claro (válido / no válido / alterado) en
  segundos, con explicación comprensible para no técnicos.
- **Criterio de éxito**: "verifiqué sin crear cuenta y entendí qué se
  estaba garantizando exactamente".

## Casos de Uso del MVP

### Mapa general

| ID | Caso de uso | Actor principal | Prioridad |
|---|---|---|---|
| UC-01 | Certificar un activo digital (generar DTR) | P2, P3 | Núcleo |
| UC-02 | Verificar un DTR públicamente | P4 | Núcleo |
| UC-03 | Consultar historial y detalle de certificaciones | P1, P2, P3 | Alta |
| UC-04 | Certificar nueva versión de un activo | P2, P3 | Alta |
| UC-05 | Compartir certificado (QR / enlace) | P2, P3 | Alta |
| UC-06 | Gestionar usuarios del despacho | P1 | Media |
| UC-07 | Registrarse y autenticarse | Todos los internos | Base |

### UC-01 — Certificar un activo digital (núcleo)

**Actor**: Lucía (P3) o Jorge (P2).
**Precondición**: usuario autenticado con cupo de DTRs disponible.

**Flujo principal**:

1. El usuario sube un documento (PDF o imagen).
2. El sistema calcula el hash SHA-256 del activo y lo muestra.
3. La IA analiza el contenido: resumen, clasificación y entidades.
4. El usuario revisa el análisis (puede corregir la clasificación).
5. El sistema construye el DTR canónico y calcula su hash (ADR-001).
6. El sistema ancla el hash del DTR en blockchain.
7. El sistema muestra el DTR completo con estado "Certificado", QR y
   enlace público de verificación.

**Extensiones**:

- 3a. El documento es una imagen → OCR previo al análisis.
- 6a. La transacción falla o se demora → el DTR queda "Pendiente de
  anclaje" con reintento automático; el usuario ve el estado en todo
  momento (dolor de Lucía: feedback claro).
- 2a. El hash coincide con un activo ya certificado por la organización
  → el sistema lo informa y ofrece ver el DTR existente o crear una
  versión (UC-04).

**Postcondición**: DTR persistido, anclado y verificable públicamente.

### UC-02 — Verificar un DTR públicamente (núcleo)

**Actor**: verificador externo (P4). **Sin autenticación.**

**Flujo principal**:

1. El verificador accede vía QR o URL pública (o introduce un hash).
2. Sube el documento que le entregaron.
3. El sistema recalcula el hash del activo y lo compara con el DTR.
4. El sistema recalcula el hash del DTR canónico y comprueba su
   existencia en blockchain (con enlace a la transacción para
   verificación independiente).
5. El sistema muestra el veredicto: **Válido** (activo íntegro +
   análisis certificado + fecha probada), con explicación en lenguaje
   claro de qué se garantiza y qué no.

**Extensiones**:

- 3a. El hash del activo no coincide → veredicto "El documento NO
  corresponde a este DTR o fue alterado", indicando que la comparación
  es binaria (un byte cambiado = hash distinto).
- 4a. El anclaje aún está pendiente → veredicto parcial con estado y
  hora estimada de confirmación.

**Postcondición**: verificación registrada (métrica clave del 03).

### UC-03 a UC-07 (resumen)

- **UC-03 Historial**: listado filtrable por estado, tipo (clasificación
  IA), fecha y texto; detalle completo de cada DTR.
- **UC-04 Nueva versión**: certificar un activo vinculándolo a un DTR
  anterior; la cadena de versiones es visible y cada versión conserva
  su propio anclaje (consecuencia 1 del ADR-001).
- **UC-05 Compartir**: generar QR y enlace público de un DTR; opción de
  descargar certificado en PDF.
- **UC-06 Gestión de usuarios**: invitar/desactivar miembros del
  despacho; roles mínimos (admin / miembro) — el RBAC fino queda fuera
  del MVP.
- **UC-07 Auth**: registro con email + contraseña, verificación de
  email, sesión segura. Sin SSO en el MVP.

## Trazabilidad con objetivos del MVP (01 §10)

| Objetivo MVP (01) | Casos de uso |
|---|---|
| Registro de usuarios | UC-07, UC-06 |
| Gestión de activos digitales | UC-01, UC-03, UC-04 |
| Análisis mediante IA | UC-01 (pasos 3-4) |
| Generación de DTR | UC-01 (pasos 5-7) |
| Certificación blockchain | UC-01 (paso 6) |
| Verificación por hash y QR | UC-02, UC-05 |
| Historial de certificaciones | UC-03 |

## Decisiones

1. El verificador externo (P4) es persona de primer nivel: UC-02 no
   requiere cuenta y su UX es tan prioritaria como la de certificación.
2. El usuario puede corregir la clasificación IA antes de certificar
   (UC-01 paso 4): el DTR congela el análisis (ADR-001), así que la
   revisión humana va antes del anclaje.
3. Estados explícitos del DTR (borrador / pendiente de anclaje /
   certificado / fallido) visibles siempre — derivado del dolor de P3.
4. Roles mínimos admin/miembro en MVP; RBAC avanzado pospuesto.

## Alternativas consideradas

- Verificación solo por hash (sin subir documento): se mantiene como
  atajo, pero la verificación completa exige el documento — sin él solo
  se prueba que "ese hash existe", no que "este documento es íntegro".
- Certificación automática sin revisión humana: descartada en MVP; el
  análisis IA congelado en evidencia exige control humano previo
  (riesgo reputacional de certificar un análisis erróneo).

## Riesgos

- Personas construidas sin entrevistas reales (hipótesis H1 del 02):
  validar con 2-3 conversaciones del sector antes de cerrar requisitos.
- La explicación del veredicto en UC-02 es crítica y difícil: comunicar
  a no técnicos qué garantiza un hash sin generar falsa sensación de
  "documento legalmente válido" (no somos firma cualificada eIDAS).

## Referencias

- docs/01-Product-Vision.md §8, §10
- docs/02-Market-Research.md (H1-H3)
- docs/03-Business-Model.md (métrica de verificaciones)
- docs/adr/ADR-001-anclaje-hash-dtr-canonico.md

## Checklist

- [x] Personas del segmento cabeza de playa con dolores y criterios de éxito
- [x] Verificador externo definido como persona de primer nivel
- [x] Casos de uso núcleo con flujo principal y extensiones
- [x] Trazabilidad con objetivos del MVP
- [ ] Validación de personas con entrevistas reales (pendiente)

## Próximo Documento

06-Requirements.md
