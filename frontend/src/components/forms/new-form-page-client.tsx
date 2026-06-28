'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DynamicFormRenderer } from '@/components/forms/dynamic-form-renderer';
import type { DynamicFormSubmitPayload } from '@/components/forms/dynamic-form-renderer';
import { Button } from '@/components/ui/button';
import { fetchTemplate } from '@/lib/api/forms';
import { fetchProject } from '@/lib/api/projects';
import { fetchProjectInventory } from '@/lib/api/materials';
import type { MaterialInventoryItem } from '@/lib/api/materials';
import { db } from '@/lib/db/dexie';
import type { LocalFormTemplate } from '@/lib/db/types';
import {
  isMaterialFormCode,
  parseFormSchema,
  type FormTemplateResponse,
} from '@/lib/forms/types';
import { canInitiateFormCode } from '@/lib/forms/template-access';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { isFieldWorker } from '@/lib/auth/field-engineer';
import { useSyncStore } from '@/stores/sync-store';
import { useTranslation } from '@/stores/locale-store';

interface NewFormPageClientProps {
  projectId: string;
}

export function NewFormPageClient({ projectId }: NewFormPageClientProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('templateId');

  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const saveFormInstanceOffline = useSyncStore((s) => s.saveFormInstanceOffline);
  const queueUpload = useSyncStore((s) => s.queueUpload);

  const [template, setTemplate] = useState<FormTemplateResponse | null>(null);
  const [inventory, setInventory] = useState<MaterialInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('SIMP Project');

  const loadTemplate = useCallback(async () => {
    if (!accessToken || !templateId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchTemplate(accessToken, templateId);
      if (data.projectId !== projectId) {
        throw new Error('Template does not belong to this project');
      }
      if (!canInitiateFormCode(user, data.code)) {
        throw new Error(t.fieldEngineer.unauthorizedTemplate);
      }

      setTemplate(data);

      const localTemplate: LocalFormTemplate = {
        id: data.id,
        projectId: data.projectId,
        code: data.code,
        name: data.name,
        nameAr: data.nameAr ?? undefined,
        version: data.version,
        schema: data.schema as unknown as Record<string, unknown>,
        uiSchema: data.uiSchema ?? undefined,
        updatedAt: new Date().toISOString(),
        syncedAt: new Date().toISOString(),
      };
      await db.formTemplates.put(localTemplate);

      if (isMaterialFormCode(data.code)) {
        setInventoryLoading(true);
        try {
          if (navigator.onLine && accessToken) {
            const items = await fetchProjectInventory(accessToken, projectId);
            setInventory(items);
            localStorage.setItem(
              `simp-inventory-${projectId}`,
              JSON.stringify(items),
            );
          } else {
            const cached = localStorage.getItem(`simp-inventory-${projectId}`);
            setInventory(cached ? (JSON.parse(cached) as MaterialInventoryItem[]) : []);
          }
        } catch {
          const cached = localStorage.getItem(`simp-inventory-${projectId}`);
          if (cached) {
            setInventory(JSON.parse(cached) as MaterialInventoryItem[]);
            toast.warning(t.forms.inventoryOffline);
          } else {
            setInventory([]);
            toast.warning(t.forms.inventoryOffline);
          }
        } finally {
          setInventoryLoading(false);
        }
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t.forms.loadError;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, templateId, projectId, user, t.fieldEngineer.unauthorizedTemplate, t.forms.inventoryOffline, t.forms.loadError]);

  useEffect(() => {
    void loadTemplate();
  }, [loadTemplate]);

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;
    void fetchProject(accessToken, projectId)
      .then((project) => {
        if (!cancelled) {
          setProjectName(project.name);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProjectName('SIMP Project');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, projectId]);

  const userName = user ? `${user.firstName} ${user.lastName}` : 'Field User';
  const templateTitle =
    template && locale === 'ar' && template.nameAr
      ? template.nameAr
      : template?.name;

  async function handleSubmit(payload: DynamicFormSubmitPayload) {
    if (!template) return;

    setIsSubmitting(true);

    try {
      const instanceId = crypto.randomUUID();
      const deviceTimestamp = new Date().toISOString();

      const formData = { ...payload.data };
      if (template.code === 'WIR') {
        const quantity = Number(formData.quantityUsed ?? 0);
        const unitRate = Number(formData.unitRate ?? 0);
        const explicitAmount = Number(formData.lineAmount ?? 0);
        if (explicitAmount <= 0 && quantity > 0 && unitRate > 0) {
          formData.lineAmount = quantity * unitRate;
        }
      }

      await saveFormInstanceOffline(
        {
          id: instanceId,
          projectId,
          templateId: template.id,
          templateCode: template.code,
          comments: payload.comments,
          status: 'DRAFT',
          data: formData,
          deviceTimestamp,
          clientRevision: 1,
        },
        { submitAfterSync: true },
      );

      for (const [fieldKey, blob] of payload.photoBlobs) {
        const photoMeta = payload.data[fieldKey] as
          | { fileName?: string; captureTimestamp?: string; gpsLat?: number; gpsLng?: number }
          | undefined;

        await queueUpload({
          projectId,
          formInstanceId: instanceId,
          blob,
          fileName: photoMeta?.fileName ?? `${fieldKey}-${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          gpsLat: photoMeta?.gpsLat ?? 0,
          gpsLng: photoMeta?.gpsLng ?? 0,
          captureTimestamp: photoMeta?.captureTimestamp ?? deviceTimestamp,
        });
      }

      for (const [fieldKey, file] of payload.attachmentFiles) {
        await queueUpload({
          projectId,
          formInstanceId: instanceId,
          blob: file.blob,
          fileName: file.fileName,
          mimeType: file.mimeType,
          gpsLat: 0,
          gpsLng: 0,
          captureTimestamp: deviceTimestamp,
        });
      }

      toast.success(t.forms.savedOfflineSuccess);
      router.push(isFieldWorker(user) ? '/dashboard/tasks' : '/dashboard/sync');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t.forms.submitError,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!templateId) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">{t.forms.missingTemplateId}</p>
        <Button asChild variant="outline">
          <Link href={`/dashboard/projects/${projectId}`}>
            <ArrowLeft className="me-2 size-4" />
            {t.forms.backToProject}
          </Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        {t.common.loading}
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error ?? t.forms.loadError}</p>
        <Button variant="outline" onClick={() => void loadTemplate()}>
          {t.forms.retry}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href={`/dashboard/projects/${projectId}`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {template.code}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{templateTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.forms.newFormSubtitle}</p>
        </div>
      </div>

      <DynamicFormRenderer
        schema={parseFormSchema(template.schema)}
        templateCode={template.code}
        projectId={projectId}
        projectName={projectName}
        userName={userName}
        inventory={inventory}
        inventoryLoading={inventoryLoading}
        isSubmitting={isSubmitting}
        formAccessMode="create"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
