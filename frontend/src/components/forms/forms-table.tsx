'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, AlertTriangle } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FormInstanceRecord } from '@/lib/api/forms';
import { STATUS_COLORS } from '@/lib/forms/workflow-actions';
import { formatFormReferenceLabel } from '@/lib/forms/form-reference';
import { useTranslation } from '@/stores/locale-store';

interface FormsTableProps {
  data: FormInstanceRecord[];
  projectId: string;
}

export function FormsTable({ data, projectId }: FormsTableProps) {
  const { t } = useTranslation();

  const columns = useMemo<ColumnDef<FormInstanceRecord>[]>(
    () => [
      {
        accessorKey: 'referenceNumber',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ms-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {t.commandCenter.colReference}
            <ArrowUpDown className="ms-2 size-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
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
        filterFn: (row, _id, value) =>
          row.original.template.code
            .toLowerCase()
            .includes(String(value).toLowerCase()),
      },
      {
        accessorKey: 'status',
        header: t.commandCenter.colStatus,
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge
              variant="outline"
              className={STATUS_COLORS[status] ?? ''}
            >
              {status.replace(/_/g, ' ')}
            </Badge>
          );
        },
      },
      {
        id: 'flags',
        header: t.commandCenter.colFlags,
        cell: ({ row }) => (
          <div className="flex gap-1">
            {row.original.liabilityShiftRedAlert && (
              <Badge variant="outline" className="border-amber-500 bg-amber-100 text-amber-900">
                <AlertTriangle className="me-1 size-3" />
                {t.commandCenter.redFlag}
              </Badge>
            )}
            {row.original.slaBreached && (
              <Badge variant="destructive">{t.commandCenter.sla}</Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ms-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {t.commandCenter.colUpdated}
            <ArrowUpDown className="ms-2 size-3.5" />
          </Button>
        ),
        cell: ({ row }) =>
          new Date(row.original.updatedAt).toLocaleString(),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <Button asChild variant="outline" size="sm">
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
    <DataTable
      columns={columns}
      data={data}
      searchKey="code"
      searchPlaceholder={t.commandCenter.filterByType}
    />
  );
}
