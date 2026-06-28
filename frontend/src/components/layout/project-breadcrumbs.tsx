'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from '@/stores/locale-store';

interface ProjectBreadcrumbsProps {
  projectId: string;
  projectName: string;
  section: string | null;
}

export function ProjectBreadcrumbs({
  projectId,
  projectName,
  section,
}: ProjectBreadcrumbsProps) {
  const { t } = useTranslation();

  const sectionLabel = section ? sectionToLabel(section, t) : null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 border-b bg-muted/30 px-4 py-2.5 text-sm sm:px-6"
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Home className="size-3.5" />
        {t.projectWorkspace.global}
      </Link>
      <ChevronRight className="size-3.5 text-muted-foreground/50 rtl:rotate-180" />
      <Link
        href="/dashboard/projects"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        {t.projectWorkspace.projects}
      </Link>
      <ChevronRight className="size-3.5 text-muted-foreground/50 rtl:rotate-180" />
      <Link
        href={`/dashboard/projects/${projectId}`}
        className={
          sectionLabel
            ? 'text-muted-foreground transition-colors hover:text-foreground'
            : 'font-semibold text-foreground'
        }
      >
        <span className="max-w-[180px] truncate align-bottom">{projectName}</span>
      </Link>
      {sectionLabel && (
        <>
          <ChevronRight className="size-3.5 text-muted-foreground/50 rtl:rotate-180" />
          <span className="font-semibold text-foreground">{sectionLabel}</span>
        </>
      )}
    </nav>
  );
}

function sectionToLabel(
  section: string,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  switch (section) {
    case 'forms':
      return t.projectWorkspace.navForms;
    case 'materials':
      return t.projectWorkspace.navMaterials;
    case 'ipc':
      return t.projectWorkspace.navIpc;
    case 'audit':
      return t.projectWorkspace.navAudit;
    case 'team':
      return t.projectWorkspace.navTeam;
    case 'settings':
      return t.projectWorkspace.navSettings;
    default:
      return t.projectWorkspace.navForms;
  }
}
