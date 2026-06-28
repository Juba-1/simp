'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { FolderX } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/layout/app-header';
import { ProjectSidebar } from '@/components/layout/project-sidebar';
import { ProjectBreadcrumbs } from '@/components/layout/project-breadcrumbs';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';
import { resolveWorkspace } from '@/lib/workspace';
import { fetchProject, fetchProjects } from '@/lib/api/projects';

const STALE_MS = 5 * 60_000;

interface ProjectShellProps {
  projectId: string;
  children: React.ReactNode;
}

export function ProjectShell({ projectId, children }: ProjectShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const workspace = resolveWorkspace(user);

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!accessToken) throw new Error('Missing token');
      return fetchProject(accessToken, projectId);
    },
    enabled: Boolean(hydrated && accessToken && !user?.isSuperAdmin),
    staleTime: STALE_MS,
  });

  const projectsQuery = useQuery({
    queryKey: ['projects', 1, 100],
    queryFn: async () => {
      if (!accessToken) throw new Error('Missing token');
      return fetchProjects(accessToken, 1, 100);
    },
    enabled: Boolean(hydrated && accessToken && !user?.isSuperAdmin),
    staleTime: STALE_MS,
  });

  const project = projectQuery.data ?? null;
  const projects = projectsQuery.data?.data ?? [];
  const loading = projectQuery.isPending && !project;
  const notFound = projectQuery.isError;

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    if (user?.isSuperAdmin) {
      router.replace('/dashboard/system');
    }
  }, [hydrated, isAuthenticated, user, router]);

  if (!hydrated || !workspace || user?.isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <FolderX className="size-8" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold">{t.projectWorkspace.notFound}</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            {t.projectWorkspace.notFoundBody}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/projects">{t.projectWorkspace.allProjects}</Link>
        </Button>
      </div>
    );
  }

  const segments = pathname.split('/').filter(Boolean);
  const section = segments[3] ?? null;
  const projectName =
    locale === 'ar' && project.nameAr ? project.nameAr : project.name;

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <ProjectSidebar
          workspace={workspace}
          isOrgAdmin={Boolean(user?.isOrgAdmin)}
          project={project}
          projects={projects}
          className="fixed inset-y-0 inset-s-0 z-40"
        />
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <ProjectSidebar
            workspace={workspace}
            isOrgAdmin={Boolean(user?.isOrgAdmin)}
            project={project}
            projects={projects}
            onNavigate={() => setMobileOpen(false)}
            className="w-full border-0"
          />
        </SheetContent>
      </Sheet>
      <div className="flex min-h-screen flex-1 flex-col lg:ps-64">
        <AppHeader onMenuClick={() => setMobileOpen(true)} variant={workspace} />
        <ProjectBreadcrumbs
          projectId={project.id}
          projectName={projectName}
          section={section}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
