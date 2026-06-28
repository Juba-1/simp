'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Loader2, Plus, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  createPlatformOrganization,
  fetchPlatformOrganizations,
} from '@/lib/api/system';
import type { PlatformOrganization } from '@/lib/api/system';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';
import { orgTypeLabel, isOrganizationType } from '@/lib/org-types';

const ORG_TYPES = [
  'CLIENT',
  'CONSULTANT',
  'MAIN_CONTRACTOR',
  'LABORATORY',
] as const;

export function SystemDashboardClient() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [orgs, setOrgs] = useState<PlatformOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await fetchPlatformOrganizations(accessToken);
      setOrgs(data);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t.systemAdmin.loadError,
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, t.systemAdmin.loadError]);

  useEffect(() => {
    if (!user?.isSuperAdmin) {
      router.replace('/dashboard');
      return;
    }
    void load();
  }, [user?.isSuperAdmin, router, load]);

  if (!user?.isSuperAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        {t.systemAdmin.accessDenied}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600">
            <Shield className="size-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t.systemAdmin.title}
            </h1>
            <p className="text-muted-foreground">{t.systemAdmin.subtitle}</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          {t.systemAdmin.createOrg}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5" />
            {t.systemAdmin.organizations}
          </CardTitle>
          <CardDescription>{t.systemAdmin.organizationsDesc}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.systemAdmin.colName}</TableHead>
                  <TableHead>{t.systemAdmin.colType}</TableHead>
                  <TableHead>{t.systemAdmin.users}</TableHead>
                  <TableHead>{t.systemAdmin.projects}</TableHead>
                  <TableHead>{t.systemAdmin.colStatus}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {isOrganizationType(org.type)
                          ? orgTypeLabel(org.type, locale)
                          : org.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{org.userCount}</TableCell>
                    <TableCell>{org.projectCount}</TableCell>
                    <TableCell>
                      <Badge variant={org.isActive ? 'default' : 'outline'}>
                        {org.isActive ? t.settings.active : t.settings.inactive}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateOrgDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          void load();
        }}
      />
    </motion.div>
  );
}

function CreateOrgDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [name, setName] = useState('');
  const [type, setType] = useState<(typeof ORG_TYPES)[number]>('CLIENT');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setName('');
      setType('CLIENT');
      setAdminFullName('');
      setAdminUsername('');
      setAdminPassword('');
    }
  }, [open]);

  async function handleCreate() {
    if (!accessToken) return;
    setSubmitting(true);
    try {
      await createPlatformOrganization(accessToken, {
        name,
        type,
        adminFullName,
        adminUsername,
        adminPassword,
      });
      toast.success(t.systemAdmin.createSuccess);
      onCreated();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t.systemAdmin.createError,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const valid =
    name.length >= 2 &&
    /^[a-zA-Z0-9._-]{3,32}$/.test(adminUsername) &&
    adminPassword.length >= 8 &&
    adminFullName.length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.systemAdmin.createOrg}</DialogTitle>
          <DialogDescription>{t.systemAdmin.createOrgDesc}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>{t.systemAdmin.orgName}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t.systemAdmin.orgType}</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORG_TYPES.map((ot) => (
                  <SelectItem key={ot} value={ot}>
                    {ot.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Button disabled={!valid || submitting} onClick={() => void handleCreate()}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {t.systemAdmin.createOrg}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
