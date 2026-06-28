'use client';

import { cn } from '@/lib/utils';
import { useSyncStore, type ConnectionStatus } from '@/stores/sync-store';
import { useTranslation } from '@/stores/locale-store';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

const statusStyles: Record<
  ConnectionStatus,
  { dot: string; variant: 'outline' | 'secondary' | 'destructive' }
> = {
  online: { dot: 'bg-emerald-500', variant: 'outline' },
  offline: { dot: 'bg-amber-500', variant: 'secondary' },
  syncing: { dot: 'bg-sky-500 animate-pulse', variant: 'outline' },
};

export function SyncStatusBadge({ className }: { className?: string }) {
  const { t } = useTranslation();
  const connectionStatus = useSyncStore((s) => s.connectionStatus);
  const pendingCount = useSyncStore((s) => s.pendingCount);

  const labels: Record<ConnectionStatus, string> = {
    online: t.common.online,
    offline: t.common.offline,
    syncing: t.common.syncing,
  };

  const style = statusStyles[connectionStatus];

  return (
    <Badge
      variant={style.variant}
      className={cn('w-full justify-center gap-1.5 py-1.5', className)}
    >
      {connectionStatus === 'syncing' ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <span className={cn('size-2 rounded-full', style.dot)} />
      )}
      <span>{labels[connectionStatus]}</span>
      {pendingCount > 0 && (
        <span className="ms-1 rounded-full bg-primary/15 px-1.5 text-[10px] font-bold text-primary">
          {pendingCount}
        </span>
      )}
    </Badge>
  );
}
