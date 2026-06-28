'use client';

import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Loader2, UserPlus, Users } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/data-table';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  fetchProjects,
  fetchSubContractors,
  provisionSubContractor,
  resetSubContractorAdminPassword,
} from '@/lib/api/projects';
import type { ProjectSummary, SubContractorLinkRow } from '@/lib/api/projects';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

const STALE_MS = 5 * 60_000;

export function SubContractorsPageClient() {
  const { t, locale } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<{
    orgId: string;
    name: string;
  } | null>(null);

  const { data: rows = [], isPending } = useQuery({
    queryKey: ['managedSubContractors'],
    queryFn: async () => {
      if (!accessToken) throw new Error('Missing token');
      return fetchSubContractors(accessToken);
    },
    enabled: Boolean(accessToken),
    staleTime: STALE_MS,
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects', 1, 50],
    queryFn: async () => {
      if (!accessToken) throw new Error('Missing token');
      return fetchProjects(accessToken);
    },
    enabled: Boolean(accessToken),
    staleTime: STALE_MS,
  });

  const projects = projectsData?.data ?? [];
  const initialLoading = isPending && rows.length === 0;

  const columns = useMemo<ColumnDef<SubContractorLinkRow>[]>(
    () => [
      {
        id: 'company',
        header: t.subContractors.colCompany,
        accessorFn: (row) => row.subContractor.name,
        cell: ({ row }) => {
          const sub = row.original.subContractor;
          const name =
            locale === 'ar' && sub.nameAr ? sub.nameAr : sub.name;
          return <span className="font-medium">{name}</span>;
        },
      },
      {
        id: 'project',
        header: t.subContractors.colProject,
        accessorFn: (row) => row.projectName,
        cell: ({ row }) => {
          const name =
            locale === 'ar' && row.original.projectNameAr
              ? row.original.projectNameAr
              : row.original.projectName;
          return (
            <div>
              <p>{name}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {row.original.projectCode}
              </p>
            </div>
          );
        },
      },
      {
        id: 'status',
        header: t.subContractors.colStatus,
        cell: ({ row }) => (
          <Badge variant={row.original.subContractor.isActive ? 'default' : 'outline'}>
            {row.original.subContractor.isActive
              ? t.settings.active
              : t.settings.inactive}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: t.subContractors.colActions,
        cell: ({ row }) => {
          const sub = row.original.subContractor;
          const name = locale === 'ar' && sub.nameAr ? sub.nameAr : sub.name;
          return (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() =>
                setResetTarget({ orgId: sub.id, name })
              }
            >
              <KeyRound className="size-3.5" />
              {t.subContractors.resetAdminPassword}
            </Button>
          );
        },
      },
    ],
    [t, locale],
  );

  if (initialLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        {t.common.loading}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t.workspaceNav.subContractors}
          </h1>
          <p className="text-muted-foreground">{t.subContractors.subtitle}</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus className="size-4" />
          {t.subContractors.inviteAction}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            {t.subContractors.tableTitle}
          </CardTitle>
          <CardDescription>{t.subContractors.tableDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t.subContractors.empty}
            </p>
          ) : (
            <DataTable
              columns={columns}
              data={rows}
              searchKey="company"
              searchPlaceholder={t.subContractors.search}
            />
          )}
        </CardContent>
      </Card>

      <InviteSubContractorDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        projects={projects}
      />

      {resetTarget && (
        <ResetSubAdminPasswordDialog
          open={Boolean(resetTarget)}
          onOpenChange={(open) => !open && setResetTarget(null)}
          orgId={resetTarget.orgId}
          companyName={resetTarget.name}
        />
      )}
    </div>
  );
}

function ResetSubAdminPasswordDialog({
  open,
  onOpenChange,
  orgId,
  companyName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId: string;
  companyName: string;
}) {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleReset() {
    if (!accessToken || password.length < 8) return;
    setSubmitting(true);
    try {
      await resetSubContractorAdminPassword(accessToken, orgId, password);
      toast.success(t.subContractors.resetAdminPasswordSuccess);
      onOpenChange(false);
      setPassword('');
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : t.subContractors.resetAdminPasswordError,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.subContractors.resetAdminPassword}</DialogTitle>
          <DialogDescription>
            {t.subContractors.resetAdminPasswordDesc} — <strong>{companyName}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>{t.settings.newPassword}</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            dir="ltr"
            autoComplete="new-password"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            onClick={() => void handleReset()}
            disabled={submitting || password.length < 8}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {t.subContractors.resetAdminPassword}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InviteSubContractorDialog({
  open,
  onOpenChange,
  projects,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projects: ProjectSummary[];
}) {
  const { t, locale } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && !projectId && projects[0]) {
      setProjectId(projects[0].id);
    }
    if (!open) {
      setName('');
      setNameAr('');
      setAdminFullName('');
      setAdminUsername('');
      setAdminPassword('');
    }
  }, [open, projects, projectId]);

  const valid =
    projectId &&
    name.trim().length >= 2 &&
    adminFullName.trim().length >= 2 &&
    /^[a-zA-Z0-9._-]{3,32}$/.test(adminUsername.trim()) &&
    adminPassword.length >= 8;

  async function handleSubmit() {
    if (!accessToken || !valid) return;
    setSubmitting(true);
    try {
      await provisionSubContractor(accessToken, projectId, {
        name: name.trim(),
        nameAr: nameAr.trim() || undefined,
        adminFullName: adminFullName.trim(),
        adminUsername: adminUsername.trim().toLowerCase(),
        adminPassword,
      });
      toast.success(t.subContractors.inviteSuccess);
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ['managedSubContractors'] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.subContractors.inviteError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.subContractors.inviteTitle}</DialogTitle>
          <DialogDescription>{t.subContractors.inviteDesc}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>{t.subContractors.selectProject}</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {locale === 'ar' && p.nameAr ? p.nameAr : p.name} ({p.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t.subContractors.companyName}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t.subContractors.companyNameAr}</Label>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" />
          </div>
          <div className="space-y-2">
            <Label>{t.systemAdmin.adminFullName}</Label>
            <Input
              value={adminFullName}
              onChange={(e) => setAdminFullName(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.systemAdmin.adminUsername}</Label>
              <Input
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value.toLowerCase())}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.systemAdmin.adminPassword}</Label>
              <Input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                dir="ltr"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button disabled={!valid || submitting} onClick={() => void handleSubmit()}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {t.subContractors.inviteAction}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
