'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  FlaskConical,
  Loader2,
  Timer,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchPendingApprovals } from '@/lib/api/users';
import type { PendingApprovalsResult } from '@/lib/api/users';
import { fetchPortfolioDashboard } from '@/lib/api/analytics';
import type { PortfolioDashboardKpis } from '@/lib/api/analytics';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

interface KpiKV {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'success' | 'warning' | 'danger' | 'default';
}

function KpiCard({ label, value, icon: Icon, variant }: KpiKV) {
  const colorMap = {
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    danger: 'text-red-500',
    default: 'text-muted-foreground',
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription>{label}</CardDescription>
        <Icon className={`size-4 ${colorMap[variant ?? 'default']}`} />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function ConsultantReportsPage() {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [portfolio, setPortfolio] = useState<PortfolioDashboardKpis | null>(null);
  const [approvals, setApprovals] = useState<PendingApprovalsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [p, a] = await Promise.allSettled([
        fetchPortfolioDashboard(accessToken),
        fetchPendingApprovals(accessToken),
      ]);
      if (p.status === 'fulfilled') setPortfolio(p.value);
      if (a.status === 'fulfilled') setApprovals(a.value);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.commandCenter.loadError);
    } finally {
      setLoading(false);
    }
  }, [accessToken, t.commandCenter.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = approvals?.data ?? [];
  const slaBreaches = pending.filter(
    (f) => f.status === 'SLA_BREACHED' || f.slaBreached,
  ).length;

  // Per-project pending counts for the chart
  const projectPendingMap: Record<string, { name: string; pending: number }> = {};
  for (const f of pending) {
    if (!projectPendingMap[f.projectId]) {
      projectPendingMap[f.projectId] = {
        name: f.project?.code ?? f.projectId.slice(0, 8),
        pending: 0,
      };
    }
    projectPendingMap[f.projectId].pending += 1;
  }
  const chartData = Object.values(projectPendingMap).sort(
    (a, b) => b.pending - a.pending,
  );

  // Portfolio-level KPIs (may return 403 for non-CLIENT — suppress gracefully)
  const totals = portfolio?.totals;

  const kpis: KpiKV[] = [
    {
      label: t.consultantReports.formsPending,
      value: pending.length,
      icon: Clock,
      variant: pending.length > 0 ? 'warning' : 'success',
    },
    {
      label: t.consultantReports.slaBreachCount,
      value: slaBreaches,
      icon: Timer,
      variant: slaBreaches > 0 ? 'danger' : 'success',
    },
    ...(totals
      ? [
          {
            label: t.commandCenter.kpiOpenNcrs,
            value: totals.openNcrs,
            icon: AlertTriangle,
            variant: (totals.openNcrs > 0 ? 'warning' : 'success') as KpiKV['variant'],
          } satisfies KpiKV,
          {
            label: t.commandCenter.kpiRedAlerts,
            value: totals.liabilityRedAlerts,
            icon: XCircle,
            variant: (totals.liabilityRedAlerts > 0 ? 'danger' : 'success') as KpiKV['variant'],
          } satisfies KpiKV,
        ]
      : []),
  ];

  // Lab stats from form data (labResults embedded in form.data)
  let labPass = 0;
  let labFail = 0;
  for (const f of pending) {
    const labResults = Array.isArray((f.data as Record<string, unknown>)?.labResults)
      ? ((f.data as Record<string, unknown>).labResults as Array<{ resultStatus: string }>)
      : [];
    for (const r of labResults) {
      if (r.resultStatus === 'PASS') labPass++;
      if (r.resultStatus === 'FAIL') labFail++;
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t.workspaceNav.reports}
        </h1>
        <p className="text-muted-foreground">{t.consultantReports.subtitle}</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-2 h-8 w-16" />
                </CardHeader>
              </Card>
            ))
          : kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      {/* Lab tests row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="size-4 text-emerald-600" />
              {t.consultantReports.labTestsPassed}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold tabular-nums text-emerald-600">
                  {labPass}
                </p>
                <Badge variant="outline" className="text-emerald-600">
                  <CheckCircle2 className="me-1 size-3" />
                  PASS
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="size-4 text-red-600" />
              {t.consultantReports.labTestsFailed}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold tabular-nums text-red-600">
                  {labFail}
                </p>
                <Badge variant="outline" className="text-red-600">
                  <XCircle className="me-1 size-3" />
                  FAIL
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approvals by project chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5" />
            {t.consultantReports.approvalsByProject}
          </CardTitle>
          <CardDescription>{t.consultantReports.approvalsByProjectDesc}</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : chartData.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-10 text-emerald-500/50" />
              <p>{t.roleDashboard.noPendingApprovals}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border))',
                  }}
                />
                <Bar
                  dataKey="pending"
                  name={t.consultantReports.formsPending}
                  radius={[0, 4, 4, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.pending > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
