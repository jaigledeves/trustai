import { Injectable } from "@nestjs/common";
import { ObjectNotFoundError, type StoragePort } from "../../ports/storage.port";

/**
 * In-memory fake for unit tests — same pattern as `StubNotificationAdapter`.
 * Not used outside tests; production wiring uses `S3StorageAdapter`.
 */
@Injectable()
export class InMemoryStorageAdapter implements StoragePort {
  private readonly objects = new Map<string, Buffer>();

  async putObject(params: { key: string; body: Buffer; contentType?: string }): Promise<void> {
    this.objects.set(params.key, Buffer.from(params.body));
  }

  async getObject(key: string): Promise<Buffer> {
    const object = this.objects.get(key);
    if (!object) {
      throw new ObjectNotFoundError(key);
    }
    return Buffer.from(object);
  }
}
