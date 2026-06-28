'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { FlaskConical, Loader2 } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  fetchPendingLabRequests,
  type PendingLabTestRequest,
} from '@/lib/api/laboratory';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-sky-500/15 text-sky-700',
  IN_PROGRESS: 'bg-blue-500/15 text-blue-700',
};

export function LaboratoryPageClient() {
  const { t, locale } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [requests, setRequests] = useState<PendingLabTestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPendingLabRequests(accessToken);
      setRequests(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.laboratory.loadError);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, t.laboratory.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo<ColumnDef<PendingLabTestRequest>[]>(
    () => [
      {
        id: 'ltrId',
        header: t.laboratory.ltrId,
        accessorFn: (row) => row.ltrId,
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold">{row.original.ltrId}</span>
        ),
      },
      {
        id: 'project',
        header: t.internalReviewPage.colProject,
        cell: ({ row }) => (
          <span className="font-medium">
            {locale === 'ar' && row.original.project.nameAr
              ? row.original.project.nameAr
              : row.original.project.name}
          </span>
        ),
      },
      {
        id: 'category',
        header: t.laboratory.sampleCategory,
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.formInstance.template.code}</Badge>
        ),
      },
      {
        accessorKey: 'testType',
        header: t.laboratory.testType,
      },
      {
        accessorKey: 'status',
        header: t.commandCenter.colStatus,
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={STATUS_COLORS[row.original.status] ?? ''}
          >
            {row.original.status.replace(/_/g, ' ')}
          </Badge>
        ),
      },
      {
        id: 'requested',
        header: t.laboratory.requestedAt,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {new Date(row.original.createdAt).toLocaleString()}
          </span>
        ),
      },
      {
        id: 'action',
        header: '',
        cell: ({ row }) => (
          <Button asChild size="sm" variant="outline">
            <Link href={`/dashboard/laboratory/requests/${row.original.id}`}>
              {t.laboratory.openLtrForm}
            </Link>
          </Button>
        ),
      },
    ],
    [locale, t],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FlaskConical className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.laboratory.title}</h1>
          <p className="text-muted-foreground">{t.laboratory.subtitle}</p>
        </div>
      </div>

      {error && <p className="text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.laboratory.pendingTitle}</CardTitle>
          <CardDescription>{t.laboratory.pendingDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              {t.laboratory.pendingEmpty}
            </p>
          ) : (
            <DataTable
              columns={columns}
              data={requests}
              searchKey="ltrId"
              searchPlaceholder={t.laboratory.searchLtrId}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
