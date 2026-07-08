import { describe, expect, it } from "vitest";
import { ObjectNotFoundError } from "../../ports/storage.port";
import { InMemoryStorageAdapter } from "./in-memory.adapter";

describe("InMemoryStorageAdapter (StoragePort contract)", () => {
  it("putObject then getObject returns the exact same bytes", async () => {
    const storage = new InMemoryStorageAdapter();
    const body = Buffer.from("hello certification flow");

    await storage.putObject({ key: "org-a/asset-1", body, contentType: "application/pdf" });
    const result = await storage.getObject("org-a/asset-1");

    expect(result.equals(body)).toBe(true);
  });

  it("getObject on a missing key throws ObjectNotFoundError", async () => {
    const storage = new InMemoryStorageAdapter();

    await expect(storage.getObject("does-not-exist")).rejects.toBeInstanceOf(
      ObjectNotFoundError,
    );
  });

  it("putObject on an existing key overwrites the previous content", async () => {
    const storage = new InMemoryStorageAdapter();
    const key = "org-a/asset-1";

    await storage.putObject({ key, body: Buffer.from("first version") });
    await storage.putObject({ key, body: Buffer.from("second version") });

    const result = await storage.getObject(key);
    expect(result.toString("utf8")).toBe("second version");
  });

  it("keeps distinct keys independent (no cross-contamination)", async () => {
    const storage = new InMemoryStorageAdapter();

    await storage.putObject({ key: "org-a/asset-1", body: Buffer.from("org-a-content") });
    await storage.putObject({ key: "org-b/asset-1", body: Buffer.from("org-b-content") });

    expect((await storage.getObject("org-a/asset-1")).toString("utf8")).toBe("org-a-content");
    expect((await storage.getObject("org-b/asset-1")).toString("utf8")).toBe("org-b-content");
  });
});
