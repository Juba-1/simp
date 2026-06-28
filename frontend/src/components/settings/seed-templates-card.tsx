'use client';

import { useCallback, useEffect, useState } from 'react';
import { Database, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { fetchProjects } from '@/lib/api/projects';
import type { ProjectSummary } from '@/lib/api/projects';
import { seedStandardTemplates } from '@/lib/api/forms';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

export function SeedTemplatesCard() {
  const { t, locale } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectId, setProjectId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const isClientAdmin =
    user?.organization.type === 'CLIENT' && user.isOrgAdmin;

  const loadProjects = useCallback(async () => {
    if (!accessToken || !isClientAdmin) return;
    setLoadingProjects(true);
    try {
      const result = await fetchProjects(accessToken);
      setProjects(result.data);
      if (result.data[0]) {
        setProjectId((prev) => prev || result.data[0].id);
      }
    } catch {
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, [accessToken, isClientAdmin]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  if (!isClientAdmin) return null;

  async function handleSeed() {
    if (!accessToken || !projectId) return;
    setSeeding(true);
    try {
      const result = await seedStandardTemplates(accessToken, projectId);
      const updated =
        (result.updatedCount ?? 0) > 0
          ? ` · ${result.updatedCount} ${t.settings.seedUpdated}`
          : '';
      const skipped =
        result.skippedCodes.length > 0
          ? ` (${result.skippedCodes.join(', ')} ${t.settings.seedSkipped})`
          : '';
      toast.success(
        `${t.settings.seedSuccess}: ${result.createdCount} ${t.settings.seedCreated}${updated}${skipped}`,
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t.settings.seedError,
      );
    } finally {
      setSeeding(false);
    }
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="size-4 text-amber-600" />
          {t.settings.seedTemplates}
        </CardTitle>
        <CardDescription>{t.settings.seedTemplatesDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadingProjects ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t.common.loading}
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.settings.seedNoProjects}</p>
        ) : (
          <div className="space-y-2">
            <Label>{t.settings.seedSelectProject}</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder={t.settings.seedSelectProject} />
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
        )}
        <Button
          variant="outline"
          className="w-full gap-2 border-amber-500/50"
          disabled={seeding || !projectId}
          onClick={() => void handleSeed()}
        >
          {seeding ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Database className="size-4" />
          )}
          {t.settings.seedTemplates}
        </Button>
      </CardContent>
    </Card>
  );
}
