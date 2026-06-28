import type { AuthUser } from '@/stores/auth-store';

export function isQaQcInspector(user: AuthUser | null): boolean {
  if (!user) return false;
  const roleName = `${user.role?.name ?? ''} ${user.role?.nameAr ?? ''}`;
  return /QA|QC|quality|مفتش|جودة/i.test(roleName);
}

/** Field execution role — stripped mobile UI, no admin/financial modules */
export function isFieldEngineer(user: AuthUser | null): boolean {
  if (!user) return false;
  const type = user.organization.type;
  if (type !== 'MAIN_CONTRACTOR' && type !== 'SUB_CONTRACTOR') return false;
  if (user.isOrgAdmin) return false;
  if (isQaQcInspector(user)) return false;

  const roleName = `${user.role?.name ?? ''} ${user.role?.nameAr ?? ''}`;
  if (/viewer|مشاهد/i.test(roleName)) return false;

  return /engineer|مهندس/i.test(roleName) || Boolean(user.isFieldAccount);
}

export function isContractorOrgLeader(user: AuthUser | null): boolean {
  if (!user) return false;
  const type = user.organization.type;
  if (type !== 'MAIN_CONTRACTOR' && type !== 'SUB_CONTRACTOR') return false;
  return user.isOrgAdmin || isQaQcInspector(user);
}

/**
 * Field laboratory technician — labs operate on site (soil compaction, slump
 * tests, etc.), so every laboratory user uses the mobile-first field UI.
 */
export function isFieldLaboratory(user: AuthUser | null): boolean {
  if (!user) return false;
  return user.organization.type === 'LABORATORY';
}

/** Any role driven by the stripped, mobile-first field UI (engineers + lab techs). */
export function isFieldWorker(user: AuthUser | null): boolean {
  return isFieldEngineer(user) || isFieldLaboratory(user);
}
