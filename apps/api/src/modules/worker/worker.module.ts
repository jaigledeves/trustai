import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { createPublicClient, createWalletClient, http, type Address, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { PrismaAnchorRepository } from "../../adapters/prisma/anchor.repository";
import { PrismaTrustRecordRepository } from "../../adapters/prisma/trust-record.repository";
import { UnpdfTextExtractionAdapter } from "../../adapters/extraction/unpdf.adapter";
import { OpenAiAnalysisAdapter } from "../../adapters/ai/openai.adapter";
import { StubAiAnalysisAdapter } from "../../adapters/ai/stub.adapter";
import { ChainNotConfiguredAnchorAdapter } from "../../adapters/chain/not-configured-anchor.adapter";
import { ViemAnchorAdapter } from "../../adapters/chain/viem-anchor.adapter";
import { PrismaService } from "../../adapters/prisma/prisma.service";
import { AnalyzeDocumentHandler } from "../../application/certification/jobs/analyze-document.handler";
import { AnchorDtrHandler } from "../../application/certification/jobs/anchor-dtr.handler";
import { ConfirmAnchorHandler } from "../../application/certification/jobs/confirm-anchor.handler";
import { AI_ANALYSIS_PORT, type AiAnalysisPort } from "../../ports/ai-analysis.port";
import { ANCHOR_PORT, type AnchorPort } from "../../ports/anchor.port";
import { ANCHOR_REPOSITORY_PORT } from "../../ports/anchor-repository.port";
import { TEXT_EXTRACTION_PORT } from "../../ports/text-extraction.port";
import { TRUST_RECORD_REPOSITORY_PORT } from "../../ports/trust-record-repository.port";
import { AssetsModule } from "../assets/assets.module";
import { QueueModule } from "../queue/queue.module";
import { JobRegistrationService } from "./job-registration.service";

@Module({
  // AssetsModule exports STORAGE_PORT/ENCRYPTION_PORT/DIGITAL_ASSET_REPOSITORY_PORT
  // — AnalyzeDocumentHandler reuses those exact adapters instead of a second
  // S3StorageAdapter/AesGcmAdapter construction site. PgBossService now
  // lives in QueueModule (shared with AssetsModule's QUEUE_PORT) — imported,
  // not re-declared, so there's exactly one PgBoss instance app-wide.
  imports: [ConfigModule, AssetsModule, QueueModule],
  providers: [
    JobRegistrationService,
    PrismaService,
    AnalyzeDocumentHandler,
    AnchorDtrHandler,
    ConfirmAnchorHandler,
    { provide: TRUST_RECORD_REPOSITORY_PORT, useClass: PrismaTrustRecordRepository },
    { provide: ANCHOR_REPOSITORY_PORT, useClass: PrismaAnchorRepository },
    { provide: TEXT_EXTRACTION_PORT, useClass: UnpdfTextExtractionAdapter },
    // AI_ADAPTER env switch (openai|stub) — mirrors AssetsModule's
    // STORAGE_PORT useFactory pattern. Defaults to "stub" so environments
    // without OPENAI_API_KEY (like this one) keep working out of the box.
    {
      provide: AI_ANALYSIS_PORT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): AiAnalysisPort => {
        const adapter = configService.get<string>("AI_ADAPTER", "stub");
        if (adapter === "openai") {
          const apiKey = configService.get<string>("OPENAI_API_KEY", "");
          const model = configService.get<string>("OPENAI_MODEL");
          return new OpenAiAnalysisAdapter(model ? { apiKey, model } : { apiKey });
        }
        return new StubAiAnalysisAdapter();
      },
    },
    // Defaults to ChainNotConfiguredAnchorAdapter (mirrors the AI_ADAPTER
    // "stub" default) so the app boots normally without a deployed
    // contract/funded wallet (e.g. this sandbox) — only an actual anchor
    // submission attempt fails, with a clear, actionable error, instead of
    // this factory throwing at boot and crashing the whole app.
    {
      provide: ANCHOR_PORT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): AnchorPort => {
        const rpcUrl = configService.get<string>("CHAIN_RPC_URL", "");
        const privateKey = configService.get<string>("WORKER_WALLET_PRIVATE_KEY", "");
        const contractAddress = configService.get<string>("ANCHOR_CONTRACT_ADDRESS", "");
        if (!rpcUrl || !privateKey || !contractAddress) {
          return new ChainNotConfiguredAnchorAdapter();
        }

        // A minimal custom Chain object — only `id` and the RPC transport
        // actually matter for viem's tx signing/broadcasting here. Driven
        // entirely by env vars so the SAME adapter code targets Base
        // Sepolia (84532) in production and a local anvil node (31337,
        // viem's `foundry` chain id) in the Phase 6 integration test.
        const chain: Chain = {
          id: Number(configService.get<string>("CHAIN_ID", "84532")),
          name: "trustai-anchor-chain",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: { default: { http: [rpcUrl] } },
        };
        const account = privateKeyToAccount(privateKey as `0x${string}`);
        const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
        const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

        return new ViemAnchorAdapter({
          publicClient,
          walletClient,
          contractAddress: contractAddress as Address,
        });
      },
    },
  ],
  // Re-export the whole QueueModule (not just the PgBossService token) so
  // consumers of WorkerModule (e.g. worker.e2e-spec.ts's moduleRef.get)
  // can still resolve PgBossService — Nest requires re-exporting an
  // imported module's provider via the module reference itself.
  exports: [QueueModule],
})
export class WorkerModule {}
