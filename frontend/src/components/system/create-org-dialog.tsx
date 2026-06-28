'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createPlatformOrganization } from '@/lib/api/system';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';
import { orgTypeLabel } from '@/lib/org-types';

const ORG_TYPES = [
  'CLIENT',
  'CONSULTANT',
  'MAIN_CONTRACTOR',
  'LABORATORY',
] as const;

type OrgType = (typeof ORG_TYPES)[number];

interface CreateOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateOrgDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateOrgDialogProps) {
  const { t, locale } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [type, setType] = useState<OrgType>('CLIENT');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName('');
      setNameAr('');
      setType('CLIENT');
      setAdminFullName('');
      setAdminUsername('');
      setAdminPassword('');
      setFieldError(null);
    }
  }, [open]);

  const trimmedName = name.trim();
  const trimmedFullName = adminFullName.trim();
  const trimmedUsername = adminUsername.trim().toLowerCase();

  const valid =
    trimmedName.length >= 2 &&
    /^[a-zA-Z0-9._-]{3,32}$/.test(trimmedUsername) &&
    adminPassword.length >= 8 &&
    trimmedFullName.length >= 2;

  async function handleCreate() {
    if (!accessToken || !valid) return;
    setSubmitting(true);
    setFieldError(null);
    try {
      await createPlatformOrganization(accessToken, {
        name: trimmedName,
        nameAr: nameAr.trim() || undefined,
        type,
        adminFullName: trimmedFullName,
        adminUsername: trimmedUsername,
        adminPassword,
      });
      toast.success(t.systemAdmin.createSuccess);
      onCreated();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t.systemAdmin.createError;
      setFieldError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.systemAdmin.createOrg}</DialogTitle>
          <DialogDescription>{t.systemAdmin.createOrgDesc}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {fieldError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {fieldError}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="org-name">{t.systemAdmin.orgName}</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.systemAdmin.orgNamePlaceholder}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-name-ar">{t.systemAdmin.orgNameAr}</Label>
            <Input
              id="org-name-ar"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label>{t.systemAdmin.orgType}</Label>
            <Select value={type} onValueChange={(v) => setType(v as OrgType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORG_TYPES.map((ot) => (
                  <SelectItem key={ot} value={ot}>
                    {orgTypeLabel(ot, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-name">{t.systemAdmin.adminFullName}</Label>
            <Input
              id="admin-name"
              value={adminFullName}
              onChange={(e) => setAdminFullName(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admin-username">{t.systemAdmin.adminUsername}</Label>
              <Input
                id="admin-username"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value.toLowerCase())}
                dir="ltr"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                {t.systemAdmin.usernameHint}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">{t.systemAdmin.adminPassword}</Label>
              <Input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                dir="ltr"
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">
                {t.systemAdmin.passwordHint}
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            disabled={!valid || submitting}
            onClick={() => void handleCreate()}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {t.systemAdmin.createOrg}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
