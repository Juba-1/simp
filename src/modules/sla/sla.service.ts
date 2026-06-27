import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import {
  ApprovalActionType,
  AuditSource,
  EscalationSeverity,
  FormInstanceStatus,
  WorkflowPhase,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { FormWorkflowStateMachine } from '../workflows/domain/form-workflow.state-machine';
import { WorkflowPolicyService } from '../workflows/workflow-policy.service';

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly policyService: WorkflowPolicyService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleSlaBreachScan(): Promise<void> {
    this.logger.log('Running SLA breach scan...');
    const breached = await this.scanAndEscalate();
    this.logger.log(`SLA scan complete — ${breached} form(s) escalated`);
  }

  async scanAndEscalate(): Promise<number> {
    const pendingForms = await this.prisma.formInstance.findMany({
      where: {
        deletedAt: null,
        status: FormInstanceStatus.PENDING_EXTERNAL_APPROVAL,
        externalReviewStartedAt: { not: null },
        slaBreached: false,
      },
      include: { template: true },
    });

    let escalated = 0;
    const now = new Date();

    for (const form of pendingForms) {
      const policy = await this.policyService.getPolicy(
        form.projectId,
        form.template.code,
      );

      const slaMs = policy.externalSlaHours * 60 * 60 * 1000;
      const startedAt = form.externalReviewStartedAt!;
      const elapsed = now.getTime() - startedAt.getTime();

      if (elapsed <= slaMs) continue;

      const hoursOverdue = new Decimal(elapsed - slaMs)
        .div(60 * 60 * 1000)
        .toDecimalPlaces(2);

      await this.escalateForm(form, hoursOverdue, policy.externalSlaHours);
      escalated++;
    }

    return escalated;
  }

  private async escalateForm(
    form: {
      id: string;
      projectId: string;
      referenceNumber: string | null;
      workflowPhase: WorkflowPhase;
      status: FormInstanceStatus;
      externalReviewStartedAt: Date | null;
    },
    hoursOverdue: Decimal,
    slaHours: number,
  ) {
    const transition = FormWorkflowStateMachine.resolveSlaBreach();
    const message = `SLA BREACH: Form ${form.referenceNumber ?? form.id} has been pending Consultant approval for ${hoursOverdue}h beyond the ${slaHours}h limit. Client notified.`;
    const messageAr = `خرق اتفاقية مستوى الخدمة: النموذج معلق لدى الاستشاري منذ ${hoursOverdue} ساعة فوق الحد المسموح (${slaHours} ساعة). تم إخطار العميل.`;

    await this.prisma.$transaction(async (tx) => {
      const previous = { ...form };

      const updated = await tx.formInstance.update({
        where: { id: form.id },
        data: {
          status: transition.status,
          workflowPhase: transition.phase,
          slaBreached: true,
          slaBreachedAt: new Date(),
          currentPendingOrgType: transition.pendingOrgType,
        },
      });

      await tx.approvalRecord.create({
        data: {
          formInstanceId: form.id,
          action: ApprovalActionType.SLA_ESCALATION,
          fromStatus: form.status,
          toStatus: transition.status,
          fromPhase: form.workflowPhase,
          toPhase: transition.phase,
          comments: message,
        },
      });

      await tx.slaEscalation.create({
        data: {
          projectId: form.projectId,
          formInstanceId: form.id,
          severity: EscalationSeverity.CRITICAL,
          message,
          messageAr,
          hoursOverdue,
        },
      });

      await this.audit.record(
        {
          entityType: 'FormInstance',
          entityId: form.id,
          action: 'SLA_BREACH_ESCALATION',
          previousData: previous,
          newData: updated,
          context: {
            projectId: form.projectId,
            source: AuditSource.SYSTEM,
            metadata: {
              hoursOverdue: hoursOverdue.toString(),
              slaHours,
              clientAlert: true,
            },
          },
        },
        tx,
      );
    });

    this.logger.warn(message);
  }

  async getProjectEscalations(projectId: string, includeAcknowledged = false) {
    return this.prisma.slaEscalation.findMany({
      where: {
        projectId,
        acknowledged: includeAcknowledged ? undefined : false,
      },
      include: {
        formInstance: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            template: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acknowledgeEscalation(id: string, userId: string) {
    const escalation = await this.prisma.slaEscalation.update({
      where: { id },
      data: { acknowledged: true },
    });

    await this.audit.record({
      entityType: 'SlaEscalation',
      entityId: id,
      action: 'ACKNOWLEDGE',
      newData: escalation,
      context: {
        userId,
        projectId: escalation.projectId,
        source: AuditSource.API,
      },
    });

    return escalation;
  }
}
