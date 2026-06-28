'use client';

import { motion } from 'framer-motion';
import { Building2, Shield, Users } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/stores/locale-store';

export function SystemOverviewClient() {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600">
          <Shield className="size-7" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t.workspaceNav.systemOverview}
          </h1>
          <p className="text-muted-foreground">{t.systemAdmin.subtitle}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-violet-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="size-5 text-violet-600" />
              {t.workspaceNav.organizations}
            </CardTitle>
            <CardDescription>{t.systemAdmin.organizationsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/system/organizations">
                {t.systemAdmin.manageOrgs}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="size-5" />
              {t.workspaceNav.globalAudit}
            </CardTitle>
            <CardDescription>{t.auditLog.globalDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard/system/audit">{t.auditLog.viewLogs}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
