import { Readable } from "node:stream";
import { PayloadTooLargeException, type CallHandler, type ExecutionContext } from "@nestjs/common";
import { INTERCEPTORS_METADATA } from "@nestjs/common/constants";
import { of } from "rxjs";
import { describe, expect, it } from "vitest";
import { AssetsController } from "../assets/assets.controller";
import { PublicVerificationController } from "../public-verification/public-verification.controller";
import { DEFAULT_MAX_UPLOAD_BYTES } from "./upload-limits";

type InterceptorClass = new () => {
  intercept(context: ExecutionContext, next: CallHandler): Promise<unknown>;
};

const BOUNDARY = "trustai-test-boundary";

function multipartRequest(fileBytes: Buffer): Readable & { headers: Record<string, string> } {
  const body = Buffer.concat([
    Buffer.from(
      `--${BOUNDARY}\r\n` +
        'Content-Disposition: form-data; name="file"; filename="big.pdf"\r\n' +
        "Content-Type: application/pdf\r\n\r\n",
    ),
    fileBytes,
    Buffer.from(`\r\n--${BOUNDARY}--\r\n`),
  ]);
  const req = Readable.from([body]) as Readable & { headers: Record<string, string> };
  req.headers = {
    "content-type": `multipart/form-data; boundary=${BOUNDARY}`,
    "content-length": String(body.length),
  };
  return req;
}

async function runUploadInterceptor(handler: object, fileBytes: Buffer): Promise<unknown> {
  const interceptors = Reflect.getMetadata(INTERCEPTORS_METADATA, handler) as InterceptorClass[];
  const Interceptor = interceptors[0]!;
  const req = multipartRequest(fileBytes);
  const context = {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({}) }),
  } as unknown as ExecutionContext;
  return new Interceptor().intercept(context, { handle: () => of(null) });
}

describe.each([
  ["POST /assets", AssetsController.prototype.upload],
  ["POST /public/verify/:id", PublicVerificationController.prototype.verifyByUpload],
])("%s file interceptor", (_route, handler) => {
  it("rejects a file above the size limit with 413", async () => {
    await expect(
      runUploadInterceptor(handler, Buffer.alloc(DEFAULT_MAX_UPLOAD_BYTES + 1)),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it("accepts a file at the size limit", async () => {
    await expect(
      runUploadInterceptor(handler, Buffer.alloc(DEFAULT_MAX_UPLOAD_BYTES)),
    ).resolves.toBeDefined();
  });
});
