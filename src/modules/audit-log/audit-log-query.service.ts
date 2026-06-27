import { Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TenantScopeService } from '../../common/services/tenant-scope.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { buildPaginatedResult } from '../../common/dto/pagination.dto';
import { AuditLogQueryDto } from './dto/audit-log.dto';

@Injectable()
export class AuditLogQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  /**
   * Role-agnostic audit query with two isolation modes:
   *   • Project mode (query.projectId): hard RLS gate via assertProjectAccess, then
   *     return only that project's trail — used inside a project workspace.
   *   • Global mode: the union of the user's accessible projects plus their own org's
   *     events — used on the global dashboard. Super admins see everything.
   */
  async queryLogs(user: AuthenticatedUser, query: AuditLogQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    let scopeFilter: Prisma.AuditLogWhereInput;

    if (user.isSuperAdmin) {
      scopeFilter = query.projectId ? { projectId: query.projectId } : {};
    } else if (query.projectId) {
      // Throws 404 if the user is not assigned to / participating in the project.
      await this.tenantScope.assertProjectAccess(user, query.projectId);
      scopeFilter = { projectId: query.projectId };
    } else {
      const accessibleProjectIds =
        await this.tenantScope.getAccessibleProjectIds(user);
      scopeFilter = {
        OR: [
          { organizationId: user.organizationId },
          ...(accessibleProjectIds.length > 0
            ? [{ projectId: { in: accessibleProjectIds } }]
            : []),
        ],
      };
    }

    const where: Prisma.AuditLogWhereInput = {
      ...scopeFilter,
      ...(this.getOperationalVisibilityFilter(user) ?? {}),
      entityType: query.entityType,
      entityId: query.entityId,
      source: query.source,
      action: query.action ? { contains: query.action } : undefined,
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async queryGlobalLogs(query: AuditLogQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      projectId: query.projectId,
      entityType: query.entityType,
      entityId: query.entityId,
      source: query.source,
      action: query.action ? { contains: query.action } : undefined,
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async getFormInstanceHistory(
    user: AuthenticatedUser,
    formInstanceId: string,
  ) {
    const form = await this.prisma.formInstance.findFirst({
      where: { id: formInstanceId, deletedAt: null },
      select: { id: true, projectId: true, referenceNumber: true },
    });

    if (!form) {
      throw new NotFoundException('Form instance not found');
    }

    await this.tenantScope.assertProjectAccess(user, form.projectId);

    const operationalFilter = this.getOperationalVisibilityFilter(user);

    const [auditLogs, approvalRecords] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { entityId: formInstanceId, ...(operationalFilter ?? {}) },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.approvalRecord.findMany({
        where: { formInstanceId },
        orderBy: { createdAt: 'asc' },
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      formInstanceId,
      referenceNumber: form.referenceNumber,
      timeline: this.mergeTimeline(auditLogs, approvalRecords),
      auditLogs,
      approvalRecords,
    };
  }

  /**
   * STRICT SECRECY:
   * Non-client delivery partners must ONLY see operational/technical evidence.
   * They must NEVER see client/admin/system onboarding or access-matrix events.
   */
  private getOperationalVisibilityFilter(
    user: AuthenticatedUser,
  ): Prisma.AuditLogWhereInput | null {
    if (user.isSuperAdmin) return null;

    const restrictedOrgTypes: OrganizationType[] = [
      OrganizationType.MAIN_CONTRACTOR,
      OrganizationType.SUB_CONTRACTOR,
      OrganizationType.CONSULTANT,
      OrganizationType.LABORATORY,
    ];

    if (!restrictedOrgTypes.includes(user.organizationType)) return null;

    const safeActions: string[] = [
      // Forms & sync evidence
      'CREATE',
      'SOFT_DELETE',
      'WORKFLOW_SUBMIT',
      'RESUBMITTED',
      'WORKFLOW_RESUBMIT',
      'SYNC_CONFLICT_SKIPPED',
      'SYNC_DELETE_SKIPPED',
      'SYNC_FAILED',
      'BATCH_RECEIVED',
      'LINK_TO_FORM',

      // Uploads & location proof
      'UPLOAD',

      // Lab chain of custody
      'LAB_TEST_REQUESTED',
      'LAB_RESULT_SUBMITTED',

      // Materials / liability red flags
      'MIR_CREDIT',

      // IPC generation evidence (contractor-side)
      'IPC_DRAFT_CREATED',

      // SLA escalation visibility is operational (delays)
      'SLA_BREACH_ESCALATION',
      'ACKNOWLEDGE',

      // Team / project access performed by the contractor org
      'PROJECT_ACCESS_GRANT',
      'PROJECT_ACCESS_REVOKE',
      'PROJECT_ACCESS_SET',
      'SUB_CONTRACTOR_PROVISION',
      'SUB_CONTRACTOR_LINKED',
    ];

    // Narrow broad verbs to operational entity types only (e.g. CREATE on User is NOT operational).
    const createAllowedEntityTypes = [
      'FormInstance',
      'FileAttachment',
      'LabTestRequest',
      'LabTestResult',
      'MaterialInventory',
      'MaterialLedgerEntry',
      'InterimPaymentCertificate',
      'IpcLineItem',
      'SyncBatch',
    ];

    return {
      OR: [
        { action: { in: safeActions.filter((a) => a !== 'CREATE' && a !== 'SOFT_DELETE') } },
        { action: 'CREATE', entityType: { in: createAllowedEntityTypes } },
        { action: 'SOFT_DELETE', entityType: { in: ['FormInstance', 'FileAttachment'] } },
        // Team matrix changes on ProjectUser rows
        {
          entityType: 'ProjectUser',
          action: { in: ['PROJECT_ACCESS_GRANT', 'PROJECT_ACCESS_REVOKE'] },
        },
      ],
    };
  }

  private mergeTimeline(
    auditLogs: Array<{
      id: string;
      action: string;
      source: string;
      createdAt: Date;
      userId: string | null;
      previousData: unknown;
      newData: unknown;
      isConflictOverwrite: boolean;
    }>,
    approvalRecords: Array<{
      id: string;
      action: string;
      fromStatus: string;
      toStatus: string;
      createdAt: Date;
      comments: string;
      actor: {
        firstName: string;
        lastName: string;
        email: string;
      } | null;
    }>,
  ) {
    const events = [
      ...auditLogs.map((log) => ({
        type: 'audit' as const,
        timestamp: log.createdAt,
        action: log.action,
        source: log.source,
        actor: log.userId,
        details: {
          previousData: log.previousData,
          newData: log.newData,
          isConflictOverwrite: log.isConflictOverwrite,
        },
      })),
      ...approvalRecords.map((record) => ({
        type: 'approval' as const,
        timestamp: record.createdAt,
        action: record.action,
        source: 'APPROVAL',
        actor: record.actor
          ? `${record.actor.firstName} ${record.actor.lastName}`
          : 'System',
        details: {
          fromStatus: record.fromStatus,
          toStatus: record.toStatus,
          comments: record.comments,
        },
      })),
    ];

    return events.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }
}
