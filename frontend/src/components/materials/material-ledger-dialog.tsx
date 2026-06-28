'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, ScrollText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  fetchInventoryLedger,
  parseBalance,
  type MaterialInventoryItem,
  type MaterialLedgerDetail,
} from '@/lib/api/materials';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

interface MaterialLedgerDialogProps {
  projectId: string;
  item: MaterialInventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaterialLedgerDialog({
  projectId,
  item,
  open,
  onOpenChange,
}: MaterialLedgerDialogProps) {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [detail, setDetail] = useState<MaterialLedgerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !item || !accessToken) {
      setDetail(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    fetchInventoryLedger(accessToken, item.id)
      .then((d) => active && setDetail(d))
      .catch((err) =>
        active &&
        setError(err instanceof ApiError ? err.message : t.materials.loadError),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, item, accessToken, t.materials.loadError]);

  const entries = detail?.ledgerEntries ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="size-5" />
            {t.materials.ledgerDetailTitle}
          </DialogTitle>
          <DialogDescription>
            {item
              ? `${item.materialName} (${item.materialCode}) — ${t.materials.ledgerDetailDesc}`
              : t.materials.ledgerDetailDesc}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : entries.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            {t.materials.ledgerEmpty}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.materials.ledgerColTimestamp}</TableHead>
                <TableHead>{t.materials.ledgerColType}</TableHead>
                <TableHead className="text-end">{t.materials.ledgerColDelta}</TableHead>
                <TableHead className="text-end">{t.materials.ledgerColBalance}</TableHead>
                <TableHead>{t.materials.ledgerColFormRef}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const delta = parseBalance(entry.quantityDelta);
                const isCredit = delta > 0;
                const formRef =
                  entry.formInstance.referenceNumber ??
                  entry.formInstance.id.slice(0, 8);
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      {new Date(entry.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.ledgerType}</Badge>
                    </TableCell>
                    <TableCell
                      className={`text-end font-semibold tabular-nums ${
                        isCredit
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isCredit ? '+' : ''}
                      {delta}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {parseBalance(entry.balanceAfter)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/projects/${projectId}/forms/${entry.formInstance.id}`}
                        className="font-mono text-xs font-medium text-primary hover:underline"
                        onClick={() => onOpenChange(false)}
                      >
                        {entry.formInstance.template.code}-{formRef}
                      </Link>
                      {entry.liabilityShiftRedAlert && (
                        <Badge variant="destructive" className="ms-2 text-xs">
                          {t.commandCenter.redFlag}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
