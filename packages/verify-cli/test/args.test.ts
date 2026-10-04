import { describe, expect, it } from "vitest";
import { DEFAULT_API_URL, DEFAULT_RPC_URL, parseCliArgs } from "../src/args.js";

describe("parseCliArgs", () => {
  it("parses the offline --proof form with the default RPC", () => {
    expect(parseCliArgs(["doc.pdf", "--proof", "proof.json"])).toEqual({
      kind: "run",
      options: { file: "doc.pdf", source: { kind: "proof", path: "proof.json" }, rpc: DEFAULT_RPC_URL, json: false },
    });
  });

  it("parses the --id form with the default API, a custom RPC and --json", () => {
    expect(parseCliArgs(["doc.pdf", "--id", "rec-1", "--rpc", "https://rpc.example", "--json"])).toEqual({
      kind: "run",
      options: {
        file: "doc.pdf",
        source: { kind: "id", id: "rec-1", api: DEFAULT_API_URL },
        rpc: "https://rpc.example",
        json: true,
      },
    });
  });

  it("accepts a custom API for --id and options before the file", () => {
    const parsed = parseCliArgs(["--id", "rec-1", "--api", "http://localhost:3001", "doc.pdf"]);
    expect(parsed).toMatchObject({ kind: "run", options: { source: { kind: "id", api: "http://localhost:3001" } } });
  });

  it("returns help for --help and -h", () => {
    expect(parseCliArgs(["--help"])).toEqual({ kind: "help" });
    expect(parseCliArgs(["-h"])).toEqual({ kind: "help" });
  });

  it.each([
    [[], "missing <file>"],
    [["doc.pdf"], "one of --proof or --id is required"],
    [["doc.pdf", "--proof", "p.json", "--id", "rec-1"], "--proof and --id are mutually exclusive"],
    [["doc.pdf", "--proof", "p.json", "--api", "http://x"], "--api only applies to --id"],
    [["a.pdf", "b.pdf", "--proof", "p.json"], "expected exactly one <file>"],
    [["doc.pdf", "--unknown"], "Unknown option"],
    [["doc.pdf", "--proof"], "argument missing"],
    [["doc.pdf", "--id", "rec-1", "--rpc", "not a url"], "--rpc must be an http(s) URL"],
    [["doc.pdf", "--id", "rec-1", "--api", "ftp://x"], "--api must be an http(s) URL"],
  ])("rejects %j as a usage error", (argv, message) => {
    const parsed = parseCliArgs(argv);
    expect(parsed.kind).toBe("error");
    expect(parsed.kind === "error" && parsed.message).toContain(message);
  });
});
