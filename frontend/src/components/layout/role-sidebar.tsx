'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/stores/locale-store';
import { useAuthStore } from '@/stores/auth-store';
import { getNavForWorkspace, getWorkspaceBrand } from '@/lib/nav-profiles';
import type { Workspace } from '@/lib/workspace';

interface RoleSidebarProps {
  workspace: Workspace;
  onNavigate?: () => void;
  className?: string;
}

export function RoleSidebar({ workspace, onNavigate, className }: RoleSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navItems = getNavForWorkspace(workspace, user);
  const brand = getWorkspaceBrand(workspace);

  const labels: Record<string, string> = {
    systemOverview: t.workspaceNav.systemOverview,
    organizations: t.workspaceNav.organizations,
    globalAudit: t.workspaceNav.globalAudit,
    settings: t.workspaceNav.settings,
    dashboard: t.workspaceNav.dashboard,
    projects: t.workspaceNav.projects,
    ipc: t.workspaceNav.ipc,
    auditLog: t.workspaceNav.auditLog,
    approvalQueue: t.workspaceNav.approvalQueue,
    reports: t.workspaceNav.reports,
    myTasks: t.workspaceNav.myTasks,
    myFieldTasks: t.workspaceNav.myFieldTasks,
    newForm: t.workspaceNav.newForm,
    offlineSyncStatus: t.workspaceNav.offlineSyncStatus,
    ipcGenerator: t.workspaceNav.ipcGenerator,
    subContractors: t.workspaceNav.subContractors,
    syncQueue: t.workspaceNav.syncQueue,
    teamManagement: t.workspaceNav.teamManagement,
    internalReview: t.workspaceNav.internalReview,
    laboratoryPortal: t.workspaceNav.laboratoryPortal,
  };

  const brandTitle =
    brand.titleKey === 'brandSuperAdmin'
      ? t.workspaceNav.brandSuperAdmin
      : brand.titleKey === 'brandClient'
        ? t.workspaceNav.brandClient
        : brand.titleKey === 'brandConsultant'
          ? t.workspaceNav.brandConsultant
          : brand.titleKey === 'brandContractor'
            ? t.workspaceNav.brandContractor
            : t.workspaceNav.brandLaboratory;

  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg',
        className,
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border bg-sidebar px-5">
        <div
          className={cn(
            'flex size-10 items-center justify-center rounded-xl text-white shadow-md',
            brand.accentClass,
          )}
        >
          <Building2 className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{brandTitle}</p>
          <p className="truncate text-xs font-medium text-slate-300">
            {t.common.appName}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map(({ href, icon: Icon, labelKey }) => {
          const [path, query] = href.split('?');
          const isActive =
            href === '/dashboard' || href === '/dashboard/system'
              ? pathname === href
              : query
                ? pathname === path && searchParams.get('tab') === new URLSearchParams(query).get('tab')
                : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
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
              <span className="truncate">{labels[labelKey] ?? labelKey}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
