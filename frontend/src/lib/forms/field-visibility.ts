import type { FormFieldDefinition } from './types';

export function isFieldVisible(
  field: FormFieldDefinition,
  data: Record<string, unknown>,
): boolean {
  if (!field.showWhen) return true;
  const current = data[field.showWhen.field];
  if (current === undefined || current === null || current === '') return false;
  return field.showWhen.values.includes(String(current));
}

export function filterVisibleFields(
  fields: FormFieldDefinition[],
  data: Record<string, unknown>,
): FormFieldDefinition[] {
  return fields.filter((field) => isFieldVisible(field, data));
}

export const LTR_EVIDENCE_FIELD_TYPES = new Set([
  'gps_picker',
  'photo',
  'camera',
  'file_attachment',
]);
