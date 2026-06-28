'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Boxes,
  DollarSign,
  FileText,
  Loader2,
  Receipt,
  ScrollText,
  ShieldAlert,
  Timer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProjectFormsPageClient } from '@/components/forms/project-forms-page-client';
import { ConsultantProjectPanel } from '@/components/projects/consultant-project-panel';
import { fetchProjectDashboard } from '@/lib/api/analytics';
import type { ProjectDashboardKpis } from '@/lib/api/analytics';
import { useAuthStore } from '@/stores/auth-store';
import { canViewIpcBilling } from '@/lib/auth/permissions';
import { useTranslation } from '@/stores/locale-store';

interface ProjectOverviewClientProps {
  projectId: string;
}

export function ProjectOverviewClient({ projectId }: ProjectOverviewClientProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isClientAdmin =
    user?.organization.type === 'CLIENT' && Boolean(user?.isOrgAdmin);
  const isConsultant = user?.organization.type === 'CONSULTANT';
  const workspace = user?.organization.type;
  const showIpc = canViewIpcBilling(user);

  const [kpis, setKpis] = useState<ProjectDashboardKpis | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(isClientAdmin);

  useEffect(() => {
    if (!accessToken || !isClientAdmin) return;
    let active = true;
    setLoadingKpis(true);
    fetchProjectDashboard(accessToken, projectId)
      .then((d) => active && setKpis(d))
      .catch(() => active && setKpis(null))
      .finally(() => active && setLoadingKpis(false));
    return () => {
      active = false;
    };
  }, [accessToken, projectId, isClientAdmin]);

  const base = `/dashboard/projects/${projectId}`;
  const quickActions = [
    { href: `${base}/forms`, icon: FileText, label: t.projectWorkspace.navForms, show: true },
    {
      href: `${base}/materials`,
      icon: Boxes,
      label: t.projectWorkspace.navMaterials,
      show: workspace !== 'LABORATORY',
    },
    {
      href: `${base}/ipc`,
      icon: Receipt,
      label: t.projectWorkspace.navIpc,
      show: showIpc && workspace !== 'LABORATORY',
    },
    { href: `${base}/audit`, icon: ScrollText, label: t.projectWorkspace.navAudit, show: true },
  ].filter((a) => a.show);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">
          {t.projectWorkspace.overviewSubtitle}
        </p>
      </div>

      {isClientAdmin && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loadingKpis ? (
            <div className="col-span-full flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <KpiCard
                icon={DollarSign}
                label={t.commandCenter.kpiTotalBilled}
                value={kpis ? formatMoney(kpis.totalBilled) : '—'}
                tone="emerald"
              />
              <KpiCard
                icon={AlertTriangle}
                label={t.commandCenter.kpiOpenNcrs}
                value={kpis?.openNcrCount ?? 0}
                tone="amber"
              />
              <KpiCard
                icon={Timer}
                label={t.commandCenter.kpiSlaBreaches}
                value={kpis?.slaBreachCount ?? 0}
                tone="rose"
              />
              <KpiCard
                icon={ShieldAlert}
                label={t.commandCenter.kpiRedAlerts}
                value={kpis?.liabilityRedAlertCount ?? 0}
                tone="violet"
              />
            </>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          {t.projectWorkspace.quickActions}
        </h2>
        <div className="flex flex-wrap gap-3">
          {quickActions.map(({ href, icon: Icon, label }) => (
            <Button key={href} asChild variant="outline" className="gap-2">
              <Link href={href}>
                <Icon className="size-4" />
                {label}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {isConsultant && <ConsultantProjectPanel projectId={projectId} />}

      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <FileText className="size-5" />
          {isConsultant
            ? t.projectWorkspace.consultantFormsTitle
            : t.commandCenter.formsManagement}
        </h2>
        <ProjectFormsPageClient projectId={projectId} />
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
  icon: typeof DollarSign;
  label: string;
  value: string | number;
  tone: 'emerald' | 'amber' | 'rose' | 'violet';
}) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
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

function formatMoney(value: string): string {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return value;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(n);
}
