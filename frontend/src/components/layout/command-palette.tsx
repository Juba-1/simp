'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { fetchProjects } from '@/lib/api/projects';
import type { ProjectSummary } from '@/lib/api/projects';
import { getNavForWorkspace } from '@/lib/nav-profiles';
import { resolveWorkspace } from '@/lib/workspace';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);

  const workspace = resolveWorkspace(user);
  const navItems = workspace ? getNavForWorkspace(workspace) : [];

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
    ipcGenerator: t.workspaceNav.ipcGenerator,
    subContractors: t.workspaceNav.subContractors,
    syncQueue: t.workspaceNav.syncQueue,
    laboratoryPortal: t.workspaceNav.laboratoryPortal,
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const loadProjects = useCallback(async () => {
    if (!accessToken || !open || workspace === 'super_admin' || workspace === 'laboratory') {
      return;
    }
    try {
      const result = await fetchProjects(accessToken);
      setProjects(result.data);
    } catch {
      setProjects([]);
    }
  }, [accessToken, open, workspace]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (workspace === 'laboratory') {
    return null;
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t.commandPalette.placeholder} />
      <CommandList>
        <CommandEmpty>{t.commandPalette.noResults}</CommandEmpty>
        <CommandGroup heading={t.commandPalette.navigation}>
          {navItems.map(({ href, icon: Icon, labelKey }) => (
            <CommandItem key={href} onSelect={() => navigate(href)}>
              <Icon className="size-4" />
              {labels[labelKey] ?? labelKey}
            </CommandItem>
          ))}
        </CommandGroup>
        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t.commandPalette.projects}>
              {projects.map((p) => {
                const title = p.name;
                return (
                  <CommandItem
                    key={p.id}
                    onSelect={() =>
                      navigate(`/dashboard/projects/${p.id}/forms`)
                    }
                  >
                    <Search className="size-4" />
                    {title} ({p.code})
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
