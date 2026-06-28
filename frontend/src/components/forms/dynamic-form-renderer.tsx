'use client';

import { useMemo, useRef, useState, useEffect, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FormFieldRenderer } from '@/components/forms/form-field-renderer';
import { MaterialReconciliationSection } from '@/components/forms/material-reconciliation-section';
import { LiabilityWarningDialog } from '@/components/forms/liability-warning-dialog';
import type { CameraCaptureResult } from '@/components/camera/smart-camera-input';
import type { MaterialInventoryItem } from '@/lib/api/materials';
import { parseBalance } from '@/lib/api/materials';
import {
  buildMaterialFormData,
  checkQuantityOverage,
  findInventoryItem,
} from '@/lib/forms/material-reconciliation';
import { buildZodSchema } from '@/lib/forms/schema-to-zod';
import {
  filterVisibleFields,
  LTR_EVIDENCE_FIELD_TYPES,
} from '@/lib/forms/field-visibility';
import {
  LTR_CMT_SCHEMA,
  stripLegacyLtrFields,
} from '@/lib/forms/ltr-cmt-schema';
import { calculateCompressiveStrengthMpa } from '@/lib/forms/ltr-compressive-strength';
import {
  isMaterialFieldKey,
  isMaterialFormCode,
  isBooleanFieldType,
  MATERIAL_FIELD_KEYS,
  type FormSchema,
  type PhotoFieldValue,
} from '@/lib/forms/types';
import { useTranslation } from '@/stores/locale-store';
import { useAuthStore } from '@/stores/auth-store';
import {
  isWirBillingFieldReadOnly,
  shouldLockWirBillingOnCreate,
  type DynamicFormAccessMode,
} from '@/lib/forms/wir-billing-access';

export interface DynamicFormSubmitPayload {
  data: Record<string, unknown>;
  comments: string;
  photoBlobs: Map<string, Blob>;
  attachmentFiles: Map<string, { blob: Blob; fileName: string; mimeType: string }>;
  liabilityShiftRedAlert: boolean;
}

interface DynamicFormRendererProps {
  schema: FormSchema;
  templateCode: string;
  projectId: string;
  projectName: string;
  userName: string;
  inventory?: MaterialInventoryItem[];
  inventoryLoading?: boolean;
  isSubmitting?: boolean;
  initialData?: Record<string, unknown>;
  initialComments?: string;
  submitLabel?: string;
  formFooter?: ReactNode;
  formAccessMode?: DynamicFormAccessMode;
  onSubmit: (payload: DynamicFormSubmitPayload) => void | Promise<void>;
}

const materialZodSchema = z.object({
  [MATERIAL_FIELD_KEYS.mirFormInstanceId]: z
    .string()
    .min(1, 'Select an approved MIR source'),
  [MATERIAL_FIELD_KEYS.quantityUsed]: z.coerce
    .number()
    .positive('Quantity must be greater than zero'),
});

export function DynamicFormRenderer({
  schema,
  templateCode,
  projectId,
  projectName,
  userName,
  inventory = [],
  inventoryLoading,
  isSubmitting,
  initialData,
  initialComments = '',
  submitLabel,
  formFooter,
  formAccessMode = 'create',
  onSubmit,
}: DynamicFormRendererProps) {
  const { t, locale } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const photoBlobs = useRef(new Map<string, Blob>());
  const attachmentFiles = useRef(
    new Map<string, { blob: Blob; fileName: string; mimeType: string }>(),
  );
  const [comments, setComments] = useState(initialComments);
  const [showLiabilityDialog, setShowLiabilityDialog] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<Record<string, unknown> | null>(
    null,
  );

  const isMaterialForm = isMaterialFormCode(templateCode);
  const isLtrForm = templateCode === 'LTR';
  const billingLockedOnCreate =
    templateCode === 'WIR' && shouldLockWirBillingOnCreate(user, templateCode);

  const effectiveSchema = useMemo(
    () => (isLtrForm ? LTR_CMT_SCHEMA : schema),
    [isLtrForm, schema],
  );

  const schemaForValidation = useMemo(() => {
    if (!billingLockedOnCreate) return effectiveSchema;

    return {
      fields: effectiveSchema.fields.map((field) =>
        field.key === 'unitRate' || field.key === 'lineAmount'
          ? { ...field, required: false }
          : field,
      ),
    };
  }, [billingLockedOnCreate, effectiveSchema]);

  const defaultValues = useMemo(() => {
    const vals: Record<string, unknown> = {};
    for (const field of effectiveSchema.fields) {
      if (isMaterialForm && isMaterialFieldKey(field.key)) continue;
      if (initialData && field.key in initialData) {
        vals[field.key] = initialData[field.key];
      } else if (isBooleanFieldType(field.type)) {
        vals[field.key] = false;
      } else if (
        billingLockedOnCreate &&
        (field.key === 'unitRate' || field.key === 'lineAmount')
      ) {
        vals[field.key] = 0;
      }
    }
    return vals;
  }, [effectiveSchema.fields, initialData, isMaterialForm, billingLockedOnCreate]);

  const validationSchema = useMemo(() => {
    const base = buildZodSchema(
      { fields: schemaForValidation.fields },
      { excludeMaterialFields: isMaterialForm },
    );
    return isMaterialForm ? base.merge(materialZodSchema) : base;
  }, [schemaForValidation.fields, isMaterialForm]);

  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(validationSchema),
    defaultValues,
  });

  const testType = String(useWatch({ control: form.control, name: 'testType' }) ?? '');
  const watchedValues = useWatch({ control: form.control }) ?? {};

  const visibleFields = useMemo(() => {
    const data: Record<string, unknown> = {
      ...(watchedValues as Record<string, unknown>),
      testType,
    };

    let base = isMaterialForm
      ? effectiveSchema.fields.filter((f) => !isMaterialFieldKey(f.key))
      : effectiveSchema.fields;

    if (isLtrForm) {
      base = stripLegacyLtrFields(base);
    }

    return filterVisibleFields(base, data);
  }, [effectiveSchema.fields, isMaterialForm, isLtrForm, testType, watchedValues]);

  const failureLoadKn = useWatch({ control: form.control, name: 'failureLoadKn' });
  const specimenType = useWatch({ control: form.control, name: 'specimenType' });

  useEffect(() => {
    if (!isLtrForm) return;
    const load = Number(failureLoadKn);
    const type = String(specimenType ?? '');
    if (!load || !type) return;
    const mpa = calculateCompressiveStrengthMpa(load, type);
    if (mpa === null) return;
    form.setValue('compressiveStrengthMpa', mpa, { shouldValidate: true });
  }, [failureLoadKn, specimenType, isLtrForm, form]);

  const engineeringFields = useMemo(
    () =>
      isLtrForm
        ? visibleFields.filter((f) => !LTR_EVIDENCE_FIELD_TYPES.has(f.type))
        : visibleFields,
    [isLtrForm, visibleFields],
  );

  const evidenceFields = useMemo(
    () =>
      isLtrForm
        ? visibleFields.filter((f) => LTR_EVIDENCE_FIELD_TYPES.has(f.type))
        : [],
    [isLtrForm, visibleFields],
  );

  const resolveField = (field: (typeof visibleFields)[number]) => {
    const readOnly = isWirBillingFieldReadOnly(
      field.key,
      templateCode,
      user,
      formAccessMode,
    );
    return readOnly ? { ...field, readOnly: true } : field;
  };

  const mirFormInstanceId = String(
    useWatch({ control: form.control, name: MATERIAL_FIELD_KEYS.mirFormInstanceId }) ??
      '',
  );
  const quantityUsed = Number(
    useWatch({ control: form.control, name: MATERIAL_FIELD_KEYS.quantityUsed }) ?? 0,
  );

  const selectedInventory = findInventoryItem(inventory, mirFormInstanceId);
  const availableBalance = selectedInventory
    ? parseBalance(selectedInventory.availableBalance)
    : 0;
  const hasOverage =
    isMaterialForm && checkQuantityOverage(quantityUsed, availableBalance);

  const dateTimeLabels = useMemo(
    () => ({
      datePlaceholder: t.forms.datePlaceholder,
      timePlaceholder: t.forms.timePlaceholder,
      hour: t.forms.hour,
      minute: t.forms.minute,
      period: t.forms.period,
      am: t.forms.am,
      pm: t.forms.pm,
    }),
    [t.forms],
  );

  function handlePhotoCapture(key: string, result: CameraCaptureResult) {
    photoBlobs.current.set(key, result.blob);
    const value: PhotoFieldValue = {
      fileName: result.file.name,
      captureTimestamp: result.captureTimestamp,
      gpsLat: result.gpsLat,
      gpsLng: result.gpsLng,
      sizeBytes: result.sizeBytes,
      previewUrl: result.previewUrl,
    };
    form.setValue(key, value, { shouldValidate: true });
  }

  function handleAttachmentSelect(key: string, file: File) {
    attachmentFiles.current.set(key, {
      blob: file,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
    });
  }

  async function finalizeSubmit(values: Record<string, unknown>) {
    let data = { ...values };

    if (isMaterialForm) {
      data = buildMaterialFormData(values, inventory);
    }

    await onSubmit({
      data,
      comments,
      photoBlobs: new Map(photoBlobs.current),
      attachmentFiles: new Map(attachmentFiles.current),
      liabilityShiftRedAlert: Boolean(data.liabilityShiftRedAlert),
    });
  }

  function handleValidSubmit(values: Record<string, unknown>) {
    if (isMaterialForm && hasOverage) {
      setPendingSubmit(values);
      setShowLiabilityDialog(true);
      return;
    }
    void finalizeSubmit(values);
  }

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleValidSubmit)}
          className="space-y-6"
        >
          {isMaterialForm && (
            <MaterialReconciliationSection
              control={form.control}
              inventory={inventory}
              mirFormInstanceId={mirFormInstanceId}
              quantityUsed={quantityUsed}
              isLoading={inventoryLoading}
            />
          )}

          <div className="space-y-4">
            {engineeringFields.map((field) => (
              <FormFieldRenderer
                key={field.key}
                field={resolveField(field)}
                control={form.control}
                locale={locale}
                projectId={projectId}
                projectName={projectName}
                userName={userName}
                dateTimeLabels={dateTimeLabels}
                onPhotoCapture={handlePhotoCapture}
                onAttachmentSelect={handleAttachmentSelect}
              />
            ))}
          </div>

          {isLtrForm && evidenceFields.length > 0 && (
            <div className="space-y-4 border-t pt-6">
              <div>
                <h3 className="text-sm font-semibold">{t.laboratory.fieldEvidenceTitle}</h3>
                <p className="text-xs text-muted-foreground">{t.laboratory.fieldEvidenceDesc}</p>
              </div>
              {evidenceFields.map((field) => (
                <FormFieldRenderer
                  key={field.key}
                  field={field}
                  control={form.control}
                  locale={locale}
                  projectId={projectId}
                  projectName={projectName}
                  userName={userName}
                  dateTimeLabels={dateTimeLabels}
                  onPhotoCapture={handlePhotoCapture}
                  onAttachmentSelect={handleAttachmentSelect}
                />
              ))}
            </div>
          )}

          {formFooter}

          <div className="space-y-2">
            <Label htmlFor="form-comments">{t.forms.comments}</Label>
            <Textarea
              id="form-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder={t.forms.commentsPlaceholder}
            />
          </div>

          <Button
            type="submit"
            size="xl"
            className="w-full shadow-md"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="me-2 size-4 animate-spin" />
                {t.forms.savingOffline}
              </>
            ) : (
              submitLabel ?? t.forms.submitOffline
            )}
          </Button>
        </form>
      </Form>

      <LiabilityWarningDialog
        open={showLiabilityDialog}
        onOpenChange={setShowLiabilityDialog}
        quantityUsed={quantityUsed}
        availableBalance={availableBalance}
        unit={selectedInventory?.unit}
        onConfirm={() => {
          if (pendingSubmit) {
            void finalizeSubmit(pendingSubmit);
            setPendingSubmit(null);
          }
        }}
      />
    </>
  );
}
