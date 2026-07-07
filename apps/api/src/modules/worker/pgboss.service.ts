import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PgBoss } from "pg-boss";

/**
 * pg-boss bootstrap (design.md "Module / Folder Layout" — worker.module.ts).
 * Runs on the same PostgreSQL instance as the rest of the app (RNF-022:
 * zero new infra, durable across worker restarts). Job handlers for
 * `analyze-document`/`anchor-dtr`/`confirm-anchor` are registered against
 * `getBoss()` in later phases (3, 6, 7) once those use cases exist.
 */
@Injectable()
export class PgBossService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PgBossService.name);
  private readonly boss: PgBoss;

  constructor(private readonly configService: ConfigService) {
    this.boss = new PgBoss({
      connectionString: this.configService.get<string>("DATABASE_URL", ""),
      schema: this.configService.get<string>("PGBOSS_SCHEMA", "pgboss"),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.boss.start();
    this.logger.log("pg-boss worker started");
  }

  async onModuleDestroy(): Promise<void> {
    await this.boss.stop({ graceful: true, timeout: 5_000 });
  }

  getBoss(): PgBoss {
    return this.boss;
  }
}
