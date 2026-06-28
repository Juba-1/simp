'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/stores/locale-store';

interface LiabilityWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  quantityUsed: number;
  availableBalance: number;
  unit?: string;
}

export function LiabilityWarningDialog({
  open,
  onOpenChange,
  onConfirm,
  quantityUsed,
  availableBalance,
  unit = 'unit',
}: LiabilityWarningDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-amber-500/40 sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
            <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle>{t.forms.liabilityWarningTitle}</DialogTitle>
          <DialogDescription className="text-start">
            {t.forms.liabilityWarningBody}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-500/30 bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/20">
          <p>
            <span className="text-muted-foreground">{t.forms.quantityUsed}: </span>
            <strong>{quantityUsed}</strong> {unit}
          </p>
          <p>
            <span className="text-muted-foreground">{t.forms.availableBalance}: </span>
            <strong>{availableBalance}</strong> {unit}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {t.forms.proceedAnyway}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
