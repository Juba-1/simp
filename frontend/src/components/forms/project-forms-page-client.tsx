'use client';

import Link from 'next/link';
import { FilePlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchProjectTemplates } from '@/lib/api/forms';
import { ApiError } from '@/lib/api/client';
import { filterInitiatableTemplates } from '@/lib/forms/template-access';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

const STALE_MS = 5 * 60_000;

interface ProjectFormsPageClientProps {
  projectId: string;
}

export function ProjectFormsPageClient({ projectId }: ProjectFormsPageClientProps) {
  const { t, locale } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const { data, isPending, error } = useQuery({
    queryKey: ['projectTemplates', projectId, user?.id],
    queryFn: async () => {
      if (!accessToken) throw new Error('Missing token');
      const templates = await fetchProjectTemplates(accessToken, projectId);
      return filterInitiatableTemplates(
        templates.filter((tpl) => tpl.isActive),
        user,
      );
    },
    enabled: Boolean(accessToken && user),
    staleTime: STALE_MS,
  });

  const templates = data ?? [];
  const initialLoading = isPending && !data;
  const errorMessage =
    error instanceof ApiError ? error.message : error ? t.forms.loadError : null;

  if (initialLoading) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.forms.projectFormsTitle}</h1>
        <p className="text-muted-foreground">{t.forms.projectFormsSubtitle}</p>
      </div>

      {errorMessage && <p className="text-destructive">{errorMessage}</p>}

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t.forms.noTemplates}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => {
            const title =
              locale === 'ar' && tpl.nameAr ? tpl.nameAr : tpl.name;
            return (
              <Card key={tpl.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary">{tpl.code}</Badge>
                    <span className="text-xs text-muted-foreground">v{tpl.version}</span>
                  </div>
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent className="mt-auto">
                  <Button asChild className="w-full gap-2">
                    <Link
                      href={`/dashboard/projects/${projectId}/forms/new?templateId=${tpl.id}`}
                    >
                      <FilePlus className="size-4" />
                      {t.forms.startForm}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
