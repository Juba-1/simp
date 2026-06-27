import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FormInstanceStatus, OrganizationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TenantScopeService } from '../../common/services/tenant-scope.service';
import { AuditService } from '../../common/services/audit.service';
import { TimeIntegrityService } from '../../common/services/time-integrity.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  AuditContext,
  PrismaTransaction,
} from '../../common/interfaces/audit.interface';
import { buildPaginatedResult } from '../../common/dto/pagination.dto';
import {
  CreateFormInstanceDto,
  FormInstanceQueryDto,
  UpdateFormInstanceDto,
} from './dto/form-instance.dto';
import {
  parseFormSchema,
  validateFormPayload,
} from './validators/form-schema.validator';

export interface FormInstanceUpsertPayload {
  id?: string;
  projectId: string;
  templateId: string;
  referenceNumber?: string;
  comments?: string;
  status?: FormInstanceStatus;
  data: Record<string, unknown>;
  deviceTimestamp: string;
  clientRevision?: number;
}

export interface FormInstanceWriteResult {
  instance: Awaited<ReturnType<FormInstancesService['findOneRaw']>>;
  applied: boolean;
  conflict?: 'SKIPPED_STALE' | 'CONFLICT_OVERWRITTEN';
}

@Injectable()
export class FormInstancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
    private readonly audit: AuditService,
    private readonly timeIntegrity: TimeIntegrityService,
  ) {}

  async create(
    user: AuthenticatedUser,
    dto: CreateFormInstanceDto,
    auditContext?: AuditContext,
  ) {
    await this.tenantScope.assertProjectAccess(user, dto.projectId);

    const template = await this.prisma.formTemplate.findFirst({
      where: {
        id: dto.templateId,
        projectId: dto.projectId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!template) {
      throw new NotFoundException('Active form template not found for this project');
    }

    const schema = parseFormSchema(template.schema);
    validateFormPayload(schema, dto.data);

    const deviceTimestamp = new Date(dto.deviceTimestamp);
    const serverNow = new Date();
    const timeSpoofingFlag = this.timeIntegrity.detectTimeSpoofing(
      deviceTimestamp,
      serverNow,
    );

    const instance = await this.prisma.formInstance.create({
      data: {
        projectId: dto.projectId,
        templateId: template.id,
        templateVersion: template.version,
        organizationId: user.organizationId,
        createdByUserId: user.id,
        referenceNumber: dto.referenceNumber,
        comments: dto.comments ?? '',
        status: dto.status ?? FormInstanceStatus.DRAFT,
        data: dto.data as Prisma.InputJsonValue,
        deviceTimestamp,
        serverSyncTimestamp: serverNow,
        timeSpoofingFlag,
        clientRevision: dto.clientRevision ?? 1,
      },
      include: this.defaultInclude(),
    });

    await this.audit.record({
      entityType: 'FormInstance',
      entityId: instance.id,
      action: 'CREATE',
      newData: instance,
      context: {
        ...this.audit.buildContext(user, auditContext),
        projectId: dto.projectId,
        deviceTimestamp,
        serverSyncTimestamp: serverNow,
        metadata: { timeSpoofingFlag },
      },
    });

    return instance;
  }

  async findAll(
    user: AuthenticatedUser,
    projectId: string,
    query: FormInstanceQueryDto,
  ) {
    await this.tenantScope.assertProjectAccess(user, projectId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.FormInstanceWhereInput = {
      projectId,
      deletedAt: null,
      status: query.status,
      templateId: query.templateId,
    };

    const [data, total] = await Promise.all([
      this.prisma.formInstance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: this.defaultInclude(),
      }),
      this.prisma.formInstance.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findPendingApprovals(
    user: AuthenticatedUser,
    options: { projectId?: string; limit?: number } = {},
  ) {
    const projectIds = await this.tenantScope.getAccessibleProjectIds(user);
    if (projectIds.length === 0) {
      return { data: [], meta: { total: 0 } };
    }

    if (options.projectId) {
      await this.tenantScope.assertProjectAccess(user, options.projectId);
      if (!projectIds.includes(options.projectId)) {
        return { data: [], meta: { total: 0 } };
      }
    }

    const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
    const orgType = user.organizationType;
    let statusFilter: FormInstanceStatus[];

    switch (orgType) {
      case 'CONSULTANT':
        statusFilter = [
          FormInstanceStatus.PENDING_EXTERNAL_APPROVAL,
          FormInstanceStatus.SLA_BREACHED,
        ];
        break;
      case 'MAIN_CONTRACTOR':
      case 'SUB_CONTRACTOR':
        statusFilter = [
          FormInstanceStatus.DRAFT,
          FormInstanceStatus.SUBMITTED,
          FormInstanceStatus.PENDING_INTERNAL_APPROVAL,
        ];
        break;
      case 'CLIENT':
        statusFilter = [
          FormInstanceStatus.PENDING_EXTERNAL_APPROVAL,
          FormInstanceStatus.SLA_BREACHED,
        ];
        break;
      default:
        statusFilter = [
          FormInstanceStatus.PENDING_INTERNAL_APPROVAL,
          FormInstanceStatus.PENDING_EXTERNAL_APPROVAL,
        ];
    }

    const where: Prisma.FormInstanceWhereInput = {
      projectId: options.projectId ?? { in: projectIds },
      deletedAt: null,
      status: { in: statusFilter },
      ...(orgType === 'CONSULTANT'
        ? { currentPendingOrgType: OrganizationType.CONSULTANT }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.formInstance.findMany({
        where,
        take: limit,
        orderBy: [{ slaBreached: 'desc' }, { updatedAt: 'desc' }],
        include: {
          ...this.defaultInclude(),
          project: {
            select: { id: true, code: true, name: true, nameAr: true },
          },
        },
      }),
      this.prisma.formInstance.count({ where }),
    ]);

    return { data, meta: { total } };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const instance = await this.findOneRaw(id);
    if (!instance) {
      throw new NotFoundException('Form instance not found');
    }

    await this.tenantScope.assertProjectAccess(user, instance.projectId);
    return instance;
  }

  async findOneRaw(id: string) {
    return this.prisma.formInstance.findFirst({
      where: { id, deletedAt: null },
      include: this.defaultInclude(),
    });
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateFormInstanceDto,
    auditContext?: AuditContext,
  ) {
    const existing = await this.findOne(user, id);

    if (existing.organizationId !== user.organizationId && !user.isOrgAdmin) {
      throw new ForbiddenException('Cannot update form owned by another organization');
    }

    if (
      existing.status !== FormInstanceStatus.DRAFT &&
      existing.status !== FormInstanceStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Only draft or rejected forms can be edited',
      );
    }

    if (dto.status && dto.status !== existing.status) {
      throw new BadRequestException(
        'Form status changes must use the workflow endpoints',
      );
    }

    const result = await this.upsertWithLastWriteWins(
      user,
      {
        id: existing.id,
        projectId: existing.projectId,
        templateId: existing.templateId,
        referenceNumber: dto.referenceNumber ?? existing.referenceNumber ?? undefined,
        comments: dto.comments ?? existing.comments,
        status: dto.status ?? existing.status,
        data: (dto.data ?? existing.data) as Record<string, unknown>,
        deviceTimestamp: dto.deviceTimestamp,
        clientRevision: dto.clientRevision,
      },
      auditContext,
    );

    if (!result.applied) {
      return {
        applied: false,
        conflict: result.conflict,
        serverRecord: result.instance,
      };
    }

    return result.instance;
  }

  async remove(user: AuthenticatedUser, id: string, auditContext?: AuditContext) {
    const existing = await this.findOne(user, id);

    if (existing.organizationId !== user.organizationId && !user.isOrgAdmin) {
      throw new ForbiddenException('Cannot delete form owned by another organization');
    }

    const deleted = await this.prisma.formInstance.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.record({
      entityType: 'FormInstance',
      entityId: id,
      action: 'SOFT_DELETE',
      previousData: existing,
      newData: deleted,
      context: {
        ...this.audit.buildContext(user, auditContext),
        projectId: existing.projectId,
      },
    });

    return deleted;
  }

  /**
   * Core LWW engine — used by both REST API and Sync batch processor.
   */
  async upsertWithLastWriteWins(
    user: AuthenticatedUser,
    payload: FormInstanceUpsertPayload,
    auditContext?: AuditContext,
    tx?: PrismaTransaction,
  ): Promise<FormInstanceWriteResult> {
    const db = tx ?? this.prisma;
    const deviceTimestamp = new Date(payload.deviceTimestamp);
    const serverNow = new Date();

    const template = await db.formTemplate.findFirst({
      where: {
        id: payload.templateId,
        projectId: payload.projectId,
        deletedAt: null,
      },
    });

    if (!template) {
      throw new NotFoundException('Form template not found');
    }

    const schema = parseFormSchema(template.schema);
    validateFormPayload(schema, payload.data);

    const timeSpoofingFlag = this.timeIntegrity.detectTimeSpoofing(
      deviceTimestamp,
      serverNow,
    );

    if (payload.id) {
      const existing = await db.formInstance.findFirst({
        where: { id: payload.id, deletedAt: null },
      });

      if (existing) {
        const lww = this.timeIntegrity.compareForLastWriteWins(
          deviceTimestamp,
          existing.deviceTimestamp,
        );

        if (lww === 'existing_wins') {
          await this.audit.record(
            {
              entityType: 'FormInstance',
              entityId: existing.id,
              action: 'SYNC_CONFLICT_SKIPPED',
              previousData: existing,
              newData: payload,
              context: {
                ...this.audit.buildContext(user, auditContext),
                projectId: payload.projectId,
                source: 'SYNC',
                deviceTimestamp,
                serverSyncTimestamp: serverNow,
                isConflictOverwrite: false,
                metadata: { reason: 'stale_device_timestamp' },
              },
            },
            tx,
          );

          return {
            instance: await this.findOneRaw(existing.id),
            applied: false,
            conflict: 'SKIPPED_STALE',
          };
        }

    const isOverwrite = true; // existing record was replaced by incoming LWW winner

        const updated = await db.formInstance.update({
          where: { id: existing.id },
          data: {
            comments: payload.comments ?? existing.comments,
            status: payload.status ?? existing.status,
            data: payload.data as Prisma.InputJsonValue,
            referenceNumber: payload.referenceNumber,
            deviceTimestamp,
            serverSyncTimestamp: serverNow,
            timeSpoofingFlag: timeSpoofingFlag || existing.timeSpoofingFlag,
            clientRevision:
              payload.clientRevision ?? existing.clientRevision + 1,
          },
          include: this.defaultInclude(),
        });

        await this.audit.record(
          {
            entityType: 'FormInstance',
            entityId: existing.id,
            action: isOverwrite ? 'SYNC_CONFLICT_OVERWRITE' : 'UPDATE',
            previousData: existing,
            newData: updated,
            context: {
              ...this.audit.buildContext(user, auditContext),
              projectId: payload.projectId,
              source: auditContext?.source ?? 'API',
              deviceTimestamp,
              serverSyncTimestamp: serverNow,
              isConflictOverwrite: isOverwrite,
              metadata: { timeSpoofingFlag },
            },
          },
          tx,
        );

        return {
          instance: updated,
          applied: true,
          conflict: isOverwrite ? 'CONFLICT_OVERWRITTEN' : undefined,
        };
      }
    }

    const created = await db.formInstance.create({
      data: {
        id: payload.id,
        projectId: payload.projectId,
        templateId: template.id,
        templateVersion: template.version,
        organizationId: user.organizationId,
        createdByUserId: user.id,
        referenceNumber: payload.referenceNumber,
        comments: payload.comments ?? '',
        status: payload.status ?? FormInstanceStatus.DRAFT,
        data: payload.data as Prisma.InputJsonValue,
        deviceTimestamp,
        serverSyncTimestamp: serverNow,
        timeSpoofingFlag,
        clientRevision: payload.clientRevision ?? 1,
      },
      include: this.defaultInclude(),
    });

    await this.audit.record(
      {
        entityType: 'FormInstance',
        entityId: created.id,
        action: 'CREATE',
        newData: created,
        context: {
          ...this.audit.buildContext(user, auditContext),
          projectId: payload.projectId,
          source: auditContext?.source ?? 'API',
          deviceTimestamp,
          serverSyncTimestamp: serverNow,
          metadata: { timeSpoofingFlag, offlineCreated: Boolean(payload.id) },
        },
      },
      tx,
    );

    return { instance: created, applied: true };
  }

  async softDeleteById(
    user: AuthenticatedUser,
    id: string,
    deviceTimestamp: Date,
    auditContext?: AuditContext,
    tx?: PrismaTransaction,
  ) {
    const db = tx ?? this.prisma;
    const existing = await db.formInstance.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return { applied: false, reason: 'NOT_FOUND' as const };
    }

    if (deviceTimestamp < existing.deviceTimestamp) {
      await this.audit.record(
        {
          entityType: 'FormInstance',
          entityId: id,
          action: 'SYNC_DELETE_SKIPPED',
          previousData: existing,
          context: {
            ...this.audit.buildContext(user, auditContext),
            projectId: existing.projectId,
            source: 'SYNC',
            deviceTimestamp,
          },
        },
        tx,
      );
      return { applied: false, reason: 'STALE' as const, instance: existing };
    }

    const deleted = await db.formInstance.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.record(
      {
        entityType: 'FormInstance',
        entityId: id,
        action: 'SOFT_DELETE',
        previousData: existing,
        newData: deleted,
        context: {
          ...this.audit.buildContext(user, auditContext),
          projectId: existing.projectId,
          source: auditContext?.source ?? 'API',
          deviceTimestamp,
        },
      },
      tx,
    );

    return { applied: true, instance: deleted };
  }

  private defaultInclude() {
    return {
      template: {
        select: {
          id: true,
          code: true,
          name: true,
          version: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      _count: {
        select: { attachments: { where: { deletedAt: null } } },
      },
    } satisfies Prisma.FormInstanceInclude;
  }
}
