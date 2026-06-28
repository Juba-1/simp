'use client';

import { create } from 'zustand';
import { db, countPendingSyncItems, getDeviceId } from '@/lib/db/dexie';
import type {
  LocalFormInstance,
  OfflineSyncQueueItem,
  PendingUpload,
  SyncActionType,
} from '@/lib/db/types';
import { pushSyncBatch } from '@/lib/api/sync';
import { submitFormWorkflow } from '@/lib/api/workflows';
import { uploadPhoto } from '@/lib/api/uploads';
import { ApiError } from '@/lib/api/client';
import { yieldToMain } from '@/lib/sync/yield-to-main';
import { useAuthStore } from '@/stores/auth-store';

export type ConnectionStatus = 'online' | 'offline' | 'syncing';

interface SyncState {
  connectionStatus: ConnectionStatus;
  pendingCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
  isInitialized: boolean;
  simulatedOffline: boolean;
  initialize: () => void;
  setSimulatedOffline: (value: boolean) => void;
  refreshPendingCount: () => Promise<void>;
  processQueue: () => Promise<void>;
  saveFormInstanceOffline: (
    instance: Omit<LocalFormInstance, 'createdAt' | 'updatedAt'>,
    options?: { submitAfterSync?: boolean },
  ) => Promise<LocalFormInstance>;
  queueUpload: (
    upload: Omit<
      PendingUpload,
      'id' | 'status' | 'attempts' | 'createdAt'
    >,
  ) => Promise<PendingUpload>;
}

let syncInFlight = false;
let pendingCountTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePendingCountRefresh(refresh: () => Promise<void>) {
  if (pendingCountTimer) clearTimeout(pendingCountTimer);
  pendingCountTimer = setTimeout(() => {
    pendingCountTimer = null;
    void refresh();
  }, 120);
}

export const useSyncStore = create<SyncState>((set, get) => ({
  connectionStatus: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
  pendingCount: 0,
  lastSyncAt: null,
  lastError: null,
  isInitialized: false,
  simulatedOffline: false,

  setSimulatedOffline: (value) => {
    set({
      simulatedOffline: value,
      connectionStatus: value
        ? 'offline'
        : navigator.onLine
          ? 'online'
          : 'offline',
    });
    if (!value && navigator.onLine) {
      void get().processQueue();
    }
  },

  initialize: () => {
    if (get().isInitialized || typeof window === 'undefined') return;

    const updateOnline = (online: boolean) => {
      if (get().simulatedOffline) {
        set({ connectionStatus: 'offline' });
        return;
      }
      set({ connectionStatus: online ? 'online' : 'offline' });
      if (online) {
        void get().processQueue();
      }
    };

    window.addEventListener('online', () => updateOnline(true));
    window.addEventListener('offline', () => updateOnline(false));

    // Omnipresent background sync: whenever the user returns to the app on any
    // page (tab focus / visibility), silently flush the queue if we are online.
    const flushIfOnline = () => {
      if (navigator.onLine && !get().simulatedOffline) {
        void get().processQueue();
      }
    };
    window.addEventListener('focus', flushIfOnline);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') flushIfOnline();
    });

    set({ isInitialized: true, connectionStatus: navigator.onLine ? 'online' : 'offline' });
    schedulePendingCountRefresh(get().refreshPendingCount);
    if (navigator.onLine) {
      void get().processQueue();
    }
  },

  refreshPendingCount: async () => {
    const count = await countPendingSyncItems();
    set({ pendingCount: count });
  },

  saveFormInstanceOffline: async (instance, options) => {
    const now = new Date().toISOString();
    const record: LocalFormInstance = {
      ...instance,
      createdAt: now,
      updatedAt: now,
    };

    const queueItem: OfflineSyncQueueItem = {
      id: crypto.randomUUID(),
      type: 'FORM_INSTANCE_UPSERT',
      entityId: record.id,
      deviceTimestamp: record.deviceTimestamp,
      payload: {
        id: record.id,
        projectId: record.projectId,
        templateId: record.templateId,
        referenceNumber: record.referenceNumber,
        comments: record.comments,
        status: record.status,
        data: record.data,
        deviceTimestamp: record.deviceTimestamp,
        clientRevision: record.clientRevision,
      },
      status: 'pending',
      attempts: 0,
      createdAt: now,
      workflowSubmitPending: Boolean(options?.submitAfterSync),
    };

    await db.transaction('rw', db.formInstances, db.syncQueue, async () => {
      await db.formInstances.put(record);
      await db.syncQueue.put(queueItem);
    });

    schedulePendingCountRefresh(get().refreshPendingCount);

    if (navigator.onLine) {
      void get().processQueue();
    }

    return record;
  },

  queueUpload: async (upload) => {
    const record: PendingUpload = {
      ...upload,
      id: crypto.randomUUID(),
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    await db.pendingUploads.put(record);
    schedulePendingCountRefresh(get().refreshPendingCount);

    if (navigator.onLine) {
      void get().processQueue();
    }

    return record;
  },

  processQueue: async () => {
    if (syncInFlight || !navigator.onLine || get().simulatedOffline) return;

    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    syncInFlight = true;
    set({ connectionStatus: 'syncing', lastError: null });

    try {
      await pushPendingSyncActions(token);
      await yieldToMain();
      await uploadPendingFiles(token);
      set({
        connectionStatus: 'online',
        lastSyncAt: new Date().toISOString(),
        lastError: null,
      });
    } catch (error) {
      set({
        connectionStatus: navigator.onLine ? 'online' : 'offline',
        lastError: error instanceof Error ? error.message : 'Sync failed',
      });
    } finally {
      syncInFlight = false;
      schedulePendingCountRefresh(get().refreshPendingCount);
    }
  },
}));

async function uploadPendingFiles(token: string) {
  const uploads = await db.pendingUploads
    .where('status')
    .anyOf(['pending', 'failed'])
    .toArray();

  for (const item of uploads) {
    await db.pendingUploads.update(item.id, { status: 'uploading' });

    try {
      const response = await uploadPhoto(
        token,
        item.blob,
        item.fileName,
        {
          projectId: item.projectId,
          formInstanceId: item.formInstanceId,
          gps_lat: item.gpsLat,
          gps_lng: item.gpsLng,
          capture_timestamp: item.captureTimestamp,
          device_id: getDeviceId(),
          camera_facing: 'environment',
        },
      );

      await db.pendingUploads.update(item.id, {
        status: 'synced',
        serverAttachmentId: response.id,
      });
    } catch (error) {
      await db.pendingUploads.update(item.id, {
        status: 'failed',
        attempts: item.attempts + 1,
        lastError: error instanceof Error ? error.message : 'Upload failed',
      });
      throw error;
    }

    await yieldToMain();
  }
}

async function pushPendingSyncActions(token: string) {
  const pending = await db.syncQueue
    .where('status')
    .anyOf(['pending', 'failed'])
    .sortBy('createdAt');

  if (pending.length === 0) return;

  const batchId = crypto.randomUUID();
  const actions = pending.map((item) => ({
    clientActionId: item.id,
    type: item.type as SyncActionType,
    entityId: item.entityId,
    deviceTimestamp: item.deviceTimestamp,
    payload: item.payload as never,
    fileAttachmentId: item.fileAttachmentId,
  }));

  for (const item of pending) {
    await db.syncQueue.update(item.id, { status: 'syncing' });
  }

  try {
    const result = await pushSyncBatch(token, {
      batchId,
      clientDeviceId: getDeviceId(),
      actions,
    });

    const outcomeMap = new Map(
      result.outcomes.map((o) => [o.clientActionId, o]),
    );

    for (const item of pending) {
      const outcome = outcomeMap.get(item.id);
      const synced =
        outcome &&
        ['APPLIED', 'CONFLICT_OVERWRITTEN', 'SKIPPED_STALE'].includes(
          outcome.result,
        );

      await db.syncQueue.update(item.id, {
        status: synced ? 'synced' : 'failed',
        syncedAt: synced ? new Date().toISOString() : undefined,
        lastError: outcome?.message,
        attempts: item.attempts + 1,
      });

      if (synced && item.type === 'FORM_INSTANCE_UPSERT') {
        await db.formInstances.update(item.entityId, {
          syncedAt: new Date().toISOString(),
        });

        if (item.workflowSubmitPending) {
          await triggerWorkflowSubmit(token, item);
        }
      }

      await yieldToMain();
    }
  } catch (error) {
    for (const item of pending) {
      await db.syncQueue.update(item.id, {
        status: 'failed',
        attempts: item.attempts + 1,
        lastError: error instanceof Error ? error.message : 'Sync failed',
      });
    }
    throw error;
  }
}

async function triggerWorkflowSubmit(
  token: string,
  item: OfflineSyncQueueItem,
) {
  if (!item.workflowSubmitPending) {
    return;
  }

  const payload = item.payload as {
    comments?: string;
  };

  try {
    await submitFormWorkflow(token, item.entityId, {
      comments:
        typeof payload.comments === 'string' ? payload.comments : undefined,
    });
    await db.syncQueue.update(item.id, { workflowSubmitPending: false });
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 400 || error.status === 403 || error.status === 409)
    ) {
      await db.syncQueue.update(item.id, {
        workflowSubmitPending: false,
        lastError:
          error instanceof ApiError ? error.message : 'Workflow submit failed',
      });
      return;
    }
    throw error;
  }
}
