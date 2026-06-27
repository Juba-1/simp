export const DEFAULT_ORG_ROLES = [
  {
    name: 'Org Admin',
    nameAr: 'مدير المؤسسة',
    permissions: ['*'],
    isSystem: true,
  },
  {
    name: 'Engineer',
    nameAr: 'مهندس',
    permissions: ['forms:write', 'forms:read', 'uploads:write'],
    isSystem: true,
  },
  {
    name: 'QA/QC Inspector',
    nameAr: 'مفتش ضبط الجودة',
    permissions: ['forms:write', 'forms:read', 'workflows:approve'],
    isSystem: true,
  },
  {
    name: 'Viewer',
    nameAr: 'مشاهد',
    permissions: ['forms:read'],
    isSystem: true,
  },
] as const;
