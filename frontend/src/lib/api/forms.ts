import { apiFetch } from './client';
import type { FormTemplateResponse } from '@/lib/forms/types';

export function fetchProjectTemplates(token: string, projectId: string) {
  return apiFetch<FormTemplateResponse[]>(
    `/forms/templates/project/${projectId}`,
    { token },
  );
}

export function fetchTemplate(token: string, templateId: string) {
  return apiFetch<FormTemplateResponse>(`/forms/templates/${templateId}`, {
    token,
  });
}

export interface SeedTemplatesResult {
  projectId: string;
  createdCount: number;
  updatedCount?: number;
  skippedCodes: string[];
  updatedCodes?: string[];
  templates: FormTemplateResponse[];
}

export function seedStandardTemplates(token: string, projectId: string) {
  return apiFetch<SeedTemplatesResult>(
    `/forms/templates/seed/project/${projectId}`,
    { method: 'POST', token },
  );
}

export interface FormInstanceRecord {
  id: string;
  projectId: string;
  templateId: string;
  organizationId: string;
  referenceNumber: string | null;
  revisionNumber: number;
  comments: string;
  status: string;
  workflowPhase: string;
  currentPendingOrgType: string | null;
  data: Record<string, unknown>;
  liabilityShiftRedAlert: boolean;
  slaBreached: boolean;
  deviceTimestamp: string;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  template: {
    id: string;
    code: string;
    name: string;
    version: number;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count?: { attachments: number };
}

export interface PaginatedFormInstances {
  data: FormInstanceRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const DEFAULT_FORM_INSTANCES_LIMIT = 50;
const MAX_FORM_INSTANCES_LIMIT = 100;

export function fetchProjectFormInstances(
  token: string,
  projectId: string,
  params?: { page?: number; limit?: number; status?: string; templateId?: string },
) {
  const search = new URLSearchParams();
  const page = params?.page ?? 1;
  const limit = Math.min(
    params?.limit ?? DEFAULT_FORM_INSTANCES_LIMIT,
    MAX_FORM_INSTANCES_LIMIT,
  );
  search.set('page', String(page));
  search.set('limit', String(limit));
  if (params?.status) search.set('status', params.status);
  if (params?.templateId) search.set('templateId', params.templateId);
  const qs = search.toString();
  return apiFetch<PaginatedFormInstances>(
    `/forms/instances/project/${projectId}${qs ? `?${qs}` : ''}`,
    { token },
  );
}

export function fetchFormInstance(token: string, formId: string) {
  return apiFetch<FormInstanceRecord>(`/forms/instances/${formId}`, { token });
}

export interface UpdateFormInstancePayload {
  referenceNumber?: string;
  comments?: string;
  data?: Record<string, unknown>;
  deviceTimestamp: string;
  clientRevision?: number;
}

export function updateFormInstance(
  token: string,
  formId: string,
  payload: UpdateFormInstancePayload,
) {
  return apiFetch<FormInstanceRecord>(`/forms/instances/${formId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });
}
