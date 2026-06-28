'use client';

import Link from 'next/link';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSyncStore } from '@/stores/sync-store';
import { useTranslation } from '@/stores/locale-store';

export function GlobalSyncIndicator() {
  const { t } = useTranslation();
  const connectionStatus = useSyncStore((s) => s.connectionStatus);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const processQueue = useSyncStore((s) => s.processQueue);

  const isOffline = connectionStatus === 'offline';
  const isSyncing = connectionStatus === 'syncing';

  const label = isOffline
    ? t.syncIndicator.offline
    : isSyncing
      ? t.syncIndicator.syncing.replace('{count}', String(pendingCount))
      : pendingCount > 0
        ? t.syncIndicator.onlinePending.replace('{count}', String(pendingCount))
        : t.syncIndicator.online;

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-9 gap-2 px-2.5 text-xs font-medium sm:px-3',
          isOffline && 'text-destructive',
          !isOffline && pendingCount > 0 && 'text-amber-700 dark:text-amber-400',
        )}
        onClick={() => {
          if (!isOffline && !isSyncing) {
            void processQueue();
          }
        }}
        asChild={isOffline}
        disabled={isSyncing}
        title={t.syncIndicator.hint}
      >
        {isOffline ? (
          <Link href="/dashboard/sync" className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-red-500" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        ) : (
          <>
            {isSyncing ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <span
                className={cn(
                  'size-2 rounded-full',
                  pendingCount > 0 ? 'bg-amber-500' : 'bg-emerald-500',
                )}
                aria-hidden
              />
            )}
            <span className="hidden sm:inline">{label}</span>
            {!isSyncing && pendingCount > 0 && (
              <RefreshCw className="size-3.5 opacity-60" aria-hidden />
            )}
          </>
        )}
      </Button>
    </div>
  );
}
