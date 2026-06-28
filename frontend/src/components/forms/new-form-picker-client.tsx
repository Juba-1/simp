'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FilePlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchProjectTemplates } from '@/lib/api/forms';
import { fetchProjects } from '@/lib/api/projects';
import type { ProjectSummary } from '@/lib/api/projects';
import { filterInitiatableTemplates } from '@/lib/forms/template-access';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

export function NewFormPickerClient() {
  const { t, locale } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [templates, setTemplates] = useState<
    Awaited<ReturnType<typeof fetchProjectTemplates>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const result = await fetchProjects(accessToken, 1, 50);
      setProjects(result.data);
      if (result.data[0]) {
        setSelectedProjectId((prev) => prev || result.data[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!accessToken || !selectedProjectId || !user) {
      setTemplates([]);
      return;
    }
    setLoadingTemplates(true);
    void fetchProjectTemplates(accessToken, selectedProjectId)
      .then((data) =>
        setTemplates(
          filterInitiatableTemplates(
            data.filter((tpl) => tpl.isActive),
            user,
          ),
        ),
      )
      .finally(() => setLoadingTemplates(false));
  }, [accessToken, selectedProjectId, user]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        {t.common.loading}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.fieldEngineer.newFormTitle}</h1>
        <p className="text-muted-foreground">{t.fieldEngineer.newFormSubtitle}</p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t.forms.noProjects}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {projects.map((project) => {
              const name =
                locale === 'ar' && project.nameAr ? project.nameAr : project.name;
              const active = project.id === selectedProjectId;
              return (
                <Button
                  key={project.id}
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  {name}
                </Button>
              );
            })}
          </div>

          {loadingTemplates ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t.fieldEngineer.noAuthorizedTemplates}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {templates.map((tpl) => {
                const title =
                  locale === 'ar' && tpl.nameAr ? tpl.nameAr : tpl.name;
                return (
                  <Card key={tpl.id}>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 py-4">
                      <div>
                        <Badge variant="secondary" className="mb-1">
                          {tpl.code}
                        </Badge>
                        <CardTitle className="text-base">{title}</CardTitle>
                      </div>
                      <Button asChild className="gap-1.5 shrink-0">
                        <Link
                          href={`/dashboard/projects/${selectedProjectId}/forms/new?templateId=${tpl.id}`}
                        >
                          <FilePlus className="size-4" />
                          {t.forms.startForm}
                        </Link>
                      </Button>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
