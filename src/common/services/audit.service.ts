import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  AuditContext,
  AuditRecordInput,
  PrismaTransaction,
} from '../interfaces/audit.interface';

/**
 * Universal immutable audit logger — the system's Black Box.
 * Every create, update, delete, approval, and sync conflict flows through here.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    input: AuditRecordInput,
    tx?: PrismaTransaction,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    const ctx = input.context ?? {};

    await client.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        projectId: ctx.projectId,
        userId: ctx.userId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        source: ctx.source ?? 'API',
        previousData: input.previousData as Prisma.InputJsonValue | undefined,
        newData: input.newData as Prisma.InputJsonValue | undefined,
        deviceTimestamp: ctx.deviceTimestamp,
        serverSyncTimestamp: ctx.serverSyncTimestamp ?? new Date(),
        isConflictOverwrite: ctx.isConflictOverwrite ?? false,
        syncBatchId: ctx.syncBatchId,
        clientActionId: ctx.clientActionId,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: (ctx.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  buildContext(
    user: { id: string; organizationId: string },
    extras?: Partial<AuditContext>,
  ): AuditContext {
    return {
      userId: user.id,
      organizationId: user.organizationId,
      ...extras,
    };
  }
}
