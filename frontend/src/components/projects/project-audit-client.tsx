'use client';

import { AuditLogViewer } from '@/components/audit/audit-log-viewer';
import { useTranslation } from '@/stores/locale-store';

interface ProjectAuditClientProps {
  projectId: string;
}

export function ProjectAuditClient({ projectId }: ProjectAuditClientProps) {
  const { t } = useTranslation();
  return (
    <AuditLogViewer
      scope="project"
      projectId={projectId}
      title={t.projectWorkspace.navAudit}
      description={t.auditLog.projectDesc}
    />
  );
}
