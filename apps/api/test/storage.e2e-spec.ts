import { CreateBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ObjectNotFoundError } from "../src/ports/storage.port";
import { S3StorageAdapter } from "../src/adapters/storage/s3.adapter";
import { isStorageAvailable } from "./utils/storage-availability";

const storageAvailable = await isStorageAvailable();

// Service-gated per D7: this suite exercises a real MinIO instance
// (infrastructure/docker-compose.yml). When MinIO isn't reachable in the
// current environment, the whole describe block is skipped rather than
// failing the run — mirrors test/utils/db-availability.ts / auth.e2e-spec.ts.
describe.skipIf(!storageAvailable)("S3StorageAdapter (integration, MinIO-backed)", () => {
  const config = {
    endpoint: process.env["S3_ENDPOINT"] ?? "http://localhost:9000",
    region: process.env["S3_REGION"] ?? "us-east-1",
    bucket: process.env["S3_BUCKET"] ?? "trustai-assets-dev",
    accessKeyId: process.env["S3_ACCESS_KEY"] ?? "minioadmin",
    secretAccessKey: process.env["S3_SECRET_KEY"] ?? "minioadmin",
    forcePathStyle: true,
  };

  let adapter: S3StorageAdapter;
  let bootstrapClient: S3Client;

  beforeAll(async () => {
    bootstrapClient = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
    try {
      await bootstrapClient.send(new CreateBucketCommand({ Bucket: config.bucket }));
    } catch (err) {
      const name = (err as { name?: string }).name;
      if (name !== "BucketAlreadyOwnedByYou" && name !== "BucketAlreadyExists") {
        throw err;
      }
    }

    adapter = new S3StorageAdapter(config);
  });

  afterAll(() => {
    bootstrapClient?.destroy();
  });

  it("putObject then getObject round-trips the exact same bytes against real MinIO", async () => {
    const key = `integration-test/${Date.now()}-roundtrip.bin`;
    const body = Buffer.from("certification-flow S3 integration test payload");

    await adapter.putObject({ key, body, contentType: "application/octet-stream" });
    const result = await adapter.getObject(key);

    expect(result.equals(body)).toBe(true);
  });

  it("getObject on a missing key throws ObjectNotFoundError", async () => {
    const key = `integration-test/${Date.now()}-missing.bin`;

    await expect(adapter.getObject(key)).rejects.toBeInstanceOf(ObjectNotFoundError);
  });
});
