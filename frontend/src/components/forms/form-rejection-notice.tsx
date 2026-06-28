'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { fetchWorkflowHistory } from '@/lib/api/workflows';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

interface ApprovalHistoryRecord {
  action: string;
  comments: string;
  createdAt: string;
  toStatus: string;
}

interface FormRejectionNoticeProps {
  formId: string;
  status: string;
}

const REJECT_ACTIONS = new Set(['REJECT_INTERNAL', 'REJECT_EXTERNAL']);

function rejectionLabel(action: string, t: ReturnType<typeof useTranslation>['t']): string {
  if (action === 'REJECT_INTERNAL') return t.forms.rejectionInternal;
  if (action === 'REJECT_EXTERNAL') return t.forms.rejectionExternal;
  return t.forms.rejectionGeneric;
}

export function FormRejectionNotice({ formId, status }: FormRejectionNoticeProps) {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [loading, setLoading] = useState(status === 'REJECTED');
  const [rejection, setRejection] = useState<ApprovalHistoryRecord | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || status !== 'REJECTED') {
      setRejection(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const history = (await fetchWorkflowHistory(
        accessToken,
        formId,
      )) as ApprovalHistoryRecord[];
      const latest = [...history]
        .reverse()
        .find((r) => REJECT_ACTIONS.has(r.action) && r.toStatus === 'REJECTED');
      setRejection(latest ?? null);
    } catch {
      setRejection(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken, formId, status]);

  useEffect(() => {
    void load();
  }, [load]);

  if (status !== 'REJECTED') return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border-2 border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm dark:border-rose-700 dark:bg-rose-950/30 dark:text-slate-300">
        <Loader2 className="size-4 animate-spin" />
        {t.common.loading}
      </div>
    );
  }

  const reason = rejection?.comments?.trim();
  const label = rejection
    ? rejectionLabel(rejection.action, t)
    : t.forms.rejectionGeneric;

  return (
    <div
      role="alert"
      className="rounded-xl border-2 border-rose-500 bg-rose-50 px-5 py-4 shadow-md dark:border-rose-600 dark:bg-rose-950/40"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-6 shrink-0 text-rose-700 dark:text-rose-400" />
        <div className="min-w-0 space-y-2">
          <p className="text-base font-bold text-rose-900 dark:text-rose-100">{label}</p>
          {reason ? (
            <p className="text-base leading-relaxed font-medium text-slate-900 dark:text-slate-100">
              {reason}
            </p>
          ) : (
            <p className="text-base font-medium text-rose-800 dark:text-rose-200">
              {t.forms.rejectionNoReason}
            </p>
          )}
          {rejection?.createdAt && (
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {new Date(rejection.createdAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
