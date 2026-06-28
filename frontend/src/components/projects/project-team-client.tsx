'use client';

import { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Link2,
  Loader2,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  assignProjectUser,
  fetchProject,
  fetchProjectTeam,
  fetchSubContractors,
  linkSubContractorToProject,
  removeProjectUser,
} from '@/lib/api/projects';
import type { ProjectTeamMember, SubContractorLinkRow } from '@/lib/api/projects';
import { ApiError } from '@/lib/api/client';
import {
  canAssignOwnOrgMembers,
  canLinkSubContractorToProject,
  canManageProjectTeamMember,
} from '@/lib/auth/permissions';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';
import { orgTypeLabel, isOrganizationType } from '@/lib/org-types';

const STALE_MS = 5 * 60_000;

function dedupeManagedSubContractors(
  links: SubContractorLinkRow[],
): SubContractorLinkRow['subContractor'][] {
  const map = new Map<string, SubContractorLinkRow['subContractor']>();
  for (const row of links) {
    if (!map.has(row.subContractor.id)) {
      map.set(row.subContractor.id, row.subContractor);
    }
  }
  return Array.from(map.values());
}

interface ProjectTeamClientProps {
  projectId: string;
}

export function ProjectTeamClient({ projectId }: ProjectTeamClientProps) {
  const { t, locale } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [linkSubOpen, setLinkSubOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedSubOrgId, setSelectedSubOrgId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const teamQuery = useQuery({
    queryKey: ['projectTeam', projectId],
    queryFn: async () => {
      if (!accessToken) throw new Error('Missing token');
      return fetchProjectTeam(accessToken, projectId);
    },
    enabled: Boolean(accessToken),
    staleTime: STALE_MS,
  });

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!accessToken) throw new Error('Missing token');
      return fetchProject(accessToken, projectId);
    },
    enabled: Boolean(accessToken),
    staleTime: STALE_MS,
  });

  const subsQuery = useQuery({
    queryKey: ['managedSubContractors'],
    queryFn: async () => {
      if (!accessToken) throw new Error('Missing token');
      return fetchSubContractors(accessToken);
    },
    enabled: Boolean(
      accessToken && teamQuery.data?.permissions.canLinkSubContractor,
    ),
    staleTime: STALE_MS,
  });

  const roster = teamQuery.data?.roster ?? [];
  const availableMembers = teamQuery.data?.availableToAssign ?? [];
  const showLinkSub =
    teamQuery.data?.permissions.canLinkSubContractor &&
    canLinkSubContractorToProject(user);
  const showAddMember =
    teamQuery.data?.permissions.canAssignMembers && canAssignOwnOrgMembers(user);

  const forbidden =
    teamQuery.error instanceof ApiError &&
    (teamQuery.error.status === 403 || teamQuery.error.status === 404);

  const linkedSubOrgIds = useMemo(() => {
    const orgs = projectQuery.data?.organizations ?? [];
    return new Set(
      orgs
        .filter((o) => o.organization.type === 'SUB_CONTRACTOR')
        .map((o) => o.organization.id),
    );
  }, [projectQuery.data?.organizations]);

  const linkedSubsOnProject = useMemo(() => {
    const orgs = projectQuery.data?.organizations ?? [];
    return orgs.filter((o) => o.organization.type === 'SUB_CONTRACTOR');
  }, [projectQuery.data?.organizations]);

  const availableSubs = useMemo(() => {
    const all = dedupeManagedSubContractors(subsQuery.data ?? []);
    return all.filter((sub) => !linkedSubOrgIds.has(sub.id));
  }, [subsQuery.data, linkedSubOrgIds]);

  const assignMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!accessToken) throw new Error('Missing token');
      return assignProjectUser(accessToken, projectId, userId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projectTeam', projectId] });
      toast.success(t.projectWorkspace.memberAssigned);
      setAddMemberOpen(false);
      setSelectedMemberId(null);
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError ? err.message : t.projectWorkspace.accessError,
      );
    },
  });

  const linkSubMutation = useMutation({
    mutationFn: async (subContractorOrgId: string) => {
      if (!accessToken) throw new Error('Missing token');
      return linkSubContractorToProject(accessToken, projectId, subContractorOrgId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['managedSubContractors'] });
      toast.success(t.projectWorkspace.subContractorLinked);
      setLinkSubOpen(false);
      setSelectedSubOrgId(null);
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError ? err.message : t.projectWorkspace.accessError,
      );
    },
  });

  async function revoke(member: ProjectTeamMember) {
    if (!accessToken || member.locked || !member.canManage) return;
    setPendingId(member.id);
    try {
      await removeProjectUser(accessToken, projectId, member.id);
      toast.success(t.projectWorkspace.accessRevoked);
      void queryClient.invalidateQueries({ queryKey: ['projectTeam', projectId] });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t.projectWorkspace.accessError,
      );
    } finally {
      setPendingId(null);
    }
  }

  const initialLoading = teamQuery.isPending && !teamQuery.data;

  if (initialLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        {t.common.loading}
      </div>
    );
  }

  if (forbidden) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <ShieldCheck className="size-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">{t.projectWorkspace.teamAdminOnly}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t.projectWorkspace.teamTitle}
          </h1>
          <p className="text-muted-foreground">{t.projectWorkspace.teamSubtitle}</p>
        </div>
        {(showAddMember || showLinkSub) && (
          <div className="flex flex-wrap gap-2">
            {showAddMember && (
              <Button
                size="lg"
                className="gap-2"
                onClick={() => setAddMemberOpen(true)}
              >
                <UserPlus className="size-4" />
                {t.projectWorkspace.addExistingMember}
              </Button>
            )}
            {showLinkSub && (
              <Button
                size="lg"
                variant="secondary"
                className="gap-2"
                onClick={() => setLinkSubOpen(true)}
              >
                <Link2 className="size-4" />
                {t.projectWorkspace.linkSubContractor}
              </Button>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" />
            {t.projectWorkspace.colMember}
          </CardTitle>
          <CardDescription>{t.projectWorkspace.teamRosterDesc}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {roster.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              {t.projectWorkspace.noMembersAvailable}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.projectWorkspace.colMember}</TableHead>
                  <TableHead>{t.projectWorkspace.colOrganization}</TableHead>
                  <TableHead>{t.projectWorkspace.colRole}</TableHead>
                  <TableHead className="text-end">{t.projectWorkspace.colAccess}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map((m) => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    locale={locale}
                    currentUser={user}
                    pendingId={pendingId}
                    onRevoke={revoke}
                    t={t}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {linkedSubsOnProject.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4" />
              {t.projectWorkspace.subContractorsOnProject}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.subContractors.colCompany}</TableHead>
                  <TableHead>{t.subContractors.colStatus}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedSubsOnProject.map((row) => {
                  const name =
                    locale === 'ar' && row.organization.nameAr
                      ? row.organization.nameAr
                      : row.organization.name;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.role}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {showAddMember && (
        <AddMemberDialog
          open={addMemberOpen}
          onOpenChange={setAddMemberOpen}
          members={availableMembers}
          selectedId={selectedMemberId}
          onSelect={setSelectedMemberId}
          onAssign={() => {
            if (selectedMemberId) assignMutation.mutate(selectedMemberId);
          }}
          assigning={assignMutation.isPending}
          locale={locale}
          t={t}
        />
      )}

      {showLinkSub && (
        <LinkSubContractorDialog
          open={linkSubOpen}
          onOpenChange={setLinkSubOpen}
          subs={availableSubs}
          selectedId={selectedSubOrgId}
          onSelect={setSelectedSubOrgId}
          onLink={() => {
            if (selectedSubOrgId) linkSubMutation.mutate(selectedSubOrgId);
          }}
          linking={linkSubMutation.isPending}
          locale={locale}
          t={t}
        />
      )}
    </div>
  );
}

function MemberRow({
  member: m,
  locale,
  currentUser,
  pendingId,
  onRevoke,
  t,
}: {
  member: ProjectTeamMember;
  locale: string;
  currentUser: ReturnType<typeof useAuthStore.getState>['user'];
  pendingId: string | null;
  onRevoke: (m: ProjectTeamMember) => void;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const roleName = locale === 'ar' && m.roleNameAr ? m.roleNameAr : m.roleName;
  const orgName =
    locale === 'ar' && m.organizationNameAr
      ? m.organizationNameAr
      : m.organizationName;
  const orgLabel = isOrganizationType(m.organizationType)
    ? orgTypeLabel(m.organizationType, locale as 'en' | 'ar')
    : m.organizationType;
  const canRevoke =
    m.canManage && canManageProjectTeamMember(currentUser, m.organizationId);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {m.firstName.charAt(0)}
            {m.lastName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">
              {m.firstName} {m.lastName}
            </p>
            {m.username && (
              <p className="truncate text-xs text-muted-foreground">@{m.username}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{orgName}</p>
          <p className="text-xs text-muted-foreground">{orgLabel}</p>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">{roleName ?? '—'}</span>
      </TableCell>
      <TableCell className="text-end">
        {m.locked ? (
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="size-3" />
            {t.projectWorkspace.adminAllAccess}
          </Badge>
        ) : canRevoke ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pendingId === m.id}
            onClick={() => void onRevoke(m)}
            className="gap-1.5"
          >
            {pendingId === m.id ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <UserMinus className="size-3.5" />
            )}
            {t.projectWorkspace.revokeAccess}
          </Button>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            {t.projectWorkspace.readOnlyAccess}
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

function AddMemberDialog({
  open,
  onOpenChange,
  members,
  selectedId,
  onSelect,
  onAssign,
  assigning,
  locale,
  t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: ProjectTeamMember[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAssign: () => void;
  assigning: boolean;
  locale: string;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.projectWorkspace.addExistingMember}</DialogTitle>
          <DialogDescription>{t.projectWorkspace.addExistingMemberDesc}</DialogDescription>
        </DialogHeader>
        <Command className="rounded-lg border">
          <CommandInput placeholder={t.projectWorkspace.searchMembers} />
          <CommandList className="max-h-64">
            <CommandEmpty>{t.projectWorkspace.noMembersAvailable}</CommandEmpty>
            <CommandGroup>
              {members.map((m) => {
                const roleName =
                  locale === 'ar' && m.roleNameAr ? m.roleNameAr : m.roleName;
                return (
                  <CommandItem
                    key={m.id}
                    value={`${m.firstName} ${m.lastName} ${m.username ?? ''} ${roleName ?? ''}`}
                    onSelect={() => onSelect(m.id)}
                  >
                    <CheckCircle2
                      className={`me-2 size-4 ${selectedId === m.id ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <div>
                      <p className="font-medium">
                        {m.firstName} {m.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {roleName ?? '—'}
                        {m.username ? ` · @${m.username}` : ''}
                      </p>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button disabled={!selectedId || assigning} onClick={onAssign} className="gap-2">
            {assigning && <Loader2 className="size-4 animate-spin" />}
            {t.projectWorkspace.assignToProject}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LinkSubContractorDialog({
  open,
  onOpenChange,
  subs,
  selectedId,
  onSelect,
  onLink,
  linking,
  locale,
  t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  subs: Array<{ id: string; name: string; nameAr: string | null; isActive: boolean }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onLink: () => void;
  linking: boolean;
  locale: string;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.projectWorkspace.linkSubContractor}</DialogTitle>
          <DialogDescription>{t.projectWorkspace.linkSubContractorDesc}</DialogDescription>
        </DialogHeader>
        <Command className="rounded-lg border">
          <CommandInput placeholder={t.projectWorkspace.searchSubContractors} />
          <CommandList className="max-h-64">
            <CommandEmpty>{t.projectWorkspace.noSubContractorsAvailable}</CommandEmpty>
            <CommandGroup>
              {subs.map((sub) => {
                const name = locale === 'ar' && sub.nameAr ? sub.nameAr : sub.name;
                return (
                  <CommandItem
                    key={sub.id}
                    value={name}
                    onSelect={() => onSelect(sub.id)}
                  >
                    <CheckCircle2
                      className={`me-2 size-4 ${selectedId === sub.id ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <div className="flex flex-1 items-center justify-between gap-2">
                      <span className="font-medium">{name}</span>
                      <Badge variant={sub.isActive ? 'default' : 'outline'} className="text-xs">
                        {sub.isActive ? t.settings.active : t.settings.inactive}
                      </Badge>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button disabled={!selectedId || linking} onClick={onLink} className="gap-2">
            {linking && <Loader2 className="size-4 animate-spin" />}
            {t.projectWorkspace.linkSubContractorAction}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
