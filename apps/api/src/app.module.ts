import { Module, type DynamicModule, type Type } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AssetsModule } from "./modules/assets/assets.module";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { PublicVerificationModule } from "./modules/public-verification/public-verification.module";
import { ThrottlingModule } from "./modules/throttling/throttling.module";
import { TrustRecordsModule } from "./modules/trust-records/trust-records.module";
import { WorkerModule } from "./modules/worker/worker.module";

// public-verification design.md "Feature flag" decision: read directly at
// module-eval time (NOT via ConfigService/DI, which doesn't exist yet
// when this decorator runs) — the rollback plan is "disabling removes
// routes only", achieved by simply never adding the module to `imports`.
// Requires a process restart to change, same as any other env var read
// this way (e.g. WorkerModule's ANCHOR_PORT factory reads its own env
// vars later, via DI, so it doesn't have this restriction — this flag
// specifically needs to gate the `imports` array itself).
const publicVerificationImports: Array<Type | DynamicModule> =
  process.env["PUBLIC_VERIFICATION_ENABLED"] === "true" ? [PublicVerificationModule] : [];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    // ADR-012: the global rate-limiting APP_GUARD. Imported after
    // ConfigModule/AuthModule (both of which it depends on), before the
    // route modules it guards.
    ThrottlingModule,
    HealthModule,
    WorkerModule,
    AssetsModule,
    TrustRecordsModule,
    ...publicVerificationImports,
  ],
})
export class AppModule {}
