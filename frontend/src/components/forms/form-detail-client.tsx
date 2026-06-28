'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { FormDataDisplay } from '@/components/forms/form-data-display';
import { FormRejectionNotice } from '@/components/forms/form-rejection-notice';
import { FormWorkflowActions } from '@/components/forms/form-workflow-actions';
import { AuditHistorySheet } from '@/components/forms/audit-history-sheet';
import { LabTestPanel } from '@/components/forms/lab-test-panel';
import { LocationVerificationMap } from '@/components/maps/location-verification-map';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchFormInstance } from '@/lib/api/forms';
import type { FormInstanceRecord } from '@/lib/api/forms';
import { fetchProjectAttachments } from '@/lib/api/uploads';
import type { FileAttachment } from '@/lib/api/uploads';
import { downloadFormPdf } from '@/lib/api/reports';
import { extractFormLocations } from '@/lib/forms/extract-locations';
import { STATUS_COLORS } from '@/lib/forms/workflow-actions';
import {
  canReviseRejectedForm,
  formatFormReferenceLabel,
} from '@/lib/forms/form-reference';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

interface FormDetailClientProps {
  projectId: string;
  formId: string;
}

export function FormDetailClient({ projectId, formId }: FormDetailClientProps) {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState<FormInstanceRecord | null>(null);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [instance, projectAttachments] = await Promise.all([
        fetchFormInstance(accessToken, formId),
        fetchProjectAttachments(accessToken, projectId),
      ]);
      setForm(instance);
      setAttachments(
        projectAttachments.filter((a) => a.formInstanceId === formId),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.commandCenter.loadError);
    } finally {
      setLoading(false);
    }
  }, [accessToken, formId, projectId, t.commandCenter.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDownloadPdf() {
    if (!accessToken) return;
    setPdfLoading(true);
    try {
      await downloadFormPdf(accessToken, formId);
      toast.success(t.commandCenter.pdfDownloaded);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t.commandCenter.pdfError,
      );
    } finally {
      setPdfLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        {t.common.loading}
      </div>
    );
  }

  if (error || !form) {
    return <p className="text-destructive">{error ?? t.commandCenter.loadError}</p>;
  }

  const locationPins = extractFormLocations(form.data, attachments);
  const displayRef = formatFormReferenceLabel(
    form.referenceNumber,
    form.id,
    form.revisionNumber,
  );
  const showRevise = canReviseRejectedForm(form, user);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/dashboard/projects/${projectId}/forms`}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{form.template.code}</Badge>
              <Badge
                variant="outline"
                className={STATUS_COLORS[form.status] ?? ''}
              >
                {form.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{displayRef}</h1>
            <p className="text-sm text-muted-foreground">
              {form.template.name} · v{form.template.version}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {showRevise && (
            <Button asChild className="gap-2">
              <Link href={`/dashboard/projects/${projectId}/forms/${formId}/edit`}>
                <RotateCcw className="size-4" />
                {t.forms.reviseResubmit}
              </Link>
            </Button>
          )}
          <AuditHistorySheet formInstanceId={formId} />
          <Button
            variant="outline"
            className="gap-2"
            disabled={pdfLoading}
            onClick={() => void handleDownloadPdf()}
          >
            {pdfLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {t.commandCenter.downloadPdf}
          </Button>
        </div>
      </div>

      <FormRejectionNotice formId={formId} status={form.status} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.commandCenter.metadata}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <MetaRow label={t.commandCenter.colStatus} value={form.status} />
              {(form.revisionNumber ?? 0) > 0 && (
                <MetaRow
                  label={t.forms.revisionLabel}
                  value={`Rev ${form.revisionNumber}`}
                />
              )}
              <MetaRow
                label={t.commandCenter.submittedBy}
                value={`${form.createdBy.firstName} ${form.createdBy.lastName}`}
              />
              <MetaRow
                label={t.commandCenter.colUpdated}
                value={new Date(form.updatedAt).toLocaleString()}
              />
              {form.comments && (
                <MetaRow label={t.forms.comments} value={form.comments} />
              )}
            </CardContent>
          </Card>

          <FormWorkflowActions form={form} onUpdated={() => void load()} />
          <LabTestPanel
            formId={formId}
            formStatus={form.status}
            templateCode={form.template.code}
          />
        </div>

        <div className="xl:col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-6">
              <LocationVerificationMap pins={locationPins} />
            </CardContent>
          </Card>

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
              <Card>
                <CardContent className="pt-6">
                  <FormDataDisplay
                    data={form.data}
                    attachments={[]}
                    liabilityShiftRedAlert={form.liabilityShiftRedAlert}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="photos" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <FormDataDisplay
                    data={{}}
                    attachments={attachments}
                    liabilityShiftRedAlert={false}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-end font-medium">{value}</span>
    </div>
  );
}
