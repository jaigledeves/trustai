import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Permissive CORS for dev; tighten per environment before production use.
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Ancrux API")
    .setDescription("Ancrux API — auth and health endpoints")
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
