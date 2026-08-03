import { config } from "@/lib/config";

/**
 * Public info: the live AnchorRegistry on Base Sepolia (docs/12-Deployment.md).
 * Shared by `Hero` (badge link) and `Footer` (contract link) — a single
 * source instead of duplicating the address/URL in both sections.
 */
export const ANCHOR_CONTRACT = "0xe6738fb0aF94822a3831c8e0a65b5C6d20607C22";

export const contractUrl = `${config.chainExplorerBaseUrl}/address/${ANCHOR_CONTRACT}`;
