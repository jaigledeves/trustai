import {
  MAX_FILE_BYTES,
  ProofPackageV1Schema,
  runIndependentVerification,
  type ChainReader,
  type ProofFetchResult,
} from "@trustai/dtr-core";
import { USAGE, parseCliArgs } from "./args.js";
import { EXIT_CODES, exitCodeFor, formatJson, formatText, type ProofExtras } from "./format.js";
import { fetchProofFromApi } from "./proof-source.js";

/** A proof package is a few hundred bytes; anything this large is the wrong file. */
export const MAX_PROOF_BYTES = 1024 * 1024;

/** Everything the CLI touches outside the process, injected so tests stay offline. */
export interface CliDeps {
  /** Size and kind, read before the file itself so an oversized file is never loaded. */
  statFile(path: string): Promise<{ size: number; isFile: boolean }>;
  readFile(path: string): Promise<Uint8Array>;
  fetch: typeof fetch;
  createChainReader(rpcUrl: string): ChainReader;
  stdout(text: string): void;
  stderr(text: string): void;
}

function describeError(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === "string") return code;
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs `ancrux-verify` and returns its exit code. The verification steps are
 * the shared dtr-core orchestrator, exactly as in the browser; this layer only
 * reads the local files, picks the proof source and prints the result.
 */
export async function runCli(argv: readonly string[], deps: CliDeps): Promise<number> {
  const parsed = parseCliArgs(argv);
  if (parsed.kind === "help") {
    deps.stdout(USAGE);
    return EXIT_CODES.verified;
  }
  if (parsed.kind === "error") {
    deps.stderr(`ancrux-verify: ${parsed.message}\n\n${USAGE}`);
    return EXIT_CODES.usage;
  }
  const { options } = parsed;
  const ioError = (message: string) => {
    deps.stderr(`ancrux-verify: ${message}\n`);
    return EXIT_CODES.usage;
  };

  let size: number;
  try {
    const stats = await deps.statFile(options.file);
    if (!stats.isFile) return ioError(`${options.file} is not a regular file`);
    size = stats.size;
  } catch (error) {
    return ioError(`cannot read ${options.file} (${describeError(error)})`);
  }

  // Read the file here, not inside the orchestrator, so a read failure is an
  // IO error (exit 2) rather than a failed verification step (exit 1). An
  // oversized file is never read: the orchestrator rejects it by size alone.
  let fileBytes: Uint8Array | undefined;
  if (size <= MAX_FILE_BYTES) {
    try {
      fileBytes = await deps.readFile(options.file);
    } catch (error) {
      return ioError(`cannot read ${options.file} (${describeError(error)})`);
    }
  }

  let trustRecordId: string;
  let loadProof: (id: string) => Promise<ProofFetchResult>;
  if (options.source.kind === "proof") {
    const proofPath = options.source.path;
    let body: unknown;
    try {
      const stats = await deps.statFile(proofPath);
      if (!stats.isFile) return ioError(`${proofPath} is not a regular file`);
      if (stats.size > MAX_PROOF_BYTES) {
        return ioError(`${proofPath} is larger than ${MAX_PROOF_BYTES} bytes; it is not a proof package`);
      }
      const bytes = await deps.readFile(proofPath);
      body = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    } catch (error) {
      return error instanceof SyntaxError
        ? ioError(`${proofPath} is not valid JSON`)
        : ioError(`cannot read ${proofPath} (${describeError(error)})`);
    }
    const declaredId = (body as { trustRecordId?: unknown } | null)?.trustRecordId;
    // Placeholder only: offline mode never uses the id to load the proof.
    trustRecordId = typeof declaredId === "string" ? declaredId : "local";
    loadProof = async () => ({ status: "ok", body });
  } else {
    const { api } = options.source;
    trustRecordId = options.source.id;
    loadProof = (id) => fetchProofFromApi(api, id, deps.fetch);
  }

  // Keeps the proof body to show the fields the orchestrator does not report.
  const extras: ProofExtras = {};
  const fetchProof = async (id: string) => {
    const fetched = await loadProof(id);
    if (fetched.status === "ok") {
      const proof = ProofPackageV1Schema.safeParse(fetched.body);
      if (proof.success && proof.data.anchor.blockNumber) extras.blockNumber = proof.data.anchor.blockNumber;
    }
    return fetched;
  };

  const result = await runIndependentVerification(
    {
      trustRecordId,
      file: {
        size,
        arrayBuffer: async () => new Uint8Array(fileBytes ?? new Uint8Array()).buffer,
      },
    },
    { fetchProof, chain: deps.createChainReader(options.rpc) },
  );

  deps.stdout(options.json ? formatJson(result) : formatText(result, extras));
  return exitCodeFor(result.outcome);
}
