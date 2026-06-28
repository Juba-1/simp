import type { AuthUser } from '@/stores/auth-store';

/** Forms a Consultant may originate (governance / inspection) */
const CONSULTANT_INITIATE = new Set(['NCR', 'SOR', 'CVI', 'DPR']);

/** Forms a field Laboratory technician may originate (on-site test reports) */
const LABORATORY_INITIATE = new Set(['LTR']);

/** Forms Contractors / Sub-contractors / Field Engineers may originate */
const CONTRACTOR_INITIATE = new Set([
  'WIR',
  'MIR',
  'MAR',
  'MDR',
  'RFI',
  'VO',
  'PTW',
  'NCR',
  'IR',
  'SDS',
  'MSS',
  'DPR',
  'AS_BUILT',
]);

/** Client org admins may initiate any seeded standard form */
const CLIENT_INITIATE = new Set([
  'WIR',
  'MIR',
  'MAR',
  'MDR',
  'RFI',
  'VO',
  'PTW',
  'NCR',
  'CVI',
  'IR',
  'LTR',
  'SDS',
  'MSS',
  'AS_BUILT',
]);

export function canInitiateFormCode(
  user: AuthUser | null,
  templateCode: string,
): boolean {
  if (!user) return false;

  switch (user.organization.type) {
    case 'CONSULTANT':
      return CONSULTANT_INITIATE.has(templateCode);
    case 'MAIN_CONTRACTOR':
    case 'SUB_CONTRACTOR':
      return CONTRACTOR_INITIATE.has(templateCode);
    case 'LABORATORY':
      return LABORATORY_INITIATE.has(templateCode);
    case 'CLIENT':
      return user.isOrgAdmin ? CLIENT_INITIATE.has(templateCode) : false;
    default:
      return false;
  }
}

export function filterInitiatableTemplates<T extends { code: string }>(
  templates: T[],
  user: AuthUser | null,
): T[] {
  return templates.filter((tpl) => canInitiateFormCode(user, tpl.code));
}
