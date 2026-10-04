import { describe, expect, it } from "vitest";
import { ANCHOR_REGISTRY_ABI, ANCHOR_REGISTRY_DEPLOYMENTS, BASE_SEPOLIA_ANCHOR_REGISTRY } from "../src/index.js";

describe("AnchorRegistry contract constants", () => {
  it("pins the Base Sepolia deployment (smart-contracts/broadcast/Deploy.s.sol/84532/run-latest.json)", () => {
    expect(BASE_SEPOLIA_ANCHOR_REGISTRY).toEqual({
      chainId: 84532,
      network: "base-sepolia",
      address: "0xe6738fb0aF94822a3831c8e0a65b5C6d20607C22",
    });
    expect(ANCHOR_REGISTRY_DEPLOYMENTS).toContain(BASE_SEPOLIA_ANCHOR_REGISTRY);
  });

  it("exposes the read functions an independent verifier needs", () => {
    const views = ANCHOR_REGISTRY_ABI.filter(
      (item) => item.type === "function" && item.stateMutability === "view",
    ).map((item) => item.name);

    expect(views).toEqual(expect.arrayContaining(["isAnchored", "anchoredAt"]));
  });

  it("keeps the full contract surface: anchor, Anchored event and both custom errors", () => {
    const names = ANCHOR_REGISTRY_ABI.map((item) => `${item.type}:${item.name}`);

    expect(names).toEqual([
      "function:anchor",
      "function:anchoredAt",
      "function:isAnchored",
      "event:Anchored",
      "error:AlreadyAnchored",
      "error:ZeroHash",
    ]);
  });
});
