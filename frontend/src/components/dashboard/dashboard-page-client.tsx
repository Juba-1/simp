'use client';

import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  DollarSign,
  FileWarning,
  Loader2,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SlaBreachesWidget } from '@/components/dashboard/sla-breaches-widget';
import { ContractorRejectionWidget } from '@/components/dashboard/contractor-rejection-widget';
import { fetchPortfolioDashboard } from '@/lib/api/analytics';
import type { PortfolioDashboardKpis } from '@/lib/api/analytics';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';
import { getDefaultHomePath, resolveWorkspace } from '@/lib/workspace';

function formatCurrency(value: string) {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(num);
}

export function DashboardPageClient() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const workspace = resolveWorkspace(user);

  useEffect(() => {
    if (!workspace) return;
    if (workspace === 'super_admin') {
      router.replace('/dashboard/system');
      return;
    }
    if (workspace !== 'client') {
      router.replace(getDefaultHomePath(workspace));
    }
  }, [workspace, router]);

  if (!workspace || workspace === 'super_admin' || workspace !== 'client') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <ClientDashboard />;
}

function ClientDashboard() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [data, setData] = useState<PortfolioDashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPortfolioDashboard(accessToken);
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.commandCenter.loadError);
    } finally {
      setLoading(false);
    }
  }, [accessToken, t.commandCenter.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = data?.totals;

  const chartData =
    data?.projects.map((p) => ({
      id: p.projectId.slice(0, 8),
      billed: parseFloat(p.totalBilled) || 0,
      ncrs: p.openNcrCount,
      wirs: p.pendingWirCount,
    })) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t.dashboard.welcome}, {user?.firstName}
          </h1>
          <p className="mt-1 text-muted-foreground">{t.roleDashboard.clientSubtitle}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/ipc">{t.workspaceNav.ipc}</Link>
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-8 w-16" />
              </CardHeader>
            </Card>
          ))
        ) : (
          <>
            <KpiCard
              label={t.commandCenter.kpiTotalBilled}
              value={formatCurrency(kpis?.totalBilled ?? '0')}
              icon={DollarSign}
            />
            <KpiCard
              label={t.commandCenter.kpiOpenNcrs}
              value={String(kpis?.openNcrs ?? 0)}
              icon={FileWarning}
              variant="warning"
            />
            <KpiCard
              label={t.commandCenter.kpiSlaBreaches}
              value={String(kpis?.slaBreaches ?? 0)}
              icon={Timer}
              variant="danger"
            />
            <KpiCard
              label={t.commandCenter.kpiRedAlerts}
              value={String(kpis?.liabilityRedAlerts ?? 0)}
              icon={AlertTriangle}
              variant="danger"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5" />
              {t.commandCenter.portfolioChart}
            </CardTitle>
            <CardDescription>{t.commandCenter.portfolioChartDesc}</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : chartData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <p>{t.commandCenter.noProjects}</p>
                <Button asChild size="sm">
                  <Link href="/dashboard/projects/new">{t.projects.createProject}</Link>
                </Button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="id" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid hsl(var(--border))',
                    }}
                  />
                  <Bar
                    dataKey="billed"
                    name={t.commandCenter.kpiTotalBilled}
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.commandCenter.projectSnapshot}</CardTitle>
            <CardDescription>
              {data?.projectCount ?? 0} {t.commandCenter.activeProjects}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              data?.projects.slice(0, 6).map((p) => (
                <Link
                  key={p.projectId}
                  href={`/dashboard/projects/${p.projectId}/forms`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {p.projectId.slice(0, 8)}…
                  </span>
                  <span className="text-muted-foreground">
                    {p.pendingWirCount} WIR · {p.openNcrCount} NCR
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SlaBreachesWidget />
        <ContractorRejectionWidget
          contractors={data?.contractorRejectionRates ?? []}
          loading={loading}
        />
      </div>
    </motion.div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  variant,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'warning' | 'danger';
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription>{label}</CardDescription>
        <Icon
          className={`size-4 ${
            variant === 'danger'
              ? 'text-red-500'
              : variant === 'warning'
                ? 'text-amber-500'
                : 'text-muted-foreground'
          }`}
        />
      </CardHeader>
      <CardContent>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardContent>
    </Card>
  );
}
