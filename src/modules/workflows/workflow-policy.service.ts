import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrganizationType,
  Prisma,
  StandardFormCode,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  FormWorkflowStateMachine,
  WorkflowPolicyConfig,
} from './domain/form-workflow.state-machine';

const DEFAULT_POLICY: Omit<WorkflowPolicyConfig, 'externalSlaHours'> & {
  externalSlaHours?: number;
} = {
  requiresInternalApproval: true,
  internalApproverOrgType: OrganizationType.MAIN_CONTRACTOR,
  externalApproverOrgType: OrganizationType.CONSULTANT,
};

@Injectable()
export class WorkflowPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getPolicy(
    projectId: string,
    templateCode: StandardFormCode,
  ): Promise<WorkflowPolicyConfig> {
    const stored = await this.prisma.workflowPolicy.findUnique({
      where: {
        projectId_templateCode: { projectId, templateCode },
      },
    });

    const defaultSla =
      this.config.get<number>('app.externalSlaHours') ?? 48;

    if (stored) {
      return {
        requiresInternalApproval: stored.requiresInternalApproval,
        internalApproverOrgType: stored.internalApproverOrgType,
        externalApproverOrgType: stored.externalApproverOrgType,
        externalSlaHours: stored.externalSlaHours,
      };
    }

    return {
      ...DEFAULT_POLICY,
      externalSlaHours: defaultSla,
    };
  }

  async upsertPolicy(
    projectId: string,
    templateCode: StandardFormCode,
    data: Partial<WorkflowPolicyConfig>,
  ) {
    return this.prisma.workflowPolicy.upsert({
      where: { projectId_templateCode: { projectId, templateCode } },
      create: {
        projectId,
        templateCode,
        requiresInternalApproval:
          data.requiresInternalApproval ?? DEFAULT_POLICY.requiresInternalApproval,
        internalApproverOrgType:
          data.internalApproverOrgType ?? DEFAULT_POLICY.internalApproverOrgType,
        externalApproverOrgType:
          data.externalApproverOrgType ?? DEFAULT_POLICY.externalApproverOrgType,
        externalSlaHours:
          data.externalSlaHours ??
          this.config.get<number>('app.externalSlaHours') ??
          48,
      },
      update: {
        requiresInternalApproval: data.requiresInternalApproval,
        internalApproverOrgType: data.internalApproverOrgType,
        externalApproverOrgType: data.externalApproverOrgType,
        externalSlaHours: data.externalSlaHours,
      } as Prisma.WorkflowPolicyUpdateInput,
    });
  }
}

export { FormWorkflowStateMachine };
