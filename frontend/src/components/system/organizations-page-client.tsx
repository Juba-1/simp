'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2, Plus } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateOrgDialog } from '@/components/system/create-org-dialog';
import { OrgRowActions } from '@/components/system/org-row-actions';
import { fetchPlatformOrganizations } from '@/lib/api/system';
import type { PlatformOrganization } from '@/lib/api/system';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';
import { orgTypeLabel, isOrganizationType } from '@/lib/org-types';

export function OrganizationsPageClient() {
  const { t, locale } = useTranslation();
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
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t.workspaceNav.organizations}
          </h1>
          <p className="text-muted-foreground">{t.systemAdmin.organizationsDesc}</p>
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
                  <TableHead>{t.systemAdmin.colAdmin}</TableHead>
                  <TableHead>{t.systemAdmin.users}</TableHead>
                  <TableHead>{t.systemAdmin.projects}</TableHead>
                  <TableHead>{t.systemAdmin.colStatus}</TableHead>
                  <TableHead className="w-12 text-end">{t.systemAdmin.colActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p>{locale === 'ar' && org.nameAr ? org.nameAr : org.name}</p>
                        {org.nameAr && locale !== 'ar' && (
                          <p className="text-xs text-muted-foreground" dir="rtl">
                            {org.nameAr}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {isOrganizationType(org.type)
                          ? orgTypeLabel(org.type, locale)
                          : org.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs" dir="ltr">
                      {org.admin?.username ? `@${org.admin.username}` : '—'}
                    </TableCell>
                    <TableCell>{org.userCount}</TableCell>
                    <TableCell>{org.projectCount}</TableCell>
                    <TableCell>
                      <Badge variant={org.isActive ? 'default' : 'outline'}>
                        {org.isActive ? t.settings.active : t.settings.inactive}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <OrgRowActions org={org} onChanged={load} />
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
    </div>
  );
}
