const CONNECT_TIMEOUT_MS = 3_000;

export const ANVIL_RPC_URL = process.env["ANVIL_RPC_URL"] ?? "http://127.0.0.1:8545";

/**
 * Best-effort check used to skip the anchor-chain integration suite
 * gracefully when no local anvil node is reachable (D7-style service
 * gating, mirrors `isDatabaseAvailable`/`isStorageAvailable`) — this repo
 * does not run anvil via docker-compose (unlike Postgres/MinIO), so
 * developers start it manually (`anvil`) before running this suite.
 */
export async function isAnvilAvailable(): Promise<boolean> {
  try {
    const response = await Promise.race([
      fetch(ANVIL_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_chainId", params: [], id: 1 }),
      }),
      new Promise<never>((_resolve, reject) =>
        setTimeout(() => reject(new Error("anvil connect timeout")), CONNECT_TIMEOUT_MS),
      ),
    ]);
    if (!response.ok) {
      return false;
    }
    const body = (await response.json()) as { result?: string };
    return typeof body.result === "string";
  } catch {
    return false;
  }
}
