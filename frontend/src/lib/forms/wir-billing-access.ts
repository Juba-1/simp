import type { AuthUser } from '@/stores/auth-store';
import { isFieldEngineer, isQaQcInspector } from '@/lib/auth/field-engineer';

export const WIR_BILLING_FIELD_KEYS = new Set(['unitRate', 'lineAmount']);

/** QA/QC inspectors and org admins may set billable rates. */
export function canEditWirBilling(user: AuthUser | null): boolean {
  if (!user) return false;
  if (user.isOrgAdmin) return true;
  return isQaQcInspector(user);
}

/** Field engineers cannot type unit rates at submission time. */
export function shouldLockWirBillingOnCreate(
  user: AuthUser | null,
  templateCode: string,
): boolean {
  if (templateCode !== 'WIR') return false;
  return isFieldEngineer(user);
}

export type DynamicFormAccessMode = 'create' | 'internal_review' | 'edit';

export function isWirBillingFieldReadOnly(
  fieldKey: string,
  templateCode: string,
  user: AuthUser | null,
  accessMode: DynamicFormAccessMode,
): boolean {
  if (templateCode !== 'WIR' || !WIR_BILLING_FIELD_KEYS.has(fieldKey)) {
    return false;
  }

  if (accessMode === 'internal_review') {
    return !canEditWirBilling(user);
  }

  if (accessMode === 'create') {
    return shouldLockWirBillingOnCreate(user, templateCode);
  }

  // Rejected-form revision: only billing reviewers may adjust rates.
  return !canEditWirBilling(user);
}
