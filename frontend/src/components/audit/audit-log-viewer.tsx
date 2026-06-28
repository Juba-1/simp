'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  fetchAuditLogs,
  fetchGlobalAuditLogs,
  fetchProjectAuditLogs,
} from '@/lib/api/audit';
import type { AuditLogEntry } from '@/lib/api/audit';
import { ApiError } from '@/lib/api/client';
import {
  formatAuditAction,
  formatAuditEntityName,
  formatAuditEntityType,
  formatAuditSource,
} from '@/lib/audit/labels';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

interface AuditLogViewerProps {
  scope: 'client' | 'global' | 'project';
  title?: string;
  description: string;
  projectId?: string;
  hideHeader?: boolean;
}

export function AuditLogViewer({
  scope,
  title,
  description,
  projectId,
  hideHeader,
}: AuditLogViewerProps) {
  const { t, locale } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [page] = useState(1);

  const queryKey = useMemo(
    () => ['auditLogs', scope, projectId ?? null, page],
    [scope, projectId, page],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    enabled: Boolean(accessToken) && (scope !== 'project' || Boolean(projectId)),
    queryFn: async () => {
      if (!accessToken) throw new Error('Missing access token');
      try {
        return scope === 'global'
          ? await fetchGlobalAuditLogs(accessToken, page)
          : scope === 'project' && projectId
            ? await fetchProjectAuditLogs(accessToken, projectId, page)
            : await fetchAuditLogs(accessToken, page);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : t.auditLog.loadError);
        throw err;
      }
    },
    staleTime: 5 * 60_000,
  });

  const logs: AuditLogEntry[] = data?.data ?? [];
  const initialLoading = isLoading && !data;

  return (
    <div className="space-y-6">
      {!hideHeader && title && (
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.auditLog.recentEvents}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {initialLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              {t.auditLog.empty}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.auditLog.colTime}</TableHead>
                  <TableHead>{t.auditLog.colAction}</TableHead>
                  <TableHead>{t.auditLog.colEntity}</TableHead>
                  <TableHead>{t.auditLog.colSource}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground" dir="ltr">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {formatAuditAction(log.action, locale)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {formatAuditEntityName(log, locale)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatAuditEntityType(log.entityType, locale)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatAuditSource(log.source, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {isFetching && !isLoading && (
            <div className="flex justify-center border-t py-2 text-xs text-muted-foreground">
              <Loader2 className="me-2 size-3.5 animate-spin" />
              {t.common.loading}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
