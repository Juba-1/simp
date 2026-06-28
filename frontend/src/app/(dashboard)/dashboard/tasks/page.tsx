'use client';

import { FormsHubPageClient } from '@/components/forms/forms-hub-page-client';
import { FieldEngineerDashboard } from '@/components/forms/field-engineer-dashboard';
import { useAuthStore } from '@/stores/auth-store';
import { isFieldWorker } from '@/lib/auth/field-engineer';

export default function TasksPage() {
  const user = useAuthStore((s) => s.user);

  if (isFieldWorker(user)) {
    return <FieldEngineerDashboard />;
  }

  return <FormsHubPageClient />;
}
