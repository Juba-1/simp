'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CloudOff,
  FileText,
  ImageIcon,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { db } from '@/lib/db/dexie';
import { useSyncStore } from '@/stores/sync-store';
import { useTranslation } from '@/stores/locale-store';

type ItemKind = 'form' | 'photo' | 'document';
type ItemState = 'pending' | 'syncing' | 'synced' | 'failed';

interface SyncHubItem {
  id: string;
  kind: ItemKind;
  label: string;
  state: ItemState;
}

const POLL_MS = 2_500;

export function SyncHubClient() {
  const { t } = useTranslation();
  const connectionStatus = useSyncStore((s) => s.connectionStatus);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const lastError = useSyncStore((s) => s.lastError);
  const processQueue = useSyncStore((s) => s.processQueue);

  const [items, setItems] = useState<SyncHubItem[]>([]);

  const refresh = useCallback(async () => {
    const [queue, uploads, instances] = await Promise.all([
      db.syncQueue.toArray(),
      db.pendingUploads.toArray(),
      db.formInstances.toArray(),
    ]);

    const codeByInstance = new Map(
      instances.map((i) => [i.id, i.templateCode]),
    );

    const formItems: SyncHubItem[] = queue
      .filter((q) => q.type === 'FORM_INSTANCE_UPSERT')
      .map((q) => {
        const code = codeByInstance.get(q.entityId);
        return {
          id: q.id,
          kind: 'form' as const,
          label: code
            ? `${code} · ${t.syncHub.itemForm}`
            : t.syncHub.itemForm,
          state: normalizeQueueState(q.status),
        };
      });

    const uploadItems: SyncHubItem[] = uploads.map((u) => {
      const isPhoto = u.gpsLat !== 0 || u.gpsLng !== 0;
      return {
        id: u.id,
        kind: isPhoto ? ('photo' as const) : ('document' as const),
        label: isPhoto ? t.syncHub.itemPhoto : t.syncHub.itemAttachment,
        state: normalizeUploadState(u.status),
      };
    });

    setItems([...formItems, ...uploadItems]);
  }, [t.syncHub.itemForm, t.syncHub.itemPhoto, t.syncHub.itemAttachment]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(interval);
  }, [refresh, connectionStatus, pendingCount]);

  const { active, done, total, progressPct, hasFailed } = useMemo(() => {
    const total = items.length;
    const done = items.filter((i) => i.state === 'synced').length;
    const active = items.filter((i) => i.state !== 'synced');
    const hasFailed = items.some((i) => i.state === 'failed');
    return {
      active,
      done,
      total,
      progressPct: total === 0 ? 100 : Math.round((done / total) * 100),
      hasFailed,
    };
  }, [items]);

  const isOffline = connectionStatus === 'offline';
  const isSyncing = connectionStatus === 'syncing';
  const allCaughtUp = active.length === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.syncHub.title}</h1>
        <p className="text-muted-foreground">{t.syncHub.subtitle}</p>
      </div>

      <ConnectionCard
        status={isOffline ? 'offline' : isSyncing ? 'syncing' : 'online'}
        pending={active.length}
        t={t}
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base">
              {allCaughtUp ? t.syncHub.allCaughtUp : t.syncHub.pendingTitle}
            </CardTitle>
            <CardDescription>
              {allCaughtUp
                ? t.syncHub.allCaughtUpDesc
                : t.syncHub.pendingCount.replace(
                    '{count}',
                    String(active.length),
                  )}
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5"
            disabled={isSyncing || isOffline || active.length === 0}
            onClick={() => void processQueue()}
          >
            <RefreshCw className={cn('size-3.5', isSyncing && 'animate-spin')} />
            {t.syncHub.forceSync}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {total > 0 && (
            <div className="space-y-1.5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    allCaughtUp ? 'bg-emerald-500' : 'bg-primary',
                    isSyncing && 'animate-pulse',
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {done}/{total} · {progressPct}%
              </p>
            </div>
          )}

          {allCaughtUp ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 className="size-10 text-emerald-500" />
              <p className="text-sm text-muted-foreground">
                {t.syncHub.allCaughtUpDesc}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {active.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <ItemIcon kind={item.kind} />
                    <span className="truncate text-sm font-medium">
                      {item.label}
                    </span>
                  </div>
                  <StateBadge state={item.state} t={t} />
                </li>
              ))}
            </ul>
          )}

          {hasFailed && !isOffline && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {t.syncHub.retryNote}
            </p>
          )}

          <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>{t.syncHub.lastSynced}</span>
            <span>
              {lastSyncAt
                ? new Date(lastSyncAt).toLocaleString()
                : t.syncHub.never}
            </span>
          </div>
          {lastError && !isOffline && (
            <p className="text-xs text-muted-foreground">{t.syncHub.retryNote}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ConnectionCard({
  status,
  pending,
  t,
}: {
  status: 'online' | 'offline' | 'syncing';
  pending: number;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const config = {
    online: {
      icon: Wifi,
      ring: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      title: t.syncHub.statusOnline,
      desc: t.syncHub.onlineDesc,
    },
    offline: {
      icon: WifiOff,
      ring: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      title: t.syncHub.statusOffline,
      desc: t.syncHub.offlineDesc,
    },
    syncing: {
      icon: Loader2,
      ring: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
      title: t.syncHub.statusSyncing,
      desc: t.syncHub.syncingDesc,
    },
  }[status];

  const Icon = config.icon;

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <span
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-xl',
            config.ring,
          )}
        >
          <Icon className={cn('size-6', status === 'syncing' && 'animate-spin')} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{config.title}</p>
            {pending > 0 && status !== 'syncing' && (
              <Badge variant="secondary" className="text-xs">
                {t.syncHub.pendingCount.replace('{count}', String(pending))}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{config.desc}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ItemIcon({ kind }: { kind: ItemKind }) {
  if (kind === 'photo') {
    return <ImageIcon className="size-4 shrink-0 text-muted-foreground" />;
  }
  if (kind === 'document') {
    return <FileText className="size-4 shrink-0 text-muted-foreground" />;
  }
  return <CloudOff className="size-4 shrink-0 text-muted-foreground" />;
}

function StateBadge({
  state,
  t,
}: {
  state: ItemState;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const map: Record<
    ItemState,
    { label: string; variant: 'secondary' | 'outline' | 'destructive' | 'default' }
  > = {
    pending: { label: t.syncHub.statePending, variant: 'secondary' },
    syncing: { label: t.syncHub.stateSyncing, variant: 'outline' },
    synced: { label: t.syncHub.stateSynced, variant: 'default' },
    failed: { label: t.syncHub.stateFailed, variant: 'destructive' },
  };
  const { label, variant } = map[state];
  return (
    <Badge variant={variant} className="shrink-0 gap-1">
      {state === 'syncing' && <Loader2 className="size-3 animate-spin" />}
      {label}
    </Badge>
  );
}

function normalizeQueueState(status: string): ItemState {
  if (status === 'synced') return 'synced';
  if (status === 'syncing') return 'syncing';
  if (status === 'failed') return 'failed';
  return 'pending';
}

function normalizeUploadState(status: string): ItemState {
  if (status === 'synced') return 'synced';
  if (status === 'uploading') return 'syncing';
  if (status === 'failed') return 'failed';
  return 'pending';
}
