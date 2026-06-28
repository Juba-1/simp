'use client';

import { AuditLogViewer } from '@/components/audit/audit-log-viewer';
import { useTranslation } from '@/stores/locale-store';

export default function SystemAuditPage() {
  const { t } = useTranslation();
  return (
    <AuditLogViewer
      scope="global"
      title={t.workspaceNav.globalAudit}
      description={t.auditLog.globalDesc}
    />
  );
}
