export type SyncQueueStatus = 'pending' | 'syncing' | 'synced' | 'failed';
export type UploadStatus = 'pending' | 'uploading' | 'synced' | 'failed';

export type SyncActionType =
  | 'FORM_INSTANCE_UPSERT'
  | 'FORM_INSTANCE_DELETE'
  | 'FILE_ATTACHMENT_LINK';

export interface LocalFormTemplate {
  id: string;
  projectId: string;
  code: string;
  name: string;
  nameAr?: string;
  version: number;
  schema: Record<string, unknown>;
  uiSchema?: Record<string, unknown>;
  updatedAt: string;
  syncedAt?: string;
}

export interface LocalFormInstance {
  id: string;
  projectId: string;
  templateId: string;
  templateCode?: string;
  referenceNumber?: string;
  comments: string;
  status: string;
  data: Record<string, unknown>;
  deviceTimestamp: string;
  clientRevision: number;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}

export interface OfflineSyncQueueItem {
  id: string;
  type: SyncActionType;
  entityId: string;
  deviceTimestamp: string;
  payload: Record<string, unknown>;
  fileAttachmentId?: string;
  status: SyncQueueStatus;
  attempts: number;
  lastError?: string;
  createdAt: string;
  syncedAt?: string;
  /** After FORM_INSTANCE_UPSERT sync, auto-call workflow submit */
  workflowSubmitPending?: boolean;
}

export interface PendingUpload {
  id: string;
  projectId: string;
  formInstanceId?: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  gpsLat: number;
  gpsLng: number;
  captureTimestamp: string;
  status: UploadStatus;
  serverAttachmentId?: string;
  syncQueueItemId?: string;
  attempts: number;
  lastError?: string;
  createdAt: string;
}

export interface SyncMeta {
  id: string;
  lastPullAt?: string;
  deviceId: string;
}
