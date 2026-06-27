import {
  ApprovalActionType,
  FormInstanceStatus,
  OrganizationType,
  WorkflowPhase,
} from '@prisma/client';

export interface WorkflowTransitionResult {
  status: FormInstanceStatus;
  phase: WorkflowPhase;
  pendingOrgType: OrganizationType | null;
  externalReviewStartedAt?: Date | null;
  submittedAt?: Date;
}

export interface WorkflowPolicyConfig {
  requiresInternalApproval: boolean;
  internalApproverOrgType: OrganizationType;
  externalApproverOrgType: OrganizationType;
  externalSlaHours: number;
}

/**
 * Pure state machine — no I/O, fully testable.
 * Internal approvals (field submitter → Main Contractor QA/QC) precede external (→ Consultant).
 */
export class FormWorkflowStateMachine {
  static resolveSubmitTransition(
    submitterOrgType: OrganizationType,
    policy: WorkflowPolicyConfig,
  ): WorkflowTransitionResult {
    const submittedAt = new Date();

    const fieldSubmitter =
      submitterOrgType === OrganizationType.SUB_CONTRACTOR ||
      submitterOrgType === OrganizationType.MAIN_CONTRACTOR;

    const needsInternal =
      policy.requiresInternalApproval && fieldSubmitter;

    if (needsInternal) {
      return {
        status: FormInstanceStatus.PENDING_INTERNAL_APPROVAL,
        phase: WorkflowPhase.INTERNAL_REVIEW,
        pendingOrgType: policy.internalApproverOrgType,
        submittedAt,
        externalReviewStartedAt: null,
      };
    }

    return {
      status: FormInstanceStatus.PENDING_EXTERNAL_APPROVAL,
      phase: WorkflowPhase.EXTERNAL_REVIEW,
      pendingOrgType: policy.externalApproverOrgType,
      submittedAt,
      externalReviewStartedAt: new Date(),
    };
  }

  static resolveInternalApproval(
    approved: boolean,
    policy: WorkflowPolicyConfig,
  ): WorkflowTransitionResult {
    if (!approved) {
      return {
        status: FormInstanceStatus.REJECTED,
        phase: WorkflowPhase.COMPLETED,
        pendingOrgType: null,
        externalReviewStartedAt: null,
      };
    }

    return {
      status: FormInstanceStatus.PENDING_EXTERNAL_APPROVAL,
      phase: WorkflowPhase.EXTERNAL_REVIEW,
      pendingOrgType: policy.externalApproverOrgType,
      externalReviewStartedAt: new Date(),
    };
  }

  static resolveExternalApproval(approved: boolean): WorkflowTransitionResult {
    if (!approved) {
      return {
        status: FormInstanceStatus.REJECTED,
        phase: WorkflowPhase.COMPLETED,
        pendingOrgType: null,
        externalReviewStartedAt: null,
      };
    }

    return {
      status: FormInstanceStatus.APPROVED,
      phase: WorkflowPhase.COMPLETED,
      pendingOrgType: null,
      externalReviewStartedAt: null,
    };
  }

  static resolveSlaBreach(): WorkflowTransitionResult {
    return {
      status: FormInstanceStatus.SLA_BREACHED,
      phase: WorkflowPhase.EXTERNAL_REVIEW,
      pendingOrgType: OrganizationType.CONSULTANT,
    };
  }

  static resolveResubmitTransition(
    submitterOrgType: OrganizationType,
    policy: WorkflowPolicyConfig,
  ): WorkflowTransitionResult {
    return this.resolveSubmitTransition(submitterOrgType, policy);
  }

  static assertActionAllowed(
    currentStatus: FormInstanceStatus,
    action: ApprovalActionType,
    actorOrgType: OrganizationType,
    pendingOrgType: OrganizationType | null,
  ): void {
    switch (action) {
      case ApprovalActionType.SUBMIT:
        if (currentStatus !== FormInstanceStatus.DRAFT) {
          throw new Error('Only DRAFT forms can be submitted');
        }
        return;

      case ApprovalActionType.RESUBMIT:
        if (currentStatus !== FormInstanceStatus.REJECTED) {
          throw new Error('Only rejected forms can be resubmitted');
        }
        return;

      case ApprovalActionType.APPROVE_INTERNAL:
      case ApprovalActionType.REJECT_INTERNAL:
        if (currentStatus !== FormInstanceStatus.PENDING_INTERNAL_APPROVAL) {
          throw new Error('Form is not pending internal approval');
        }
        if (actorOrgType !== pendingOrgType) {
          throw new Error('Your organization is not the internal approver');
        }
        return;

      case ApprovalActionType.APPROVE_EXTERNAL:
      case ApprovalActionType.REJECT_EXTERNAL:
        if (
          currentStatus !== FormInstanceStatus.PENDING_EXTERNAL_APPROVAL &&
          currentStatus !== FormInstanceStatus.SLA_BREACHED
        ) {
          throw new Error('Form is not pending external approval');
        }
        if (actorOrgType !== pendingOrgType) {
          throw new Error('Your organization is not the external approver');
        }
        return;

      default:
        return;
    }
  }
}
