import { Controller, Get, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applySecurityHeaders } from "./security-headers";

@Controller("probe")
class ProbeController {
  @Get()
  get(): { ok: boolean } {
    return { ok: true };
  }
}

describe("applySecurityHeaders", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication();
    applySecurityHeaders(app);
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle("probe").build(),
    );
    SwaggerModule.setup("api-docs", app, document);
    // Listen on an ephemeral port: supertest's default import needs
    // esModuleInterop, which the API tsconfig (src only) does not enable.
    await app.listen(0, "127.0.0.1");
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it("sets the baseline security headers on a JSON route", async () => {
    const response = await fetch(`${baseUrl}/probe`);

    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ ok: true });
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("strict-transport-security")).toContain("max-age=");
    expect(response.headers.get("x-powered-by")).toBeNull();
  });

  it("sends a CSP that forbids framing and inline scripts", async () => {
    const response = await fetch(`${baseUrl}/probe`);
    const csp = response.headers.get("content-security-policy") ?? "";

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toMatch(/script-src 'self'(;|$)/);
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("keeps Swagger UI loadable: external init script, inline styles and data: images allowed", async () => {
    const page = await fetch(`${baseUrl}/api-docs/`);
    const csp = page.headers.get("content-security-policy") ?? "";

    expect(page.status).toBe(200);
    // Swagger UI ships its bootstrap as an external file, so script-src 'self' suffices.
    expect(await page.text()).toContain("swagger-ui-init.js");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("img-src 'self' data:");
  });
});
