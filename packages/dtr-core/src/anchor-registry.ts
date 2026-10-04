/**
 * `AnchorRegistry` contract constants (smart-contracts/src/AnchorRegistry.sol,
 * ADR-003): the single source of truth for its ABI and known deployments,
 * shared by the API, the browser verifier and the CLI.
 *
 * Plain data, no chain client dependency: any EVM library (viem, ethers) can
 * consume the ABI. It is hand-kept in sync with the Solidity source instead
 * of being imported from the Foundry build output (`smart-contracts/out/`,
 * gitignored); the contract is tiny and immutable (no owner, no proxy), so
 * the mirror is low-maintenance. `as const` keeps the literal types that
 * viem needs for typed `readContract`/`simulateContract` calls.
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

export interface AnchorRegistryDeployment {
  /** EIP-155 chain id. */
  readonly chainId: number;
  /** Network name as stored in `Anchor.network`. */
  readonly network: string;
  /** EIP-55 checksummed contract address. */
  readonly address: `0x${string}`;
}

/**
 * The deployment on Base Sepolia (ADR-003). Receipt:
 * smart-contracts/broadcast/Deploy.s.sol/84532/run-latest.json.
 */
export const BASE_SEPOLIA_ANCHOR_REGISTRY: AnchorRegistryDeployment = {
  chainId: 84532,
  network: "base-sepolia",
  address: "0xe6738fb0aF94822a3831c8e0a65b5C6d20607C22",
};

/** Every known public deployment, looked up by chain id. */
export const ANCHOR_REGISTRY_DEPLOYMENTS: readonly AnchorRegistryDeployment[] = [
  BASE_SEPOLIA_ANCHOR_REGISTRY,
];
