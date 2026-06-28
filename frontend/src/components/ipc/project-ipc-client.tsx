'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Plus,
  Send,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DatePicker } from '@/components/forms/date-picker-field';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  approveIpcClient,
  approveIpcConsultant,
  fetchEligibleWirs,
  fetchProjectIpcs,
  generateDraftIpc,
  rejectIpcClient,
  rejectIpcConsultant,
  submitIpcForReview,
} from '@/lib/api/ipc';
import type { EligibleWir, IpcRecord } from '@/lib/api/ipc';
import { downloadIpcPdf } from '@/lib/api/reports';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { canGenerateIpc, canViewIpcBilling } from '@/lib/auth/permissions';
import { useTranslation } from '@/stores/locale-store';

interface ProjectIpcClientProps {
  projectId: string;
}

function formatMoney(amount: string, currency: string) {
  const num = parseFloat(amount);
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'USD',
  }).format(Number.isNaN(num) ? 0 : num);
}

const IPC_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-500/15 text-slate-700',
  PENDING_CONSULTANT_REVIEW: 'bg-amber-500/15 text-amber-800',
  PENDING_CLIENT_APPROVAL: 'bg-orange-500/15 text-orange-800',
  APPROVED: 'bg-emerald-500/15 text-emerald-700',
  REJECTED: 'bg-red-500/15 text-red-700',
};

// ─── Wizard: new IPC from eligible WIRs ─────────────────────────────────────

interface IpcWizardProps {
  projectId: string;
  onCreated: (ipc: IpcRecord) => void;
}

function IpcWizard({ projectId, onCreated }: IpcWizardProps) {
  const { t, locale, dir } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [open, setOpen] = useState(false);
  const [eligibleWirs, setEligibleWirs] = useState<EligibleWir[]>([]);
  const [loadingWirs, setLoadingWirs] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);

  async function loadWirs() {
    if (!accessToken) return;
    setLoadingWirs(true);
    try {
      const wirs = await fetchEligibleWirs(accessToken, projectId);
      setEligibleWirs(wirs);
      setSelected(new Set(wirs.map((w) => w.id)));
    } catch {
      setEligibleWirs([]);
    } finally {
      setLoadingWirs(false);
    }
  }

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) void loadWirs();
    else {
      setSelected(new Set());
      setPeriodStart('');
      setPeriodEnd('');
      setNotes('');
    }
  }

  function toggleWir(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleGenerate() {
    if (!accessToken || selected.size === 0) return;
    setGenerating(true);
    try {
      const draft = await generateDraftIpc(accessToken, {
        projectId,
        formInstanceIds: Array.from(selected),
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined,
        notes: notes || undefined,
      });
      toast.success(t.commandCenter.ipcGenerated);
      setOpen(false);
      onCreated(draft);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.commandCenter.ipcError);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="size-4" />
          {t.commandCenter.generateDraftIpc}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            {t.ipc.wizardTitle}
          </DialogTitle>
          <DialogDescription>{t.ipc.wizardDesc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Date range */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="period-start">{t.ipc.periodStart}</Label>
              <DatePicker
                id="period-start"
                value={periodStart}
                onChange={(v) => setPeriodStart(v ?? '')}
                locale={locale}
                dir={dir}
                placeholder={t.forms.datePlaceholder}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="period-end">{t.ipc.periodEnd}</Label>
              <DatePicker
                id="period-end"
                value={periodEnd}
                onChange={(v) => setPeriodEnd(v ?? '')}
                locale={locale}
                dir={dir}
                placeholder={t.forms.datePlaceholder}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="ipc-notes">{t.ipc.notes}</Label>
            <Textarea
              id="ipc-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.ipc.notesPlaceholder}
            />
          </div>

          {/* Eligible WIRs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t.ipc.eligibleWirs}</Label>
              {eligibleWirs.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setSelected(
                      selected.size === eligibleWirs.length
                        ? new Set()
                        : new Set(eligibleWirs.map((w) => w.id)),
                    )
                  }
                >
                  {selected.size === eligibleWirs.length
                    ? t.ipc.deselectAll
                    : t.ipc.selectAll}
                </Button>
              )}
            </div>
            {loadingWirs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : eligibleWirs.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                {t.ipc.noEligibleWirs}
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>{t.commandCenter.colReference}</TableHead>
                      <TableHead>{t.commandCenter.colType}</TableHead>
                      <TableHead>{t.commandCenter.colUpdated}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligibleWirs.map((wir) => (
                      <TableRow
                        key={wir.id}
                        data-state={selected.has(wir.id) ? 'selected' : undefined}
                        className="cursor-pointer"
                        onClick={() => toggleWir(wir.id)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selected.has(wir.id)}
                            onCheckedChange={() => toggleWir(wir.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {wir.referenceNumber ?? wir.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>{wir.template.code}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(wir.updatedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {selected.size > 0 && (
              <p className="text-xs text-muted-foreground">
                {selected.size} {t.ipc.wirsSelected}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={generating || selected.size === 0}
            onClick={() => void handleGenerate()}
            className="gap-2"
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {t.ipc.generateButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Workflow actions on selected IPC ────────────────────────────────────────

interface IpcWorkflowActionsProps {
  ipc: IpcRecord;
  orgType: string;
  onUpdated: () => void;
}

function IpcWorkflowActions({ ipc, orgType, onUpdated }: IpcWorkflowActionsProps) {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState('');

  async function run(action: string) {
    if (!accessToken) return;
    setLoading(true);
    try {
      const payload = { comments: comments || undefined };
      switch (action) {
        case 'submit':
          await submitIpcForReview(accessToken, ipc.id, payload);
          break;
        case 'approve-consultant':
          await approveIpcConsultant(accessToken, ipc.id, payload);
          break;
        case 'reject-consultant':
          await rejectIpcConsultant(accessToken, ipc.id, payload);
          break;
        case 'approve-client':
          await approveIpcClient(accessToken, ipc.id, payload);
          break;
        case 'reject-client':
          await rejectIpcClient(accessToken, ipc.id, payload);
          break;
      }
      toast.success(t.commandCenter.workflowSuccess);
      setComments('');
      onUpdated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.commandCenter.workflowError);
    } finally {
      setLoading(false);
    }
  }

  type IpcAction = { id: string; label: string; variant: 'default' | 'destructive'; icon: typeof Send; cond: boolean };
  const actions: IpcAction[] = [
    { id: 'submit', label: t.ipc.submitForReview, variant: 'default' as const, icon: Send, cond: ipc.status === 'DRAFT' && orgType === 'MAIN_CONTRACTOR' },
    { id: 'approve-consultant', label: t.ipc.approveConsultant, variant: 'default' as const, icon: CheckCircle2, cond: ipc.status === 'PENDING_CONSULTANT_REVIEW' && orgType === 'CONSULTANT' },
    { id: 'reject-consultant', label: t.ipc.rejectConsultant, variant: 'destructive' as const, icon: XCircle, cond: ipc.status === 'PENDING_CONSULTANT_REVIEW' && orgType === 'CONSULTANT' },
    { id: 'approve-client', label: t.ipc.approveClient, variant: 'default' as const, icon: CheckCircle2, cond: ipc.status === 'PENDING_CLIENT_APPROVAL' && orgType === 'CLIENT' },
    { id: 'reject-client', label: t.ipc.rejectClient, variant: 'destructive' as const, icon: XCircle, cond: ipc.status === 'PENDING_CLIENT_APPROVAL' && orgType === 'CLIENT' },
  ].filter((a) => a.cond);

  if (actions.length === 0) return null;

  return (
    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <h4 className="text-sm font-semibold">{t.commandCenter.workflowActions}</h4>
      <Textarea
        rows={2}
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        placeholder={t.commandCenter.decisionCommentsPlaceholder}
      />
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button
            key={a.id}
            variant={a.variant}
            size="sm"
            disabled={loading}
            className="gap-2"
            onClick={() => void run(a.id)}
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <a.icon className="size-3.5" />}
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ProjectIpcClient({ projectId }: ProjectIpcClientProps) {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [selected, setSelected] = useState<IpcRecord | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const queryClient = useQueryClient();

  const orgType = user?.organization?.type ?? '';

  const { data: ipcs = [], isLoading: loading } = useQuery({
    queryKey: ['ipcs', projectId],
    enabled: Boolean(accessToken),
    queryFn: async () => {
      if (!accessToken) throw new Error('Missing access token');
      return fetchProjectIpcs(accessToken, projectId);
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    setSelected((prev) => {
      if (prev) {
        const refreshed = ipcs.find((i) => i.id === prev.id);
        return refreshed ?? ipcs[0] ?? null;
      }
      return ipcs[0] ?? null;
    });
  }, [ipcs]);

  async function handleDownloadPdf(ipcId: string) {
    if (!accessToken) return;
    setPdfLoading(true);
    try {
      await downloadIpcPdf(accessToken, ipcId);
      toast.success(t.commandCenter.pdfDownloaded);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.commandCenter.pdfError);
    } finally {
      setPdfLoading(false);
    }
  }

  const canCreateIpc = canGenerateIpc(user);

  if (!canViewIpcBilling(user)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.ipcHub.restrictedTitle}</CardTitle>
          <CardDescription>{t.ipcHub.restrictedDesc}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t.commandCenter.ipcTitle}
          </h1>
          <p className="text-muted-foreground">{t.commandCenter.ipcSubtitle}</p>
        </div>
        {canCreateIpc && (
          <IpcWizard
            projectId={projectId}
            onCreated={(ipc) => {
              queryClient.setQueryData<IpcRecord[]>(['ipcs', projectId], (prev) =>
                prev ? [ipc, ...prev] : [ipc],
              );
              setSelected(ipc);
            }}
          />
        )}
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left — IPC list */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{t.commandCenter.ipcList}</CardTitle>
              <CardDescription>{ipcs.length} {t.ipc.certificates}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {ipcs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t.commandCenter.noIpcs}
                </p>
              ) : (
                ipcs.map((ipc) => (
                  <button
                    key={ipc.id}
                    type="button"
                    onClick={() => setSelected(ipc)}
                    className={`w-full rounded-lg border px-3 py-2 text-start text-sm transition-colors ${
                      selected?.id === ipc.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{ipc.certificateNumber}</span>
                      <Badge
                        variant="outline"
                        className={IPC_STATUS_COLORS[ipc.status] ?? ''}
                      >
                        {ipc.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{formatMoney(ipc.subtotalAmount, ipc.currency)}</span>
                      {ipc.periodStart && (
                        <span>
                          {new Date(ipc.periodStart).toLocaleDateString()} –{' '}
                          {ipc.periodEnd ? new Date(ipc.periodEnd).toLocaleDateString() : '…'}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Right — IPC detail */}
          <Card className="lg:col-span-3">
            {selected ? (
              <>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="size-5" />
                      {selected.certificateNumber}
                    </CardTitle>
                    <CardDescription>
                      {selected.lineItems.length} {t.commandCenter.lineItems} ·{' '}
                      {formatMoney(selected.subtotalAmount, selected.currency)}
                      {selected.contractorOrg && (
                        <> · {selected.contractorOrg.name}</>
                      )}
                    </CardDescription>
                    {selected.periodStart && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(selected.periodStart).toLocaleDateString()} —{' '}
                        {selected.periodEnd
                          ? new Date(selected.periodEnd).toLocaleDateString()
                          : ''}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-2"
                    disabled={pdfLoading}
                    onClick={() => void handleDownloadPdf(selected.id)}
                  >
                    {pdfLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                    PDF
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="overflow-hidden rounded-xl border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t.commandCenter.colReference}</TableHead>
                          <TableHead>{t.commandCenter.description}</TableHead>
                          <TableHead className="text-end">
                            {t.commandCenter.amount}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.lineItems.map((line) => (
                          <TableRow key={line.id}>
                            <TableCell className="font-mono text-xs">
                              {line.formInstance?.referenceNumber ??
                                line.formInstanceId.slice(0, 8)}
                            </TableCell>
                            <TableCell>{line.description}</TableCell>
                            <TableCell className="text-end font-medium tabular-nums">
                              {formatMoney(line.lineAmount, selected.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-end text-lg font-bold tabular-nums">
                    {t.commandCenter.total}:{' '}
                    {formatMoney(selected.subtotalAmount, selected.currency)}
                  </p>
                  {selected.notes && (
                    <p className="rounded-lg bg-muted/40 p-3 text-sm italic text-muted-foreground">
                      {selected.notes}
                    </p>
                  )}

                  <IpcWorkflowActions
                    ipc={selected}
                    orgType={orgType}
                    onUpdated={() =>
                      void queryClient.invalidateQueries({ queryKey: ['ipcs', projectId] })
                    }
                  />
                </CardContent>
              </>
            ) : (
              <CardContent className="flex min-h-[280px] items-center justify-center text-muted-foreground">
                {t.commandCenter.selectIpc}
              </CardContent>
            )}
          </Card>
        </div>
      )}

      <Button asChild variant="link" className="px-0">
        <Link href={`/dashboard/projects/${projectId}/forms`}>
          {t.commandCenter.viewWirs}
        </Link>
      </Button>
    </div>
  );
}
