'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, ClipboardList, Loader2, Timer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchPendingApprovals } from '@/lib/api/users';
import type { PendingApprovalsResult } from '@/lib/api/users';
import { STATUS_COLORS } from '@/lib/forms/workflow-actions';
import { formatFormReferenceLabel } from '@/lib/forms/form-reference';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

type PendingForm = PendingApprovalsResult['data'][number];

const REVIEW_STATUSES = new Set(['PENDING_EXTERNAL_APPROVAL', 'SLA_BREACHED']);

interface ConsultantProjectPanelProps {
  projectId: string;
}

export function ConsultantProjectPanel({ projectId }: ConsultantProjectPanelProps) {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data, isPending, error } = useQuery({
    queryKey: ['projectPendingApprovals', projectId],
    queryFn: async () => {
      if (!accessToken) throw new Error('Missing token');
      return fetchPendingApprovals(accessToken, { projectId, limit: 50 });
    },
    enabled: Boolean(accessToken),
    staleTime: 30_000,
    select: (result) => ({
      ...result,
      data: result.data.filter((f) => REVIEW_STATUSES.has(f.status)),
    }),
  });

  const queue = data?.data ?? [];
  const pendingCount = queue.filter((f) => f.status === 'PENDING_EXTERNAL_APPROVAL').length;
  const slaCount = queue.filter(
    (f) => f.slaBreached || f.status === 'SLA_BREACHED',
  ).length;
  const errorMessage =
    error instanceof ApiError ? error.message : error ? t.commandCenter.loadError : null;

  const columns = useMemo<ColumnDef<PendingForm>[]>(
    () => [
      {
        accessorKey: 'referenceNumber',
        header: t.commandCenter.colReference,
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold">
            {formatFormReferenceLabel(
              row.original.referenceNumber,
              row.original.id,
              row.original.revisionNumber,
            )}
          </span>
        ),
      },
      {
        id: 'code',
        accessorFn: (row) => row.template.code,
        header: t.commandCenter.colType,
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.template.code}</Badge>
        ),
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
        id: 'flags',
        header: t.commandCenter.colFlags,
        cell: ({ row }) => (
          <div className="flex gap-1">
            {row.original.slaBreached && (
              <Badge variant="destructive" className="text-xs">
                {t.commandCenter.sla}
              </Badge>
            )}
            {row.original.liabilityShiftRedAlert && (
              <Badge variant="destructive" className="text-xs">
                {t.commandCenter.redFlag}
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: 'action',
        header: '',
        cell: ({ row }) => (
          <Button asChild size="sm" variant="outline">
            <Link
              href={`/dashboard/projects/${projectId}/forms/${row.original.id}`}
            >
              {t.commandCenter.view}
            </Link>
          </Button>
        ),
      },
    ],
    [projectId, t],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard
          icon={ClipboardList}
          label={t.projectWorkspace.consultantKpiPending}
          value={pendingCount}
          tone="amber"
        />
        <KpiCard
          icon={Timer}
          label={t.projectWorkspace.consultantKpiSla}
          value={slaCount}
          tone="rose"
        />
      </div>

      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <AlertTriangle className="size-5 text-amber-600" />
          {t.projectWorkspace.pendingApprovalsTitle}
        </h2>
        {errorMessage && <p className="mb-3 text-destructive">{errorMessage}</p>}
        {isPending && !data ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : queue.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t.projectWorkspace.pendingApprovalsEmpty}
            </CardContent>
          </Card>
        ) : (
          <DataTable
            columns={columns}
            data={queue}
            searchKey="referenceNumber"
            searchPlaceholder={t.commandCenter.search}
          />
        )}
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: number;
  tone: 'amber' | 'rose';
}) {
  const tones: Record<string, string> = {
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <span
          className={`flex size-8 items-center justify-center rounded-lg ${tones[tone]}`}
        >
          <Icon className="size-4" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
