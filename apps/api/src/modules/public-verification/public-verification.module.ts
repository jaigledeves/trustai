import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { createPublicClient, http, type Address, type Chain } from "viem";
import { ChainNotConfiguredAnchorAdapter } from "../../adapters/chain/not-configured-anchor.adapter";
import { ViemAnchorAdapter } from "../../adapters/chain/viem-anchor.adapter";
import { PrismaService } from "../../adapters/prisma/prisma.service";
import { PrismaTrustRecordRepository } from "../../adapters/prisma/trust-record.repository";
import { PrismaVerificationAttemptRepository } from "../../adapters/prisma/verification-attempt.repository";
import { VerifyDocumentUseCase } from "../../application/verification/verify-document.use-case";
import { ANCHOR_PORT, type AnchorPort } from "../../ports/anchor.port";
import { TRUST_RECORD_REPOSITORY_PORT } from "../../ports/trust-record-repository.port";
import { VERIFICATION_ATTEMPT_REPOSITORY_PORT } from "../../ports/verification-attempt-repository.port";
import { PublicVerificationController } from "./public-verification.controller";

// ADR-012: rate limiting is app-wide via the global "global" APP_GUARD
// (ThrottlingModule). This module no longer registers its own ThrottlerModule;
// the controller pins its 60/min GET and 20/min POST limits via per-route
// @Throttle({ global: {...} }) overrides on that shared guard — the same
// mechanism assets/anchor use. (Two coexisting ThrottlerModules collided on
// the throttler-options DI token, silently disabling these limits — hence the
// consolidation onto one guard.)
@Module({
  imports: [
    ConfigModule,
  ],
  controllers: [PublicVerificationController],
  providers: [
    PrismaService,
    VerifyDocumentUseCase,
    { provide: TRUST_RECORD_REPOSITORY_PORT, useClass: PrismaTrustRecordRepository },
    { provide: VERIFICATION_ATTEMPT_REPOSITORY_PORT, useClass: PrismaVerificationAttemptRepository },
    // design.md "ViemAnchorAdapterConfig.walletClient" decision: this
    // provider is deliberately wallet-less (least privilege — a public,
    // read-only endpoint must not depend on WORKER_WALLET_PRIVATE_KEY).
    // Only needs CHAIN_RPC_URL + ANCHOR_CONTRACT_ADDRESS; mirrors
    // WorkerModule's ANCHOR_PORT factory's "stub" default otherwise.
    {
      provide: ANCHOR_PORT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): AnchorPort => {
        const rpcUrl = configService.get<string>("CHAIN_RPC_URL", "");
        const contractAddress = configService.get<string>("ANCHOR_CONTRACT_ADDRESS", "");
        if (!rpcUrl || !contractAddress) {
          return new ChainNotConfiguredAnchorAdapter();
        }

        const chain: Chain = {
          id: Number(configService.get<string>("CHAIN_ID", "84532")),
          name: "trustai-anchor-chain-readonly",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: { default: { http: [rpcUrl] } },
        };
        const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

        return new ViemAnchorAdapter({ publicClient, contractAddress: contractAddress as Address });
      },
    },
  ],
})
export class PublicVerificationModule {}
