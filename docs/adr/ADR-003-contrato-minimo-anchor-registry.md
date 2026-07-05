# ADR-003: Contrato mínimo AnchorRegistry en L2 (Base Sepolia)

**Estado:** Aceptada
**Fecha:** 05/07/2026
**Decisores:** Jose (Product Owner), agente IA (arquitectura)

## Contexto

Había que decidir cómo se materializa el anclaje en blockchain. La
Constitución manda: blockchain solo para confianza e inmutabilidad. El
04-Viability descartó Ethereum L1 por coste (~$1.10/tx vs centavos en
L2) y estableció el batching Merkle como palanca de coste futura.

## Decisión

Un contrato Solidity **mínimo**, `AnchorRegistry`:

```solidity
// Esbozo conceptual — el diseño completo va en 09-Smart-Contract-Design
contract AnchorRegistry {
    event Anchored(bytes32 indexed hash, address indexed sender, uint256 timestamp);

    mapping(bytes32 => uint256) public anchoredAt;

    function anchor(bytes32 hash) external {
        require(anchoredAt[hash] == 0, "already anchored");
        anchoredAt[hash] = block.timestamp;
        emit Anchored(hash, msg.sender, block.timestamp);
    }
}
```

Propiedades clave:

- **El mismo `bytes32` sirve para un hash de DTR individual o para un
  Merkle root** de N DTRs: activar batching (04) no requiere cambiar el
  contrato.
- Evento indexado → verificación y auditoría sencillas desde cualquier
  explorador o cliente RPC, sin depender de TrustAI (RNF-032).
- Sin ownership de documentos, sin versionado, sin permisos on-chain:
  todo eso vive en la base de datos. On-chain solo evidencia.

**Red**: Base Sepolia (testnet) para el MVP. Criterios: fees bajísimas
en su mainnet (camino de producción), tooling maduro, faucets
disponibles. La cadena es intercambiable tras `AnchorPort` (RNF-031).

## Alternativas consideradas

### A. Sin contrato (hash en calldata, estilo OpenTimestamps)

- Pros: coste mínimo absoluto, cero código on-chain que mantener.
- Contras: verificación menos legible (parsear calldata), sin evento
  indexado, menor valor académico demostrable en el TFM.
- **Descartada** para MVP; válida como optimización extrema futura.

### B. Contrato rico (ownership, versiones, permisos on-chain)

- Pros: "más blockchain" en apariencia.
- Contras: duplica en la cadena estado que ya vive off-chain; más gas;
  más superficie de ataque; contradice la Constitución (blockchain solo
  para confianza/inmutabilidad).
- **Descartada.**

### C. Contrato mínimo con evento (elegida)

- Pros: ~20 líneas auditables; verificación elegante vía evento +
  mapping público; soporta individual y Merkle sin cambios; demuestra
  competencia Solidity/Foundry en el TFM sin sobreingeniería.
- Contras: coste de despliegue (una vez) y ~45-50K gas por anclaje
  (aceptable en L2, ver 04).

## Consecuencias

1. `AnchorPort.anchor(hashes[])` decide off-chain si envía un hash o
   construye el Merkle root; el contrato no cambia (RF-035, INV-30).
2. Con batching, cada DTR guarda su Merkle proof (INV-31); `dtr-core`
   implementa la verificación de proofs.
3. Antes de mainnet (post-MVP): revisión de seguridad ligera y
   verificación del contrato en el explorador (código fuente público).
4. El `require` de duplicados hace idempotente el anclaje: reintentos
   del worker no duplican eventos.

## Referencias

- docs/04-Viability.md (costes L2, batching Merkle)
- docs/07-Domain-Model.md (Anchor, INV-30/31/32/33)
- docs/adr/ADR-001-anclaje-hash-dtr-canonico.md
