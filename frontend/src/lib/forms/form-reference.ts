/**
 * Display label for a form reference including PMIS revision tag.
 * Rev 0 is the initial submission; Rev 1+ shown after revise & resubmit.
 */
export function formatFormReferenceLabel(
  referenceNumber: string | null | undefined,
  formId: string,
  revisionNumber?: number | null,
): string {
  const base = referenceNumber?.trim() || formId.slice(0, 8);
  const rev = revisionNumber ?? 0;
  if (rev > 0) {
    return `${base} (Rev ${rev})`;
  }
  return base;
}

export function canReviseRejectedForm(
  form: { status: string; organizationId: string },
  user: {
    organizationId: string;
    organization?: { type?: string };
    isOrgAdmin?: boolean;
  } | null,
): boolean {
  if (!user || form.status !== 'REJECTED') return false;
  const ownsForm = form.organizationId === user.organizationId;
  const isMcAdmin =
    Boolean(user.isOrgAdmin) &&
    user.organization?.type === 'MAIN_CONTRACTOR';
  return ownsForm || isMcAdmin;
}
