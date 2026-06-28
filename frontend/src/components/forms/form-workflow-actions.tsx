'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Loader2,
  Send,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { FormInstanceRecord } from '@/lib/api/forms';
import {
  approveExternal,
  approveInternal,
  rejectExternal,
  rejectInternal,
  submitFormWorkflow,
} from '@/lib/api/workflows';
import {
  getAvailableWorkflowActions,
  type WorkflowAction,
} from '@/lib/forms/workflow-actions';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';
import { ApiError } from '@/lib/api/client';

interface FormWorkflowActionsProps {
  form: FormInstanceRecord;
  onUpdated: () => void;
}

export function FormWorkflowActions({ form, onUpdated }: FormWorkflowActionsProps) {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState<WorkflowAction | null>(null);

  const orgType = user?.organization.type ?? '';
  const actions = getAvailableWorkflowActions(
    form,
    user?.organizationId ?? '',
    orgType,
    Boolean(user?.isOrgAdmin),
  );

  if (actions.length === 0) return null;

  async function run(action: WorkflowAction) {
    if (!accessToken) return;
    const isReject =
      action === 'reject-internal' || action === 'reject-external';
    if (isReject && !comments.trim()) {
      toast.error(t.forms.rejectionReasonRequired);
      return;
    }
    setLoading(action);
    try {
      const payload = { comments: comments || undefined };
      switch (action) {
        case 'submit':
          await submitFormWorkflow(accessToken, form.id, payload);
          break;
        case 'approve-internal':
          await approveInternal(accessToken, form.id, payload);
          break;
        case 'reject-internal':
          await rejectInternal(accessToken, form.id, payload);
          break;
        case 'approve-external':
          await approveExternal(accessToken, form.id, payload);
          break;
        case 'reject-external':
          await rejectExternal(accessToken, form.id, payload);
          break;
      }
      toast.success(t.commandCenter.workflowSuccess);
      setComments('');
      onUpdated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.commandCenter.workflowError);
    } finally {
      setLoading(null);
    }
  }

  const actionButtons: Array<{
    action: WorkflowAction;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    variant: 'default' | 'destructive' | 'outline';
  }> = [
    {
      action: 'submit',
      label: t.commandCenter.submitWorkflow,
      icon: Send,
      variant: 'default',
    },
    {
      action: 'approve-internal',
      label: t.commandCenter.approveInternal,
      icon: CheckCircle2,
      variant: 'default',
    },
    {
      action: 'reject-internal',
      label: t.commandCenter.rejectInternal,
      icon: XCircle,
      variant: 'destructive',
    },
    {
      action: 'approve-external',
      label: t.commandCenter.approveExternal,
      icon: CheckCircle2,
      variant: 'default',
    },
    {
      action: 'reject-external',
      label: t.commandCenter.rejectExternal,
      icon: XCircle,
      variant: 'destructive',
    },
  ];

  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <h3 className="font-semibold">{t.commandCenter.workflowActions}</h3>
      <div className="space-y-2">
        <Label htmlFor="workflow-comments">{t.commandCenter.decisionComments}</Label>
        <Textarea
          id="workflow-comments"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={2}
          placeholder={t.commandCenter.decisionCommentsPlaceholder}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {actionButtons
          .filter((b) => actions.includes(b.action))
          .map(({ action, label, icon: Icon, variant }) => (
            <Button
              key={action}
              variant={variant}
              disabled={loading !== null}
              onClick={() => void run(action)}
              className="gap-2"
            >
              {loading === action ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Icon className="size-4" />
              )}
              {label}
            </Button>
          ))}
      </div>
    </div>
  );
}
