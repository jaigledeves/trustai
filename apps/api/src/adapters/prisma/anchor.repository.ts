import { Injectable } from "@nestjs/common";
import type { Anchor as PrismaAnchor } from "@prisma/client";
import { Anchor, AnchorStatus } from "../../domain/anchor.entity";
import type { AnchorRepositoryPort } from "../../ports/anchor-repository.port";
import { PrismaService } from "./prisma.service";

@Injectable()
export class PrismaAnchorRepository implements AnchorRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: { chain: string; network: string }): Promise<Anchor> {
    const record = await this.prisma.anchor.create({
      data: { chain: params.chain, network: params.network, status: "PENDING" },
    });
    return this.toDomain(record);
  }

  async findById(id: string): Promise<Anchor | null> {
    const record = await this.prisma.anchor.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async updateSubmissionResult(
    id: string,
    fields: { txHash: string | null; status: AnchorStatus; blockTimestamp?: Date | null },
  ): Promise<void> {
    await this.prisma.anchor.update({
      where: { id },
      data: {
        txHash: fields.txHash,
        status: fields.status,
        // Undefined is left untouched by Prisma; explicit null clears the
        // column — only relevant if a caller deliberately wants to reset it.
        ...(fields.blockTimestamp !== undefined ? { blockTimestamp: fields.blockTimestamp } : {}),
      },
    });
  }

  private toDomain(record: PrismaAnchor): Anchor {
    return new Anchor(
      record.id,
      record.chain,
      record.network,
      record.txHash,
      record.merkleRoot,
      record.blockTimestamp,
      this.toDomainStatus(record.status),
      record.createdAt,
      record.updatedAt,
    );
  }

  private toDomainStatus(status: PrismaAnchor["status"]): AnchorStatus {
    switch (status) {
      case "PENDING":
        return AnchorStatus.PENDING;
      case "CONFIRMED":
        return AnchorStatus.CONFIRMED;
      case "FAILED":
        return AnchorStatus.FAILED;
    }
  }
}
