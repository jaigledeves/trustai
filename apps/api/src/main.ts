import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { resolveCorsOrigins } from "./cors-origins";
import { applySecurityHeaders } from "./security-headers";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Registered first so every response, including Swagger UI and errors, carries them.
  applySecurityHeaders(app);

  // Allow-list only (CORS_ORIGINS); the browser calls the API just from /verify.
  const cors = resolveCorsOrigins(process.env["CORS_ORIGINS"]);
  if (cors.usedFallback) {
    Logger.warn(
      `CORS_ORIGINS has no usable origin (unset, blank or wildcard-only); only ${cors.origins.join(", ")} may call the API from a browser.`,
      "Bootstrap",
    );
  }
  app.enableCors({ origin: cors.origins });

  if (!process.env["TRUSTED_PROXY_SECRET"]?.trim()) {
    Logger.warn(
      "TRUSTED_PROXY_SECRET is not set; web traffic is rate limited by the hosting egress IP shared by all users.",
      "Bootstrap",
    );
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Ancrux API")
    .setDescription(
      "Ancrux API — authentication, asset upload, Digital Trust Record lifecycle " +
        "(review, confirm, anchor) and public verification.",
    )
    .setVersion(process.env["npm_package_version"] ?? "0.1.0")
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api-docs", app, swaggerDocument);

  const port = process.env["PORT"] ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Ancrux API listening on port ${port}`);
}

void bootstrap();
