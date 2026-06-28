import type { FormFieldDefinition, FormSchema } from './types';
import { parseFormSchema } from './types';

/** Legacy generic LTR fields — must never render on CMT forms */
export const LEGACY_LTR_FIELD_KEYS = new Set([
  'specifiedValue',
  'resultSummary',
  'location',
  'sampleReference',
]);

export const LTR_TEST_TYPE_VALUES = [
  'CONCRETE_SLUMP',
  'CONCRETE_COMPRESSIVE',
  'SOIL_COMPACTION',
] as const;

export type LtrTestType = (typeof LTR_TEST_TYPE_VALUES)[number];

const LTR_TEST_TYPE_WHEN = { field: 'testType', values: [...LTR_TEST_TYPE_VALUES] };

/** Canonical CMT engineering schema — source of truth for LTR UI */
export const LTR_CMT_FIELDS: FormFieldDefinition[] = [
  {
    key: 'testType',
    type: 'select',
    required: true,
    label: 'Test type',
    labelAr: 'نوع الفحص',
    options: [
      {
        value: 'CONCRETE_SLUMP',
        label: 'Fresh concrete — slump & temperature (ASTM C143)',
        labelAr: 'خرسانة حديثة — هبوط وحرارة الخرسانة',
      },
      {
        value: 'CONCRETE_COMPRESSIVE',
        label: 'Concrete compressive strength — cubes/cylinders (ASTM C39)',
        labelAr: 'مقاومة الضغط للخرسانة — مكعبات/أسطوانات',
      },
      {
        value: 'SOIL_COMPACTION',
        label: 'Soil compaction — field density test (ASTM D6938)',
        labelAr: 'دك التربة — اختبار الكثافة الحقلية',
      },
    ],
  },
  {
    key: 'testDate',
    type: 'date',
    required: true,
    label: 'Test date',
    labelAr: 'تاريخ الفحص',
    showWhen: LTR_TEST_TYPE_WHEN,
  },
  {
    key: 'deliveryTicketNo',
    type: 'text',
    required: true,
    label: 'Delivery ticket no.',
    labelAr: 'رقم بوليصة التوريد',
    showWhen: { field: 'testType', values: ['CONCRETE_SLUMP'] },
  },
  {
    key: 'truckNo',
    type: 'text',
    required: true,
    label: 'Truck no.',
    labelAr: 'رقم الخلاطة',
    showWhen: { field: 'testType', values: ['CONCRETE_SLUMP'] },
  },
  {
    key: 'batchingTime',
    type: 'time',
    required: true,
    label: 'Batching time',
    labelAr: 'وقت الخلط',
    showWhen: { field: 'testType', values: ['CONCRETE_SLUMP'] },
  },
  {
    key: 'samplingTime',
    type: 'time',
    required: true,
    label: 'Sampling time',
    labelAr: 'وقت أخذ العينة',
    showWhen: { field: 'testType', values: ['CONCRETE_SLUMP'] },
  },
  {
    key: 'ambientTemperatureC',
    type: 'number',
    required: true,
    label: 'Ambient temperature (°C)',
    labelAr: 'حرارة الجو (°م)',
    showWhen: { field: 'testType', values: ['CONCRETE_SLUMP'] },
  },
  {
    key: 'concreteTemperatureC',
    type: 'number',
    required: true,
    label: 'Concrete temperature (°C)',
    labelAr: 'حرارة الخرسانة (°م)',
    max: 32,
    showWhen: { field: 'testType', values: ['CONCRETE_SLUMP'] },
  },
  {
    key: 'slumpMm',
    type: 'number',
    required: true,
    label: 'Slump (mm)',
    labelAr: 'مقدار الهبوط (مم)',
    min: 0,
    showWhen: { field: 'testType', values: ['CONCRETE_SLUMP'] },
  },
  {
    key: 'specimenType',
    type: 'select',
    required: true,
    label: 'Specimen type',
    labelAr: 'نوع العينة',
    options: [
      { value: 'CUBE_150x150', label: 'Cube 150×150 mm', labelAr: 'مكعب 150×150 مم' },
      { value: 'CYLINDER_150x300', label: 'Cylinder 150×300 mm', labelAr: 'أسطوانة 150×300 مم' },
    ],
    showWhen: { field: 'testType', values: ['CONCRETE_COMPRESSIVE'] },
  },
  {
    key: 'testingAge',
    type: 'select',
    required: true,
    label: 'Testing age',
    labelAr: 'عمر الفحص',
    options: [
      { value: '7_DAYS', label: '7 days', labelAr: '7 أيام' },
      { value: '14_DAYS', label: '14 days', labelAr: '14 يوماً' },
      { value: '28_DAYS', label: '28 days', labelAr: '28 يوماً' },
    ],
    showWhen: { field: 'testType', values: ['CONCRETE_COMPRESSIVE'] },
  },
  {
    key: 'dateCast',
    type: 'date',
    required: true,
    label: 'Date cast',
    labelAr: 'تاريخ الصب',
    showWhen: { field: 'testType', values: ['CONCRETE_COMPRESSIVE'] },
  },
  {
    key: 'dateTested',
    type: 'date',
    required: true,
    label: 'Date tested',
    labelAr: 'تاريخ الكسر',
    showWhen: { field: 'testType', values: ['CONCRETE_COMPRESSIVE'] },
  },
  {
    key: 'failureLoadKn',
    type: 'number',
    required: true,
    label: 'Failure load (kN)',
    labelAr: 'حمل الكسر (كيلو نيوتن)',
    min: 0,
    showWhen: { field: 'testType', values: ['CONCRETE_COMPRESSIVE'] },
  },
  {
    key: 'compressiveStrengthMpa',
    type: 'number',
    required: true,
    label: 'Compressive strength (MPa)',
    labelAr: 'مقاومة الضغط (ميجا باسكال)',
    min: 0,
    readOnly: true,
    showWhen: { field: 'testType', values: ['CONCRETE_COMPRESSIVE'] },
  },
  {
    key: 'mdd',
    type: 'number',
    required: true,
    label: 'Max dry density — MDD (kN/m³)',
    labelAr: 'الكثافة الجافة القصوى (كيلو نيوتن/م³)',
    min: 0,
    showWhen: { field: 'testType', values: ['SOIL_COMPACTION'] },
  },
  {
    key: 'omc',
    type: 'number',
    required: true,
    label: 'Optimum moisture content — OMC (%)',
    labelAr: 'المحتوى المائي الأمثل (%)',
    min: 0,
    showWhen: { field: 'testType', values: ['SOIL_COMPACTION'] },
  },
  {
    key: 'fieldMoisturePct',
    type: 'number',
    required: true,
    label: 'Field moisture (%)',
    labelAr: 'المحتوى المائي الحقلي (%)',
    min: 0,
    showWhen: { field: 'testType', values: ['SOIL_COMPACTION'] },
  },
  {
    key: 'degreeOfCompactionPct',
    type: 'number',
    required: true,
    label: 'Degree of compaction (%)',
    labelAr: 'نسبة الدمك (%)',
    min: 0,
    max: 100,
    showWhen: { field: 'testType', values: ['SOIL_COMPACTION'] },
  },
  {
    key: 'testResult',
    type: 'select',
    required: true,
    label: 'Result',
    labelAr: 'النتيجة',
    options: [
      { value: 'PASS', label: 'Pass', labelAr: 'مطابق' },
      { value: 'FAIL', label: 'Fail', labelAr: 'غير مطابق' },
      { value: 'PASS_WITH_OBS', label: 'Pass with observations', labelAr: 'مطابق مع ملاحظات' },
    ],
    showWhen: LTR_TEST_TYPE_WHEN,
  },
  {
    key: 'siteLocation',
    type: 'gps_picker',
    required: true,
    label: 'Test site coordinates',
    labelAr: 'إحداثيات موقع الفحص',
    showWhen: LTR_TEST_TYPE_WHEN,
  },
  {
    key: 'sitePhoto',
    type: 'photo',
    required: true,
    label: 'Test photo (live camera)',
    labelAr: 'صورة الفحص (كاميرا مباشرة)',
    showWhen: LTR_TEST_TYPE_WHEN,
  },
  {
    key: 'testCertificate',
    type: 'file_attachment',
    required: false,
    label: 'Lab certificate (PDF)',
    labelAr: 'الشهادة المخبرية (PDF)',
    showWhen: LTR_TEST_TYPE_WHEN,
  },
];

export const LTR_CMT_SCHEMA: FormSchema = { fields: LTR_CMT_FIELDS };

function hasCmtEngineeringFields(fields: FormFieldDefinition[]): boolean {
  return fields.some((f) => f.key === 'deliveryTicketNo' || f.key === 'failureLoadKn' || f.key === 'mdd');
}

export function stripLegacyLtrFields(fields: FormFieldDefinition[]): FormFieldDefinition[] {
  return fields.filter((f) => !LEGACY_LTR_FIELD_KEYS.has(f.key));
}

/** Always return canonical CMT schema for LTR lab forms (ignores stale API templates). */
export function resolveLtrFormSchema(apiSchema: unknown): FormSchema {
  const parsed = parseFormSchema(apiSchema);
  const cleaned = stripLegacyLtrFields(parsed.fields);
  if (hasCmtEngineeringFields(cleaned)) {
    return { fields: cleaned };
  }
  return LTR_CMT_SCHEMA;
}

export function normalizeLtrTestType(value: unknown): LtrTestType | '' {
  const raw = String(value ?? '');
  const legacy: Record<string, LtrTestType> = {
    'Field work verification': 'CONCRETE_SLUMP',
    'Material sampling & analysis': 'SOIL_COMPACTION',
    CONCRETE_CUBE: 'CONCRETE_COMPRESSIVE',
    CONCRETE_SLUMP: 'CONCRETE_SLUMP',
    CONCRETE_COMPRESSIVE: 'CONCRETE_COMPRESSIVE',
    SOIL_COMPACTION: 'SOIL_COMPACTION',
  };
  return legacy[raw] ?? (LTR_TEST_TYPE_VALUES.includes(raw as LtrTestType) ? (raw as LtrTestType) : '');
}
