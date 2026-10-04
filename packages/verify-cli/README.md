# @trustai/verify-cli — `ancrux-verify`

CLI para verificar un registro `dtr-2` de Ancrux **sin confiar en Ancrux**
(roadmap C5). Ejecuta exactamente los mismos pasos que la verificación
independiente del navegador en `/verify/:id`, porque ambos usan el
orquestador compartido `runIndependentVerification` de `@trustai/dtr-core`:

1. **Archivo**: lee el archivo local (máximo 10 MB, comprobado antes de
   leerlo), calcula su SHA-256 y comprueba que es un PDF.
2. **Prueba**: carga el paquete de prueba `ancrux-proof-1` (ADR-016) y lo
   valida con el esquema estricto de `dtr-core`.
3. **coreHash**: lo recalcula a partir del archivo y lo compara con la prueba.
4. **anchorHash**: lo recalcula a partir de los campos de la prueba.
5. **Red**: comprueba que el nodo RPC sirve la cadena indicada en la prueba.
6. **Contrato**: comprueba que la prueba apunta al despliegue conocido de
   `AnchorRegistry`.
7. **Anclaje**: lee `isAnchored(anchorHash)` y `anchoredAt(anchorHash)` en el
   contrato (solo lectura: sin cartera, sin clave, sin gas).

## Qué se considera de confianza

Únicamente el **nodo RPC** que se indique con `--rpc` (por defecto
`https://sepolia.base.org`) y el **archivo** que aporta la persona usuaria.
La prueba no se acepta por venir de Ancrux: se recalcula y se contrasta con la
cadena. Con `--proof` no se contacta con Ancrux en ningún momento; con `--id`
la API solo sirve el paquete de prueba, que después se valida igual.

## Compilación y ejecución desde el monorepo

Requiere Node.js 22 o superior y las dependencias instaladas (`pnpm install`).

```bash
pnpm --filter @trustai/dtr-core build
pnpm --filter @trustai/verify-cli build
node packages/verify-cli/dist/cli.js <archivo> --proof <prueba.json>
```

El paquete declara el binario `ancrux-verify` (`dist/cli.js`), que queda
disponible con ese nombre si el paquete se instala o se enlaza globalmente.

## Uso

```text
ancrux-verify <archivo> --proof <prueba.json> [--rpc <url>] [--json]
ancrux-verify <archivo> --id <trustRecordId> [--api <url>] [--rpc <url>] [--json]
```

| Opción | Descripción |
|---|---|
| `--proof <ruta>` | Paquete de prueba `ancrux-proof-1` en disco (descargable desde `/verify/:id`). Sin peticiones a Ancrux. |
| `--id <id>` | Descarga la prueba desde `<api>/public/verify/<id>/proof`, con un tiempo máximo de 10 s. |
| `--api <url>` | URL base de la API para `--id` (por defecto `https://trustaiapi-production.up.railway.app`). |
| `--rpc <url>` | Endpoint JSON-RPC (por defecto `https://sepolia.base.org`). Tiempo máximo de 10 s por lectura. |
| `--json` | Imprime el resultado legible por máquina (`outcome`, `exitCode`, `steps`) en lugar del texto. |
| `-h`, `--help` | Muestra la ayuda. |

Ejemplo con un PDF y una prueba cuyo `anchorHash` no está anclado:

```text
$ node packages/verify-cli/dist/cli.js documento.pdf --proof prueba.json
[ok]       file        PDF file read and hashed locally
            sha256: cb3585b1...
...
[failed]   anchored    anchorHash is not anchored on the AnchorRegistry contract
            anchorHash: 9c2543ad...

Result: NOT VERIFIED (step anchored failed).
```

La salida del CLI está en inglés; cada paso muestra sus datos completos
(hashes, `chainId`, contrato, `txHash`, `blockNumber`, `anchoredAt`).

## Códigos de salida

| Código | Significado |
|---|---|
| `0` | Verificado de forma independiente: todos los pasos son correctos. |
| `1` | No verificado: algún paso ha fallado (archivo distinto, prueba inválida, hash no anclado, error del RPC o de la API, etc.). |
| `2` | Error de uso o de E/S: argumentos inválidos, archivo o prueba ilegibles, JSON inválido. |
| `3` | No verificable de forma independiente: registro `dtr-1` heredado (409 `legacy_record`), identificador inexistente (404) o registro sin paquete de prueba todavía (otro 409). |

Un registro `dtr-1` solo puede verificarlo el servidor de Ancrux; el CLI lo
indica explícitamente en lugar de presentarlo como un fallo.

## Formato de la prueba

El paquete `ancrux-proof-1` está definido en
[ADR-016](../../docs/adr/ADR-016-paquete-de-prueba-publico.md) y validado por
`ProofPackageV1Schema` en `@trustai/dtr-core`.

## Desarrollo

```bash
pnpm --filter @trustai/verify-cli test       # vitest, sin red (lector de cadena y fetch simulados)
pnpm --filter @trustai/verify-cli typecheck
```
