'use client';

import { useCallback, useEffect, useState } from 'react';
import { History, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { fetchFormAuditHistory } from '@/lib/api/audit';
import type { AuditTimelineEvent } from '@/lib/api/audit';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

interface AuditHistorySheetProps {
  formInstanceId: string;
}

export function AuditHistorySheet({ formInstanceId }: AuditHistorySheetProps) {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [open, setOpen] = useState(false);
  const [timeline, setTimeline] = useState<AuditTimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !open) return;
    setLoading(true);
    try {
      const result = await fetchFormAuditHistory(accessToken, formInstanceId);
      setTimeline(result.timeline);
    } catch {
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, formInstanceId, open]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <History className="size-4" />
          {t.commandCenter.auditHistory}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t.commandCenter.auditHistory}</SheetTitle>
          <SheetDescription>{t.commandCenter.auditHistoryDesc}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t.commandCenter.noAuditEvents}
            </p>
          ) : (
            <ol className="relative border-s border-border ms-3">
              {timeline.map((event, i) => (
                <li key={`${event.timestamp}-${i}`} className="mb-6 ms-6">
                  <span className="absolute -start-1.5 mt-1.5 size-3 rounded-full border border-background bg-primary" />
                  <time className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString()}
                  </time>
                  <p className="mt-1 font-medium">{event.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.source}
                    {event.actor ? ` · ${event.actor}` : ''}
                  </p>
                  {event.type === 'approval' &&
                    typeof event.details.comments === 'string' &&
                    event.details.comments && (
                      <p className="mt-1 text-sm italic text-muted-foreground">
                        &ldquo;{event.details.comments}&rdquo;
                      </p>
                    )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
