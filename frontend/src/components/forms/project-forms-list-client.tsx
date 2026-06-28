'use client';

import Link from 'next/link';
import { FilePlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { FormsTable } from '@/components/forms/forms-table';
import { Button } from '@/components/ui/button';
import { fetchProjectFormInstances } from '@/lib/api/forms';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

const STALE_MS = 5 * 60_000;

interface ProjectFormsListClientProps {
  projectId: string;
}

export function ProjectFormsListClient({ projectId }: ProjectFormsListClientProps) {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data, isPending, error } = useQuery({
    queryKey: ['projectForms', projectId],
    queryFn: async () => {
      if (!accessToken) throw new Error('Missing token');
      return fetchProjectFormInstances(accessToken, projectId, { limit: 50 });
    },
    enabled: Boolean(accessToken),
    staleTime: STALE_MS,
  });

  const forms = data?.data ?? [];
  const initialLoading = isPending && !data;
  const errorMessage =
    error instanceof ApiError ? error.message : error ? t.commandCenter.loadError : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t.commandCenter.formsManagement}
          </h1>
          <p className="text-muted-foreground">
            {t.commandCenter.formsManagementDesc}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href={`/dashboard/projects/${projectId}`}>
            <FilePlus className="size-4" />
            {t.forms.startForm}
          </Link>
        </Button>
      </div>

      {errorMessage && <p className="text-destructive">{errorMessage}</p>}

      {initialLoading ? null : (
        <FormsTable data={forms} projectId={projectId} />
      )}
    </div>
  );
}
