import type { AuthUser } from '@/stores/auth-store';

/** Client owner org admin — manages vendors, SLA policies, project settings */
export function isClientOrgAdmin(user: AuthUser | null): boolean {
  return Boolean(user?.organization.type === 'CLIENT' && user.isOrgAdmin);
}

/** Main Contractor org admin on a project */
export function isMainContractorOrg(user: AuthUser | null): boolean {
  return user?.organization.type === 'MAIN_CONTRACTOR';
}

export function canLinkSubContractorToProject(user: AuthUser | null): boolean {
  return Boolean(isMainContractorOrg(user) && user?.isOrgAdmin);
}

/** Only Main Contractors originate IPC drafts — not sub-contractors or consultants */
export function canGenerateIpc(user: AuthUser | null): boolean {
  return user?.organization.type === 'MAIN_CONTRACTOR' && Boolean(user.isOrgAdmin);
}

export function canViewIpcBilling(user: AuthUser | null): boolean {
  const type = user?.organization.type;
  return type === 'CLIENT' || type === 'MAIN_CONTRACTOR' || type === 'CONSULTANT';
}

export function canAccessProjectVendorSettings(user: AuthUser | null): boolean {
  return isClientOrgAdmin(user);
}

/** Platform / portfolio SLA configuration — Client only */
export function canViewClientSlaSettings(user: AuthUser | null): boolean {
  return isClientOrgAdmin(user);
}

/** Manage a project team member (assign / revoke) — same organization only */
export function canManageProjectTeamMember(
  currentUser: AuthUser | null,
  memberOrganizationId: string,
): boolean {
  if (!currentUser?.isOrgAdmin) return false;
  return currentUser.organization.id === memberOrganizationId;
}

export function canAssignOwnOrgMembers(user: AuthUser | null): boolean {
  return Boolean(user?.isOrgAdmin);
}
