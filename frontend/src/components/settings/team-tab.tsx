'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  FolderKanban,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  createTeamMember,
  fetchMemberProjects,
  fetchOrgRoles,
  fetchTeamMembers,
  resetTeamMemberPassword,
  setMemberProjects,
  updateTeamMember,
} from '@/lib/api/users';
import type {
  MemberProjectAccessItem,
  OrgRole,
  TeamMember,
} from '@/lib/api/users';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';
import { resolveWorkspace } from '@/lib/workspace';

export function TeamTab() {
  const { t, locale } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const workspace = resolveWorkspace(user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [memberList, roleList] = await Promise.all([
        fetchTeamMembers(accessToken),
        fetchOrgRoles(accessToken),
      ]);
      setMembers(memberList);
      setRoles(roleList);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t.settings.teamLoadError,
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, t.settings.teamLoadError]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user?.isOrgAdmin) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Shield className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">{t.settings.teamAdminOnly}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t.settings.team}</h2>
          <p className="text-sm text-muted-foreground">{t.settings.teamDesc}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="size-4" />
          {workspace === 'main_contractor' || workspace === 'sub_contractor'
            ? t.settings.addEngineer
            : t.settings.createUser}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" />
            {t.settings.teamMembers} ({members.length})
          </CardTitle>
          <CardDescription>{t.settings.teamMembersDesc}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.settings.name}</TableHead>
                  <TableHead>{t.settings.loginId}</TableHead>
                  <TableHead>{t.settings.role}</TableHead>
                  <TableHead>{t.commandCenter.colStatus}</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    roles={roles}
                    locale={locale}
                    currentUserId={user.id}
                    onUpdated={load}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        roles={roles}
        locale={locale}
        onCreated={() => {
          setCreateOpen(false);
          void load();
        }}
      />
    </div>
  );
}

function MemberRow({
  member,
  roles,
  locale,
  currentUserId,
  onUpdated,
}: {
  member: TeamMember;
  roles: OrgRole[];
  locale: 'en' | 'ar';
  currentUserId: string;
  onUpdated: () => void;
}) {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [resetOpen, setResetOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const roleName =
    locale === 'ar' && member.role?.nameAr
      ? member.role.nameAr
      : member.role?.name ?? '—';

  const loginId =
    member.loginId ??
    member.username ??
    member.email ??
    '—';

  async function handleRoleChange(roleId: string) {
    if (!accessToken) return;
    try {
      await updateTeamMember(accessToken, member.id, { roleId });
      toast.success(t.settings.memberUpdated);
      onUpdated();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t.settings.memberUpdateError,
      );
    }
  }

  async function toggleActive() {
    if (!accessToken || member.id === currentUserId) return;
    try {
      await updateTeamMember(accessToken, member.id, {
        isActive: !member.isActive,
      });
      toast.success(t.settings.memberUpdated);
      onUpdated();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t.settings.memberUpdateError,
      );
    }
  }

  async function toggleAdmin() {
    if (!accessToken || member.id === currentUserId) return;
    try {
      await updateTeamMember(accessToken, member.id, {
        isOrgAdmin: !member.isOrgAdmin,
      });
      toast.success(t.settings.memberUpdated);
      onUpdated();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t.settings.memberUpdateError,
      );
    }
  }

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">
          {member.firstName} {member.lastName}
          {member.isOrgAdmin && (
            <Badge variant="secondary" className="ms-2">
              {t.settings.orgAdmin}
            </Badge>
          )}
        </TableCell>
        <TableCell className="font-mono text-xs" dir="ltr">
          {loginId}
        </TableCell>
        <TableCell>
          <Select
            value={member.role?.id ?? ''}
            onValueChange={handleRoleChange}
            disabled={member.id === currentUserId}
          >
            <SelectTrigger className="h-8 w-[160px]">
              <SelectValue>{roleName}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {locale === 'ar' && r.nameAr ? r.nameAr : r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <Badge variant={member.isActive ? 'default' : 'outline'}>
            {member.isActive ? t.settings.active : t.settings.inactive}
          </Badge>
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setResetOpen(true)}>
                <KeyRound className="size-4" />
                {t.settings.resetPassword}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setManageOpen(true)}>
                <FolderKanban className="size-4" />
                {t.projectWorkspace.manageAccess}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={member.id === currentUserId}
                onClick={() => void toggleAdmin()}
              >
                <Shield className="size-4" />
                {member.isOrgAdmin
                  ? t.settings.revokeAdmin
                  : t.settings.grantAdmin}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={member.id === currentUserId}
                onClick={() => void toggleActive()}
              >
                {member.isActive ? t.settings.deactivate : t.settings.activate}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <ResetPasswordDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        memberId={member.id}
        memberName={`${member.firstName} ${member.lastName}`}
      />

      <ManageProjectsDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        memberId={member.id}
        memberName={`${member.firstName} ${member.lastName}`}
        locale={locale}
      />
    </>
  );
}

function ManageProjectsDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  locale,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  memberId: string;
  memberName: string;
  locale: 'en' | 'ar';
}) {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [items, setItems] = useState<MemberProjectAccessItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !accessToken) return;
    let active = true;
    setLoading(true);
    fetchMemberProjects(accessToken, memberId)
      .then((res) => {
        if (!active) return;
        setItems(res.projects);
        setIsAdmin(res.isOrgAdmin);
        setSelected(
          new Set(res.projects.filter((p) => p.assigned).map((p) => p.id)),
        );
      })
      .catch((err) => {
        toast.error(
          err instanceof ApiError ? err.message : t.projectWorkspace.accessError,
        );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, accessToken, memberId, t.projectWorkspace.accessError]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (!accessToken) return;
    setSaving(true);
    try {
      await setMemberProjects(accessToken, memberId, Array.from(selected));
      toast.success(t.projectWorkspace.accessSaved);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t.projectWorkspace.accessError,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="size-5" />
            {t.projectWorkspace.manageAccess}
          </DialogTitle>
          <DialogDescription>
            {t.projectWorkspace.manageAccessDesc} — <strong>{memberName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : isAdmin ? (
            <p className="rounded-md bg-muted px-3 py-3 text-sm text-muted-foreground">
              {t.projectWorkspace.adminAllProjects}
            </p>
          ) : items.length === 0 ? (
            <p className="rounded-md bg-muted px-3 py-3 text-sm text-muted-foreground">
              {t.projectWorkspace.noProjectsToAssign}
            </p>
          ) : (
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {items.map((p) => {
                const name = locale === 'ar' && p.nameAr ? p.nameAr : p.name;
                const checked = selected.has(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(p.id)}
                      className="size-4 rounded border"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {p.code}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={saving || loading || isAdmin || items.length === 0}
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {t.projectWorkspace.saveAccess}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  roles,
  locale,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roles: OrgRole[];
  locale: 'en' | 'ar';
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setFullName('');
      setUsername('');
      setPassword('');
      setRoleId(roles[0]?.id ?? '');
      setIsOrgAdmin(false);
    } else if (roles.length && !roleId) {
      const engineer = roles.find((r) => r.name === 'Engineer');
      setRoleId(engineer?.id ?? roles[0].id);
    }
  }, [open, roles, roleId]);

  async function handleCreate() {
    if (!accessToken) return;
    setSubmitting(true);
    try {
      await createTeamMember(accessToken, {
        fullName,
        username,
        password,
        roleId: roleId || undefined,
        isOrgAdmin,
      });
      toast.success(t.settings.createUserSuccess);
      onCreated();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t.settings.createUserError,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const usernameValid = /^[a-zA-Z0-9._-]{3,32}$/.test(username);
  const canSubmit =
    fullName.trim().length >= 2 &&
    usernameValid &&
    password.length >= 8 &&
    !submitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            {t.settings.createUser}
          </DialogTitle>
          <DialogDescription>{t.settings.createUserDesc}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>{t.settings.fullName}</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ahmed Hassan"
            />
          </div>
          <div className="space-y-2">
            <Label>{t.settings.username}</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="ahmed.h"
              dir="ltr"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">{t.settings.usernameHint}</p>
          </div>
          <div className="space-y-2">
            <Label>{t.settings.initialPassword}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label>{t.settings.assignRole}</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {locale === 'ar' && r.nameAr ? r.nameAr : r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isOrgAdmin}
              onChange={(e) => setIsOrgAdmin(e.target.checked)}
              className="rounded border"
            />
            {t.settings.grantOrgAdmin}
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button onClick={() => void handleCreate()} disabled={!canSubmit}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {t.settings.createUser}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  memberId: string;
  memberName: string;
}) {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) setPassword('');
  }, [open]);

  async function handleReset() {
    if (!accessToken || password.length < 8) return;
    setSubmitting(true);
    try {
      await resetTeamMemberPassword(accessToken, memberId, password);
      toast.success(t.settings.resetPasswordSuccess);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t.settings.resetPasswordError,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.settings.resetPassword}</DialogTitle>
          <DialogDescription>
            {t.settings.resetPasswordDesc} — <strong>{memberName}</strong>
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
            {t.settings.resetPassword}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
