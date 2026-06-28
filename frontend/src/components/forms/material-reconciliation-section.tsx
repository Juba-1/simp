'use client';

import { AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';
import type { Control } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MaterialInventoryItem } from '@/lib/api/materials';
import { parseBalance } from '@/lib/api/materials';
import {
  checkQuantityOverage,
  findInventoryItem,
} from '@/lib/forms/material-reconciliation';
import { MATERIAL_FIELD_KEYS } from '@/lib/forms/types';
import { useTranslation } from '@/stores/locale-store';

interface MaterialReconciliationSectionProps {
  control: Control<Record<string, unknown>>;
  inventory: MaterialInventoryItem[];
  mirFormInstanceId: string;
  quantityUsed: number;
  isLoading?: boolean;
}

export function MaterialReconciliationSection({
  control,
  inventory,
  mirFormInstanceId,
  quantityUsed,
  isLoading,
}: MaterialReconciliationSectionProps) {
  const { t } = useTranslation();

  const approvedInventory = useMemo(
    () =>
      inventory.filter(
        (item) =>
          item.mirForm.status === 'APPROVED' &&
          parseBalance(item.availableBalance) > 0,
      ),
    [inventory],
  );

  const selectedItem = findInventoryItem(approvedInventory, mirFormInstanceId);
  const availableBalance = selectedItem
    ? parseBalance(selectedItem.availableBalance)
    : 0;
  const hasOverage = checkQuantityOverage(quantityUsed, availableBalance);

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div>
        <h3 className="font-semibold">{t.forms.materialSectionTitle}</h3>
        <p className="text-sm text-muted-foreground">
          {t.forms.materialSectionSubtitle}
        </p>
      </div>

      <FormField
        control={control}
        name={MATERIAL_FIELD_KEYS.mirFormInstanceId}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t.forms.selectMir}</FormLabel>
            <Select
              value={String(field.value ?? '')}
              onValueChange={field.onChange}
              disabled={isLoading}
            >
              <FormControl>
                <SelectTrigger className="h-12 w-full">
                  <SelectValue placeholder={t.forms.selectMirPlaceholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {approvedInventory.length === 0 ? (
                  <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                    {t.forms.noApprovedMir}
                  </p>
                ) : (
                  approvedInventory.map((item) => (
                    <SelectItem
                      key={item.mirFormInstanceId}
                      value={item.mirFormInstanceId}
                    >
                      {item.materialName} ({item.materialCode}) —{' '}
                      {parseBalance(item.availableBalance)} {item.unit}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {selectedItem && (
        <div className="rounded-lg border bg-background px-3 py-2 text-sm">
          <span className="text-muted-foreground">{t.forms.availableBalance}: </span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {availableBalance} {selectedItem.unit}
          </span>
          {selectedItem.mirForm.referenceNumber && (
            <span className="ms-2 text-muted-foreground">
              · MIR {selectedItem.mirForm.referenceNumber}
            </span>
          )}
        </div>
      )}

      <FormField
        control={control}
        name={MATERIAL_FIELD_KEYS.quantityUsed}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t.forms.quantityUsed}</FormLabel>
            <FormControl>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                className="h-12 text-base"
                value={field.value === undefined || field.value === null ? '' : String(field.value)}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === '' ? undefined : Number(e.target.value),
                  )
                }
                placeholder="0"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {hasOverage && (
        <Alert className="border-amber-500/50 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle className="text-amber-600 dark:text-amber-400" />
          <AlertTitle>{t.forms.liabilityWarningTitle}</AlertTitle>
          <AlertDescription>{t.forms.liabilityWarningBody}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
