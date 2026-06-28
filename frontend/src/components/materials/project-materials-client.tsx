'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Loader2, Package, ScrollText, TrendingDown } from 'lucide-react';
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
import { fetchProjectInventory, parseBalance } from '@/lib/api/materials';
import type { MaterialInventoryItem } from '@/lib/api/materials';
import { MaterialLedgerDialog } from '@/components/materials/material-ledger-dialog';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

interface ProjectMaterialsClientProps {
  projectId: string;
}

export function ProjectMaterialsClient({ projectId }: ProjectMaterialsClientProps) {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [inventory, setInventory] = useState<MaterialInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ledgerItem, setLedgerItem] = useState<MaterialInventoryItem | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const items = await fetchProjectInventory(accessToken, projectId);
      setInventory(items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.materials.loadError);
    } finally {
      setLoading(false);
    }
  }, [accessToken, projectId, t.materials.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const totalLines = inventory.length;
    const totalBalance = inventory.reduce(
      (sum, row) => sum + parseBalance(row.availableBalance),
      0,
    );
    const lowStock = inventory.filter(
      (row) => parseBalance(row.availableBalance) < 10,
    ).length;
    return { totalLines, totalBalance, lowStock };
  }, [inventory]);

  const columns = useMemo<ColumnDef<MaterialInventoryItem>[]>(
    () => [
      {
        accessorKey: 'materialCode',
        header: t.materials.colMaterial,
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.materialName}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {row.original.materialCode}
            </p>
          </div>
        ),
      },
      {
        id: 'mir',
        header: t.materials.colMir,
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.mirForm.referenceNumber ??
              row.original.mirFormInstanceId.slice(0, 8)}
          </span>
        ),
      },
      {
        accessorKey: 'availableBalance',
        header: t.materials.colBalance,
        cell: ({ row }) => {
          const balance = parseBalance(row.original.availableBalance);
          const isLow = balance < 10;
          return (
            <span
              className={`font-semibold tabular-nums ${
                isLow
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {balance} {row.original.unit}
            </span>
          );
        },
      },
      {
        id: 'status',
        header: t.commandCenter.colStatus,
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.mirForm.status}</Badge>
        ),
      },
      {
        id: 'ledger',
        header: '',
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              setLedgerItem(row.original);
            }}
          >
            <ScrollText className="size-3.5" />
            {t.materials.viewLedger}
          </Button>
        ),
      },
    ],
    [t],
  );

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.materials.ledgerTitle}</h1>
        <p className="text-muted-foreground">{t.materials.ledgerDesc}</p>
      </div>

      {error && <p className="text-destructive">{error}</p>}

      {inventory.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t.materials.totalMaterials}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {stats.totalLines}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <TrendingDown className="size-3" />
                {t.materials.totalBalance}
              </CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {stats.totalBalance.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className={stats.lowStock > 0 ? 'border-amber-500/40' : undefined}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <AlertTriangle className="size-3" />
                {t.materials.lowStock}
              </CardDescription>
              <CardTitle className="text-3xl tabular-nums text-amber-600">
                {stats.lowStock}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {inventory.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Package className="size-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">{t.materials.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={inventory}
          searchKey="materialCode"
          searchPlaceholder={t.materials.searchMaterial}
          onRowClick={(row) => setLedgerItem(row)}
        />
      )}

      <MaterialLedgerDialog
        projectId={projectId}
        item={ledgerItem}
        open={ledgerItem !== null}
        onOpenChange={(open) => !open && setLedgerItem(null)}
      />
    </div>
  );
}
