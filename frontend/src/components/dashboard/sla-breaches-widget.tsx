'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2, Timer } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchPendingApprovals } from '@/lib/api/users';
import type { PendingApprovalsResult } from '@/lib/api/users';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

type PendingForm = PendingApprovalsResult['data'][number];

export function SlaBreachesWidget() {
  const { t, locale } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [breaches, setBreaches] = useState<PendingForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPendingApprovals(accessToken);
      const slaForms = result.data.filter(
        (f) => f.status === 'SLA_BREACHED' || f.slaBreached,
      );
      setBreaches(slaForms);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.commandCenter.loadError);
    } finally {
      setLoading(false);
    }
  }, [accessToken, t.commandCenter.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  function projectLabel(form: PendingForm) {
    return locale === 'ar' && form.project?.nameAr
      ? form.project.nameAr
      : form.project?.name ?? form.project?.code ?? form.projectId.slice(0, 8);
  }

  return (
    <Card className="border-red-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <Timer className="size-5" />
          {t.commandCenter.slaBreachesWidget}
        </CardTitle>
        <CardDescription>{t.commandCenter.slaBreachesWidgetDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : breaches.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <AlertTriangle className="size-8 opacity-30" />
            <p>{t.commandCenter.slaBreachesEmpty}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {breaches.slice(0, 8).map((form) => (
              <li key={form.id}>
                <Link
                  href={`/dashboard/projects/${form.projectId}/forms/${form.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-red-500/15 bg-red-500/5 px-3 py-2.5 text-sm transition-colors hover:bg-red-500/10"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {form.template.code} ·{' '}
                      <span className="font-mono text-xs text-muted-foreground">
                        {form.referenceNumber ?? form.id.slice(0, 8)}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {projectLabel(form)} · {form.currentPendingOrgType ?? '—'}
                    </p>
                  </div>
                  <Badge variant="destructive">{t.commandCenter.sla}</Badge>
                </Link>
              </li>
            ))}
            {breaches.length > 8 && (
              <p className="pt-1 text-center text-xs text-muted-foreground">
                +{breaches.length - 8} {t.commandCenter.slaBreachesMore}
              </p>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
