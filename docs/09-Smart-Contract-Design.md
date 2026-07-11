# 09 - Smart Contract Design

**Proyecto:** TrustAI
**Versión:** 1.0
**Estado:** Draft
**Fecha:** Julio 2026

## Objetivo

Diseñar el contrato `AnchorRegistry` en detalle: código, propiedades de
seguridad, plan de pruebas Foundry, despliegue y operación. Materializa
el ADR-003.

## El contrato completo

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AnchorRegistry
/// @notice Registro permissionless de evidencias criptográficas.
///         Un bytes32 puede ser el hash de un DTR individual o el
///         Merkle root de un lote de DTRs (ADR-003).
contract AnchorRegistry {
    /// @notice Emitido una única vez por hash.
    event Anchored(bytes32 indexed hash, address indexed sender, uint256 timestamp);

    error ZeroHash();
    error AlreadyAnchored(bytes32 hash);

    /// @notice Timestamp del bloque en que se ancló cada hash (0 = no anclado).
    mapping(bytes32 => uint256) public anchoredAt;

    /// @notice Ancla un hash. Reverte si ya existe (idempotencia operativa).
    function anchor(bytes32 hash) external {
        if (hash == bytes32(0)) revert ZeroHash();
        if (anchoredAt[hash] != 0) revert AlreadyAnchored(hash);
        anchoredAt[hash] = block.timestamp;
        emit Anchored(hash, msg.sender, block.timestamp);
    }

    /// @notice Consulta de conveniencia para verificadores.
    function isAnchored(bytes32 hash) external view returns (bool) {
        return anchoredAt[hash] != 0;
    }
}
```

Eso es TODO el contrato. Cada línea que no está aquí es una decisión
(ver §Decisiones).

## Propiedades de diseño

| Propiedad | Cómo se garantiza | Por qué importa |
|---|---|---|
| **Inmutable** | Sin proxy, sin upgradeability, sin `selfdestruct` | Un registro de evidencias actualizable no es un registro de evidencias: nadie (ni TrustAI) puede cambiar la semántica a posteriori |
| **Permissionless** | `anchor` sin control de acceso | El contrato es un bien público: cualquiera puede anclar (paga su gas) y cualquiera puede verificar. Refuerza la independencia del proveedor (RNF-032) |
| **Sin owner** | Ningún rol privilegiado | No hay clave que robar ni poder que abusar |
| **Idempotente para el operador** | `AlreadyAnchored` en duplicado | El worker puede reintentar sin ensuciar la cadena; el error "ya anclado" se trata como éxito (la evidencia existe) |
| **Sin estado mutable** | Un hash escrito jamás cambia (solo escritura 0→timestamp) | Invariante verificable con tests de invariantes Foundry |
| **Barato** | 1 SSTORE + 1 evento ≈ 48-50K gas | Céntimos o menos en L2 (04 §1.2) |

## Qué se ancla (recordatorio ADR-001/003)

| Estrategia | Qué contiene el `bytes32` | Verificación |
|---|---|---|
| Individual (MVP) | `canonicalHash` del DTR | `anchoredAt[hash] > 0` |
| Batching Merkle (producción) | Merkle root de N `canonicalHash` | Merkle proof (en el DTR) hasta el root + `anchoredAt[root] > 0` |

La verificación de Merkle proofs vive en `dtr-core` (off-chain), no en
el contrato: verificar en cadena costaría gas sin añadir garantías.

## Flujo de verificación independiente (RNF-032)

Un verificador sin relación con TrustAI puede:

1. Canonicalizar el DTR (spec pública, `dtr-core` open source) y
   calcular su SHA-256.
2. Llamar `anchoredAt(hash)` en cualquier nodo RPC público de la red, o
   buscar el evento `Anchored` en el explorador.
3. Comparar el timestamp del bloque con la fecha declarada.

Ningún paso requiere permiso, cuenta ni infraestructura de TrustAI.

## Plan de pruebas (Foundry)

| Tipo | Casos |
|---|---|
| Unitarias | ancla y guarda timestamp; emite evento con args correctos; revierte con `ZeroHash`; revierte con `AlreadyAnchored`; `isAnchored` coherente |
| Fuzzing | `anchor(bytes32)` con hashes arbitrarios: siempre almacena `block.timestamp`, nunca sobrescribe |
| Invariantes | (1) un hash anclado nunca cambia su timestamp; (2) `anchoredAt[h] != 0 ⟺` existe evento `Anchored(h)` |
| Gas | `forge snapshot` en CI: una regresión de gas es un cambio de diseño, no un accidente |

Objetivo de cobertura: 100%. Con 15 líneas efectivas no hay excusa.

## Despliegue y operación

| Aspecto | Decisión |
|---|---|
| Red MVP | Base Sepolia (testnet, chainId 84532) — ADR-003 |
| Toolchain | Foundry (`smart-contracts/script/Deploy.s.sol`, `forge script` para deploy reproducible) |
| Verificación de código | Publicar código fuente en el explorador (Basescan) tras el deploy — sin esto, RNF-032 cojea |
| Registro | **Ya desplegado**: `0xe6738fb0aF94822a3831c8e0a65b5C6d20607C22` (recibo en `smart-contracts/broadcast/Deploy.s.sol/84532/run-latest.json`); configurado como `ANCHOR_CONTRACT_ADDRESS` en la API (docs/12-Deployment.md) |
| Wallet del worker | Clave en secreto de entorno (RNF-005); wallet dedicada solo para anclar, sin fondos más allá del gas necesario |
| Confirmaciones | El worker espera 2 confirmaciones antes de marcar `CERTIFIED` (INV-32) |
| Reintentos | `AlreadyAnchored` ⇒ éxito; timeout/nonce ⇒ reintento con backoff (RF-033) |

## Decisiones

1. **Sin función `anchorBatch(bytes32[])`**: para lotes usamos Merkle
   root con `anchor()` — un array de SSTOREs costaría ~20K gas por
   elemento extra; el Merkle root cuesta lo mismo que un hash. La
   función batch sería la opción peor en todos los escenarios.
2. **Sin upgradeability**: nueva versión = nuevo contrato desplegado;
   los anclajes históricos siguen siendo válidos en el contrato
   anterior (el DTR referencia dirección + tx). La confianza exige que
   el código que verificó tu evidencia no pueda cambiar.
3. **Permissionless a propósito**: restringir `anchor` a la wallet de
   TrustAI no aporta nada (el spam lo paga quien lo envía) y convierte
   un bien público en un servicio propietario.
4. **Custom errors en lugar de strings**: menos gas, ABI explícita para
   que el worker distinga `AlreadyAnchored` (éxito) de otros fallos.
5. **`isAnchored` como conveniencia**: los verificadores no técnicos
   usan el explorador; `anchoredAt` público ya bastaría, pero el
   booleano simplifica integraciones.

## Alternativas consideradas

- **ERC-7683 / estándares de attestation (EAS)**: Ethereum Attestation
  Service resuelve attestations genéricas y es interesante, pero añade
  una dependencia de protocolo externo y un modelo de datos más
  complejo del que el DTR necesita. Revisable post-MVP si
  interoperabilidad con el ecosistema attestation aporta valor
  comercial.
- **Timestamp del lado del contrato vs del DTR**: el DTR declara su
  fecha, pero la fecha probatoria es SIEMPRE la del bloque
  (`block.timestamp`). Decidido: la página de verificación muestra
  ambas y explica la diferencia (RF-045).
- **Multi-chain desde MVP (Bitcoin + EVM, estilo OriginStamp)**:
  descartado (RF-036 Won't); duplicaría operación sin demanda validada.

## Riesgos

- **Reorgs de L2**: mitigado con 2 confirmaciones + el estado
  `ANCHORING` no pasa a `CERTIFIED` hasta confirmación (INV-32).
- **Dependencia de testnet**: Base Sepolia puede resetearse o
  degradarse; aceptable en MVP (el diseño es idéntico en mainnet, solo
  cambia la config del `AnchorPort`).
- **Pérdida de la wallet del worker**: no compromete evidencias (el
  contrato es permissionless — cualquier wallet nueva sigue anclando);
  solo interrumpe operación hasta rotar el secreto.

El código en `smart-contracts/src/AnchorRegistry.sol` coincide exactamente
con el bloque anterior — sin desviaciones. Suite de tests en
`smart-contracts/test/AnchorRegistry.t.sol` (`.gas-snapshot` versionado en el
repo para detectar regresiones de gas en CI, según lo previsto arriba). El
worker (`ViemAnchorAdapter`, `apps/api/src/adapters/chain/`) usa el ABI en
`anchor-registry.abi.ts` y hay un e2e "live" gateado por credenciales reales
(`apps/api/test/anchor-basesepolia.e2e-spec.ts`) que somete una tx real a
Base Sepolia y confirma `isAnchored` on-chain — la prueba más cercana a la
demo del tribunal.

## Referencias

- docs/adr/ADR-003-contrato-minimo-anchor-registry.md
- docs/adr/ADR-001-anclaje-hash-dtr-canonico.md
- docs/07-Domain-Model.md (Anchor, INV-30..33)
- docs/06-Requirements.md (RF-033/035/044, RNF-032)
- docs/04-Viability.md (§1.2 costes de gas)
- docs/12-Deployment.md (dirección del contrato como variable de entorno de la API)

## Checklist

- [x] Código completo del contrato con justificación línea a línea
- [x] Propiedades de seguridad explícitas (inmutable, permissionless, sin owner)
- [x] Plan de pruebas Foundry (unit + fuzz + invariantes + gas)
- [x] Estrategia de despliegue, wallet y confirmaciones
- [x] Batching Merkle soportado sin cambios de contrato
- [x] Implementación + suite de tests (`smart-contracts/test/AnchorRegistry.t.sol`)
- [x] Desplegado en Base Sepolia (`0xe6738fb0aF94822a3831c8e0a65b5C6d20607C22`) y validado con e2e "live" contra la red real
- [ ] Verificación del código fuente en Basescan — pendiente de confirmar (no verificable desde el repo; revisar manualmente antes de la demo)
- [ ] Revisión de seguridad ligera antes de mainnet (post-MVP; sigue aplicando, Base Sepolia es solo testnet)

## Próximo Documento

10-AI-Architecture.md
