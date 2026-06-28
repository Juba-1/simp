import type { Locale } from '@/lib/i18n/types';

const ACTION_LABELS: Record<string, { en: string; ar: string }> = {
  CREATE: { en: 'Record created', ar: 'إنشاء سجل' },
  UPDATE: { en: 'Record updated', ar: 'تحديث سجل' },
  SOFT_DELETE: { en: 'Record archived', ar: 'أرشفة سجل' },
  PASSWORD_RESET: { en: 'Password reset', ar: 'إعادة ضبط كلمة المرور' },
  PASSWORD_RESET_SUPER_ADMIN: {
    en: 'Password reset (platform admin)',
    ar: 'إعادة ضبط كلمة المرور (مسؤول المنصة)',
  },
  PLATFORM_CREATE: { en: 'Organization provisioned', ar: 'توفير مؤسسة جديدة' },
  VENDOR_ONBOARD: { en: 'New vendor onboarded', ar: 'تعيين مورد جديد' },
  SUB_CONTRACTOR_PROVISION: {
    en: 'Sub-contractor provisioned',
    ar: 'تعيين مقاول باطن جديد',
  },
  SUB_CONTRACTOR_LINKED: {
    en: 'Sub-contractor linked to project',
    ar: 'ربط مقاول باطن بالمشروع',
  },
  ORG_SUSPEND: { en: 'Organization suspended', ar: 'تعليق المؤسسة' },
  ORG_DELETE: { en: 'Organization deleted', ar: 'حذف المؤسسة' },
  PROJECT_ACCESS_GRANT: { en: 'Project access granted', ar: 'منح صلاحية مشروع' },
  PROJECT_ACCESS_REVOKE: { en: 'Project access revoked', ar: 'إلغاء صلاحية مشروع' },
  PROJECT_ACCESS_SET: { en: 'Project access updated', ar: 'تحديث صلاحيات المشاريع' },
  WORKFLOW_SUBMIT: { en: 'Form submitted', ar: 'إرسال نموذج' },
  RESUBMITTED: { en: 'Form resubmitted (revision)', ar: 'إعادة إرسال نموذج (مراجعة)' },
  WORKFLOW_RESUBMIT: { en: 'Revision resubmitted', ar: 'إرسال مراجعة' },
  WORKFLOW_APPROVE_INTERNAL: {
    en: 'Internal approval',
    ar: 'اعتماد داخلي (ضبط الجودة)',
  },
  WORKFLOW_REJECT_INTERNAL: { en: 'Internal rejection', ar: 'رفض داخلي' },
  WORKFLOW_APPROVE_EXTERNAL: { en: 'External approval', ar: 'اعتماد خارجي' },
  WORKFLOW_REJECT_EXTERNAL: { en: 'External rejection', ar: 'رفض خارجي' },
  SYNC_CONFLICT_SKIPPED: { en: 'Sync conflict skipped', ar: 'تجاهل تعارض مزامنة' },
  SYNC_CONFLICT_OVERWRITE: { en: 'Sync conflict overwritten', ar: 'استبدال تعارض مزامنة' },
};

const ENTITY_LABELS: Record<string, { en: string; ar: string }> = {
  Organization: { en: 'Organization', ar: 'مؤسسة' },
  User: { en: 'User', ar: 'مستخدم' },
  Project: { en: 'Project', ar: 'مشروع' },
  ProjectUser: { en: 'Project assignment', ar: 'تعيين مشروع' },
  FormInstance: { en: 'Form', ar: 'نموذج' },
  FormTemplate: { en: 'Form template', ar: 'قالب نموذج' },
  MaterialInventory: { en: 'Material inventory', ar: 'مخزون مواد' },
  MaterialLedgerEntry: { en: 'Material ledger', ar: 'حركة مواد' },
  InterimPaymentCertificate: { en: 'IPC / Invoice', ar: 'شهادة دفع / فاتورة' },
  LabTestRequest: { en: 'Lab test request', ar: 'طلب فحص مختبر' },
  LabTestResult: { en: 'Lab test result', ar: 'نتيجة فحص مختبر' },
  FileAttachment: { en: 'Attachment', ar: 'مرفق' },
  SyncBatch: { en: 'Sync batch', ar: 'دفعة مزامنة' },
  SyncAction: { en: 'Sync action', ar: 'إجراء مزامنة' },
  SlaEscalation: { en: 'SLA escalation', ar: 'تصعيد SLA' },
};

const SOURCE_LABELS: Record<string, { en: string; ar: string }> = {
  API: { en: 'API', ar: 'واجهة النظام' },
  SYNC: { en: 'Field sync', ar: 'مزامنة ميدانية' },
  APPROVAL: { en: 'Approval workflow', ar: 'سير اعتماد' },
  SYSTEM: { en: 'System', ar: 'النظام' },
};

export function formatAuditAction(action: string, locale: Locale): string {
  return ACTION_LABELS[action]?.[locale] ?? action.replace(/_/g, ' ');
}

export function formatAuditEntityType(entityType: string, locale: Locale): string {
  return ENTITY_LABELS[entityType]?.[locale] ?? entityType;
}

export function formatAuditSource(source: string, locale: Locale): string {
  return SOURCE_LABELS[source]?.[locale] ?? source;
}

/** Best-effort human label from audit payload metadata */
export function formatAuditEntityName(
  log: {
    entityType: string;
    entityId: string;
    newData?: unknown;
    previousData?: unknown;
  },
  locale: Locale,
): string {
  const data = (log.newData ?? log.previousData) as Record<string, unknown> | null;
  if (data && typeof data === 'object') {
    const name =
      (typeof data.name === 'string' && data.name) ||
      (typeof data.referenceNumber === 'string' && data.referenceNumber) ||
      (typeof data.adminUsername === 'string' && `@${data.adminUsername}`) ||
      (typeof data.username === 'string' && `@${data.username}`) ||
      null;
    if (name) return name;
  }

  const typeLabel = formatAuditEntityType(log.entityType, locale);
  return `${typeLabel} · ${log.entityId.slice(0, 8)}`;
}
