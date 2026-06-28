'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  Boxes,
  FileText,
  LayoutDashboard,
  Receipt,
  ScrollText,
  Settings,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/stores/locale-store';
import { useAuthStore } from '@/stores/auth-store';
import { isFieldWorker } from '@/lib/auth/field-engineer';
import { canViewIpcBilling } from '@/lib/auth/permissions';
import type { Workspace } from '@/lib/workspace';
import type { ProjectDetail, ProjectSummary } from '@/lib/api/projects';
import { ProjectSwitcher } from './project-switcher';

interface ProjectSidebarProps {
  workspace: Workspace;
  isOrgAdmin: boolean;
  project: ProjectDetail;
  projects: ProjectSummary[];
  onNavigate?: () => void;
  className?: string;
}

export function ProjectSidebar({
  workspace,
  isOrgAdmin,
  project,
  projects,
  onNavigate,
  className,
}: ProjectSidebarProps) {
  const pathname = usePathname();
  const { t, locale } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const fieldEngineer = isFieldWorker(user);
  const showIpc = canViewIpcBilling(user) && !fieldEngineer;
  const base = `/dashboard/projects/${project.id}`;
  const projectName = locale === 'ar' && project.nameAr ? project.nameAr : project.name;

  const items = [
    {
      key: 'navOverview',
      href: base,
      icon: LayoutDashboard,
      show: !fieldEngineer,
      exact: true,
    },
    { key: 'navForms', href: `${base}/forms`, icon: FileText, show: true },
    {
      key: 'navMaterials',
      href: `${base}/materials`,
      icon: Boxes,
      show: !fieldEngineer && workspace !== 'laboratory',
    },
    {
      key: 'navIpc',
      href: `${base}/ipc`,
      icon: Receipt,
      show: showIpc && workspace !== 'laboratory',
    },
    {
      key: 'navAudit',
      href: `${base}/audit`,
      icon: ScrollText,
      show: !fieldEngineer,
    },
    {
      key: 'navTeam',
      href: `${base}/team`,
      icon: Users,
      show: isOrgAdmin && !fieldEngineer,
    },
    {
      key: 'navSettings',
      href: `${base}/settings`,
      icon: Settings,
      show: workspace === 'client' && isOrgAdmin && !fieldEngineer,
    },
  ] as const;

  const labels: Record<string, string> = {
    navOverview: t.projectWorkspace.navOverview,
    navForms: t.projectWorkspace.navForms,
    navMaterials: t.projectWorkspace.navMaterials,
    navIpc: t.projectWorkspace.navIpc,
    navAudit: t.projectWorkspace.navAudit,
    navTeam: t.projectWorkspace.navTeam,
    navSettings: t.projectWorkspace.navSettings,
  };

  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg',
        className,
      )}
    >
      <div className="flex h-16 items-center border-b border-sidebar-border px-3">
        <ProjectSwitcher
          projects={projects}
          currentProjectId={project.id}
          currentName={projectName}
        />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items
          .filter((i) => i.show)
          .map((item) => {
            const { key, href, icon: Icon } = item;
            const exact = 'exact' in item ? item.exact : false;
            const isActive = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={key}
                href={href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-lg border-s-4 px-3 py-3 text-sm font-semibold transition-all',
                  isActive
                    ? 'border-indigo-400 bg-indigo-600/25 text-white shadow-sm'
                    : 'border-transparent text-slate-300 hover:bg-sidebar-accent hover:text-white',
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span className="truncate">{labels[key] ?? key}</span>
              </Link>
            );
          })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href={fieldEngineer ? '/dashboard/tasks' : '/dashboard/projects'}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg border-s-4 border-transparent px-3 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-sidebar-accent hover:text-white"
        >
          <ArrowLeft className="size-5 shrink-0 rtl:rotate-180" />
          <span className="truncate">{t.projectWorkspace.backToGlobal}</span>
        </Link>
      </div>
    </aside>
  );
}
