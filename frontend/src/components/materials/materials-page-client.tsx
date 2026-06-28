'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { type ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Loader2, Package, TrendingDown } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchProjects } from '@/lib/api/projects';
import type { ProjectSummary } from '@/lib/api/projects';
import { fetchProjectInventory } from '@/lib/api/materials';
import type { MaterialInventoryItem } from '@/lib/api/materials';
import { parseBalance } from '@/lib/api/materials';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

interface InventoryRow extends MaterialInventoryItem {
  projectName: string;
  projectCode: string;
}

export function MaterialsPageClient() {
  const { t, locale } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const { data: projectList } = await fetchProjects(accessToken);
      setProjects(projectList);

      const results = await Promise.all(
        projectList.map(async (project) => {
          try {
            const items = await fetchProjectInventory(accessToken, project.id);
            const name =
              locale === 'ar' && project.nameAr ? project.nameAr : project.name;
            return items.map((item) => ({
              ...item,
              projectName: name,
              projectCode: project.code,
            }));
          } catch {
            return [] as InventoryRow[];
          }
        }),
      );

      setInventory(results.flat());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.materials.loadError);
    } finally {
      setLoading(false);
    }
  }, [accessToken, locale, t.materials.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered =
    projectFilter === 'all'
      ? inventory
      : inventory.filter((row) => row.projectId === projectFilter);

  const stats = useMemo(() => {
    const totalLines = filtered.length;
    const totalBalance = filtered.reduce(
      (sum, row) => sum + parseBalance(row.availableBalance),
      0,
    );
    const lowStock = filtered.filter(
      (row) => parseBalance(row.availableBalance) < 10,
    ).length;
    return { totalLines, totalBalance, lowStock };
  }, [filtered]);

  const columns = useMemo<ColumnDef<InventoryRow>[]>(
    () => [
      {
        accessorKey: 'projectCode',
        header: t.materials.colProject,
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.projectName}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.projectCode}
            </p>
          </div>
        ),
      },
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.materials.ledgerTitle}</h1>
        <p className="text-muted-foreground">{t.materials.ledgerDesc}</p>
      </div>

      {error && <p className="text-destructive">{error}</p>}

      {!loading && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t.materials.totalMaterials}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{stats.totalLines}</CardTitle>
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

      {projects.length > 0 && (
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder={t.materials.filterProject} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.materials.allProjects}</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {locale === 'ar' && p.nameAr ? p.nameAr : p.name} ({p.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Package className="size-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">{t.materials.empty}</p>
            {projects.length === 0 && (
              <Link
                href="/dashboard/projects/new"
                className="text-sm text-primary hover:underline"
              >
                {t.projects.createProject}
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          searchKey="materialCode"
          searchPlaceholder={t.materials.searchMaterial}
        />
      )}
    </motion.div>
  );
}
