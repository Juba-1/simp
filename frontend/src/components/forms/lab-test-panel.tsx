'use client';

import { useCallback, useEffect, useState } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  createLabTestRequest,
  fetchLabRequestsByForm,
} from '@/lib/api/laboratory';
import type { LabTestRequest } from '@/lib/api/laboratory';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

interface LabTestPanelProps {
  formId: string;
  formStatus: string;
  templateCode: string;
}

const LAB_ELIGIBLE_CODES = ['WIR', 'MIR'];
const LAB_ELIGIBLE_STATUSES = ['APPROVED'];
const ACTIVE_STATUSES = new Set(['PENDING', 'IN_PROGRESS']);

const RESULT_COLORS: Record<string, string> = {
  PASS: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  FAIL: 'bg-red-500/15 text-red-700 dark:text-red-300',
  INCONCLUSIVE: 'bg-amber-500/15 text-amber-800',
  PENDING: 'bg-sky-500/15 text-sky-700',
  IN_PROGRESS: 'bg-blue-500/15 text-blue-700',
  COMPLETED: 'bg-emerald-500/15 text-emerald-700',
  CANCELLED: 'bg-muted text-muted-foreground',
};

export function LabTestPanel({ formId, formStatus, templateCode }: LabTestPanelProps) {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [requests, setRequests] = useState<LabTestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const isEligible =
    LAB_ELIGIBLE_CODES.includes(templateCode) &&
    LAB_ELIGIBLE_STATUSES.includes(formStatus);

  const hasActiveRequest = requests.some((r) => ACTIVE_STATUSES.has(r.status));

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await fetchLabRequestsByForm(accessToken, formId);
      setRequests(data);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, formId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleIssueRequest() {
    if (!accessToken) return;
    setCreating(true);
    try {
      const req = await createLabTestRequest(accessToken, { formInstanceId: formId });
      toast.success(t.laboratory.requestCreated);
      setRequests((prev) => [req, ...prev]);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.laboratory.requestError);
    } finally {
      setCreating(false);
    }
  }

  if (!isEligible) return null;

  return (
    <Card className="border-sky-500/20 bg-sky-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="size-4 text-sky-600" />
          {t.laboratory.panelTitle}
        </CardTitle>
        <CardDescription>{t.laboratory.panelDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.laboratory.noRequests}</p>
        ) : (
          <ul className="space-y-2">
            {requests.map((req) => (
              <li
                key={req.id}
                className="rounded-lg border border-sky-500/20 bg-background p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{t.laboratory.ltrId}</p>
                    <span className="font-mono text-sm font-bold tracking-wide">
                      {req.ltrId}
                    </span>
                  </div>
                  <Badge
                    className={RESULT_COLORS[req.result?.resultStatus ?? req.status] ?? ''}
                    variant="outline"
                  >
                    {req.result?.resultStatus ?? req.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.laboratory.testType}: {req.testType} ·{' '}
                  {t.laboratory.requested}: {new Date(req.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}

        {!hasActiveRequest && (
          <Button
            size="sm"
            className="gap-2"
            disabled={creating}
            onClick={() => void handleIssueRequest()}
          >
            {creating && <Loader2 className="size-3.5 animate-spin" />}
            {t.laboratory.issueLabRequest}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
