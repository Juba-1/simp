'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ExternalLink, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchProjectFormInstances } from '@/lib/api/forms';
import type { FormInstanceRecord } from '@/lib/api/forms';
import { fetchProjects } from '@/lib/api/projects';
import { fetchPendingApprovals } from '@/lib/api/users';
import type { PendingApprovalsResult } from '@/lib/api/users';
import { approveInternal, rejectInternal } from '@/lib/api/workflows';
import { fetchFormInstance } from '@/lib/api/forms';
import { ApiError } from '@/lib/api/client';
import { canAccessInternalReview } from '@/lib/auth/internal-review-access';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { STATUS_COLORS } from '@/lib/forms/workflow-actions';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

type ReviewForm = PendingApprovalsResult['data'][number];

export function InternalReviewPageClient() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [forms, setForms] = useState<ReviewForm[]>([]);
  const [rejectedForms, setRejectedForms] = useState<
    (FormInstanceRecord & { projectName: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ReviewForm | null>(null);
  const [rejectComments, setRejectComments] = useState('');
  const [billingTarget, setBillingTarget] = useState<ReviewForm | null>(null);
  const [billingUnitRate, setBillingUnitRate] = useState('');
  const [billingLineAmount, setBillingLineAmount] = useState('');
  const [billingQuantity, setBillingQuantity] = useState(0);

  const allowed = canAccessInternalReview(user);

  const loadRejected = useCallback(async () => {
    if (!accessToken) return [];
    const projects = await fetchProjects(accessToken);
    const projectById = new Map(projects.data.map((p) => [p.id, p]));
    const batches = await Promise.all(
      projects.data.map((p) =>
        fetchProjectFormInstances(accessToken, p.id, {
          status: 'REJECTED',
          limit: 50,
        }),
      ),
    );
    return batches.flatMap((b) =>
      b.data.map((form) => ({
        ...form,
        projectName:
          locale === 'ar' && projectById.get(form.projectId)?.nameAr
            ? projectById.get(form.projectId)!.nameAr!
            : projectById.get(form.projectId)?.name ?? form.projectId.slice(0, 8),
      })),
    );
  }, [accessToken, locale]);

  const load = useCallback(async () => {
    if (!accessToken || !allowed) return;
    setLoading(true);
    try {
      const [pendingResult, rejected] = await Promise.all([
        fetchPendingApprovals(accessToken),
        loadRejected(),
      ]);
      setForms(
        pendingResult.data.filter((f) => f.status === 'PENDING_INTERNAL_APPROVAL'),
      );
      setRejectedForms(rejected);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.commandCenter.loadError);
      setForms([]);
      setRejectedForms([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, allowed, loadRejected, t.commandCenter.loadError]);

  useEffect(() => {
    if (!user) return;
    if (!allowed) {
      router.replace('/dashboard/tasks');
      return;
    }
    void load();
  }, [user, allowed, router, load]);

  async function handleApprove(form: ReviewForm) {
    if (!accessToken) return;

    if (form.template.code === 'WIR') {
      setActionId(form.id);
      try {
        const detail = await fetchFormInstance(accessToken, form.id);
        const data = detail.data as Record<string, unknown>;
        const qty = Number(data.quantityUsed ?? 0);
        const existingRate = Number(data.unitRate ?? 0);
        const existingAmount = Number(data.lineAmount ?? 0);

        setBillingQuantity(qty);
        setBillingUnitRate(existingRate > 0 ? String(existingRate) : '');
        setBillingLineAmount(
          existingAmount > 0
            ? String(existingAmount)
            : qty > 0 && existingRate > 0
              ? String(qty * existingRate)
              : '',
        );
        setBillingTarget(form);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : t.commandCenter.loadError);
      } finally {
        setActionId(null);
      }
      return;
    }

    setActionId(form.id);
    try {
      await approveInternal(accessToken, form.id, {});
      toast.success(t.internalReviewPage.reviewSubmit);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.commandCenter.workflowError);
    } finally {
      setActionId(null);
    }
  }

  async function confirmBillingApprove() {
    if (!accessToken || !billingTarget) return;

    const unitRate = Number(billingUnitRate);
    const explicitAmount = Number(billingLineAmount);
    const lineAmount =
      explicitAmount > 0
        ? explicitAmount
        : billingQuantity > 0 && unitRate > 0
          ? billingQuantity * unitRate
          : 0;

    if (!unitRate || unitRate <= 0 || lineAmount <= 0) {
      toast.error(t.internalReviewPage.billingRequired);
      return;
    }

    setActionId(billingTarget.id);
    try {
      await approveInternal(accessToken, billingTarget.id, {
        unitRate,
        lineAmount,
      });
      toast.success(t.internalReviewPage.reviewSubmit);
      setBillingTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.commandCenter.workflowError);
    } finally {
      setActionId(null);
    }
  }

  function openRejectDialog(form: ReviewForm) {
    setRejectTarget(form);
    setRejectComments('');
  }

  async function confirmReject() {
    if (!accessToken || !rejectTarget) return;
    if (!rejectComments.trim()) {
      toast.error(t.forms.rejectionReasonRequired);
      return;
    }
    setActionId(rejectTarget.id);
    try {
      await rejectInternal(accessToken, rejectTarget.id, {
        comments: rejectComments.trim(),
      });
      toast.success(t.commandCenter.workflowSuccess);
      setRejectTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.commandCenter.workflowError);
    } finally {
      setActionId(null);
    }
  }

  if (!allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        {t.internalReviewPage.accessDenied}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t.internalReviewPage.title}
        </h1>
        <p className="text-muted-foreground">{t.internalReviewPage.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.roleDashboard.internalReviewTitle}</CardTitle>
          <CardDescription>{t.roleDashboard.internalReviewDesc}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : forms.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <CheckCircle2 className="size-12 text-emerald-500/50" />
              <p className="text-muted-foreground">{t.internalReviewPage.empty}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.internalReviewPage.colForm}</TableHead>
                  <TableHead>{t.internalReviewPage.colProject}</TableHead>
                  <TableHead>{t.internalReviewPage.colSubmitted}</TableHead>
                  <TableHead>{t.commandCenter.colStatus}</TableHead>
                  <TableHead className="text-end">{t.systemAdmin.colActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => {
                  const projectName =
                    locale === 'ar' && form.project?.nameAr
                      ? form.project.nameAr
                      : form.project?.name ?? form.projectId.slice(0, 8);
                  const busy = actionId === form.id;
                  return (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium">
                        {form.template.name}
                        <span className="ms-2 font-mono text-xs text-muted-foreground">
                          {form.template.code}
                        </span>
                      </TableCell>
                      <TableCell>{projectName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {form.submittedAt
                          ? new Date(form.submittedAt).toLocaleString()
                          : new Date(form.updatedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={STATUS_COLORS.PENDING_INTERNAL_APPROVAL}
                        >
                          {t.roleDashboard.statusInternalReview}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={`/dashboard/projects/${form.projectId}/forms/${form.id}`}
                            >
                              <ExternalLink className="size-4" />
                              {t.internalReviewPage.reviewDetails}
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => void handleApprove(form)}
                          >
                            {busy ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="size-4" />
                            )}
                            {t.internalReviewPage.reviewSubmit}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => openRejectDialog(form)}
                          >
                            <XCircle className="size-4" />
                            {t.internalReviewPage.reject}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle className="text-red-800 dark:text-red-200">
            {t.forms.rejectedForms}
          </CardTitle>
          <CardDescription>{t.forms.rejectedFormsDesc}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? null : rejectedForms.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              {t.forms.noRejectedForms}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.internalReviewPage.colForm}</TableHead>
                  <TableHead>{t.internalReviewPage.colProject}</TableHead>
                  <TableHead>{t.forms.rejectionGeneric}</TableHead>
                  <TableHead className="text-end">{t.systemAdmin.colActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejectedForms.map((form) => (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium">
                        {form.template.name}
                        <span className="ms-2 font-mono text-xs text-muted-foreground">
                          {form.template.code}
                        </span>
                      </TableCell>
                      <TableCell>{form.projectName}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {form.comments?.trim() || t.forms.rejectionNoReason}
                      </TableCell>
                      <TableCell className="text-end">
                        <Button asChild variant="outline" size="sm">
                          <Link
                            href={`/dashboard/projects/${form.projectId}/forms/${form.id}`}
                          >
                            <ExternalLink className="size-4" />
                            {t.internalReviewPage.reviewDetails}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.internalReviewPage.reject}</DialogTitle>
            <DialogDescription>{t.internalReviewPage.rejectReasonHint}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectComments}
            onChange={(e) => setRejectComments(e.target.value)}
            placeholder={t.forms.rejectionReasonRequired}
            rows={4}
            className="resize-none"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              disabled={actionId === rejectTarget?.id}
              onClick={() => void confirmReject()}
            >
              {actionId === rejectTarget?.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t.internalReviewPage.reject
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={billingTarget !== null}
        onOpenChange={(open) => {
          if (!open) setBillingTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.internalReviewPage.billingTitle}</DialogTitle>
            <DialogDescription>{t.internalReviewPage.billingDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="billing-unit-rate">
                {t.internalReviewPage.billingUnitRate}
              </Label>
              <Input
                id="billing-unit-rate"
                type="number"
                inputMode="decimal"
                min={0}
                value={billingUnitRate}
                onChange={(e) => {
                  const nextRate = e.target.value;
                  setBillingUnitRate(nextRate);
                  const rate = Number(nextRate);
                  if (billingQuantity > 0 && rate > 0) {
                    setBillingLineAmount(String(billingQuantity * rate));
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing-line-amount">
                {t.internalReviewPage.billingLineAmount}
              </Label>
              <Input
                id="billing-line-amount"
                type="number"
                inputMode="decimal"
                min={0}
                value={billingLineAmount}
                onChange={(e) => setBillingLineAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBillingTarget(null)}>
              {t.common.cancel}
            </Button>
            <Button
              disabled={actionId === billingTarget?.id}
              onClick={() => void confirmBillingApprove()}
            >
              {actionId === billingTarget?.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t.internalReviewPage.reviewSubmit
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
