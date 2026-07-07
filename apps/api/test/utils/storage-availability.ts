import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";

const CONNECT_TIMEOUT_MS = 3_000;

/**
 * Best-effort check used to skip S3/MinIO-backed integration specs
 * gracefully in environments where MinIO is not reachable (mirrors
 * `isDatabaseAvailable` in `db-availability.ts` — D7 service-gating
 * pattern) instead of hard-failing the whole run.
 */
export async function isStorageAvailable(): Promise<boolean> {
  const endpoint = process.env["S3_ENDPOINT"];
  if (!endpoint) {
    return false;
  }

  const client = new S3Client({
    endpoint,
    region: process.env["S3_REGION"] ?? "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env["S3_ACCESS_KEY"] ?? "",
      secretAccessKey: process.env["S3_SECRET_KEY"] ?? "",
    },
  });

  try {
    await Promise.race([
      client.send(new HeadBucketCommand({ Bucket: process.env["S3_BUCKET"] ?? "trustai-assets-dev" })).catch(
        // A 404 (bucket doesn't exist yet) still proves MinIO itself is
        // reachable and answering S3 API calls — that's all this check needs.
        (err) => {
          if (err?.$metadata?.httpStatusCode) return;
          throw err;
        },
      ),
      new Promise((_resolve, reject) =>
        setTimeout(() => reject(new Error("S3 connect timeout")), CONNECT_TIMEOUT_MS),
      ),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    client.destroy();
  }
}
