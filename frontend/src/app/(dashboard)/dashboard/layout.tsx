'use client';

import { usePathname } from 'next/navigation';
import { TenantShell } from '@/components/layout/workspace-shells';
import { ProjectShell } from '@/components/layout/project-shell';

export default function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments[1] === 'system') {
    // Super-admin system area handles its own shell.
    return <>{children}</>;
  }

  // Project workspace: /dashboard/projects/<id>/... (but not the list or "new" page)
  const inProject =
    segments[1] === 'projects' &&
    Boolean(segments[2]) &&
    segments[2] !== 'new';

  if (inProject) {
    return <ProjectShell projectId={segments[2]}>{children}</ProjectShell>;
  }

  return <TenantShell>{children}</TenantShell>;
}
