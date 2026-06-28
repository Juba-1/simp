'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MapPin,
  PenLine,
} from 'lucide-react';
import { FormDataDisplay } from '@/components/forms/form-data-display';
import { LabTestPanel } from '@/components/forms/lab-test-panel';
import { FormRejectionNotice } from '@/components/forms/form-rejection-notice';
import { FormWorkflowActions } from '@/components/forms/form-workflow-actions';
import { AuditHistorySheet } from '@/components/forms/audit-history-sheet';
import { LocationVerificationMap } from '@/components/maps/location-verification-map';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchFormInstance } from '@/lib/api/forms';
import type { FormInstanceRecord } from '@/lib/api/forms';
import { fetchProjectAttachments } from '@/lib/api/uploads';
import type { FileAttachment } from '@/lib/api/uploads';
import { fetchPendingApprovals } from '@/lib/api/users';
import type { PendingApprovalsResult } from '@/lib/api/users';
import { extractFormLocations } from '@/lib/forms/extract-locations';
import { STATUS_COLORS } from '@/lib/forms/workflow-actions';
import { formatFormReferenceLabel } from '@/lib/forms/form-reference';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type PendingForm = PendingApprovalsResult['data'][number];

const REVIEW_STATUSES = new Set(['PENDING_EXTERNAL_APPROVAL', 'SLA_BREACHED']);

export function ConsultantCommandCenter() {
  const { t, locale } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const {
    data: approvals,
    isLoading: queueLoading,
    error: queueErr,
  } = useQuery({
    queryKey: ['pendingApprovals', 'consultant'],
    enabled: Boolean(accessToken),
    queryFn: async () => {
      if (!accessToken) throw new Error('Missing access token');
      return fetchPendingApprovals(accessToken);
    },
    select: (result) => ({
      ...result,
      data: result.data.filter((f) => REVIEW_STATUSES.has(f.status)),
    }),
    staleTime: 15_000,
  });

  const queue = approvals?.data ?? [];
  const queueError =
    queueErr instanceof ApiError ? queueErr.message : queueErr ? t.roleDashboard.loadError : null;

  useEffect(() => {
    setSelectedId((prev) => {
      if (prev && queue.some((f) => f.id === prev)) return prev;
      return queue[0]?.id ?? null;
    });
  }, [queue]);

  const selected = useMemo(
    () => queue.find((f) => f.id === selectedId) ?? null,
    [queue, selectedId],
  );

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['formInstance', selected?.id ?? null],
    enabled: Boolean(accessToken) && Boolean(selected?.id),
    queryFn: async () => {
      if (!accessToken || !selected) throw new Error('Missing selection');
      return fetchFormInstance(accessToken, selected.id);
    },
    staleTime: 30_000,
  });

  const { data: projectAttachments } = useQuery({
    queryKey: ['projectAttachments', selected?.projectId ?? null],
    enabled: Boolean(accessToken) && Boolean(selected?.projectId),
    queryFn: async () => {
      if (!accessToken || !selected) throw new Error('Missing selection');
      return fetchProjectAttachments(accessToken, selected.projectId);
    },
    staleTime: 60_000,
  });

  const attachments: FileAttachment[] = useMemo(() => {
    if (!projectAttachments || !selected) return [];
    return projectAttachments.filter((a) => a.formInstanceId === selected.id);
  }, [projectAttachments, selected]);

  const locationPins = useMemo(() => {
    if (!detail) return [];
    return extractFormLocations(detail.data, attachments);
  }, [detail, attachments]);

  const slaCount = queue.filter((f) => f.slaBreached || f.status === 'SLA_BREACHED').length;

  async function handleWorkflowUpdated() {
    await queryClient.invalidateQueries({ queryKey: ['pendingApprovals', 'consultant'] });
    if (selected?.id) {
      await queryClient.invalidateQueries({ queryKey: ['formInstance', selected.id] });
      await queryClient.invalidateQueries({ queryKey: ['projectAttachments', selected.projectId] });
    }
  }

  function projectLabel(form: PendingForm) {
    return locale === 'ar' && form.project?.nameAr
      ? form.project.nameAr
      : form.project?.name ?? form.projectId.slice(0, 8);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-[calc(100dvh-7rem)] min-h-[520px] flex-col gap-4"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <PenLine className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t.commandCenter.commandCenter}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t.roleDashboard.consultantSubtitle}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="secondary" className="gap-1 px-3 py-1">
            <ClipboardList className="size-3.5" />
            {queue.length} {t.roleDashboard.pendingSignatures}
          </Badge>
          {slaCount > 0 && (
            <Badge variant="destructive" className="gap-1 px-3 py-1">
              <AlertTriangle className="size-3.5" />
              {slaCount} {t.commandCenter.kpiSlaBreaches}
            </Badge>
          )}
        </div>
      </div>

      {queueError && <p className="text-sm text-destructive">{queueError}</p>}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardHeader className="shrink-0 border-b py-4">
            <CardTitle className="text-base">{t.roleDashboard.approvalQueue}</CardTitle>
            <CardDescription>{t.roleDashboard.approvalQueueDesc}</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 p-0">
            {queueLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : queue.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <CheckCircle2 className="size-12 text-emerald-500/50" />
                <p className="text-muted-foreground">{t.roleDashboard.noPendingApprovals}</p>
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                <ul className="divide-y">
                  {queue.map((form) => {
                    const active = form.id === selectedId;
                    return (
                      <li key={form.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(form.id)}
                          className={cn(
                            'w-full px-4 py-3 text-start transition-colors hover:bg-muted/50',
                            active && 'border-s-2 border-s-primary bg-primary/5',
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {form.template.code} ·{' '}
                                <span className="font-mono text-xs text-muted-foreground">
                                  {formatFormReferenceLabel(
                                    form.referenceNumber,
                                    form.id,
                                    form.revisionNumber,
                                  )}
                                </span>
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {projectLabel(form)}
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {new Date(form.updatedAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              {(form.slaBreached || form.status === 'SLA_BREACHED') && (
                                <Badge variant="destructive" className="text-[10px]">
                                  {t.commandCenter.sla}
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px]',
                                  STATUS_COLORS[form.status] ?? '',
                                )}
                              >
                                {form.status.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden">
          {!selected ? (
            <CardContent className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <ClipboardList className="size-12 opacity-30" />
              <p>{t.commandCenter.selectFormToReview}</p>
            </CardContent>
          ) : detailLoading && !detail ? (
            <CardContent className="flex flex-1 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </CardContent>
          ) : detail ? (
            <>
              <CardHeader className="shrink-0 border-b py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{detail.template.code}</Badge>
                      <Badge
                        variant="outline"
                        className={STATUS_COLORS[detail.status] ?? ''}
                      >
                        {detail.status.replace(/_/g, ' ')}
                      </Badge>
                      {detail.slaBreached && (
                        <Badge variant="destructive">{t.commandCenter.sla}</Badge>
                      )}
                    </div>
                    <CardTitle className="mt-2 text-lg">
                      {formatFormReferenceLabel(
                        detail.referenceNumber,
                        detail.id,
                        detail.revisionNumber,
                      )}
                    </CardTitle>
                    <CardDescription>
                      {detail.template.name} · {projectLabel(selected)}
                    </CardDescription>
                  </div>
                  <AuditHistorySheet formInstanceId={detail.id} />
                </div>
              </CardHeader>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <CardContent className="space-y-4 py-4">
                  <FormRejectionNotice formId={detail.id} status={detail.status} />
                  <LocationVerificationMap pins={locationPins} />

                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <MetaRow
                      label={t.commandCenter.submittedBy}
                      value={`${detail.createdBy.firstName} ${detail.createdBy.lastName}`}
                    />
                    <MetaRow
                      label={t.commandCenter.colUpdated}
                      value={new Date(detail.updatedAt).toLocaleString()}
                    />
                    {locationPins.length > 0 && (
                      <MetaRow
                        label={t.commandCenter.locationVerification}
                        value={`${locationPins.length} ${t.commandCenter.gpsPins}`}
                        icon={MapPin}
                      />
                    )}
                  </div>

                  <FormWorkflowActions
                    form={detail}
                    onUpdated={() => void handleWorkflowUpdated()}
                  />
                  <LabTestPanel
                    formId={detail.id}
                    formStatus={detail.status}
                    templateCode={detail.template.code}
                  />

                  <Tabs defaultValue="data">
                    <TabsList>
                      <TabsTrigger value="data">{t.commandCenter.formData}</TabsTrigger>
                      <TabsTrigger value="photos">
                        {t.commandCenter.photoVerification}
                        {attachments.length > 0 && (
                          <Badge variant="secondary" className="ms-2">
                            {attachments.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="data" className="mt-4">
                      <FormDataDisplay
                        data={detail.data}
                        attachments={[]}
                        liabilityShiftRedAlert={detail.liabilityShiftRedAlert}
                      />
                    </TabsContent>
                    <TabsContent value="photos" className="mt-4">
                      <FormDataDisplay
                        data={{}}
                        attachments={attachments}
                        liabilityShiftRedAlert={false}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </div>
            </>
          ) : (
            <CardContent className="flex flex-1 items-center justify-center text-destructive">
              {t.commandCenter.loadError}
            </CardContent>
          )}
        </Card>
      </div>

      <p className="shrink-0 text-center text-xs text-muted-foreground">
        {t.dashboard.welcome}, {user?.firstName}
      </p>
    </motion.div>
  );
}

function MetaRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3" />}
        {label}
      </p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
