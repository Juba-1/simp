import { apiFetch } from './client';

export interface LabTestRequest {
  id: string;
  ltrId: string;
  testType: string;
  anonymousLabel: string;
  status: string;
  createdAt: string;
  result?: {
    resultStatus: string;
    reportNotes?: string;
  } | null;
}

export interface PendingLabTestRequest {
  id: string;
  ltrId: string;
  testType: string;
  anonymousLabel: string;
  status: string;
  createdAt: string;
  project: { id: string; code: string; name: string; nameAr: string | null };
  formInstance: {
    template: { code: string; name: string };
  };
}

function withLtrId<T extends { barcode: string }>(row: T): T & { ltrId: string } {
  return { ...row, ltrId: row.barcode };
}

export interface LabParentFormReference {
  referenceNumber: string;
  templateCode: string;
  location?: string;
  materialType?: string;
  chainage?: string;
}

export interface LabRequestDetail {
  id: string;
  ltrId: string;
  testType: string;
  anonymousLabel: string;
  status: string;
  requestedAt: string;
  sampleCategory: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  parentForm: LabParentFormReference;
}

export interface CreateLabTestRequestPayload {
  formInstanceId: string;
  testType?: string;
}

export function createLabTestRequest(
  token: string,
  payload: CreateLabTestRequestPayload,
) {
  return apiFetch<LabTestRequest & { barcode: string }>('/laboratory/requests', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  }).then((row) => withLtrId(row));
}

export function fetchLabRequestsByForm(token: string, formInstanceId: string) {
  return apiFetch<Array<LabTestRequest & { barcode: string }>>(
    `/laboratory/requests/form/${formInstanceId}`,
    { token },
  ).then((rows) => rows.map(withLtrId));
}

export function fetchPendingLabRequests(token: string) {
  return apiFetch<Array<PendingLabTestRequest & { barcode: string }>>(
    '/laboratory/requests/pending',
    { token },
  ).then((rows) => rows.map(withLtrId));
}

export function fetchLabRequestById(token: string, requestId: string) {
  return apiFetch<LabRequestDetail>(`/laboratory/requests/${requestId}`, {
    token,
  });
}

export type LabResultStatus = 'PASS' | 'FAIL' | 'INCONCLUSIVE';

export interface SubmitLabResultPayload {
  resultStatus: LabResultStatus;
  metrics: Record<string, unknown>;
  reportNotes?: string;
}

export function submitLabResultByRequestId(
  token: string,
  requestId: string,
  payload: SubmitLabResultPayload,
) {
  return apiFetch(`/laboratory/requests/${requestId}/results`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

/** Map LTR form payload to lab result submission */
export function mapLtrFormToLabResult(data: Record<string, unknown>): SubmitLabResultPayload {
  const testResult = String(data.testResult ?? 'PASS');
  let resultStatus: LabResultStatus = 'PASS';
  if (testResult === 'FAIL') resultStatus = 'FAIL';
  else if (testResult === 'PASS_WITH_OBS') resultStatus = 'INCONCLUSIVE';

  const { testResult: _tr, ...metrics } = data;

  return {
    resultStatus,
    metrics: {
      ...metrics,
      testResult,
    },
    reportNotes: buildLtrReportNotes(data),
  };
}

function buildLtrReportNotes(data: Record<string, unknown>): string | undefined {
  const testType = String(data.testType ?? '');
  switch (testType) {
    case 'CONCRETE_SLUMP':
      return `Slump ${data.slumpMm} mm @ ${data.concreteTemperatureC}°C`;
    case 'CONCRETE_COMPRESSIVE':
      return `f'c = ${data.compressiveStrengthMpa} MPa (${data.testingAge})`;
    case 'SOIL_COMPACTION':
      return `Compaction ${data.degreeOfCompactionPct}% (MDD ${data.mdd})`;
    default:
      return undefined;
  }
}
