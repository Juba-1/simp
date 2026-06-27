import { StandardFormCode } from '@prisma/client';

/** Conventional JSONB keys for material forms — keeps JSONB flexible while enabling reconciliation */
export interface MirMaterialPayload {
  materialCode: string;
  materialName: string;
  quantity: number;
  unit?: string;
}

export interface MaterialUsagePayload {
  mirFormInstanceId: string;
  quantityUsed: number;
  materialCode?: string;
}

export function extractMirMaterial(data: Record<string, unknown>): MirMaterialPayload {
  const materialCode = String(data.materialCode ?? data.material_code ?? '').trim();
  const materialName = String(
    data.materialName ?? data.material_name ?? materialCode,
  ).trim();
  const quantity = Number(data.quantity ?? data.deliveredQuantity ?? 0);
  const unit = String(data.unit ?? 'unit');

  return { materialCode, materialName, quantity, unit };
}

export function extractMaterialUsage(
  data: Record<string, unknown>,
): MaterialUsagePayload {
  const mirFormInstanceId = String(
    data.mirFormInstanceId ?? data.mir_form_instance_id ?? data.mirReferenceId ?? '',
  ).trim();
  const quantityUsed = Number(
    data.quantityUsed ?? data.quantity_used ?? data.quantity ?? 0,
  );
  const materialCode = data.materialCode
    ? String(data.materialCode)
    : undefined;

  return { mirFormInstanceId, quantityUsed, materialCode };
}

export function isMaterialUsageForm(code: StandardFormCode): boolean {
  return code === StandardFormCode.WIR || code === StandardFormCode.MDR;
}

export function isMirForm(code: StandardFormCode): boolean {
  return code === StandardFormCode.MIR;
}
