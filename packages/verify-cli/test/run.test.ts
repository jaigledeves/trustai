import type { ChainReader } from "@trustai/dtr-core";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_API_URL, DEFAULT_RPC_URL } from "../src/args.js";
import { runCli, type CliDeps } from "../src/run.js";
import { GOLDEN_TRUST_RECORD_ID, PDF_BYTES, buildProof, fakeChain } from "./fixtures.js";

interface Harness {
  deps: CliDeps;
  out: () => string;
  err: () => string;
  fetch: ReturnType<typeof vi.fn>;
  createChainReader: ReturnType<typeof vi.fn>;
}

function harness(options: {
  files?: Record<string, Uint8Array>;
  chain?: ChainReader;
  fetch?: (url: string, init?: RequestInit) => Promise<Response>;
}): Harness {
  const files = options.files ?? {};
  let out = "";
  let err = "";
  const fetch = vi.fn(options.fetch ?? (async () => new Response(null, { status: 500 })));
  const createChainReader = vi.fn(() => options.chain ?? fakeChain());
  const missing = (path: string) => Object.assign(new Error(`ENOENT: ${path}`), { code: "ENOENT" });
  return {
    deps: {
      statFile: async (path) => {
        const bytes = files[path];
        if (!bytes) throw missing(path);
        return bytes.byteLength;
      },
      readFile: async (path) => {
        const bytes = files[path];
        if (!bytes) throw missing(path);
        return bytes;
      },
      fetch: fetch as unknown as typeof globalThis.fetch,
      createChainReader,
      stdout: (text) => {
        out += text;
      },
      stderr: (text) => {
        err += text;
      },
    },
    out: () => out,
    err: () => err,
    fetch,
    createChainReader,
  };
}

const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("runCli --proof (offline from Ancrux)", () => {
  it("verifies the file against a local proof package and the chain, exit 0", async () => {
    const h = harness({ files: { "doc.pdf": PDF_BYTES, "proof.json": encode(await buildProof()) } });

    const code = await runCli(["doc.pdf", "--proof", "proof.json"], h.deps);

    expect(code).toBe(0);
    expect(h.out()).toContain("Result: VERIFIED independently");
    expect(h.out()).toContain("blockNumber: 18734512");
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.createChainReader).toHaveBeenCalledWith(DEFAULT_RPC_URL);
  });

  it("reports a hash the chain does not know as not verified, exit 1", async () => {
    const h = harness({
      files: { "doc.pdf": PDF_BYTES, "proof.json": encode(await buildProof()) },
      chain: fakeChain({ isAnchored: vi.fn(async () => false), anchoredAt: vi.fn(async () => 0n) }),
    });

    const code = await runCli(["doc.pdf", "--proof", "proof.json", "--rpc", "https://rpc.example"], h.deps);

    expect(code).toBe(1);
    expect(h.out()).toMatch(/\[failed\]\s+anchored/);
    expect(h.createChainReader).toHaveBeenCalledWith("https://rpc.example");
  });

  it("reports a different file as a coreHash mismatch, exit 1", async () => {
    const other = new TextEncoder().encode("%PDF-1.7\nanother file\n");
    const h = harness({ files: { "doc.pdf": other, "proof.json": encode(await buildProof()) } });

    expect(await runCli(["doc.pdf", "--proof", "proof.json"], h.deps)).toBe(1);
    expect(h.out()).toMatch(/\[failed\]\s+coreHash/);
  });

  it("prints the machine-readable result with --json", async () => {
    const h = harness({ files: { "doc.pdf": PDF_BYTES, "proof.json": encode(await buildProof()) } });

    const code = await runCli(["doc.pdf", "--proof", "proof.json", "--json"], h.deps);
    const parsed = JSON.parse(h.out()) as { outcome: string; exitCode: number; steps: unknown[] };

    expect(code).toBe(0);
    expect(parsed).toMatchObject({ outcome: "verified", exitCode: 0 });
    expect(parsed.steps).toHaveLength(7);
  });

  it("rejects an oversized file before reading it, exit 1", async () => {
    const h = harness({ files: { "doc.pdf": PDF_BYTES, "proof.json": encode(await buildProof()) } });
    const readFile = vi.fn(h.deps.readFile);
    const deps = { ...h.deps, statFile: async () => 10 * 1024 * 1024 + 1, readFile };

    expect(await runCli(["doc.pdf", "--proof", "proof.json"], deps)).toBe(1);
    expect(h.out()).toMatch(/\[failed\]\s+file/);
    expect(readFile).not.toHaveBeenCalledWith("doc.pdf");
  });

  it.each([
    [{ "proof.json": new Uint8Array() }, "cannot read doc.pdf"],
    [{ "doc.pdf": PDF_BYTES }, "cannot read proof.json"],
    [{ "doc.pdf": PDF_BYTES, "proof.json": new TextEncoder().encode("{not json") }, "is not valid JSON"],
  ])("exits 2 on an IO error (%#)", async (files, message) => {
    const h = harness({ files });

    expect(await runCli(["doc.pdf", "--proof", "proof.json"], h.deps)).toBe(2);
    expect(h.err()).toContain(message);
    expect(h.out()).toBe("");
  });
});

describe("runCli --id (proof fetched from the public API)", () => {
  it("fetches the proof from the default API and verifies, exit 0", async () => {
    const proof = await buildProof();
    const h = harness({ files: { "doc.pdf": PDF_BYTES }, fetch: async () => json(200, proof) });

    const code = await runCli(["doc.pdf", "--id", GOLDEN_TRUST_RECORD_ID], h.deps);

    expect(code).toBe(0);
    const [url, init] = h.fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${DEFAULT_API_URL}/public/verify/${GOLDEN_TRUST_RECORD_ID}/proof`);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("honours a custom API without a doubled slash", async () => {
    const h = harness({ files: { "doc.pdf": PDF_BYTES }, fetch: async () => json(404, {}) });

    await runCli(["doc.pdf", "--id", "a b", "--api", "http://localhost:3001/"], h.deps);

    expect(h.fetch.mock.calls[0]?.[0]).toBe("http://localhost:3001/public/verify/a%20b/proof");
  });

  it("reports an unknown record as not found, exit 3", async () => {
    const h = harness({ files: { "doc.pdf": PDF_BYTES }, fetch: async () => json(404, { message: "Not Found" }) });

    expect(await runCli(["doc.pdf", "--id", "missing"], h.deps)).toBe(3);
    expect(h.out()).toContain("Result: CANNOT VERIFY: no record with this id.");
  });

  it("reports a 409 legacy_record as a legacy dtr-1 record, exit 3", async () => {
    const h = harness({
      files: { "doc.pdf": PDF_BYTES },
      fetch: async () => json(409, { reason: "legacy_record", message: "dtr-1 record" }),
    });

    expect(await runCli(["doc.pdf", "--id", "rec-1"], h.deps)).toBe(3);
    expect(h.out()).toContain("legacy dtr-1 record");
    expect(h.createChainReader).toHaveBeenCalledTimes(1);
  });

  it("reports any other 409 as unavailable, exit 3", async () => {
    const h = harness({ files: { "doc.pdf": PDF_BYTES }, fetch: async () => json(409, { reason: "not_anchored" }) });

    expect(await runCli(["doc.pdf", "--id", "rec-1"], h.deps)).toBe(3);
    expect(h.out()).toContain("no proof package is available");
  });

  it("turns a server error into a failed proof step, exit 1", async () => {
    const h = harness({ files: { "doc.pdf": PDF_BYTES }, fetch: async () => json(503, {}) });

    expect(await runCli(["doc.pdf", "--id", "rec-1"], h.deps)).toBe(1);
    expect(h.out()).toMatch(/\[failed\]\s+proof/);
  });

  it("maps a request that times out to the proof timeout code", async () => {
    const h = harness({
      files: { "doc.pdf": PDF_BYTES },
      fetch: async () => {
        throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
      },
    });

    expect(await runCli(["doc.pdf", "--id", "rec-1", "--json"], h.deps)).toBe(1);
    expect(h.out()).toContain('"code": "proof_timeout"');
  });
});

describe("runCli usage", () => {
  it("prints the usage and exits 0 on --help", async () => {
    const h = harness({});

    expect(await runCli(["--help"], h.deps)).toBe(0);
    expect(h.out()).toContain("ancrux-verify <file> --proof <proof.json>");
  });

  it("prints the error and the usage on stderr and exits 2 on bad arguments", async () => {
    const h = harness({});

    expect(await runCli(["doc.pdf"], h.deps)).toBe(2);
    expect(h.err()).toContain("one of --proof or --id is required");
    expect(h.err()).toContain("Usage:");
  });
});
