import { z } from 'zod';
import { isFieldVisible } from './field-visibility';
import type { FormFieldDefinition, FormSchema } from './types';
import { isMaterialFieldKey, isPhotoFieldType } from './types';

const photoValueSchema = z.object({
  fileName: z.string(),
  captureTimestamp: z.string(),
  gpsLat: z.number(),
  gpsLng: z.number(),
  sizeBytes: z.number(),
  previewUrl: z.string().optional(),
});

const gpsValueSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number().optional(),
  capturedAt: z.string(),
});

const fileAttachmentValueSchema = z.object({
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  pendingUpload: z.boolean().optional(),
});

function fieldToZod(field: FormFieldDefinition, required: boolean): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  if (isPhotoFieldType(field.type)) {
    schema = photoValueSchema;
  } else if (field.type === 'gps_picker') {
    schema = gpsValueSchema;
  } else if (field.type === 'file_attachment') {
    schema = fileAttachmentValueSchema;
  } else {
    switch (field.type) {
      case 'number':
        schema = z.coerce.number();
        if (field.min !== undefined) schema = (schema as z.ZodNumber).min(field.min);
        if (field.max !== undefined) schema = (schema as z.ZodNumber).max(field.max);
        break;
      case 'boolean':
      case 'toggle':
        schema = z.boolean();
        break;
      case 'date':
      case 'time':
        schema = z.string().min(1);
        break;
      case 'select':
        if (field.options?.length) {
          schema = z.enum(
            field.options.map((o) => o.value) as [string, ...string[]],
          );
        } else {
          schema = z.string();
        }
        break;
      default:
        schema = z.string();
    }
  }

  if (!required) {
    schema = schema.optional().nullable();
  }

  return schema;
}

export function buildZodSchema(
  schema: FormSchema,
  options?: { excludeMaterialFields?: boolean },
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const fields = schema.fields.filter(
    (field) => !(options?.excludeMaterialFields && isMaterialFieldKey(field.key)),
  );

  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.key] = fieldToZod(field, false);
  }

  return z.object(shape).superRefine((data, ctx) => {
    for (const field of fields) {
      if (!isFieldVisible(field, data as Record<string, unknown>)) continue;
      if (!field.required) continue;

      const val = (data as Record<string, unknown>)[field.key];
      if (val === undefined || val === null || val === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field.key],
          message: 'Required',
        });
      }
    }
  });
}
