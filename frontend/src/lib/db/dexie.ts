import Dexie, { type Table } from 'dexie';
import type {
  LocalFormInstance,
  LocalFormTemplate,
  OfflineSyncQueueItem,
  PendingUpload,
  SyncMeta,
} from './types';

export class SimpDatabase extends Dexie {
  formTemplates!: Table<LocalFormTemplate, string>;
  formInstances!: Table<LocalFormInstance, string>;
  syncQueue!: Table<OfflineSyncQueueItem, string>;
  pendingUploads!: Table<PendingUpload, string>;
  syncMeta!: Table<SyncMeta, string>;

  constructor() {
    super('simp_platform');

    this.version(1).stores({
      formTemplates: 'id, projectId, code, updatedAt',
      formInstances: 'id, projectId, templateId, status, updatedAt',
      syncQueue: 'id, status, entityId, createdAt',
      pendingUploads: 'id, status, projectId, formInstanceId, createdAt',
      syncMeta: 'id',
    });
  }
}

export const db =
  typeof window !== 'undefined' ? new SimpDatabase() : (null as unknown as SimpDatabase);

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';

  const key = 'simp-device-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export async function countPendingSyncItems(): Promise<number> {
  if (!db) return 0;
  const [queueCount, uploadCount] = await Promise.all([
    db.syncQueue.where('status').anyOf(['pending', 'failed']).count(),
    db.pendingUploads.where('status').anyOf(['pending', 'failed']).count(),
  ]);
  return queueCount + uploadCount;
}
