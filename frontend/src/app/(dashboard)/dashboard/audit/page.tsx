'use client';

import { AuditLogViewer } from '@/components/audit/audit-log-viewer';
import { useTranslation } from '@/stores/locale-store';

export default function ClientAuditPage() {
  const { t } = useTranslation();
  return (
    <AuditLogViewer
      scope="client"
      title={t.workspaceNav.auditLog}
      description={t.auditLog.clientDesc}
    />
  );
}
