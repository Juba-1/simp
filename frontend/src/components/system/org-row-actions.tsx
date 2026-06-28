'use client';

import { useState } from 'react';
import {
  KeyRound,
  Loader2,
  MoreHorizontal,
  Pencil,
  ShieldOff,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  deletePlatformOrganization,
  resetPlatformUserPassword,
  suspendPlatformOrganization,
  updatePlatformOrganization,
} from '@/lib/api/system';
import type { PlatformOrganization } from '@/lib/api/system';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

interface OrgRowActionsProps {
  org: PlatformOrganization;
  onChanged: () => void;
}

export function OrgRowActions({ org, onChanged }: OrgRowActionsProps) {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [name, setName] = useState(org.name);
  const [nameAr, setNameAr] = useState(org.nameAr ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleEdit() {
    if (!accessToken || name.trim().length < 2) return;
    setBusy(true);
    try {
      await updatePlatformOrganization(accessToken, org.id, {
        name: name.trim(),
        nameAr: nameAr.trim() || undefined,
      });
      toast.success(t.systemAdmin.editSuccess);
      setEditOpen(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.systemAdmin.editError);
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!accessToken || !org.admin || password.length < 8) return;
    setBusy(true);
    try {
      await resetPlatformUserPassword(accessToken, org.admin.id, password);
      toast.success(t.systemAdmin.resetSuccess);
      setResetOpen(false);
      setPassword('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.systemAdmin.resetError);
    } finally {
      setBusy(false);
    }
  }

  async function handleSuspend() {
    if (!accessToken) return;
    setBusy(true);
    try {
      await suspendPlatformOrganization(accessToken, org.id);
      toast.success(t.systemAdmin.suspendSuccess);
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.systemAdmin.suspendError);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!accessToken) return;
    if (!window.confirm(t.systemAdmin.deleteConfirm)) return;
    setBusy(true);
    try {
      await deletePlatformOrganization(accessToken, org.id);
      toast.success(t.systemAdmin.deleteSuccess);
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.systemAdmin.deleteError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={busy}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              setName(org.name);
              setNameAr(org.nameAr ?? '');
              setEditOpen(true);
            }}
          >
            <Pencil className="size-4" />
            {t.systemAdmin.editOrg}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!org.admin}
            onClick={() => setResetOpen(true)}
          >
            <KeyRound className="size-4" />
            {t.systemAdmin.resetPassword}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!org.isActive} onClick={() => void handleSuspend()}>
            <ShieldOff className="size-4" />
            {t.systemAdmin.suspendAccount}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => void handleDelete()}
          >
            <Trash2 className="size-4" />
            {t.systemAdmin.deleteOrg}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.systemAdmin.editOrg}</DialogTitle>
            <DialogDescription>{org.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>{t.systemAdmin.orgName}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.systemAdmin.orgNameAr}</Label>
              <Input
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                dir="rtl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={() => void handleEdit()} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.systemAdmin.resetPassword}</DialogTitle>
            <DialogDescription>
              {org.admin?.username
                ? `@${org.admin.username}`
                : t.systemAdmin.colAdmin}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>{t.systemAdmin.adminPassword}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
              autoComplete="new-password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={() => void handleReset()}
              disabled={busy || password.length < 8}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t.systemAdmin.resetPassword}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
