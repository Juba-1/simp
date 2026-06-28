'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2, Search, Trash2, UserPlus } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  assignProjectOrganization,
  fetchProject,
  searchOrgDirectory,
  unassignProjectOrganization,
} from '@/lib/api/projects';
import type {
  OrgDirectoryItem,
  ProjectDetail,
  ProjectOrganizationMember,
} from '@/lib/api/projects';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';
import { orgTypeLabel, isOrganizationType } from '@/lib/org-types';

interface ProjectStakeholdersTabProps {
  projectId: string;
}

type AssignRole = 'CONSULTANT' | 'MAIN_CONTRACTOR' | 'LABORATORY';

export function ProjectStakeholdersTab({ projectId }: ProjectStakeholdersTabProps) {
  const { t, locale } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignRole, setAssignRole] = useState<AssignRole | null>(null);

  const isClientOwner =
    user?.organization.type === 'CLIENT' && user?.isOrgAdmin;

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await fetchProject(accessToken, projectId);
      setProject(data);
    } catch {
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isClientOwner) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t.stakeholders.clientOnly}
        </CardContent>
      </Card>
    );
  }

  const stakeholders =
    project?.organizations?.filter((o) => o.role !== 'OWNER') ?? [];

  async function handleUnassign(membership: ProjectOrganizationMember) {
    if (!accessToken) return;
    try {
      await unassignProjectOrganization(accessToken, projectId, membership.id);
      toast.success(t.stakeholders.unassignSuccess);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.stakeholders.assignError);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setAssignRole('CONSULTANT')}>
          <UserPlus className="size-4" />
          {t.stakeholders.assignConsultant}
        </Button>
        <Button variant="outline" onClick={() => setAssignRole('MAIN_CONTRACTOR')}>
          <UserPlus className="size-4" />
          {t.stakeholders.assignContractor}
        </Button>
        <Button variant="outline" onClick={() => setAssignRole('LABORATORY')}>
          <UserPlus className="size-4" />
          {t.stakeholders.assignLaboratory}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5" />
            {t.stakeholders.assigned}
          </CardTitle>
          <CardDescription>{t.stakeholders.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : stakeholders.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {t.stakeholders.noResults}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.stakeholders.colCompany}</TableHead>
                  <TableHead>{t.stakeholders.colRole}</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {stakeholders.map((row) => {
                  const name =
                    locale === 'ar' && row.organization.nameAr
                      ? row.organization.nameAr
                      : row.organization.name;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {isOrganizationType(row.organization.type)
                            ? orgTypeLabel(row.organization.type, locale)
                            : row.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => void handleUnassign(row)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {assignRole && (
        <AssignOrgDialog
          open={Boolean(assignRole)}
          role={assignRole}
          projectId={projectId}
          existingOrgIds={stakeholders.map((s) => s.organization.id)}
          onClose={() => setAssignRole(null)}
          onAssigned={() => {
            setAssignRole(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function AssignOrgDialog({
  open,
  role,
  projectId,
  existingOrgIds,
  onClose,
  onAssigned,
}: {
  open: boolean;
  role: AssignRole;
  projectId: string;
  existingOrgIds: string[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { t, locale } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OrgDirectoryItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  const title =
    role === 'CONSULTANT'
      ? t.stakeholders.assignConsultant
      : role === 'MAIN_CONTRACTOR'
        ? t.stakeholders.assignContractor
        : t.stakeholders.assignLaboratory;

  const search = useCallback(async () => {
    if (!accessToken) return;
    setSearching(true);
    try {
      const data = await searchOrgDirectory(accessToken, role, query || undefined);
      setResults(data.filter((o) => !existingOrgIds.includes(o.id)));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [accessToken, role, query, existingOrgIds]);

  useEffect(() => {
    if (open) {
      void search();
    } else {
      setQuery('');
      setResults([]);
    }
  }, [open, search]);

  async function handleAssign(org: OrgDirectoryItem) {
    if (!accessToken) return;
    setAssigning(org.id);
    try {
      await assignProjectOrganization(accessToken, projectId, org.id, role);
      toast.success(t.stakeholders.assignSuccess);
      onAssigned();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.stakeholders.assignError);
    } finally {
      setAssigning(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t.stakeholders.subtitle}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.stakeholders.searchOrgs}
            onKeyDown={(e) => e.key === 'Enter' && void search()}
          />
          <Button variant="outline" size="icon" onClick={() => void search()}>
            <Search className="size-4" />
          </Button>
        </div>
        <div className="max-h-64 space-y-2 overflow-y-auto py-2">
          {searching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t.stakeholders.noResults}
            </p>
          ) : (
            results.map((org) => {
              const name =
                locale === 'ar' && org.nameAr ? org.nameAr : org.name;
              return (
                <div
                  key={org.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">{org.slug}</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={assigning === org.id}
                    onClick={() => void handleAssign(org)}
                  >
                    {assigning === org.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    {t.stakeholders.assign}
                  </Button>
                </div>
              );
            })
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t.common.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
