import { apiFetch } from './client';

export interface AuditLogEntry {
  id: string;
  organizationId: string | null;
  projectId: string | null;
  userId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  source: string;
  createdAt: string;
  newData?: Record<string, unknown> | null;
  previousData?: Record<string, unknown> | null;
}

export interface PaginatedAuditLogs {
  data: AuditLogEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuditTimelineEvent {
  type: 'audit' | 'approval';
  timestamp: string;
  action: string;
  source: string;
  actor: string | null;
  details: Record<string, unknown>;
}

export interface FormAuditHistory {
  formInstanceId: string;
  referenceNumber: string | null;
  timeline: AuditTimelineEvent[];
  auditLogs: unknown[];
  approvalRecords: unknown[];
}

export function fetchFormAuditHistory(token: string, formInstanceId: string) {
  return apiFetch<FormAuditHistory>(
    `/audit/forms/${formInstanceId}/history`,
    { token },
  );
}

export function fetchAuditLogs(token: string, page = 1, limit = 50) {
  return apiFetch<PaginatedAuditLogs>(
    `/audit/logs?page=${page}&limit=${limit}`,
    { token },
  );
}

export function fetchProjectAuditLogs(
  token: string,
  projectId: string,
  page = 1,
  limit = 50,
) {
  return apiFetch<PaginatedAuditLogs>(
    `/audit/logs?projectId=${projectId}&page=${page}&limit=${limit}`,
    { token },
  );
}

export function fetchGlobalAuditLogs(token: string, page = 1, limit = 50) {
  return apiFetch<PaginatedAuditLogs>(
    `/system/audit/logs?page=${page}&limit=${limit}`,
    { token },
  );
}
