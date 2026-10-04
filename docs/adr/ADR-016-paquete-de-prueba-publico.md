# ADR-016: Paquete de prueba público `ancrux-proof-1` para registros `dtr-2`

**Estado:** Aceptada
**Fecha:** 04/10/2026
**Decisores:** Jose (Product Owner), agente IA (arquitectura)
**Relacionadas:** ADR-015 (esquema `dtr-2`), ADR-009 (la web es dueña del
copy de veredictos; INV-41), ADR-003 (contrato mínimo `AnchorRegistry`),
`docs/14-Roadmap.md` fase C (C3)

## Contexto

ADR-015 separó el DTR en un núcleo reproducible desde el archivo y un
enriquecimiento IA, y ancla `anchorHash`, que se calcula con `coreHash`,
`enrichmentHash`, `issuedAt` y `schemaVersion`. Con eso, un tercero ya no
necesita el texto de la IA para comprobar un anclaje, pero sí necesita esos
cuatro valores y saber dónde mirar en la cadena (red, contrato).

Hoy esos datos solo existen en la base de datos de Ancrux. `GET
/public/verify/:id` devuelve un veredicto calculado por el servidor; quien
verifica tiene que confiar en ese veredicto. La fase C busca que cualquiera
pueda verificar sin confiar en Ancrux (C2 en el navegador, C5 por CLI), y
ambos necesitan un documento público y estable con lo mínimo para hacerlo.

Restricciones:

- INV-41: la consulta pública por `GET` nunca expone el análisis IA ni el
  contenido. El nombre de archivo también es un dato del cliente.
- Decisión de producto de la fase C: la verificación independiente es solo
  para `dtr-2`. Un registro `dtr-1` se muestra como registro heredado,
  verificable por el servidor.
- INV-22: un registro cuyo hash recalculado no coincide con el
  `canonicalHash` fijado al confirmar está alterado y no debe avalarse.

## Decisión

Se publica un paquete de prueba JSON con identificador de formato
`ancrux-proof-1`, definido en `dtr-core` (`ProofPackageV1Schema`) y servido
en `GET /public/verify/:id/proof`.

### Formato

```json
{
  "format": "ancrux-proof-1",
  "trustRecordId": "5b0c4f7e-6a1d-4c39-9f0e-2d8a7b1c3e45",
  "dtr": {
    "schemaVersion": "dtr-2",
    "issuedAt": "2026-10-04T12:00:00.000Z",
    "coreHash": "4e0e672d46be24c06169679e0727e0afce65bbac9e8d83ad9fd8177e98d24802",
    "enrichmentHash": "b19f7fe94680ca65d7d34eccbd099a1aef8702aa8a5f9d6331c8b00ba502c514",
    "anchorHash": "9f8c2d775d90c88594687f16ba2652fae2ffc184d5f77881ca01e14331eee0c9"
  },
  "algorithms": { "hash": "SHA-256", "canonicalization": "RFC 8785 (JCS)" },
  "anchor": {
    "chainId": 84532,
    "network": "base-sepolia",
    "contractAddress": "0xe6738fb0aF94822a3831c8e0a65b5C6d20607C22",
    "txHash": "0xabab…ab",
    "blockNumber": "18734512",
    "blockTimestamp": "2026-10-04T12:00:14.000Z"
  }
}
```

- El esquema es estricto: una clave desconocida invalida el paquete. Un
  cambio de forma es un formato nuevo (`ancrux-proof-2`), igual que la
  disciplina de versiones de ADR-001/ADR-015.
- `blockNumber` es una cadena decimal: el número de bloque es un `uint256`
  y JSON no representa enteros grandes sin pérdida.
- `txHash`, `blockNumber` y `blockTimestamp` admiten `null` cuando el hash
  ya estaba anclado antes del envío de Ancrux (no hay transacción propia).
- Para anclajes creados antes de C1 (sin `chainId` ni contrato guardados),
  se usa el despliegue conocido de su red (`ANCHOR_REGISTRY_DEPLOYMENTS`).
  Si la red no tiene despliegue conocido, no se sirve paquete.

### Qué se excluye y por qué

- Análisis IA y procedencia: `enrichmentHash` los compromete sin
  revelarlos. Publicarlos rompería INV-41 y la decisión de ADR-009 de no
  exponer análisis en consultas públicas sin el archivo.
- Nombre de archivo: es un metadato del cliente y forma parte del
  enriquecimiento; queda cubierto por `enrichmentHash`.
- Hashes del archivo (`sha256`, tipo MIME, tamaño): el verificador los
  calcula desde su copia del archivo; incluirlos no aporta prueba.

### Cuándo se sirve

| Situación | Respuesta |
|---|---|
| Registro `dtr-2` en `CERTIFIED` con anclaje | 200 con el paquete |
| `id` desconocido | 404 |
| Registro `dtr-1` | 409: registro heredado, verificable solo por el servidor |
| Registro aún no anclado (`READY`, `ANCHORING`, etc.) | 409 |
| El `anchorHash` recalculado no coincide con el `canonicalHash` guardado | 409 y aviso en el log con el id del registro |
| Red del anclaje sin despliegue conocido, o datos de anclaje inválidos | 409 |

El servidor reconstruye el registro con el constructor de `dtr-core`, calcula
los hashes con `computeDtr2Hashes` y valida el paquete contra
`ProofPackageV1Schema` antes de responder. Con `download=1` la respuesta
lleva `Content-Disposition: attachment`. La consulta no registra un intento
de verificación: no emite veredicto.

### Pasos de verificación para un tercero

1. Calcular el SHA-256 del archivo original, y anotar su tipo MIME y su
   tamaño en bytes.
2. Calcular `coreHash = SHA-256(JCS({"asset": {"sha256", "mimeType",
   "sizeBytes"}}))` y compararlo con `dtr.coreHash`. Si difiere, el archivo
   no es el certificado.
3. Calcular `anchorHash = SHA-256(JCS({"schemaVersion", "issuedAt",
   "coreHash", "enrichmentHash"}))` con los valores del paquete y
   compararlo con `dtr.anchorHash`. Si difiere, el paquete es incoherente.
4. Llamar `isAnchored(0x<anchorHash>)` (o `anchoredAt`) en
   `anchor.contractAddress` de la red `anchor.chainId`, con cualquier nodo
   RPC público. `true` confirma el anclaje; `anchoredAt` da su instante.

`verifyProofPackageAgainstFile` en `dtr-core` implementa los pasos 2 y 3;
el paso 4 queda a cargo del llamador, como en `verifyDtr2Proof`.

## Alternativas consideradas

### A. Publicar el DTR `dtr-2` completo

Permitiría recalcular también `enrichmentHash`. Se descarta porque expone
el análisis IA y el nombre de archivo a cualquiera que conozca el id, en
contra de INV-41. Quien tenga el archivo y quiera ver el análisis ya lo
obtiene con `POST /public/verify/:id`.

### B. Soportar `dtr-1` subiendo el archivo

En `dtr-1` el hash anclado cubre el análisis y el nombre de archivo, así que
un paquete sin ellos no permite recalcularlo. Habría que publicar el DTR
completo (alternativa A) o exigir el archivo y devolver el análisis, que es
lo que ya hace la verificación del servidor. Por decisión de producto,
`dtr-1` queda como registro heredado verificable solo por el servidor.

### C. Paquete firmado por Ancrux

Una firma solo probaría que Ancrux emitió el paquete, que es justo la
confianza que la fase C quiere evitar. La prueba está en la cadena: si el
`anchorHash` recalculado está anclado, el paquete es válido aunque lo
entregue un tercero. Se deja fuera por ahora; podría añadirse en un formato
nuevo si se necesita autenticidad del emisor.

## Consecuencias

### Positivas

- Cualquiera puede verificar un registro `dtr-2` con el archivo, el paquete
  y un nodo RPC público, sin confiar en Ancrux.
- El formato es pequeño, versionado y validado en `dtr-core`; el navegador
  (C2) y el CLI (C5) lo consumen con el mismo esquema.
- No se expone el análisis IA ni el nombre de archivo.
- No se sirve paquete para registros alterados después de certificar.

### Negativas

- Los registros `dtr-1` no tienen verificación independiente.
- Sin el enriquecimiento, el tercero no puede comprobar qué análisis se
  certificó; solo que el archivo y la emisión están anclados.
- El formato pasa a ser un contrato público: cambiarlo exige una versión
  nueva y mantener la anterior.
- El endpoint publica `issuedAt` y las coordenadas del anclaje a quien
  conozca el id. Ya eran deducibles del veredicto público y de la cadena.

## Riesgos

- Si `AnchorRegistry` se desplegara en otra dirección, los anclajes
  anteriores a C1 tomarían el despliegue actual de su red. Mitigación:
  ADR-003 fija un contrato inmutable y C1 ya guarda contrato y `chainId`
  con cada anclaje.
- Un tercero podría implementar mal JCS. Mitigación: `dtr-core` es una
  librería sin dependencias de Node y los vectores fijos de ADR-015 sirven
  para comprobar otras implementaciones.

## Referencias

- `packages/dtr-core/src/proof-package.ts`
- `apps/api/src/application/verification/get-proof-package.use-case.ts`
- `docs/api/endpoints.md`
