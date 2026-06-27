import { Injectable, BadRequestException } from '@nestjs/common';
import {
  AuditSource,
  SyncActionResult,
  SyncActionType,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PRISMA_INTERACTIVE_TX_OPTIONS } from '../../database/prisma-transaction.options';
import { TenantScopeService } from '../../common/services/tenant-scope.service';
import { AuditService } from '../../common/services/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { FormInstancesService } from '../forms/form-instances.service';
import { SyncActionDto, SyncBatchDto } from './dto/sync.dto';

export interface SyncActionOutcome {
  clientActionId: string;
  entityId: string;
  type: SyncActionType;
  result: SyncActionResult;
  serverRecord?: unknown;
  message?: string;
}

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
    private readonly audit: AuditService,
    private readonly formInstances: FormInstancesService,
  ) {}

  async processBatch(
    user: AuthenticatedUser,
    dto: SyncBatchDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const outcomes: SyncActionOutcome[] = [];
    const serverSyncTimestamp = new Date();

    await this.audit.record({
      entityType: 'SyncBatch',
      entityId: dto.batchId,
      action: 'BATCH_RECEIVED',
      newData: {
        actionCount: dto.actions.length,
        clientDeviceId: dto.clientDeviceId,
      },
      context: {
        ...this.audit.buildContext(user),
        source: AuditSource.SYNC,
        syncBatchId: dto.batchId,
        serverSyncTimestamp,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    for (const action of dto.actions) {
      const outcome = await this.processAction(
        user,
        dto.batchId,
        action,
        serverSyncTimestamp,
        meta,
      );
      outcomes.push(outcome);
    }

    const pullCursor = serverSyncTimestamp.toISOString();

    return {
      batchId: dto.batchId,
      serverSyncTimestamp: pullCursor,
      processed: outcomes.length,
      outcomes,
      pullCursor,
    };
  }

  async pullChanges(user: AuthenticatedUser, since?: string) {
    const sinceDate = since ? new Date(since) : new Date(0);
    const projectIds = await this.tenantScope.getAccessibleProjectIds(user);

    const [formInstances, attachments] = await Promise.all([
      this.prisma.formInstance.findMany({
        where: {
          projectId: { in: projectIds },
          updatedAt: { gt: sinceDate },
        },
        include: {
          template: { select: { id: true, code: true, version: true } },
        },
        orderBy: { updatedAt: 'asc' },
        take: 500,
      }),
      this.prisma.fileAttachment.findMany({
        where: {
          projectId: { in: projectIds },
          updatedAt: { gt: sinceDate },
          deletedAt: null,
        },
        orderBy: { updatedAt: 'asc' },
        take: 500,
      }),
    ]);

    return {
      serverSyncTimestamp: new Date().toISOString(),
      formInstances,
      fileAttachments: attachments,
    };
  }

  private async processAction(
    user: AuthenticatedUser,
    batchId: string,
    action: SyncActionDto,
    serverSyncTimestamp: Date,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<SyncActionOutcome> {
    const existingReceipt = await this.prisma.syncActionReceipt.findUnique({
      where: { clientActionId: action.clientActionId },
    });

    if (existingReceipt) {
      return {
        clientActionId: action.clientActionId,
        entityId: action.entityId,
        type: action.type,
        result: existingReceipt.result,
        serverRecord: existingReceipt.resultPayload ?? undefined,
        message: 'Idempotent replay — already processed',
      };
    }

    try {
      const outcome = await this.prisma.$transaction(
        async (tx) => {
          switch (action.type) {
            case SyncActionType.FORM_INSTANCE_UPSERT:
              return this.handleFormUpsert(user, batchId, action, serverSyncTimestamp, meta, tx);
            case SyncActionType.FORM_INSTANCE_DELETE:
              return this.handleFormDelete(user, batchId, action, serverSyncTimestamp, meta, tx);
            case SyncActionType.FILE_ATTACHMENT_LINK:
              return this.handleFileLink(user, batchId, action, serverSyncTimestamp, meta, tx);
            default:
              throw new BadRequestException(`Unknown sync action type: ${action.type}`);
          }
        },
        PRISMA_INTERACTIVE_TX_OPTIONS,
      );

      await this.prisma.syncActionReceipt.create({
        data: {
          clientActionId: action.clientActionId,
          userId: user.id,
          batchId,
          actionType: action.type,
          entityId: action.entityId,
          result: outcome.result,
          resultPayload: outcome.serverRecord as object | undefined,
        },
      });

      return outcome;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      await this.audit.record({
        entityType: 'SyncAction',
        entityId: action.entityId,
        action: 'SYNC_FAILED',
        newData: { action, error: message },
        context: {
          ...this.audit.buildContext(user),
          source: AuditSource.SYNC,
          syncBatchId: batchId,
          clientActionId: action.clientActionId,
          deviceTimestamp: new Date(action.deviceTimestamp),
          serverSyncTimestamp,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      });

      await this.prisma.syncActionReceipt.create({
        data: {
          clientActionId: action.clientActionId,
          userId: user.id,
          batchId,
          actionType: action.type,
          entityId: action.entityId,
          result: SyncActionResult.FAILED,
          resultPayload: { error: message },
        },
      });

      return {
        clientActionId: action.clientActionId,
        entityId: action.entityId,
        type: action.type,
        result: SyncActionResult.FAILED,
        message,
      };
    }
  }

  private async handleFormUpsert(
    user: AuthenticatedUser,
    batchId: string,
    action: SyncActionDto,
    serverSyncTimestamp: Date,
    meta: { ipAddress?: string; userAgent?: string },
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
  ): Promise<SyncActionOutcome> {
    if (!action.payload) {
      throw new BadRequestException('FORM_INSTANCE_UPSERT requires payload');
    }

    await this.tenantScope.assertProjectAccess(user, action.payload.projectId);

    const auditContext = {
      source: AuditSource.SYNC,
      syncBatchId: batchId,
      clientActionId: action.clientActionId,
      deviceTimestamp: new Date(action.deviceTimestamp),
      serverSyncTimestamp,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    };

    const result = await this.formInstances.upsertWithLastWriteWins(
      user,
      {
        id: action.entityId,
        projectId: action.payload.projectId,
        templateId: action.payload.templateId,
        referenceNumber: action.payload.referenceNumber,
        comments: action.payload.comments,
        status: action.payload.status,
        data: action.payload.data,
        deviceTimestamp: action.payload.deviceTimestamp,
        clientRevision: action.payload.clientRevision,
      },
      auditContext,
      tx,
    );

    let syncResult: SyncActionResult = SyncActionResult.APPLIED;
    if (!result.applied && result.conflict === 'SKIPPED_STALE') {
      syncResult = SyncActionResult.SKIPPED_STALE;
    } else if (result.conflict === 'CONFLICT_OVERWRITTEN') {
      syncResult = SyncActionResult.CONFLICT_OVERWRITTEN;
    }

    return {
      clientActionId: action.clientActionId,
      entityId: action.entityId,
      type: action.type,
      result: syncResult,
      serverRecord: result.instance,
    };
  }

  private async handleFormDelete(
    user: AuthenticatedUser,
    batchId: string,
    action: SyncActionDto,
    serverSyncTimestamp: Date,
    meta: { ipAddress?: string; userAgent?: string },
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
  ): Promise<SyncActionOutcome> {
    const auditContext = {
      source: AuditSource.SYNC,
      syncBatchId: batchId,
      clientActionId: action.clientActionId,
      deviceTimestamp: new Date(action.deviceTimestamp),
      serverSyncTimestamp,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    };

    const result = await this.formInstances.softDeleteById(
      user,
      action.entityId,
      new Date(action.deviceTimestamp),
      auditContext,
      tx,
    );

    return {
      clientActionId: action.clientActionId,
      entityId: action.entityId,
      type: action.type,
      result: result.applied
        ? SyncActionResult.APPLIED
        : SyncActionResult.SKIPPED_STALE,
      serverRecord: result.instance,
      message: result.applied ? undefined : String(result.reason),
    };
  }

  private async handleFileLink(
    user: AuthenticatedUser,
    batchId: string,
    action: SyncActionDto,
    serverSyncTimestamp: Date,
    meta: { ipAddress?: string; userAgent?: string },
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
  ): Promise<SyncActionOutcome> {
    if (!action.fileAttachmentId) {
      throw new BadRequestException('FILE_ATTACHMENT_LINK requires fileAttachmentId');
    }

    const attachment = await tx.fileAttachment.findFirst({
      where: { id: action.fileAttachmentId, deletedAt: null },
    });

    if (!attachment) {
      throw new BadRequestException('File attachment not found');
    }

    await this.tenantScope.assertProjectAccess(user, attachment.projectId);

    const updated = await tx.fileAttachment.update({
      where: { id: attachment.id },
      data: { formInstanceId: action.entityId },
    });

    await this.audit.record(
      {
        entityType: 'FileAttachment',
        entityId: attachment.id,
        action: 'LINK_TO_FORM',
        previousData: attachment,
        newData: updated,
        context: {
          ...this.audit.buildContext(user),
          projectId: attachment.projectId,
          source: AuditSource.SYNC,
          syncBatchId: batchId,
          clientActionId: action.clientActionId,
          serverSyncTimestamp,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      },
      tx,
    );

    return {
      clientActionId: action.clientActionId,
      entityId: action.entityId,
      type: action.type,
      result: SyncActionResult.APPLIED,
      serverRecord: updated,
    };
  }
}
