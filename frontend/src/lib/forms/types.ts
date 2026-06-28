export type FormFieldType =
  | 'text'
  | 'string'
  | 'textarea'
  | 'number'
  | 'select'
  | 'photo'
  | 'camera'
  | 'date'
  | 'time'
  | 'boolean'
  | 'toggle'
  | 'gps_picker'
  | 'file_attachment';

export interface FormFieldShowWhen {
  field: string;
  values: string[];
}

export interface FormFieldOption {
  value: string;
  label: string;
  labelAr?: string;
}

export interface FormFieldDefinition {
  key: string;
  type: FormFieldType | string;
  required?: boolean;
  label?: string;
  labelAr?: string;
  placeholder?: string;
  placeholderAr?: string;
  options?: FormFieldOption[];
  min?: number;
  max?: number;
  showWhen?: FormFieldShowWhen;
  readOnly?: boolean;
}

export interface FormSchema {
  fields: FormFieldDefinition[];
}

export interface FormTemplateResponse {
  id: string;
  projectId: string;
  code: string;
  name: string;
  nameAr?: string | null;
  version: number;
  schema: FormSchema;
  uiSchema?: Record<string, unknown> | null;
  isActive: boolean;
}

export interface PhotoFieldValue {
  fileName: string;
  captureTimestamp: string;
  gpsLat: number;
  gpsLng: number;
  sizeBytes: number;
  previewUrl?: string;
}

export interface GpsFieldValue {
  lat: number;
  lng: number;
  accuracy?: number;
  capturedAt: string;
}

export interface FileAttachmentFieldValue {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  pendingUpload?: boolean;
}

export const MATERIAL_FORM_CODES = ['WIR', 'MDR'] as const;
export type MaterialFormCode = (typeof MATERIAL_FORM_CODES)[number];

export const MATERIAL_FIELD_KEYS = {
  mirFormInstanceId: 'mirFormInstanceId',
  quantityUsed: 'quantityUsed',
  materialCode: 'materialCode',
} as const;

export function isMaterialFormCode(code: string): code is MaterialFormCode {
  return MATERIAL_FORM_CODES.includes(code as MaterialFormCode);
}

export function parseFormSchema(raw: unknown): FormSchema {
  if (!raw || typeof raw !== 'object') {
    return { fields: [] };
  }
  const schema = raw as FormSchema;
  return { fields: Array.isArray(schema.fields) ? schema.fields : [] };
}

export function isPhotoFieldType(type: string): boolean {
  return type === 'photo' || type === 'camera';
}

export function isBooleanFieldType(type: string): boolean {
  return type === 'boolean' || type === 'toggle';
}

export function isMaterialFieldKey(key: string): boolean {
  return (
    key === MATERIAL_FIELD_KEYS.mirFormInstanceId ||
    key === MATERIAL_FIELD_KEYS.quantityUsed ||
    key === MATERIAL_FIELD_KEYS.materialCode
  );
}
