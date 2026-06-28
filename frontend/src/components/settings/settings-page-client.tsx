'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Building2, Cog, User, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ProfileTab } from '@/components/settings/profile-tab';
import { TeamTab } from '@/components/settings/team-tab';
import { SeedTemplatesCard } from '@/components/settings/seed-templates-card';
import { canViewClientSlaSettings } from '@/lib/auth/permissions';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';
import { orgTypeLabel, isOrganizationType } from '@/lib/org-types';

export function SettingsPageClient() {
  const { t, locale } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const defaultTab =
    tabParam === 'team' ||
    tabParam === 'organization' ||
    (tabParam === 'system' && canViewClientSlaSettings(user)) ||
    tabParam === 'profile'
      ? tabParam
      : 'profile';
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (
      tabParam === 'team' ||
      tabParam === 'organization' ||
      (tabParam === 'system' && canViewClientSlaSettings(user)) ||
      tabParam === 'profile'
    ) {
      setActiveTab(tabParam);
    }
  }, [tabParam, user]);

  if (!user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        {t.common.loading}
      </div>
    );
  }

  const orgType = isOrganizationType(user.organization.type)
    ? user.organization.type
    : 'CLIENT';
  const showSystemSettings = canViewClientSlaSettings(user);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.nav.settings}</h1>
        <p className="text-muted-foreground">{t.settings.subtitle}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList
          className={`grid w-full ${showSystemSettings ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}
        >
          <TabsTrigger value="profile" className="gap-2">
            <User className="size-4" />
            <span className="hidden sm:inline">{t.settings.profile}</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="size-4" />
            <span className="hidden sm:inline">{t.settings.team}</span>
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="size-4" />
            <span className="hidden sm:inline">{t.settings.organization}</span>
          </TabsTrigger>
          {showSystemSettings && (
            <TabsTrigger value="system" className="gap-2">
              <Cog className="size-4" />
              <span className="hidden sm:inline">{t.settings.system}</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="team">
          <TeamTab />
        </TabsContent>

        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-4" />
                {user.organization.name}
              </CardTitle>
              <CardDescription>{t.settings.organizationDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between gap-4 py-2">
                <span className="text-muted-foreground">{t.settings.orgType}</span>
                <Badge variant="secondary">
                  {orgTypeLabel(orgType, locale)}
                </Badge>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <span className="text-muted-foreground">{t.settings.orgId}</span>
                <span className="font-mono text-xs" dir="ltr">
                  {user.organization.id}
                </span>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <span className="text-muted-foreground">{t.settings.yourRole}</span>
                <span className="font-medium">
                  {user.isOrgAdmin
                    ? t.settings.orgAdmin
                    : locale === 'ar' && user.role?.nameAr
                      ? user.role.nameAr
                      : user.role?.name ?? t.settings.member}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {showSystemSettings && (
          <TabsContent value="system" className="space-y-6">
            {orgType === 'CLIENT' && user.isOrgAdmin && <SeedTemplatesCard />}
            <Card>
              <CardHeader>
                <CardTitle>{t.settings.systemSettings}</CardTitle>
                <CardDescription>{t.settings.systemSettingsDesc}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t.settings.systemSettingsBody}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
