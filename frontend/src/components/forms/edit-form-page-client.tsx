'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DynamicFormRenderer } from '@/components/forms/dynamic-form-renderer';
import type { DynamicFormSubmitPayload } from '@/components/forms/dynamic-form-renderer';
import { FormRejectionNotice } from '@/components/forms/form-rejection-notice';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  fetchFormInstance,
  fetchTemplate,
  updateFormInstance,
} from '@/lib/api/forms';
import type { FormInstanceRecord } from '@/lib/api/forms';
import { fetchProject } from '@/lib/api/projects';
import { fetchProjectInventory } from '@/lib/api/materials';
import type { MaterialInventoryItem } from '@/lib/api/materials';
import { resubmitFormWorkflow } from '@/lib/api/workflows';
import { ApiError } from '@/lib/api/client';
import {
  canReviseRejectedForm,
  formatFormReferenceLabel,
} from '@/lib/forms/form-reference';
import {
  isMaterialFormCode,
  parseFormSchema,
  type FormTemplateResponse,
} from '@/lib/forms/types';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

interface EditFormPageClientProps {
  projectId: string;
  formId: string;
}

export function EditFormPageClient({ projectId, formId }: EditFormPageClientProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const [form, setForm] = useState<FormInstanceRecord | null>(null);
  const [template, setTemplate] = useState<FormTemplateResponse | null>(null);
  const [inventory, setInventory] = useState<MaterialInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('SIMP Project');

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const instance = await fetchFormInstance(accessToken, formId);
      if (instance.projectId !== projectId) {
        throw new Error('Form does not belong to this project');
      }
      if (!canReviseRejectedForm(instance, user)) {
        throw new Error(t.forms.editNotAllowed);
      }

      const tpl = await fetchTemplate(accessToken, instance.templateId);
      setForm(instance);
      setTemplate(tpl);

      if (isMaterialFormCode(tpl.code)) {
        setInventoryLoading(true);
        try {
          const items = await fetchProjectInventory(accessToken, projectId);
          setInventory(items);
        } catch {
          setInventory([]);
        } finally {
          setInventoryLoading(false);
        }
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t.forms.loadError,
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, formId, projectId, user, t.forms.editNotAllowed, t.forms.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

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
    if (!accessToken || !form || !template) return;

    setIsSubmitting(true);
    try {
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

      await updateFormInstance(accessToken, form.id, {
        data: formData,
        comments: payload.comments,
        deviceTimestamp,
      });

      await resubmitFormWorkflow(accessToken, form.id, {
        comments: payload.comments || undefined,
      });

      toast.success(t.forms.revisionSubmitted);
      router.push(`/dashboard/projects/${projectId}/forms/${form.id}`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t.forms.revisionSubmitError,
      );
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

  if (error || !form || !template) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error ?? t.forms.loadError}</p>
        <Button asChild variant="outline">
          <Link href={`/dashboard/projects/${projectId}/forms/${formId}`}>
            <ArrowLeft className="me-2 size-4" />
            {t.forms.backToProject}
          </Link>
        </Button>
      </div>
    );
  }

  const displayRef = formatFormReferenceLabel(
    form.referenceNumber,
    form.id,
    form.revisionNumber,
  );
  const nextRev = (form.revisionNumber ?? 0) + 1;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href={`/dashboard/projects/${projectId}/forms/${formId}`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{template.code}</Badge>
            <Badge variant="outline">Rev {nextRev}</Badge>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {t.forms.editRevisionTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            {displayRef} · {t.forms.editRevisionSubtitle}
          </p>
        </div>
      </div>

      <FormRejectionNotice formId={formId} status={form.status} />

      <DynamicFormRenderer
        schema={parseFormSchema(template.schema)}
        templateCode={template.code}
        projectId={projectId}
        projectName={projectName}
        userName={userName}
        inventory={inventory}
        inventoryLoading={inventoryLoading}
        isSubmitting={isSubmitting}
        initialData={form.data}
        formAccessMode="edit"
        submitLabel={t.forms.submitRevision}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
