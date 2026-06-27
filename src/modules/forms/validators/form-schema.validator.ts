import { BadRequestException } from '@nestjs/common';
import { FormSchemaDto } from '../dto/form-template.dto';

function isFieldVisible(
  field: { key: string; showWhen?: { field: string; values: string[] } },
  data: Record<string, unknown>,
): boolean {
  if (!field.showWhen) return true;
  const current = data[field.showWhen.field];
  if (current === undefined || current === null || current === '') return false;
  return field.showWhen.values.includes(String(current));
}

export function validateFormPayload(
  schema: FormSchemaDto,
  data: Record<string, unknown>,
): void {
  const errors: string[] = [];

  for (const field of schema.fields ?? []) {
    if (!isFieldVisible(field, data)) continue;

    const value = data[field.key];

    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field "${field.key}" is required`);
      continue;
    }

    if (value === undefined || value === null) continue;

    switch (field.type) {
      case 'number':
        if (typeof value !== 'number' && Number.isNaN(Number(value))) {
          errors.push(`Field "${field.key}" must be a number`);
        }
        break;
      case 'string':
      case 'text':
      case 'textarea':
        if (typeof value !== 'string') {
          errors.push(`Field "${field.key}" must be a string`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Field "${field.key}" must be a boolean`);
        }
        break;
      case 'gps_picker':
        if (
          typeof value !== 'object' ||
          value === null ||
          typeof (value as { lat?: unknown }).lat !== 'number' ||
          typeof (value as { lng?: unknown }).lng !== 'number'
        ) {
          errors.push(`Field "${field.key}" must include GPS coordinates`);
        }
        break;
      case 'file_attachment':
        if (typeof value !== 'object' || value === null) {
          errors.push(`Field "${field.key}" must be a file attachment reference`);
        }
        break;
      case 'date':
        if (Number.isNaN(Date.parse(String(value)))) {
          errors.push(`Field "${field.key}" must be a valid date`);
        }
        break;
      case 'time':
        if (typeof value !== 'string' || !/^\d{2}:\d{2}/.test(value)) {
          errors.push(`Field "${field.key}" must be a valid time`);
        }
        break;
      case 'select':
        if (typeof value !== 'string' && typeof value !== 'number') {
          errors.push(`Field "${field.key}" must be a string or number`);
        }
        break;
    }
  }

  if (errors.length > 0) {
    throw new BadRequestException({
      message: 'Form data validation failed',
      errors,
    });
  }
}

export function parseFormSchema(raw: unknown): FormSchemaDto {
  if (!raw || typeof raw !== 'object') {
    throw new BadRequestException('Template schema is invalid');
  }

  const schema = raw as FormSchemaDto;
  if (!Array.isArray(schema.fields)) {
    throw new BadRequestException('Template schema must include a fields array');
  }

  return schema;
}
