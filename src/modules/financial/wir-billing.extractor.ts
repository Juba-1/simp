/** Conventional WIR JSONB keys for IPC line-item billing */
export interface WirBillingPayload {
  description: string;
  quantity: number;
  unit: string;
  unitRate: number;
  lineAmount: number;
}

export function extractWirBilling(
  data: Record<string, unknown>,
  referenceNumber?: string | null,
): WirBillingPayload {
  const quantity = Number(
    data.quantityUsed ?? data.quantity_used ?? data.quantity ?? 0,
  );
  const unitRate = Number(
    data.unitRate ?? data.unit_rate ?? data.rate ?? 0,
  );
  const explicitAmount = Number(
    data.lineAmount ?? data.line_amount ?? data.billedAmount ?? 0,
  );

  const lineAmount =
    explicitAmount > 0 ? explicitAmount : quantity * unitRate;

  const description = String(
    data.workDescription ??
      data.work_description ??
      data.description ??
      `WIR ${referenceNumber ?? 'work inspection'}`,
  );

  const unit = String(data.unit ?? 'unit');

  return { description, quantity, unit, unitRate, lineAmount };
}
