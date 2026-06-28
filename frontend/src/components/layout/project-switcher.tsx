'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, FolderKanban, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/stores/locale-store';
import type { ProjectSummary } from '@/lib/api/projects';

interface ProjectSwitcherProps {
  projects: ProjectSummary[];
  currentProjectId: string;
  currentName: string;
}

export function ProjectSwitcher({
  projects,
  currentProjectId,
  currentName,
}: ProjectSwitcherProps) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'p' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 max-w-[220px] justify-between gap-2"
      >
        <span className="flex min-w-0 items-center gap-2">
          <FolderKanban className="size-4 shrink-0 text-primary" />
          <span className="truncate font-medium">{currentName}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t.projectWorkspace.searchProjects} />
        <CommandList>
          <CommandEmpty>{t.projectWorkspace.noProjects}</CommandEmpty>
          <CommandGroup heading={t.projectWorkspace.switchProject}>
            {projects.map((p) => {
              const name = locale === 'ar' && p.nameAr ? p.nameAr : p.name;
              const active = p.id === currentProjectId;
              return (
                <CommandItem
                  key={p.id}
                  value={`${name} ${p.code}`}
                  onSelect={() => go(`/dashboard/projects/${p.id}`)}
                >
                  <FolderKanban className="size-4" />
                  <span className="truncate">{name}</span>
                  <span className="ms-2 font-mono text-xs text-muted-foreground">
                    {p.code}
                  </span>
                  <Check
                    className={cn(
                      'ms-auto size-4',
                      active ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup>
            <CommandItem
              value="all-projects-global"
              onSelect={() => go('/dashboard/projects')}
            >
              <LayoutGrid className="size-4" />
              {t.projectWorkspace.allProjects}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
