import { apiFetch } from './client';
import type { SyncActionType } from '@/lib/db/types';

export interface SyncFormPayload {
  id?: string;
  projectId: string;
  templateId: string;
  referenceNumber?: string;
  comments?: string;
  status?: string;
  data: Record<string, unknown>;
  deviceTimestamp: string;
  clientRevision?: number;
}

export interface SyncAction {
  clientActionId: string;
  type: SyncActionType;
  entityId: string;
  deviceTimestamp: string;
  payload?: SyncFormPayload;
  fileAttachmentId?: string;
}

export interface SyncBatchPayload {
  batchId: string;
  clientDeviceId?: string;
  actions: SyncAction[];
}

export interface SyncBatchResponse {
  batchId: string;
  serverSyncTimestamp: string;
  processed: number;
  outcomes: Array<{
    clientActionId: string;
    entityId: string;
    type: SyncActionType;
    result: string;
    serverRecord?: unknown;
    message?: string;
  }>;
}

export function pushSyncBatch(token: string, batch: SyncBatchPayload) {
  return apiFetch<SyncBatchResponse>('/sync', {
    method: 'POST',
    token,
    body: JSON.stringify(batch),
  });
}
