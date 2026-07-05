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
