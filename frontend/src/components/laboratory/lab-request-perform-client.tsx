'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DynamicFormRenderer } from '@/components/forms/dynamic-form-renderer';
import type { DynamicFormSubmitPayload } from '@/components/forms/dynamic-form-renderer';
import { LabParentReferenceCard } from '@/components/laboratory/lab-parent-reference-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchProjectTemplates } from '@/lib/api/forms';
import { apiFetch, ApiError } from '@/lib/api/client';
import {
  fetchLabRequestById,
  mapLtrFormToLabResult,
  submitLabResultByRequestId,
  type LabRequestDetail,
} from '@/lib/api/laboratory';
import { uploadPhoto } from '@/lib/api/uploads';
import { getDeviceId } from '@/lib/db/dexie';
import { LTR_CMT_SCHEMA, normalizeLtrTestType } from '@/lib/forms/ltr-cmt-schema';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

interface LabRequestPerformClientProps {
  requestId: string;
}

const LEGACY_TEST_TYPE_MAP: Record<string, string> = {
  'Field work verification': 'CONCRETE_SLUMP',
  'Material sampling & analysis': 'SOIL_COMPACTION',
  'Standard laboratory analysis': 'SOIL_COMPACTION',
  CONCRETE_CUBE: 'CONCRETE_COMPRESSIVE',
};

function resolveLtrTestType(testType: string): string {
  return normalizeLtrTestType(testType) || LEGACY_TEST_TYPE_MAP[testType] || 'CONCRETE_SLUMP';
}

export function LabRequestPerformClient({ requestId }: LabRequestPerformClientProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const [request, setRequest] = useState<LabRequestDetail | null>(null);
  const [template, setTemplate] = useState<Awaited<ReturnType<typeof fetchProjectTemplates>>[number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const technicianName = user ? `${user.firstName} ${user.lastName}` : 'Lab Technician';

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const req = await fetchLabRequestById(accessToken, requestId);
      setRequest(req);

      const templates = await fetchProjectTemplates(accessToken, req.projectId);
      const ltr = templates.find((tpl) => tpl.code === 'LTR' && tpl.isActive);
      if (!ltr) {
        throw new Error(t.laboratory.noLtrTemplate);
      }
      setTemplate(ltr);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t.laboratory.loadError,
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, requestId, t.laboratory.loadError, t.laboratory.noLtrTemplate]);

  useEffect(() => {
    void load();
  }, [load]);

  const initialData = request
    ? {
        testType: resolveLtrTestType(request.testType),
        testDate: new Date().toISOString().slice(0, 10),
      }
    : undefined;

  async function handleSubmit(payload: DynamicFormSubmitPayload) {
    if (!accessToken || !request || !template || !user) return;

    setIsSubmitting(true);
    try {
      const deviceTimestamp = new Date().toISOString();
      const formData = {
        ...payload.data,
        sampleReference: request.ltrId,
        parentFormReference: request.parentForm.referenceNumber,
        parentTemplateCode: request.parentForm.templateCode,
        responsibleTechnician: technicianName,
      };

      const instance = await apiFetch<{ id: string }>('/forms/instances', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          projectId: request.projectId,
          templateId: template.id,
          referenceNumber: `${request.ltrId}-RPT`,
          comments: payload.comments,
          status: 'DRAFT',
          data: formData,
          deviceTimestamp,
          clientRevision: 1,
        }),
      });

      const createdId = instance.id;

      for (const [fieldKey, blob] of payload.photoBlobs) {
        const photoMeta = payload.data[fieldKey] as
          | { fileName?: string; captureTimestamp?: string; gpsLat?: number; gpsLng?: number }
          | undefined;
        const gpsLat = photoMeta?.gpsLat ?? 0;
        const gpsLng = photoMeta?.gpsLng ?? 0;

        await uploadPhoto(accessToken, blob, photoMeta?.fileName ?? `${fieldKey}.jpg`, {
          projectId: request.projectId,
          formInstanceId: createdId,
          gps_lat: gpsLat,
          gps_lng: gpsLng,
          capture_timestamp: photoMeta?.captureTimestamp ?? deviceTimestamp,
          device_id: getDeviceId(),
          camera_facing: 'environment',
        });
      }

      for (const [, file] of payload.attachmentFiles) {
        await uploadPhoto(accessToken, file.blob, file.fileName, {
          projectId: request.projectId,
          formInstanceId: createdId,
          gps_lat: 0,
          gps_lng: 0,
          capture_timestamp: deviceTimestamp,
          device_id: getDeviceId(),
          camera_facing: 'environment',
        });
      }

      await submitLabResultByRequestId(
        accessToken,
        requestId,
        mapLtrFormToLabResult(formData),
      );

      toast.success(t.laboratory.submitSuccess);
      router.push('/dashboard/laboratory');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.laboratory.submitError);
    } finally {
      setIsSubmitting(false);
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

  if (error || !request || !template) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error ?? t.laboratory.loadError}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/laboratory">{t.laboratory.backToQueue}</Link>
        </Button>
      </div>
    );
  }

  const templateTitle =
    locale === 'ar' && template.nameAr ? template.nameAr : template.name;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href="/dashboard/laboratory">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{request.ltrId}</Badge>
            <Badge variant="outline">{request.sampleCategory}</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t.laboratory.performTitle}</h1>
          <p className="text-sm text-muted-foreground">
            {templateTitle} · {request.projectName}
          </p>
        </div>
      </div>

      <LabParentReferenceCard parent={request.parentForm} ltrId={request.ltrId} />

      <DynamicFormRenderer
        schema={LTR_CMT_SCHEMA}
        templateCode="LTR"
        projectId={request.projectId}
        projectName={request.projectName}
        userName={technicianName}
        isSubmitting={isSubmitting}
        initialData={initialData}
        submitLabel={t.laboratory.submitResult}
        formFooter={
          <p className="border-t pt-4 text-sm text-muted-foreground">
            {t.laboratory.responsibleTechnician}:{' '}
            <span className="font-medium text-foreground">{technicianName}</span>
          </p>
        }
        onSubmit={handleSubmit}
      />
    </div>
  );
}
