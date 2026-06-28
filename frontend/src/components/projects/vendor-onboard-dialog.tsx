'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Copy, Loader2 } from 'lucide-react';
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
import { onboardVendor } from '@/lib/api/projects';
import type { OnboardVendorResult } from '@/lib/api/projects';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';
import { orgTypeLabel } from '@/lib/org-types';
import type { OrganizationType } from '@/lib/org-types';

const VENDOR_TYPES = ['CONSULTANT', 'MAIN_CONTRACTOR', 'LABORATORY'] as const;
type VendorType = (typeof VENDOR_TYPES)[number];

interface VendorOnboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated: () => void;
}

export function VendorOnboardDialog({
  open,
  onOpenChange,
  projectId,
  onCreated,
}: VendorOnboardDialogProps) {
  const { t, locale } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [type, setType] = useState<VendorType>('CONSULTANT');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [created, setCreated] = useState<OnboardVendorResult | null>(null);

  useEffect(() => {
    if (!open) {
      setName('');
      setNameAr('');
      setType('CONSULTANT');
      setAdminFullName('');
      setAdminUsername('');
      setAdminPassword('');
      setFieldError(null);
      setSubmitting(false);
      setCreated(null);
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
      const result = await onboardVendor(accessToken, projectId, {
        name: trimmedName,
        nameAr: nameAr.trim() || undefined,
        type,
        adminFullName: trimmedFullName,
        adminUsername: trimmedUsername,
        adminPassword,
      });
      toast.success(t.projectWorkspace.vendorSuccess);
      setCreated(result);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t.projectWorkspace.accessError;
      setFieldError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  function finish() {
    onCreated();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-500" />
                {t.projectWorkspace.vendorCredentialsTitle}
              </DialogTitle>
              <DialogDescription>{created.organization.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <CredentialRow
                label={t.projectWorkspace.vendorLoginId}
                value={created.admin.loginId}
              />
              <CredentialRow
                label={t.projectWorkspace.vendorAdminName}
                value={`${created.admin.firstName} ${created.admin.lastName}`}
              />
              <CredentialRow
                label={t.projectWorkspace.vendorType}
                value={orgTypeLabel(
                  created.organization.type as OrganizationType,
                  locale,
                )}
              />
            </div>
            <DialogFooter>
              <Button onClick={finish}>{t.projectWorkspace.vendorClose}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t.projectWorkspace.onboardVendor}</DialogTitle>
              <DialogDescription>
                {t.projectWorkspace.vendorSubtitle}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              {fieldError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {fieldError}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="vendor-name">{t.projectWorkspace.vendorName}</Label>
                <Input
                  id="vendor-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-name-ar">
                  {t.projectWorkspace.vendorNameAr}
                </Label>
                <Input
                  id="vendor-name-ar"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.projectWorkspace.vendorType}</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as VendorType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VENDOR_TYPES.map((vt) => (
                      <SelectItem key={vt} value={vt}>
                        {orgTypeLabel(vt, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-admin-name">
                  {t.projectWorkspace.vendorAdminName}
                </Label>
                <Input
                  id="vendor-admin-name"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vendor-admin-username">
                    {t.projectWorkspace.vendorAdminUsername}
                  </Label>
                  <Input
                    id="vendor-admin-username"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value.toLowerCase())}
                    dir="ltr"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor-admin-password">
                    {t.projectWorkspace.vendorAdminPassword}
                  </Label>
                  <Input
                    id="vendor-admin-password"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    dir="ltr"
                    autoComplete="new-password"
                  />
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
                {t.projectWorkspace.vendorCreate}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CredentialRow({ label, value }: { label: string; value: string }) {
  function copy() {
    void navigator.clipboard?.writeText(value);
  }
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm font-medium" dir="ltr">
          {value}
        </p>
      </div>
      <Button variant="ghost" size="icon" className="size-8" onClick={copy}>
        <Copy className="size-4" />
      </Button>
    </div>
  );
}
