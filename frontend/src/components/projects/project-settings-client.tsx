'use client';

import { useState } from 'react';
import { Building2, Sparkles } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProjectStakeholdersTab } from '@/components/projects/project-stakeholders-tab';
import { VendorOnboardDialog } from '@/components/projects/vendor-onboard-dialog';
import { canAccessProjectVendorSettings } from '@/lib/auth/permissions';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

interface ProjectSettingsClientProps {
  projectId: string;
}

export function ProjectSettingsClient({ projectId }: ProjectSettingsClientProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!canAccessProjectVendorSettings(user)) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t.stakeholders.clientOnly}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t.projectWorkspace.settingsTitle}
        </h1>
        <p className="text-muted-foreground">
          {t.projectWorkspace.settingsSubtitle}
        </p>
      </div>

      <Card className="overflow-hidden border-primary/20">
        <CardHeader className="flex flex-row items-start justify-between gap-4 bg-linear-to-br from-primary/5 to-transparent">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" />
              {t.projectWorkspace.vendorTitle}
            </CardTitle>
            <CardDescription>{t.projectWorkspace.vendorSubtitle}</CardDescription>
          </div>
          <Button onClick={() => setVendorOpen(true)} className="gap-2">
            <Building2 className="size-4" />
            {t.projectWorkspace.onboardVendor}
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <ProjectStakeholdersTab key={refreshKey} projectId={projectId} />
        </CardContent>
      </Card>

      <VendorOnboardDialog
        open={vendorOpen}
        onOpenChange={setVendorOpen}
        projectId={projectId}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
