'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, FolderKanban, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchProjects } from '@/lib/api/projects';
import type { ProjectSummary } from '@/lib/api/projects';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

export function FormsHubPageClient() {
  const { t, locale } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const result = await fetchProjects(accessToken);
      setProjects(result.data);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FileText className="size-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t.forms.selectProjectFirst}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t.forms.selectProjectDesc}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="mb-4 text-muted-foreground">{t.forms.noProjects}</p>
            <Button asChild>
              <Link href="/dashboard/projects">{t.projects.backToProjects}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {projects.map((project) => {
            const title =
              locale === 'ar' && project.nameAr ? project.nameAr : project.name;
            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}/forms`}
              >
                <Card className="transition-colors hover:border-primary/40 hover:bg-muted/30">
                  <CardHeader className="flex flex-row items-center gap-3 py-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                      <FolderKanban className="size-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">{title}</CardTitle>
                      <CardDescription>{project.code}</CardDescription>
                    </div>
                    <span className="text-sm text-primary">
                      {t.commandCenter.viewAllForms} →
                    </span>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <div className="text-center">
        <Button asChild variant="link">
          <Link href="/dashboard/projects">{t.projects.browseProjects}</Link>
        </Button>
      </div>
    </div>
  );
}
