'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, FilePlus, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchProjectFormInstances, fetchProjectTemplates } from '@/lib/api/forms';
import type { FormInstanceRecord } from '@/lib/api/forms';
import { fetchProjects } from '@/lib/api/projects';
import type { ProjectSummary } from '@/lib/api/projects';
import { filterInitiatableTemplates } from '@/lib/forms/template-access';
import { STATUS_COLORS } from '@/lib/forms/workflow-actions';
import { formatFormReferenceLabel } from '@/lib/forms/form-reference';
import { isFieldLaboratory } from '@/lib/auth/field-engineer';
import { useAuthStore } from '@/stores/auth-store';
import { useSyncStore } from '@/stores/sync-store';
import { useTranslation } from '@/stores/locale-store';

interface QuickAction {
  code: string;
  projectId: string;
  templateId: string;
}

export function FieldEngineerDashboard() {
  const { t, locale } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const connectionStatus = useSyncStore((s) => s.connectionStatus);
  const processQueue = useSyncStore((s) => s.processQueue);

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [myForms, setMyForms] = useState<FormInstanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);

  const priorityCodes = useMemo(
    () => (isFieldLaboratory(user) ? ['LTR'] : ['WIR', 'MIR']),
    [user],
  );

  const load = useCallback(async () => {
    if (!accessToken || !user) return;
    setLoading(true);
    try {
      const { data: projectList } = await fetchProjects(accessToken, 1, 20);
      setProjects(projectList);

      const forms: FormInstanceRecord[] = [];
      const found = new Map<string, QuickAction>();

      for (const project of projectList.slice(0, 5)) {
        const templates = filterInitiatableTemplates(
          await fetchProjectTemplates(accessToken, project.id),
          user,
        ).filter((tpl) => tpl.isActive);

        for (const code of priorityCodes) {
          if (found.has(code)) continue;
          const tpl = templates.find((t) => t.code === code);
          if (tpl) {
            found.set(code, { code, projectId: project.id, templateId: tpl.id });
          }
        }

        const instances = await fetchProjectFormInstances(accessToken, project.id, {
          limit: 50,
        });
        for (const form of instances.data) {
          if (form.createdBy.id === user.id) {
            forms.push(form);
          }
        }
      }

      forms.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

      setMyForms(forms.slice(0, 20));
      setQuickActions(
        priorityCodes
          .map((code) => found.get(code))
          .filter((a): a is QuickAction => Boolean(a)),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, user, priorityCodes]);

  useEffect(() => {
    void load();
  }, [load]);

  const syncLabel = useMemo(() => {
    if (connectionStatus === 'syncing') return t.fieldEngineer.syncing;
    if (pendingCount > 0) {
      return t.fieldEngineer.pendingSync.replace('{count}', String(pendingCount));
    }
    return t.fieldEngineer.syncUpToDate;
  }, [connectionStatus, pendingCount, t.fieldEngineer]);

  const quickActionLabels: Record<string, string> = {
    WIR: t.fieldEngineer.createWir,
    MIR: t.fieldEngineer.createMir,
    LTR: t.fieldEngineer.createLtr,
  };

  const rejectedForms = myForms.filter((f) => f.status === 'REJECTED');
  const activeForms = myForms.filter((f) => f.status !== 'REJECTED');

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-base font-medium text-slate-700 dark:text-slate-300">
        <Loader2 className="size-6 animate-spin" />
        {t.common.loading}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {t.fieldEngineer.dashboardTitle}
        </h1>
        <p className="mt-2 text-base font-medium text-slate-700 dark:text-slate-300">
          {t.fieldEngineer.dashboardSubtitle}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {quickActions.length > 0 ? (
          quickActions.map((action, idx) => (
            <Button
              key={action.code}
              asChild
              size="xl"
              variant={idx === 0 ? 'default' : 'outline'}
              className={`min-h-[4.75rem] flex-col gap-2 shadow-md ${
                quickActions.length === 1 ? 'sm:col-span-2' : ''
              }`}
            >
              <Link
                href={`/dashboard/projects/${action.projectId}/forms/new?templateId=${action.templateId}`}
              >
                <FilePlus className="size-7" />
                {quickActionLabels[action.code] ?? action.code}
              </Link>
            </Button>
          ))
        ) : (
          <Button
            asChild
            size="xl"
            variant="outline"
            className="min-h-[4.75rem] shadow-md sm:col-span-2"
          >
            <Link href="/dashboard/tasks/new">{t.fieldEngineer.newFormTitle}</Link>
          </Button>
        )}
      </div>

      {rejectedForms.length > 0 && (
        <Card className="border-2 border-rose-400 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-rose-800 dark:text-rose-300">
              {t.forms.rejectedForms}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rejectedForms.map((form) => (
              <Link
                key={form.id}
                href={`/dashboard/projects/${form.projectId}/forms/${form.id}/edit`}
                className="flex flex-col gap-2 rounded-xl border-2 border-rose-300 bg-rose-50 px-4 py-4 transition-colors hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-950/30 dark:hover:bg-rose-950/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-base font-bold text-slate-900 dark:text-slate-50">
                    {formatFormReferenceLabel(
                      form.referenceNumber,
                      form.id,
                      form.revisionNumber,
                    )}
                  </p>
                  <Badge variant="outline" className={STATUS_COLORS.REJECTED}>
                    {form.status}
                  </Badge>
                </div>
                {form.comments ? (
                  <p className="line-clamp-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {form.comments}
                  </p>
                ) : null}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-lg">{t.fieldEngineer.syncStatus}</CardTitle>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 px-5 font-semibold"
            disabled={connectionStatus === 'syncing'}
            onClick={() => void processQueue()}
          >
            <RefreshCw
              className={`size-4 ${connectionStatus === 'syncing' ? 'animate-spin' : ''}`}
            />
            {t.fieldEngineer.syncNow}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-base font-medium text-slate-800 dark:text-slate-200">{syncLabel}</p>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="size-5" />
            {t.fieldEngineer.mySubmissions}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeForms.length === 0 ? (
            <p className="py-8 text-center text-base font-medium text-slate-700 dark:text-slate-300">
              {t.fieldEngineer.noSubmissions}
            </p>
          ) : (
            activeForms.map((form) => {
              const title =
                locale === 'ar' && form.template.name
                  ? form.template.name
                  : form.template.name;
              return (
                <Link
                  key={form.id}
                  href={`/dashboard/projects/${form.projectId}/forms/${form.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border-2 border-slate-200 bg-white px-4 py-4 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-indigo-600"
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-slate-900 dark:text-slate-50">
                      {formatFormReferenceLabel(
                        form.referenceNumber,
                        form.id,
                        form.revisionNumber,
                      )}
                    </p>
                    <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                      {title}
                    </p>
                  </div>
                  <Badge variant="outline" className={STATUS_COLORS[form.status] ?? ''}>
                    {form.status.replace(/_/g, ' ')}
                  </Badge>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
