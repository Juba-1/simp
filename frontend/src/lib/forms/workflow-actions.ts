export type WorkflowAction =
  | 'submit'
  | 'approve-internal'
  | 'reject-internal'
  | 'approve-external'
  | 'reject-external';

interface FormWorkflowContext {
  status: string;
  organizationId: string;
  currentPendingOrgType: string | null;
}

export function getAvailableWorkflowActions(
  form: FormWorkflowContext,
  userOrgId: string,
  userOrgType: string,
  isOrgAdmin = false,
): WorkflowAction[] {
  const actions: WorkflowAction[] = [];

  const ownsForm = form.organizationId === userOrgId;
  const isMcAdmin = isOrgAdmin && userOrgType === 'MAIN_CONTRACTOR';

  if (form.status === 'DRAFT' && (ownsForm || isMcAdmin)) {
    actions.push('submit');
  }

  if (
    form.status === 'PENDING_INTERNAL_APPROVAL' &&
    (form.currentPendingOrgType === userOrgType ||
      (isMcAdmin && form.currentPendingOrgType === 'MAIN_CONTRACTOR'))
  ) {
    actions.push('approve-internal', 'reject-internal');
  }

  if (
    (form.status === 'PENDING_EXTERNAL_APPROVAL' ||
      form.status === 'SLA_BREACHED') &&
    form.currentPendingOrgType === userOrgType
  ) {
    actions.push('approve-external', 'reject-external');
  }

  return actions;
}

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-800 border border-slate-400',
  SUBMITTED: 'bg-blue-100 text-blue-900 border border-blue-500',
  PENDING_INTERNAL_APPROVAL: 'bg-amber-100 text-amber-900 border border-amber-500',
  PENDING_EXTERNAL_APPROVAL: 'bg-amber-100 text-amber-900 border border-amber-500',
  APPROVED: 'bg-emerald-100 text-emerald-800 border border-emerald-500',
  REJECTED: 'bg-rose-100 text-rose-800 border border-rose-500',
  SLA_BREACHED: 'bg-rose-100 text-rose-800 border border-rose-500',
  ARCHIVED: 'bg-slate-100 text-slate-700 border border-slate-300',
};
