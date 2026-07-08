import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AssetsModule } from "./modules/assets/assets.module";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { TrustRecordsModule } from "./modules/trust-records/trust-records.module";
import { WorkerModule } from "./modules/worker/worker.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    HealthModule,
    WorkerModule,
    AssetsModule,
    TrustRecordsModule,
  ],
})
export class AppModule {}
