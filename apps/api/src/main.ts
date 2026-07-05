import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

// TASK-0 spike bootstrap: minimal, no ValidationPipe/Swagger/CORS yet.
// Replaced by the final bootstrap in TASK-7.
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[spike] NestJS bootstrapped OK on port ${port}`);
}

void bootstrap();
