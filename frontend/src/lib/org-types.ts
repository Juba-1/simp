export type OrganizationType =
  | 'CLIENT'
  | 'CONSULTANT'
  | 'MAIN_CONTRACTOR'
  | 'LABORATORY'
  | 'SUB_CONTRACTOR';

export function isOrganizationType(value: string): value is OrganizationType {
  return [
    'CLIENT',
    'CONSULTANT',
    'MAIN_CONTRACTOR',
    'LABORATORY',
    'SUB_CONTRACTOR',
  ].includes(value);
}

export function orgTypeLabel(
  type: OrganizationType,
  locale: 'en' | 'ar',
): string {
  const labels: Record<OrganizationType, { en: string; ar: string }> = {
    CLIENT: { en: 'Client (Owner)', ar: 'العميل / المالك' },
    CONSULTANT: { en: 'Consultant', ar: 'استشاري' },
    MAIN_CONTRACTOR: { en: 'Main Contractor', ar: 'المقاول الرئيسي' },
    LABORATORY: { en: 'Laboratory', ar: 'المختبر' },
    SUB_CONTRACTOR: { en: 'Sub-contractor', ar: 'مقاول باطن' },
  };
  return labels[type]?.[locale] ?? type;
}
