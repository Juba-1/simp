'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FolderKanban, Loader2, Receipt } from 'lucide-react';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchProjects } from '@/lib/api/projects';
import type { ProjectSummary } from '@/lib/api/projects';
import { useAuthStore } from '@/stores/auth-store';
import { canViewIpcBilling } from '@/lib/auth/permissions';
import { useTranslation } from '@/stores/locale-store';

export function IpcHubPageClient() {
  const { t, locale } = useTranslation();
  const user = useAuthStore((s) => s.user);
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

  if (!canViewIpcBilling(user)) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>{t.ipcHub.restrictedTitle}</CardTitle>
          <CardDescription>{t.ipcHub.restrictedDesc}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl space-y-6"
    >
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
          <Receipt className="size-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t.ipcHub.title}</h1>
        <p className="mt-2 text-muted-foreground">{t.ipcHub.subtitle}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t.forms.noProjects}</CardTitle>
            <CardDescription>{t.projects.emptyHint}</CardDescription>
            <Button asChild className="mx-auto mt-4 w-fit">
              <Link href="/dashboard/projects/new">{t.projects.createProject}</Link>
            </Button>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3">
          {projects.map((project) => {
            const title =
              locale === 'ar' && project.nameAr ? project.nameAr : project.name;
            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}/ipc`}
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
                      {t.ipcHub.viewIpc} →
                    </span>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
