import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApprovalActionType,
  AuditSource,
  FormInstanceStatus,
  OrganizationType,
  Prisma,
  StandardFormCode,
  WorkflowPhase,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PRISMA_INTERACTIVE_TX_OPTIONS } from '../../database/prisma-transaction.options';
import { TenantScopeService } from '../../common/services/tenant-scope.service';
import { AuditService } from '../../common/services/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  FormWorkflowStateMachine,
  WorkflowPolicyService,
} from './workflow-policy.service';
import { MaterialReconciliationService } from '../materials/material-reconciliation.service';
import {
  isMaterialUsageForm,
  isMirForm,
} from '../materials/material-payload.extractor';
import { ApprovalDecisionDto, SubmitWorkflowDto } from './dto/workflow.dto';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
    private readonly audit: AuditService,
    private readonly policyService: WorkflowPolicyService,
    private readonly materialReconciliation: MaterialReconciliationService,
  ) {}

  async submit(
    user: AuthenticatedUser,
    formInstanceId: string,
    dto: SubmitWorkflowDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const form = await this.loadForm(formInstanceId);
    await this.tenantScope.assertProjectAccess(user, form.projectId);

    if (form.organizationId !== user.organizationId) {
      const mayActForSubmitter =
        user.isOrgAdmin &&
        user.organizationType === OrganizationType.MAIN_CONTRACTOR &&
        (await this.isManagedSubContractorForm(user, form));

      if (!mayActForSubmitter) {
        throw new ForbiddenException(
          'Only the submitting organization can submit',
        );
      }
    }

    const policy = await this.policyService.getPolicy(
      form.projectId,
      form.template.code,
    );

    this.assertWorkflowAction(
      form.status,
      ApprovalActionType.SUBMIT,
      user.organizationType,
      form.currentPendingOrgType,
    );

    const transition = FormWorkflowStateMachine.resolveSubmitTransition(
      user.organizationType,
      policy,
    );

    return this.prisma.$transaction(async (tx) => {
      if (
        form.template.code === StandardFormCode.WIR &&
        !(await this.canEditWirBilling(user))
      ) {
        const sanitized = {
          ...(form.data as Record<string, unknown>),
          unitRate: 0,
          lineAmount: 0,
        };
        await tx.formInstance.update({
          where: { id: form.id },
          data: { data: sanitized as Prisma.InputJsonValue },
        });
      }

      const updated = await tx.formInstance.update({
        where: { id: form.id },
        data: {
          status: transition.status,
          workflowPhase: transition.phase,
          currentPendingOrgType: transition.pendingOrgType,
          submittedAt: transition.submittedAt,
          externalReviewStartedAt: transition.externalReviewStartedAt,
          comments: dto.comments ?? form.comments,
        },
        include: this.formInclude(),
      });

      await tx.approvalRecord.create({
        data: {
          formInstanceId: form.id,
          action: ApprovalActionType.SUBMIT,
          fromStatus: form.status,
          toStatus: transition.status,
          fromPhase: form.workflowPhase,
          toPhase: transition.phase,
          actorUserId: user.id,
          actorOrgId: user.organizationId,
          comments: dto.comments ?? '',
        },
      });

      await this.audit.record(
        {
          entityType: 'FormInstance',
          entityId: form.id,
          action: 'WORKFLOW_SUBMIT',
          previousData: form,
          newData: updated,
          context: {
            ...this.audit.buildContext(user),
            projectId: form.projectId,
            source: AuditSource.APPROVAL,
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
            metadata: { pendingOrgType: transition.pendingOrgType },
          },
        },
        tx,
      );

      let materialResult = null;
      if (isMaterialUsageForm(form.template.code)) {
        materialResult = await this.materialReconciliation.processMaterialDeduction(
          form.id,
          user,
          tx,
        );
      }

      return { form: updated, materialReconciliation: materialResult };
    }, PRISMA_INTERACTIVE_TX_OPTIONS);
  }

  async approveInternal(
    user: AuthenticatedUser,
    formInstanceId: string,
    dto: ApprovalDecisionDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.processInternalDecision(user, formInstanceId, true, dto, meta);
  }

  async rejectInternal(
    user: AuthenticatedUser,
    formInstanceId: string,
    dto: ApprovalDecisionDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.processInternalDecision(user, formInstanceId, false, dto, meta);
  }

  async approveExternal(
    user: AuthenticatedUser,
    formInstanceId: string,
    dto: ApprovalDecisionDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.processExternalDecision(user, formInstanceId, true, dto, meta);
  }

  async rejectExternal(
    user: AuthenticatedUser,
    formInstanceId: string,
    dto: ApprovalDecisionDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.processExternalDecision(user, formInstanceId, false, dto, meta);
  }

  async resubmit(
    user: AuthenticatedUser,
    formInstanceId: string,
    dto: SubmitWorkflowDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const form = await this.loadForm(formInstanceId);
    await this.tenantScope.assertProjectAccess(user, form.projectId);

    if (form.organizationId !== user.organizationId) {
      const mayActForSubmitter =
        user.isOrgAdmin &&
        user.organizationType === OrganizationType.MAIN_CONTRACTOR &&
        (await this.isManagedSubContractorForm(user, form));

      if (!mayActForSubmitter) {
        throw new ForbiddenException(
          'Only the submitting organization can resubmit',
        );
      }
    }

    const policy = await this.policyService.getPolicy(
      form.projectId,
      form.template.code,
    );

    this.assertWorkflowAction(
      form.status,
      ApprovalActionType.RESUBMIT,
      user.organizationType,
      form.currentPendingOrgType,
    );

    const submitterOrg = await this.prisma.organization.findFirst({
      where: { id: form.organizationId, deletedAt: null },
      select: { type: true },
    });

    if (!submitterOrg) {
      throw new NotFoundException('Submitting organization not found');
    }

    const transition = FormWorkflowStateMachine.resolveResubmitTransition(
      submitterOrg.type,
      policy,
    );

    const lastRejection = await this.prisma.approvalRecord.findFirst({
      where: {
        formInstanceId: form.id,
        action: {
          in: [
            ApprovalActionType.REJECT_INTERNAL,
            ApprovalActionType.REJECT_EXTERNAL,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const nextRevision = form.revisionNumber + 1;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.formInstance.update({
        where: { id: form.id },
        data: {
          status: transition.status,
          workflowPhase: transition.phase,
          currentPendingOrgType: transition.pendingOrgType,
          submittedAt: transition.submittedAt,
          externalReviewStartedAt: transition.externalReviewStartedAt,
          revisionNumber: nextRevision,
          comments: dto.comments?.trim() ?? '',
          slaBreached: false,
        },
        include: this.formInclude(),
      });

      await tx.approvalRecord.create({
        data: {
          formInstanceId: form.id,
          action: ApprovalActionType.RESUBMIT,
          fromStatus: form.status,
          toStatus: transition.status,
          fromPhase: form.workflowPhase,
          toPhase: transition.phase,
          actorUserId: user.id,
          actorOrgId: user.organizationId,
          comments: dto.comments ?? '',
        },
      });

      await this.audit.record(
        {
          entityType: 'FormInstance',
          entityId: form.id,
          action: 'RESUBMITTED',
          previousData: form,
          newData: updated,
          context: {
            ...this.audit.buildContext(user),
            projectId: form.projectId,
            source: AuditSource.APPROVAL,
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
            metadata: {
              previousRevisionNumber: form.revisionNumber,
              newRevisionNumber: nextRevision,
              priorRejection: lastRejection
                ? {
                    action: lastRejection.action,
                    comments: lastRejection.comments,
                    rejectedAt: lastRejection.createdAt,
                    fromStatus: lastRejection.fromStatus,
                  }
                : null,
              pendingOrgType: transition.pendingOrgType,
            },
          },
        },
        tx,
      );

      let materialResult = null;
      if (isMaterialUsageForm(form.template.code)) {
        materialResult = await this.materialReconciliation.processMaterialDeduction(
          form.id,
          user,
          tx,
        );
      }

      return { form: updated, materialReconciliation: materialResult };
    }, PRISMA_INTERACTIVE_TX_OPTIONS);
  }

  async getApprovalHistory(user: AuthenticatedUser, formInstanceId: string) {
    const form = await this.loadForm(formInstanceId);
    await this.tenantScope.assertProjectAccess(user, form.projectId);

    return this.prisma.approvalRecord.findMany({
      where: { formInstanceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async processInternalDecision(
    user: AuthenticatedUser,
    formInstanceId: string,
    approved: boolean,
    dto: ApprovalDecisionDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const form = await this.loadForm(formInstanceId);
    await this.tenantScope.assertProjectAccess(user, form.projectId);

    const action = approved
      ? ApprovalActionType.APPROVE_INTERNAL
      : ApprovalActionType.REJECT_INTERNAL;

    this.assertWorkflowAction(
      form.status,
      action,
      user.organizationType,
      form.currentPendingOrgType,
    );

    if (user.organizationType !== OrganizationType.MAIN_CONTRACTOR) {
      throw new ForbiddenException('Internal approval requires Main Contractor role');
    }

    if (form.createdByUserId === user.id) {
      throw new ForbiddenException(
        'You cannot approve or reject your own submission',
      );
    }

    await this.assertInternalReviewerRole(user);

    const policy = await this.policyService.getPolicy(
      form.projectId,
      form.template.code,
    );

    const transition = FormWorkflowStateMachine.resolveInternalApproval(
      approved,
      policy,
    );

    if (!approved && !dto.comments?.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    let formForTransition = form;

    if (approved && form.template.code === StandardFormCode.WIR) {
      if (dto.unitRate === undefined || dto.unitRate <= 0) {
        throw new BadRequestException(
          'Internal WIR approval requires a valid unitRate',
        );
      }

      const existing = form.data as Record<string, unknown>;
      const quantity = Number(existing.quantityUsed ?? 0);
      const lineAmount =
        dto.lineAmount !== undefined && dto.lineAmount > 0
          ? dto.lineAmount
          : quantity > 0
            ? quantity * dto.unitRate
            : 0;

      if (lineAmount <= 0) {
        throw new BadRequestException(
          'WIR line amount must be greater than zero before internal approval',
        );
      }

      const mergedData = {
        ...existing,
        unitRate: dto.unitRate,
        lineAmount,
      };

      formForTransition = await this.prisma.formInstance.update({
        where: { id: form.id },
        data: { data: mergedData as Prisma.InputJsonValue },
        include: { template: true },
      });
    }

    return this.applyTransition(formForTransition, user, action, transition, dto, meta);
  }

  private async processExternalDecision(
    user: AuthenticatedUser,
    formInstanceId: string,
    approved: boolean,
    dto: ApprovalDecisionDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const form = await this.loadForm(formInstanceId);
    await this.tenantScope.assertProjectAccess(user, form.projectId);

    const action = approved
      ? ApprovalActionType.APPROVE_EXTERNAL
      : ApprovalActionType.REJECT_EXTERNAL;

    this.assertWorkflowAction(
      form.status,
      action,
      user.organizationType,
      form.currentPendingOrgType,
    );

    if (user.organizationType !== OrganizationType.CONSULTANT) {
      throw new ForbiddenException('External approval requires Consultant role');
    }

    const transition = FormWorkflowStateMachine.resolveExternalApproval(approved);

    if (!approved && !dto.comments?.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    const result = await this.applyTransition(
      form,
      user,
      action,
      transition,
      dto,
      meta,
    );

    if (approved && isMirForm(form.template.code)) {
      await this.materialReconciliation.establishInventoryFromMir(
        form.id,
        user,
      );
    }

    return result;
  }

  private async applyTransition(
    form: Awaited<ReturnType<WorkflowService['loadForm']>>,
    user: AuthenticatedUser,
    action: ApprovalActionType,
    transition: ReturnType<typeof FormWorkflowStateMachine.resolveInternalApproval>,
    dto: ApprovalDecisionDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.formInstance.update({
        where: { id: form.id },
        data: {
          status: transition.status,
          workflowPhase: transition.phase,
          currentPendingOrgType: transition.pendingOrgType,
          externalReviewStartedAt:
            transition.externalReviewStartedAt !== undefined
              ? transition.externalReviewStartedAt
              : form.externalReviewStartedAt,
          slaBreached:
            transition.status === FormInstanceStatus.APPROVED
              ? false
              : form.slaBreached,
          ...(transition.status === FormInstanceStatus.REJECTED && dto.comments?.trim()
            ? { comments: dto.comments.trim() }
            : {}),
        },
        include: this.formInclude(),
      });

      await tx.approvalRecord.create({
        data: {
          formInstanceId: form.id,
          action,
          fromStatus: form.status,
          toStatus: transition.status,
          fromPhase: form.workflowPhase,
          toPhase: transition.phase,
          actorUserId: user.id,
          actorOrgId: user.organizationId,
          comments: dto.comments ?? '',
        },
      });

      await this.audit.record(
        {
          entityType: 'FormInstance',
          entityId: form.id,
          action: `WORKFLOW_${action}`,
          previousData: form,
          newData: updated,
          context: {
            ...this.audit.buildContext(user),
            projectId: form.projectId,
            source: AuditSource.APPROVAL,
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
          },
        },
        tx,
      );

      return updated;
    }, PRISMA_INTERACTIVE_TX_OPTIONS);
  }

  private assertWorkflowAction(
    currentStatus: FormInstanceStatus,
    action: ApprovalActionType,
    actorOrgType: OrganizationType,
    pendingOrgType: OrganizationType | null,
  ): void {
    try {
      FormWorkflowStateMachine.assertActionAllowed(
        currentStatus,
        action,
        actorOrgType,
        pendingOrgType,
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid workflow transition',
      );
    }
  }

  private async loadForm(id: string) {
    const form = await this.prisma.formInstance.findFirst({
      where: { id, deletedAt: null },
      include: { template: true },
    });

    if (!form) {
      throw new NotFoundException('Form instance not found');
    }

    return form;
  }

  private formInclude() {
    return {
      template: { select: { id: true, code: true, name: true, version: true } },
      approvalRecords: { orderBy: { createdAt: 'desc' as const }, take: 5 },
    };
  }

  private async isManagedSubContractorForm(
    user: AuthenticatedUser,
    form: { projectId: string; organizationId: string },
  ): Promise<boolean> {
    if (form.organizationId === user.organizationId) {
      return false;
    }

    const link = await this.prisma.subContractorLink.findFirst({
      where: {
        projectId: form.projectId,
        mainContractorId: user.organizationId,
        subContractorId: form.organizationId,
        deletedAt: null,
      },
    });

    return Boolean(link);
  }

  /**
   * Internal QA/QC gate — org admins or QA/QC-named roles only (mirrors frontend
   * internal-review-access.ts so API cannot be bypassed).
   */
  private async assertInternalReviewerRole(
    user: AuthenticatedUser,
  ): Promise<void> {
    if (await this.canEditWirBilling(user)) return;

    throw new ForbiddenException(
      'Internal approval requires QA/QC inspector or organization admin role',
    );
  }

  private async canEditWirBilling(user: AuthenticatedUser): Promise<boolean> {
    if (user.isOrgAdmin) return true;

    const dbUser = await this.prisma.user.findFirst({
      where: { id: user.id, deletedAt: null },
      include: { role: true },
    });

    if (!dbUser?.role) return false;

    const qaPattern = /QA|QC|quality|مفتش|جودة/i;
    const roleName = dbUser.role.name ?? '';
    const roleNameAr = dbUser.role.nameAr ?? '';

    return qaPattern.test(roleName) || qaPattern.test(roleNameAr);
  }
}
