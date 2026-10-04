import { parseArgs } from "node:util";

/** Public Ancrux API, used only by `--id` to download the proof package. */
export const DEFAULT_API_URL = "https://trustaiapi-production.up.railway.app";
/** Public Base Sepolia RPC node: the only party the check has to trust. */
export const DEFAULT_RPC_URL = "https://sepolia.base.org";

export const USAGE = `Usage:
  ancrux-verify <file> --proof <proof.json> [--rpc <url>] [--json]
  ancrux-verify <file> --id <trustRecordId> [--api <url>] [--rpc <url>] [--json]

Verifies a dtr-2 record independently: hashes <file> locally, checks it
against the public proof package (ancrux-proof-1, ADR-016) and reads the
AnchorRegistry contract over a public RPC node.

Options:
  --proof <path>  Proof package JSON on disk (no request to Ancrux).
  --id <id>       Download the proof package from the public API.
  --api <url>     API base URL for --id (default ${DEFAULT_API_URL}).
  --rpc <url>     JSON-RPC endpoint (default ${DEFAULT_RPC_URL}).
  --json          Print the machine-readable result instead of text.
  -h, --help      Show this help.

Exit codes:
  0  verified independently
  1  not verified (a step failed)
  2  usage or IO error
  3  cannot be verified independently (legacy dtr-1 record, unknown id,
     or no proof package available yet)
`;

export type ProofSource = { kind: "proof"; path: string } | { kind: "id"; id: string; api: string };

export interface CliOptions {
  file: string;
  source: ProofSource;
  rpc: string;
  json: boolean;
}

export type ParsedArgs = { kind: "run"; options: CliOptions } | { kind: "help" } | { kind: "error"; message: string };

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/** Parses the command line with node:util, never throws. */
export function parseCliArgs(argv: readonly string[]): ParsedArgs {
  let parsed;
  try {
    parsed = parseArgs({
      args: [...argv],
      allowPositionals: true,
      strict: true,
      options: {
        proof: { type: "string" },
        id: { type: "string" },
        api: { type: "string" },
        rpc: { type: "string" },
        json: { type: "boolean" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (error) {
    return { kind: "error", message: error instanceof Error ? error.message : String(error) };
  }

  const { values, positionals } = parsed;
  if (values.help) return { kind: "help" };

  if (positionals.length === 0) return { kind: "error", message: "missing <file>" };
  if (positionals.length > 1) return { kind: "error", message: "expected exactly one <file>" };
  if (values.proof !== undefined && values.id !== undefined) {
    return { kind: "error", message: "--proof and --id are mutually exclusive" };
  }
  if (values.proof === undefined && values.id === undefined) {
    return { kind: "error", message: "one of --proof or --id is required" };
  }
  if (values.api !== undefined && values.id === undefined) {
    return { kind: "error", message: "--api only applies to --id" };
  }

  const rpc = values.rpc ?? DEFAULT_RPC_URL;
  if (!isHttpUrl(rpc)) return { kind: "error", message: "--rpc must be an http(s) URL" };
  const api = values.api ?? DEFAULT_API_URL;
  if (!isHttpUrl(api)) return { kind: "error", message: "--api must be an http(s) URL" };

  const source: ProofSource =
    values.proof !== undefined ? { kind: "proof", path: values.proof } : { kind: "id", id: values.id ?? "", api };
  return { kind: "run", options: { file: positionals[0] ?? "", source, rpc, json: values.json ?? false } };
}
