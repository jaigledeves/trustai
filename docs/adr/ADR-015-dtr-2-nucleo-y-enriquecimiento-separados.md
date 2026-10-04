# ADR-015: Esquema `dtr-2` con núcleo verificable y enriquecimiento IA separados

**Estado:** Aceptada
**Fecha:** 04/10/2026
**Decisores:** Jose (Product Owner), agente IA (arquitectura)
**Supersede a:** [ADR-001](ADR-001-anclaje-hash-dtr-canonico.md)
**Relacionadas:** ADR-003 (contrato mínimo `AnchorRegistry`), ADR-004
(procedencia obligatoria del análisis), `docs/14-Roadmap.md` fase B

## Contexto

ADR-001 decidió anclar el SHA-256 del DTR canónico completo. En `dtr-1`
ese objeto mezcla tres tipos de datos:

| Tipo | Campos `dtr-1` | ¿Reproducible desde el archivo? |
|---|---|---|
| Datos del activo | `asset.sha256`, `asset.mimeType`, `asset.sizeBytes` | Sí |
| Metadato de subida | `asset.filename` | No |
| Salida de la IA y procedencia | `analysis.*`, `provenance.*` | No (no determinista) |
| Emisión | `issuedAt` | No |

Como el hash anclado incluye la salida de la IA, un tercero solo puede
comprobar el anclaje si obtiene de Ancrux el texto exacto del análisis. La
verificación independiente del proveedor, que es la tesis central del
producto, queda condicionada a confiar en el contenido que sirve la
plataforma. El feedback externo recibido tras el TFM señaló este punto, y
la fase C del roadmap (verificación en el navegador, paquete de prueba y
CLI) necesita un registro cuyo núcleo se pueda reconstruir sin Ancrux.

Restricciones:

- `AnchorRegistry` está desplegado en Base Sepolia, no tiene propietario
  ni proxy y guarda un único `bytes32` por anclaje (ADR-003). No se puede
  modificar.
- Los DTR `dtr-1` ya anclados deben seguir verificándose con su hash
  original.
- La canonicalización (implementación propia de RFC 8785 / JCS en
  `packages/dtr-core`) no cambia.

## Decisión

Se introduce el esquema **`dtr-2`**, que separa el registro en un núcleo y
un enriquecimiento, y ancla un **sobre** que combina ambos hashes.

### Estructura

```json
{
  "schemaVersion": "dtr-2",
  "issuedAt": "2026-10-04T12:00:00.000Z",
  "core": {
    "asset": { "sha256": "…", "mimeType": "application/pdf", "sizeBytes": 123456 }
  },
  "enrichment": {
    "asset": { "filename": "contrato.pdf" },
    "analysis": { "summary": "…", "classification": "contrato", "language": "es" },
    "provenance": { "provider": "…", "model": "…", "modelVersion": "…",
                    "promptVersion": "…", "taxonomyVersion": "v1", "analyzedAt": "…" }
  }
}
```

- **Núcleo (`core`)**: solo datos derivables del archivo. El tipo MIME es
  el verificado por el servidor (firma `%PDF-`), no el declarado por el
  cliente.
- **Enriquecimiento (`enrichment`)**: el nombre de archivo, el análisis de
  la IA y su procedencia.

### Hashes

Todos usan la misma canonicalización JCS y SHA-256 en hexadecimal
minúsculo:

1. `coreHash = sha256(JCS(core))`
2. `enrichmentHash = sha256(JCS(enrichment))`
3. `anchorHash = sha256(JCS({ schemaVersion, issuedAt, coreHash, enrichmentHash }))`

Se ancla `anchorHash` (como `0x` + hex) en una única transacción, igual
que hoy. Es el valor que se guarda en `canonicalHash`.

### Flujo de verificación

1. Con el archivo, el verificador calcula `coreHash` sin ningún dato de
   Ancrux.
2. Con un paquete de prueba mínimo (`schemaVersion`, `issuedAt`,
   `enrichmentHash`) recalcula `anchorHash` y lo consulta en el contrato.
   No necesita el texto del análisis.
3. Si además recibe el `enrichment` completo, comprueba que su hash
   coincide con `enrichmentHash`: así verifica que el análisis no se
   alteró.

### Convivencia con `dtr-1`

- `schemaVersion` decide cómo se interpreta y verifica cada registro. Los
  DTR `dtr-1` existentes se siguen reconstruyendo y verificando con el
  algoritmo original, cubierto por un hash de referencia fijado en tests.
- Los registros nuevos se emiten como `dtr-2`.
- No se migra ningún DTR ya anclado: su hash on-chain es inmutable.

## Alternativas consideradas

### A. Anclar solo `coreHash`

- Pros: basta el archivo para verificar el anclaje, sin ningún dato de
  Ancrux.
- Contras: el análisis de IA deja de estar protegido en la cadena, y el
  diferencial del producto (certificar también el análisis, ADR-001)
  desaparece. Además, el mismo archivo certificado dos veces produce el
  mismo `coreHash` y el contrato lo rechaza (`AlreadyAnchored`).
  **Descartada.**

### B. Dos anclajes, `coreHash` y `enrichmentHash` por separado

- Pros: cada parte es verificable por su cuenta.
- Contras: duplica el gas por certificación, comparte el problema de
  `AlreadyAnchored` con archivos repetidos y complica la verificación.
  Es la alternativa B que ADR-001 ya había descartado. **Descartada.**

### C. Sobre combinado (elegida)

- Pros: una sola transacción, como en `dtr-1`. El núcleo se verifica desde
  el archivo y el análisis queda protegido por `enrichmentHash`. Registros
  distintos del mismo archivo tienen `anchorHash` distintos porque cambian
  `issuedAt` y el enriquecimiento.
- Contras: para comprobar el anclaje hace falta, además del archivo, el
  paquete de prueba mínimo (tres valores pequeños). No contiene el texto de
  la IA, así que no obliga a confiar en él.

### Por qué ahora se acepta separar hashes

ADR-001 descartó anclar dos hashes porque duplicaba coste sin aportar
garantías. Esta decisión no ancla dos hashes: sigue anclando uno solo. La
separación vive dentro del sobre y aporta una garantía que `dtr-1` no
tenía: verificar el núcleo sin depender del contenido de la IA.

## Consecuencias

### Positivas

1. La verificación del activo deja de depender de la salida de la IA, que
   es no determinista y la sirve el proveedor.
2. El análisis sigue congelado y protegido contra cambios, como pedía
   ADR-001.
3. Sin cambios en el contrato ni en el coste por certificación.
4. Habilita la fase C: el paquete de prueba y el CLI trabajan sobre un
   formato estable.

### Negativas

1. Conviven dos esquemas. `packages/dtr-core` necesita un despachador por
   `schemaVersion`, y cualquier consumidor (API, web, CLI) debe manejar
   ambos.
2. Verificar el anclaje de un `dtr-2` requiere el paquete de prueba
   mínimo, no solo el archivo.
3. El tipo MIME forma parte del núcleo: si en el futuro se aceptan otros
   formatos, su detección en el servidor debe ser determinista.
4. Más superficie de tests: hashes de referencia para `dtr-1` y vectores
   de prueba para `dtr-2`.

## Riesgos

- Romper sin querer el hash de los `dtr-1` existentes al refactorizar la
  reconstrucción. Mitigación: hash de referencia fijado en tests antes de
  tocar el código.
- Diferencias de precisión en fechas (`issuedAt`, `analyzedAt`) al
  reconstruir desde la base de datos. Mitigación: misma conversión
  `toISOString()` para ambos esquemas, cubierta por tests.

## Referencias

- [ADR-001](ADR-001-anclaje-hash-dtr-canonico.md) (supersedida por esta ADR)
- [ADR-003](ADR-003-contrato-minimo-anchor-registry.md)
- [ADR-004](ADR-004-doble-adaptador-ia.md)
- `docs/14-Roadmap.md` (fases B y C)
- RFC 8785 — JSON Canonicalization Scheme
