import { apiFetch } from './client';

export interface MaterialLedgerEntryRecord {
  id: string;
  inventoryId: string;
  formInstanceId: string;
  ledgerType: string;
  quantityDelta: string;
  balanceBefore: string;
  balanceAfter: string;
  liabilityShiftRedAlert: boolean;
  notes: string | null;
  createdAt: string;
  formInstance: {
    id: string;
    referenceNumber: string | null;
    template: { code: string; name: string };
  };
}

export interface MaterialInventoryItem {
  id: string;
  projectId: string;
  mirFormInstanceId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  initialQuantity: string;
  availableBalance: string;
  mirForm: {
    id: string;
    referenceNumber: string | null;
    status: string;
  };
  ledgerEntries?: MaterialLedgerEntryRecord[];
}

export interface MaterialLedgerDetail extends MaterialInventoryItem {
  ledgerEntries: MaterialLedgerEntryRecord[];
}

export function fetchProjectInventory(token: string, projectId: string) {
  return apiFetch<MaterialInventoryItem[]>(
    `/materials/inventory/project/${projectId}`,
    { token },
  );
}

export function fetchInventoryLedger(token: string, inventoryId: string) {
  return apiFetch<MaterialLedgerDetail>(`/materials/inventory/${inventoryId}`, {
    token,
  });
}

export function parseBalance(value: string | number): number {
  return Number(value);
}
