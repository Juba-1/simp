'use client';

import { XCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ContractorRejectionStats } from '@/lib/api/analytics';
import { useTranslation } from '@/stores/locale-store';

interface ContractorRejectionWidgetProps {
  contractors: ContractorRejectionStats[];
  loading?: boolean;
}

export function ContractorRejectionWidget({
  contractors,
  loading = false,
}: ContractorRejectionWidgetProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-amber-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <XCircle className="size-5" />
          {t.commandCenter.contractorRejectionTitle}
        </CardTitle>
        <CardDescription>{t.commandCenter.contractorRejectionDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8 text-sm text-muted-foreground">
            {t.common.loading}
          </div>
        ) : contractors.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <XCircle className="size-8 opacity-30" />
            <p>{t.commandCenter.contractorRejectionEmpty}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {contractors.map((row) => (
              <li
                key={row.organizationId}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.organizationName}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.commandCenter.contractorRejectionBreakdown
                      .replace('{wir}', String(row.wirRejected))
                      .replace('{mir}', String(row.mirRejected))}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={
                    row.rejectionRatePercent >= 25
                      ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                      : 'bg-amber-500/15 text-amber-800 dark:text-amber-200'
                  }
                >
                  {row.rejectionRatePercent}%
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
