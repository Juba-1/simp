import { apiFetch } from './client';

export interface IpcLineItem {
  id: string;
  formInstanceId: string;
  description: string;
  quantity: string;
  unitRate: string;
  lineAmount: string;
  formInstance?: {
    id: string;
    referenceNumber: string | null;
    status: string;
  };
}

export interface IpcRecord {
  id: string;
  projectId: string;
  certificateNumber: string;
  status: string;
  subtotalAmount: string;
  currency: string;
  notes: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  lineItems: IpcLineItem[];
  contractorOrg?: { id: string; name: string; type: string };
}

export interface CreateIpcDraftPayload {
  projectId: string;
  periodStart?: string;
  periodEnd?: string;
  notes?: string;
  formInstanceIds?: string[];
}

export function fetchProjectIpcs(token: string, projectId: string) {
  return apiFetch<IpcRecord[]>(`/ipc/project/${projectId}`, { token });
}

export function fetchIpc(token: string, ipcId: string) {
  return apiFetch<IpcRecord>(`/ipc/${ipcId}`, { token });
}

export function generateDraftIpc(token: string, payload: CreateIpcDraftPayload) {
  return apiFetch<IpcRecord>('/ipc/draft', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export interface EligibleWir {
  id: string;
  referenceNumber: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  data: Record<string, unknown>;
  template: { code: string; name: string };
}

export function fetchEligibleWirs(token: string, projectId: string) {
  return apiFetch<EligibleWir[]>(`/ipc/eligible-wirs/project/${projectId}`, {
    token,
  });
}

export function submitIpcForReview(
  token: string,
  ipcId: string,
  payload: { comments?: string },
) {
  return apiFetch<IpcRecord>(`/ipc/${ipcId}/submit`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function approveIpcConsultant(
  token: string,
  ipcId: string,
  payload: { comments?: string },
) {
  return apiFetch<IpcRecord>(`/ipc/${ipcId}/approve-consultant`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function rejectIpcConsultant(
  token: string,
  ipcId: string,
  payload: { comments?: string; rejectionReason?: string },
) {
  return apiFetch<IpcRecord>(`/ipc/${ipcId}/reject-consultant`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function approveIpcClient(
  token: string,
  ipcId: string,
  payload: { comments?: string },
) {
  return apiFetch<IpcRecord>(`/ipc/${ipcId}/approve-client`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function rejectIpcClient(
  token: string,
  ipcId: string,
  payload: { comments?: string; rejectionReason?: string },
) {
  return apiFetch<IpcRecord>(`/ipc/${ipcId}/reject-client`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}
