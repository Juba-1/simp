'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/stores/locale-store';
import { useAuthStore } from '@/stores/auth-store';
import { SyncStatusBadge } from '@/components/layout/sync-status-badge';
import { getNavItemsForOrg, type NavKey } from '@/lib/nav-config';
import { Building2 } from 'lucide-react';

interface AppSidebarProps {
  onNavigate?: () => void;
  className?: string;
}

export function AppSidebar({ onNavigate, className }: AppSidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const orgType = user?.organization.type ?? 'CLIENT';
  const isSuperAdmin = user?.isSuperAdmin ?? false;
  const navItems = getNavItemsForOrg(orgType, isSuperAdmin);

  const labels: Record<NavKey, string> = {
    dashboard: t.nav.dashboard,
    projects: t.nav.projects,
    forms: t.nav.forms,
    sync: t.nav.sync,
    materials: t.nav.materials,
    ipc: t.nav.ipc,
    laboratory: t.nav.laboratory,
    settings: t.nav.settings,
    system: t.nav.system,
  };

  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground',
        className,
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Building2 className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold">{t.common.appName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {t.common.appTagline}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map(({ href, icon: Icon, key }) => {
          const isActive =
            href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{labels[key]}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <SyncStatusBadge />
      </div>
    </aside>
  );
}
