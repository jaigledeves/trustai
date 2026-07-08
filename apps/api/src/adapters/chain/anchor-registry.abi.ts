/**
 * `AnchorRegistry` ABI (smart-contracts/src/AnchorRegistry.sol) — hand-kept
 * in sync with the Solidity source rather than imported from the Foundry
 * build artifact (`smart-contracts/out/`, gitignored), so `apps/api` never
 * depends on `smart-contracts/` having been built. The contract is
 * intentionally tiny (3 functions, 1 event, 2 errors) and frozen
 * (permissionless, immutable, no owner/proxy — smart-contracts/README.md),
 * so this mirror is low-maintenance-risk. `as const` gives viem full
 * type inference for `simulateContract`/`writeContract` calls.
 */
export const ANCHOR_REGISTRY_ABI = [
  {
    type: "function",
    name: "anchor",
    inputs: [{ name: "hash", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "anchoredAt",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isAnchored",
    inputs: [{ name: "hash", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Anchored",
    inputs: [
      { name: "hash", type: "bytes32", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "AlreadyAnchored",
    inputs: [{ name: "hash", type: "bytes32" }],
  },
  {
    type: "error",
    name: "ZeroHash",
    inputs: [],
  },
] as const;
