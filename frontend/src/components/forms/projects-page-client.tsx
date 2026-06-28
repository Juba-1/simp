'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderKanban, Loader2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetchProjects } from '@/lib/api/projects';
import type { ProjectSummary } from '@/lib/api/projects';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

export function ProjectsPageClient() {
  const { t, locale } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canCreate =
    user?.organization.type === 'CLIENT' && user.isOrgAdmin;

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchProjects(accessToken);
      setProjects(result.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.forms.loadError);
    } finally {
      setLoading(false);
    }
  }, [accessToken, t.forms.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        {t.common.loading}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.nav.projects}</h1>
          <p className="text-muted-foreground">{t.forms.projectsSubtitle}</p>
        </div>
        {canCreate && (
          <Button asChild className="gap-2">
            <Link href="/dashboard/projects/new">
              <Plus className="size-4" />
              {t.projects.createProject}
            </Link>
          </Button>
        )}
      </div>

      {error && <p className="text-destructive">{error}</p>}

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <FolderKanban className="size-12 text-muted-foreground/50" />
            <div className="max-w-md">
              <p className="font-medium">
                {user?.isOrgAdmin
                  ? t.forms.noProjects
                  : t.projectWorkspace.noAssignedTitle}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {canCreate
                  ? t.projects.emptyHint
                  : user?.isOrgAdmin
                    ? t.forms.noProjects
                    : t.projectWorkspace.noAssignedBody}
              </p>
            </div>
            {canCreate && (
              <Button asChild>
                <Link href="/dashboard/projects/new">
                  <Plus className="me-2 size-4" />
                  {t.projects.createProject}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const title =
              locale === 'ar' && project.nameAr ? project.nameAr : project.name;
            return (
              <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/30">
                  <CardHeader className="flex flex-row items-start gap-3 pb-2">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FolderKanban className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">{title}</CardTitle>
                      <p className="text-xs text-muted-foreground">{project.code}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="outline">{project.status}</Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
