import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  AuditSource,
  FormInstanceStatus,
  IpcStatus,
  OrganizationType,
  Prisma,
  StandardFormCode,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../database/prisma.service';
import { TenantScopeService } from '../../common/services/tenant-scope.service';
import { AuditService } from '../../common/services/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { IpcStateMachine } from './domain/ipc.state-machine';
import { extractWirBilling } from './wir-billing.extractor';
import {
  CreateIpcDraftDto,
  CreateIpcWithWirsDto,
  IpcDecisionDto,
} from './dto/ipc.dto';

@Injectable()
export class IpcService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
    private readonly audit: AuditService,
  ) {}

  async getEligibleWirs(user: AuthenticatedUser, projectId: string) {
    await this.tenantScope.assertProjectAccess(user, projectId);

    return this.prisma.formInstance.findMany({
      where: await this.getEligibleWirWhere(user, projectId),
      include: {
        template: { select: { code: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Auto-aggregate all eligible approved unbilled WIRs into a DRAFT IPC */
  async generateDraft(
    user: AuthenticatedUser,
    dto: CreateIpcDraftDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    this.assertContractor(user);
    await this.tenantScope.assertProjectAccess(user, dto.projectId);

    const eligible = await this.prisma.formInstance.findMany({
      where: await this.getEligibleWirWhere(user, dto.projectId),
      include: { template: true },
    });

    const ids =
      dto.formInstanceIds?.length
        ? dto.formInstanceIds
        : eligible.map((w) => w.id);

    if (ids.length === 0) {
      throw new BadRequestException(
        'No eligible approved unbilled WIRs found for this project',
      );
    }

    return this.createIpcWithWirs(
      user,
      {
        projectId: dto.projectId,
        formInstanceIds: ids,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        notes: dto.notes,
      },
      meta,
    );
  }

  async createWithSelectedWirs(
    user: AuthenticatedUser,
    dto: CreateIpcWithWirsDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.createIpcWithWirs(user, dto, meta);
  }

  async findByProject(user: AuthenticatedUser, projectId: string) {
    await this.tenantScope.assertProjectAccess(user, projectId);

    return this.prisma.interimPaymentCertificate.findMany({
      where: { projectId, deletedAt: null },
      include: {
        lineItems: {
          include: {
            formInstance: {
              select: {
                id: true,
                referenceNumber: true,
                status: true,
              },
            },
          },
        },
        contractorOrg: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const ipc = await this.loadIpc(id);
    await this.tenantScope.assertProjectAccess(user, ipc.projectId);
    return ipc;
  }

  async submitForConsultantReview(
    user: AuthenticatedUser,
    id: string,
    dto: IpcDecisionDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const ipc = await this.loadIpc(id);
    await this.tenantScope.assertProjectAccess(user, ipc.projectId);
    this.assertContractor(user);
    this.assertIpcOwner(ipc, user);

    this.assertIpcStatus(ipc.status, [IpcStatus.DRAFT]);

    if (ipc.lineItems.length === 0) {
      throw new BadRequestException('IPC must contain at least one WIR line item');
    }

    const transition = IpcStateMachine.submitForConsultantReview();
    return this.applyTransition(ipc, user, transition, 'IPC_SUBMIT_CONSULTANT', dto, meta);
  }

  async approveConsultant(
    user: AuthenticatedUser,
    id: string,
    dto: IpcDecisionDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const ipc = await this.loadIpc(id);
    await this.tenantScope.assertProjectAccess(user, ipc.projectId);

    if (user.organizationType !== OrganizationType.CONSULTANT) {
      throw new ForbiddenException('Consultant approval required');
    }

    this.assertIpcStatus(ipc.status, [IpcStatus.PENDING_CONSULTANT_REVIEW]);
    const transition = IpcStateMachine.consultantApprove();
    return this.applyTransition(ipc, user, transition, 'IPC_CONSULTANT_APPROVE', dto, meta);
  }

  async rejectConsultant(
    user: AuthenticatedUser,
    id: string,
    dto: IpcDecisionDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const ipc = await this.loadIpc(id);
    await this.tenantScope.assertProjectAccess(user, ipc.projectId);

    if (user.organizationType !== OrganizationType.CONSULTANT) {
      throw new ForbiddenException('Consultant rejection required');
    }

    this.assertIpcStatus(ipc.status, [IpcStatus.PENDING_CONSULTANT_REVIEW]);
    const transition = IpcStateMachine.reject();
    return this.applyTransition(
      ipc,
      user,
      transition,
      'IPC_CONSULTANT_REJECT',
      dto,
      meta,
      true,
    );
  }

  async approveClient(
    user: AuthenticatedUser,
    id: string,
    dto: IpcDecisionDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const ipc = await this.loadIpc(id);
    await this.tenantScope.assertProjectAccess(user, ipc.projectId);

    if (user.organizationType !== OrganizationType.CLIENT) {
      throw new ForbiddenException('Client financial approval required');
    }

    this.tenantScope.assertOrgAdmin(user);
    this.assertIpcStatus(ipc.status, [IpcStatus.PENDING_CLIENT_APPROVAL]);
    const transition = IpcStateMachine.clientApprove();
    return this.applyTransition(ipc, user, transition, 'IPC_CLIENT_APPROVE', dto, meta);
  }

  async rejectClient(
    user: AuthenticatedUser,
    id: string,
    dto: IpcDecisionDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const ipc = await this.loadIpc(id);
    await this.tenantScope.assertProjectAccess(user, ipc.projectId);

    if (user.organizationType !== OrganizationType.CLIENT) {
      throw new ForbiddenException('Client financial rejection required');
    }

    this.tenantScope.assertOrgAdmin(user);
    this.assertIpcStatus(ipc.status, [IpcStatus.PENDING_CLIENT_APPROVAL]);
    const transition = IpcStateMachine.reject();
    return this.applyTransition(
      ipc,
      user,
      transition,
      'IPC_CLIENT_REJECT',
      dto,
      meta,
      true,
    );
  }

  private async createIpcWithWirs(
    user: AuthenticatedUser,
    dto: CreateIpcWithWirsDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    this.assertContractor(user);
    await this.tenantScope.assertProjectAccess(user, dto.projectId);

    const wirs = await this.prisma.formInstance.findMany({
      where: {
        id: { in: dto.formInstanceIds },
        ...(await this.getEligibleWirWhere(user, dto.projectId)),
      },
      include: { template: true },
    });

    if (wirs.length !== dto.formInstanceIds.length) {
      throw new BadRequestException(
        'One or more WIRs are ineligible — must be APPROVED, unbilled, and submitted by your organization or a linked sub-contractor',
      );
    }

    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const certificateNumber = await this.nextCertificateNumber(dto.projectId);
    const lineItemsData = wirs.map((wir, index) => {
      const billing = extractWirBilling(
        wir.data as Record<string, unknown>,
        wir.referenceNumber,
      );

      if (billing.lineAmount <= 0) {
        throw new BadRequestException(
          `WIR ${wir.referenceNumber ?? wir.id} has no billable amount`,
        );
      }

      return {
        formInstanceId: wir.id,
        description: billing.description,
        quantity: new Decimal(billing.quantity),
        unit: billing.unit,
        unitRate: new Decimal(billing.unitRate),
        lineAmount: new Decimal(billing.lineAmount),
        sortOrder: index,
      };
    });

    const subtotal = lineItemsData.reduce(
      (sum, item) => sum.plus(item.lineAmount),
      new Decimal(0),
    );

    const ipc = await this.prisma.$transaction(async (tx) => {
      const created = await tx.interimPaymentCertificate.create({
        data: {
          projectId: dto.projectId,
          contractorOrgId: user.organizationId,
          certificateNumber,
          status: IpcStatus.DRAFT,
          periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
          periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
          subtotalAmount: subtotal,
          notes: dto.notes,
          createdByUserId: user.id,
          lineItems: { create: lineItemsData },
        },
        include: this.ipcInclude(),
      });

      await tx.formInstance.updateMany({
        where: { id: { in: dto.formInstanceIds } },
        data: { isBilled: true, ipcId: created.id },
      });

      return created;
    });

    await this.audit.record({
      entityType: 'InterimPaymentCertificate',
      entityId: ipc.id,
      action: 'IPC_DRAFT_CREATED',
      newData: ipc,
      context: {
        ...this.audit.buildContext(user),
        projectId: dto.projectId,
        source: AuditSource.API,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: {
          wirCount: wirs.length,
          subtotal: subtotal.toString(),
          autoGenerated: true,
        },
      },
    });

    return ipc;
  }

  private async applyTransition(
    ipc: Awaited<ReturnType<IpcService['loadIpc']>>,
    user: AuthenticatedUser,
    transition: ReturnType<typeof IpcStateMachine.submitForConsultantReview>,
    action: string,
    dto: IpcDecisionDto,
    meta: { ipAddress?: string; userAgent?: string },
    releaseWirs = false,
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.interimPaymentCertificate.update({
        where: { id: ipc.id },
        data: {
          status: transition.status,
          consultantReviewedAt: transition.consultantReviewedAt,
          clientApprovedAt: transition.clientApprovedAt,
          rejectedAt: transition.rejectedAt,
          rejectionReason: releaseWirs ? dto.rejectionReason ?? dto.comments : undefined,
        },
        include: this.ipcInclude(),
      });

      if (releaseWirs) {
        const formIds = ipc.lineItems.map((li) => li.formInstanceId);
        await tx.formInstance.updateMany({
          where: { id: { in: formIds } },
          data: { isBilled: false, ipcId: null },
        });
      }

      return result;
    });

    await this.audit.record({
      entityType: 'InterimPaymentCertificate',
      entityId: ipc.id,
      action,
      previousData: ipc,
      newData: updated,
      context: {
        ...this.audit.buildContext(user),
        projectId: ipc.projectId,
        source: AuditSource.APPROVAL,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: {
          comments: dto.comments,
          rejectionReason: dto.rejectionReason,
          wirsReleased: releaseWirs,
        },
      },
    });

    return updated;
  }

  private async getEligibleWirWhere(
    user: AuthenticatedUser,
    projectId: string,
  ): Promise<Prisma.FormInstanceWhereInput> {
    const organizationIds = await this.resolveBillableOrganizationIds(
      user,
      projectId,
    );

    return {
      projectId,
      organizationId: { in: organizationIds },
      isBilled: false,
      deletedAt: null,
      status: FormInstanceStatus.APPROVED,
      template: { code: StandardFormCode.WIR },
    };
  }

  /**
   * Main Contractor IPC rolls up approved WIRs from the MC org and every
   * SubContractorLink on the project.
   */
  private async resolveBillableOrganizationIds(
    user: AuthenticatedUser,
    projectId: string,
  ): Promise<string[]> {
    const ids = new Set<string>([user.organizationId]);

    if (user.organizationType === OrganizationType.MAIN_CONTRACTOR) {
      const links = await this.prisma.subContractorLink.findMany({
        where: {
          projectId,
          mainContractorId: user.organizationId,
          deletedAt: null,
        },
        select: { subContractorId: true },
      });

      for (const link of links) {
        ids.add(link.subContractorId);
      }
    }

    return Array.from(ids);
  }

  private async nextCertificateNumber(projectId: string): Promise<string> {
    const count = await this.prisma.interimPaymentCertificate.count({
      where: { projectId },
    });
    const project = await this.prisma.project.findFirst({
      where: { id: projectId },
      select: { code: true },
    });
    const seq = String(count + 1).padStart(4, '0');
    return `IPC-${project?.code ?? 'PRJ'}-${seq}`;
  }

  private async loadIpc(id: string) {
    const ipc = await this.prisma.interimPaymentCertificate.findFirst({
      where: { id, deletedAt: null },
      include: this.ipcInclude(),
    });

    if (!ipc) {
      throw new NotFoundException('IPC not found');
    }

    return ipc;
  }

  private ipcInclude() {
    return {
      lineItems: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
          formInstance: {
            select: {
              id: true,
              referenceNumber: true,
              status: true,
              data: true,
            },
          },
        },
      },
      contractorOrg: {
        select: { id: true, name: true, type: true },
      },
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    };
  }

  private assertContractor(user: AuthenticatedUser): void {
    if (user.organizationType !== OrganizationType.MAIN_CONTRACTOR) {
      throw new ForbiddenException(
        'Only the Main Contractor can create Interim Payment Certificates',
      );
    }
  }

  private assertIpcOwner(
    ipc: { contractorOrgId: string },
    user: AuthenticatedUser,
  ): void {
    if (ipc.contractorOrgId !== user.organizationId) {
      throw new ForbiddenException('You can only manage your own IPCs');
    }
  }

  private assertIpcStatus(current: IpcStatus, allowed: IpcStatus[]): void {
    try {
      IpcStateMachine.assertStatus(current, allowed);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid IPC status transition',
      );
    }
  }
}
