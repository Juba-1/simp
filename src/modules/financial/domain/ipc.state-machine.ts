import { IpcStatus } from '@prisma/client';

export interface IpcTransitionResult {
  status: IpcStatus;
  consultantReviewedAt?: Date | null;
  clientApprovedAt?: Date | null;
  rejectedAt?: Date | null;
}

/**
 * IPC financial approval chain:
 * DRAFT → Consultant Review → Client Financial Approval → APPROVED
 */
export class IpcStateMachine {
  static submitForConsultantReview(): IpcTransitionResult {
    return { status: IpcStatus.PENDING_CONSULTANT_REVIEW };
  }

  static consultantApprove(): IpcTransitionResult {
    return {
      status: IpcStatus.PENDING_CLIENT_APPROVAL,
      consultantReviewedAt: new Date(),
    };
  }

  static clientApprove(): IpcTransitionResult {
    return {
      status: IpcStatus.APPROVED,
      clientApprovedAt: new Date(),
    };
  }

  static reject(): IpcTransitionResult {
    return {
      status: IpcStatus.REJECTED,
      rejectedAt: new Date(),
    };
  }

  static assertStatus(current: IpcStatus, allowed: IpcStatus[]): void {
    if (!allowed.includes(current)) {
      throw new Error(
        `IPC status ${current} does not allow this action. Expected: ${allowed.join(' or ')}`,
      );
    }
  }
}
