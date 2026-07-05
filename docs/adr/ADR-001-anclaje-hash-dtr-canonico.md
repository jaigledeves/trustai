# ADR-001: Anclar en blockchain el hash del DTR canónico completo

**Estado:** Aceptada
**Fecha:** 05/07/2026
**Decisores:** Jose (Product Owner), agente IA (arquitectura)

## Contexto

El Digital Trust Record (DTR) contiene: hash SHA-256 del activo,
timestamp, resumen IA, clasificación, entidades, metadatos y versión.
Había que decidir qué evidencia se registra en blockchain, porque
define qué puede demostrar el producto ante un tercero.

El Market Research (02) mostró que la prueba de existencia de un hash
es una commodity gratuita (OpenTimestamps). El diferencial de TrustAI
debe estar en certificar también el análisis de IA (tendencia
AI-provenance, ya explotada comercialmente por OriginStamp para el AI
Act europeo).

## Decisión

Se ancla en blockchain el **hash SHA-256 del DTR canónico completo**.

- El DTR se serializa a un formato JSON canónico y determinista (misma
  entrada → mismos bytes → mismo hash). La especificación de
  canonicalización (p. ej. RFC 8785 / JCS) se definirá en la fase de
  arquitectura.
- El DTR contiene internamente el hash del activo, por lo que una sola
  transacción certifica dos hechos:
  1. **Existencia e integridad del activo** en la fecha del anclaje.
  2. **Existencia e inmutabilidad del análisis IA** (resumen,
     clasificación, entidades) sobre ese activo en esa fecha.

### Flujo de verificación

1. El verificador recibe el activo y el DTR (JSON).
2. Recalcula el hash del activo y comprueba que coincide con el campo
   correspondiente del DTR.
3. Canonicaliza el DTR y recalcula su hash.
4. Comprueba que ese hash existe en la blockchain en la transacción
   referenciada.

Ningún paso requiere confiar en TrustAI como plataforma.

## Alternativas consideradas

### A. Anclar solo el hash del activo

- Pros: más simple; el DTR puede editarse sin invalidar la evidencia.
- Contras: no certifica el análisis IA; el producto queda reducido a un
  OpenTimestamps con interfaz — indiferenciado y sin valor por el que
  cobrar. **Descartada.**

### B. Anclar ambos hashes por separado (activo y DTR)

- Pros: granularidad máxima.
- Contras: duplica coste de transacción y complejidad de verificación
  sin aportar garantías adicionales (el DTR ya contiene el hash del
  activo). **Descartada.**

### C. Anclar el hash del DTR canónico (elegida)

- Pros: una transacción certifica activo + análisis; coste mínimo;
  diferencial competitivo (AI-provenance); verificación end-to-end sin
  confiar en el proveedor.
- Contras: exige canonicalización estricta y disciplina de
  inmutabilidad (ver consecuencias).

## Consecuencias

1. **El DTR es inmutable tras el anclaje.** Cualquier corrección o
   re-análisis genera una nueva versión del DTR con nuevo anclaje. La
   estrategia de versionado se diseñará en el modelo de dominio.
2. **La canonicalización es crítica.** Un cambio en la serialización
   (orden de claves, encoding, formato de números) rompería la
   verificación de DTRs históricos. La especificación debe fijarse por
   versión de esquema del DTR.
3. **El output de la IA queda congelado como evidencia.** Re-ejecutar
   el análisis con otro modelo produce otro DTR/versión; esto es una
   feature (trazabilidad de qué modelo dijo qué y cuándo), no un bug.
4. El esquema del DTR debe incluir un campo de versión de esquema desde
   el día uno.

## Riesgos

- Errores de implementación en la canonicalización (mitigación: tests
  de verificación reproducible como criterio de éxito del MVP).
- Evolución del esquema DTR (mitigación: versionado de esquema
  explícito).

## Referencias

- docs/01-Product-Vision.md (secciones 6 y 7)
- docs/02-Market-Research.md (commodity del timestamping; AI-provenance)
- RFC 8785 — JSON Canonicalization Scheme (candidata para la fase de
  arquitectura)
