import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Abi } from "viem";

// smart-contracts/out/ is a gitignored Foundry build artifact — apps/api's
// own source never depends on it existing (src/adapters/chain/anchor-registry.abi.ts
// hand-mirrors the ABI instead). Only this TEST reads it, and only to get
// the deployment BYTECODE for spinning up a fresh contract instance on
// anvil — something a hand-mirrored ABI alone can't provide.
const ARTIFACT_PATH = join(
  __dirname,
  "../../../../smart-contracts/out/AnchorRegistry.sol/AnchorRegistry.json",
);

export interface AnchorRegistryArtifact {
  abi: Abi;
  bytecode: `0x${string}`;
}

export function anchorRegistryArtifactExists(): boolean {
  return existsSync(ARTIFACT_PATH);
}

/** @throws if the artifact doesn't exist — check `anchorRegistryArtifactExists()` first. */
export function readAnchorRegistryArtifact(): AnchorRegistryArtifact {
  const raw = JSON.parse(readFileSync(ARTIFACT_PATH, "utf8")) as {
    abi: Abi;
    bytecode: { object: `0x${string}` };
  };
  return { abi: raw.abi, bytecode: raw.bytecode.object };
}
