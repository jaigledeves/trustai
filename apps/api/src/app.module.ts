import { Controller, Get, Injectable, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

// TASK-0 spike: minimal controller + injectable service used only to prove
// that NestJS decorators (@Module/@Controller/@Get/@Injectable) and
// constructor-based DI resolve correctly when run via `tsx` against this
// package's CommonJS tsconfig. Replaced by real feature modules in TASK-7.
@Injectable()
class SpikeService {
  ping(): { ok: true; via: "DI" } {
    return { ok: true, via: "DI" };
  }
}

@Controller()
class SpikeController {
  constructor(private readonly spikeService: SpikeService) {}

  @Get("spike")
  getSpike(): { ok: true; via: "DI" } {
    return this.spikeService.ping();
  }
}

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [SpikeController],
  providers: [SpikeService],
})
export class AppModule {}
