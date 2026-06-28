import type { MaterialInventoryItem } from '@/lib/api/materials';
import { parseBalance } from '@/lib/api/materials';
import { MATERIAL_FIELD_KEYS } from './types';

export interface MaterialReconciliationState {
  mirFormInstanceId: string;
  quantityUsed: number;
  materialCode?: string;
  liabilityShiftRedAlert: boolean;
}

export function findInventoryItem(
  inventory: MaterialInventoryItem[],
  mirFormInstanceId: string,
): MaterialInventoryItem | undefined {
  return inventory.find((item) => item.mirFormInstanceId === mirFormInstanceId);
}

export function checkQuantityOverage(
  quantityUsed: number,
  availableBalance: number,
): boolean {
  if (!Number.isFinite(quantityUsed) || quantityUsed <= 0) return false;
  return quantityUsed > availableBalance;
}

export function buildMaterialFormData(
  values: Record<string, unknown>,
  inventory: MaterialInventoryItem[],
): Record<string, unknown> {
  const mirId = String(values[MATERIAL_FIELD_KEYS.mirFormInstanceId] ?? '');
  const quantityUsed = Number(values[MATERIAL_FIELD_KEYS.quantityUsed] ?? 0);
  const item = findInventoryItem(inventory, mirId);
  const balance = item ? parseBalance(item.availableBalance) : 0;
  const liabilityShiftRedAlert = checkQuantityOverage(quantityUsed, balance);

  return {
    ...values,
    [MATERIAL_FIELD_KEYS.mirFormInstanceId]: mirId,
    [MATERIAL_FIELD_KEYS.quantityUsed]: quantityUsed,
    [MATERIAL_FIELD_KEYS.materialCode]:
      values[MATERIAL_FIELD_KEYS.materialCode] ?? item?.materialCode,
    liabilityShiftRedAlert,
  };
}
