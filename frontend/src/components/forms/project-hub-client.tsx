'use client';

import Link from 'next/link';
import { FilePlus, FileText, List, Receipt, Users } from 'lucide-react';
import { ProjectFormsPageClient } from '@/components/forms/project-forms-page-client';
import { ProjectStakeholdersTab } from '@/components/projects/project-stakeholders-tab';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

interface ProjectHubClientProps {
  projectId: string;
}

export function ProjectHubClient({ projectId }: ProjectHubClientProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isClientAdmin =
    user?.organization.type === 'CLIENT' && user?.isOrgAdmin;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{t.stakeholders.overview}</TabsTrigger>
          {isClientAdmin && (
            <TabsTrigger value="stakeholders" className="gap-2">
              <Users className="size-4" />
              {t.stakeholders.title}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="gap-2">
              <Link href={`/dashboard/projects/${projectId}/forms`}>
                <List className="size-4" />
                {t.commandCenter.formsManagement}
              </Link>
            </Button>
            {user?.organization.type === 'CLIENT' && (
              <Button asChild variant="outline" className="gap-2">
                <Link href={`/dashboard/projects/${projectId}/ipc`}>
                  <Receipt className="size-4" />
                  {t.commandCenter.ipcTitle}
                </Link>
              </Button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="size-4" />
                  {t.commandCenter.commandCenter}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-muted-foreground">
                  {t.commandCenter.formsManagementDesc}
                </p>
                <Button asChild size="sm">
                  <Link href={`/dashboard/projects/${projectId}/forms`}>
                    {t.commandCenter.viewAllForms}
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FilePlus className="size-4" />
                  {t.forms.startForm}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-muted-foreground">
                  {t.forms.projectFormsSubtitle}
                </p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="mb-4 text-lg font-semibold">{t.forms.startForm}</h2>
            <ProjectFormsPageClient projectId={projectId} />
          </div>
        </TabsContent>

        {isClientAdmin && (
          <TabsContent value="stakeholders">
            <ProjectStakeholdersTab projectId={projectId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
