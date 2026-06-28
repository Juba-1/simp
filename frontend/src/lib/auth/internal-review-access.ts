import type { AuthUser } from '@/stores/auth-store';

/** Main Contractor org admins and QA/QC inspectors may access internal review queue */
export function canAccessInternalReview(user: AuthUser | null): boolean {
  if (!user) return false;
  if (user.organization.type !== 'MAIN_CONTRACTOR') return false;
  if (user.isOrgAdmin) return true;

  const roleName = user.role?.name ?? '';
  const roleNameAr = user.role?.nameAr ?? '';
  const qaPattern = /QA|QC|quality|مفتش|جودة/i;

  return qaPattern.test(roleName) || qaPattern.test(roleNameAr);
}
