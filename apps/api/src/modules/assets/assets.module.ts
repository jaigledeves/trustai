import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AesGcmAdapter } from "../../adapters/crypto/aes-gcm.adapter";
import { PrismaDigitalAssetRepository } from "../../adapters/prisma/digital-asset.repository";
import { PrismaService } from "../../adapters/prisma/prisma.service";
import { S3StorageAdapter } from "../../adapters/storage/s3.adapter";
import { UploadAssetUseCase } from "../../application/certification/upload-asset.use-case";
import { DIGITAL_ASSET_REPOSITORY_PORT } from "../../ports/digital-asset-repository.port";
import { ENCRYPTION_PORT } from "../../ports/encryption.port";
import { STORAGE_PORT } from "../../ports/storage.port";
import { AssetsController } from "./assets.controller";

@Module({
  imports: [ConfigModule],
  controllers: [AssetsController],
  providers: [
    PrismaService,
    UploadAssetUseCase,
    { provide: DIGITAL_ASSET_REPOSITORY_PORT, useClass: PrismaDigitalAssetRepository },
    { provide: ENCRYPTION_PORT, useClass: AesGcmAdapter },
    {
      provide: STORAGE_PORT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new S3StorageAdapter({
          endpoint: configService.get<string>("S3_ENDPOINT", "http://localhost:9000"),
          region: configService.get<string>("S3_REGION", "us-east-1"),
          bucket: configService.get<string>("S3_BUCKET", "trustai-assets-dev"),
          accessKeyId: configService.get<string>("S3_ACCESS_KEY", ""),
          secretAccessKey: configService.get<string>("S3_SECRET_KEY", ""),
          forcePathStyle: configService.get<string>("S3_FORCE_PATH_STYLE", "true") === "true",
        }),
    },
  ],
})
export class AssetsModule {}
