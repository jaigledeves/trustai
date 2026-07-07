import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PgBossService } from "./pgboss.service";

@Module({
  imports: [ConfigModule],
  providers: [PgBossService],
  exports: [PgBossService],
})
export class WorkerModule {}
