import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  ScrollText,
  Settings,
  Shield,
  Building2,
  ClipboardCheck,
  BarChart3,
  ListTodo,
  Users,
  RefreshCw,
  FlaskConical,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import type { Workspace } from '@/lib/workspace';
import type { AuthUser } from '@/stores/auth-store';
import { isFieldEngineer } from '@/lib/auth/field-engineer';

export interface NavProfileItem {
  href: string;
  icon: LucideIcon;
  labelKey: string;
}

const FIELD_ENGINEER_NAV: NavProfileItem[] = [
  { href: '/dashboard/tasks', icon: ListTodo, labelKey: 'myFieldTasks' },
  { href: '/dashboard/tasks/new', icon: FileText, labelKey: 'newForm' },
  { href: '/dashboard/sync', icon: RefreshCw, labelKey: 'offlineSyncStatus' },
];

const SUPER_ADMIN_NAV: NavProfileItem[] = [
  { href: '/dashboard/system', icon: LayoutDashboard, labelKey: 'systemOverview' },
  { href: '/dashboard/system/organizations', icon: Building2, labelKey: 'organizations' },
  { href: '/dashboard/system/audit', icon: ScrollText, labelKey: 'globalAudit' },
  { href: '/dashboard/system/settings', icon: Settings, labelKey: 'settings' },
];

const CLIENT_NAV: NavProfileItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { href: '/dashboard/projects', icon: FolderKanban, labelKey: 'projects' },
  { href: '/dashboard/ipc', icon: Receipt, labelKey: 'ipc' },
  { href: '/dashboard/audit', icon: ScrollText, labelKey: 'auditLog' },
  { href: '/dashboard/settings', icon: Settings, labelKey: 'settings' },
];

const CONSULTANT_NAV: NavProfileItem[] = [
  { href: '/dashboard/approvals', icon: ClipboardCheck, labelKey: 'approvalQueue' },
  { href: '/dashboard/projects', icon: FolderKanban, labelKey: 'projects' },
  { href: '/dashboard/reports', icon: BarChart3, labelKey: 'reports' },
  { href: '/dashboard/settings', icon: Settings, labelKey: 'settings' },
];

const CONTRACTOR_NAV: NavProfileItem[] = [
  { href: '/dashboard/tasks', icon: ListTodo, labelKey: 'myTasks' },
  { href: '/dashboard/projects', icon: FolderKanban, labelKey: 'projects' },
  { href: '/dashboard/internal-review', icon: ShieldCheck, labelKey: 'internalReview' },
  { href: '/dashboard/ipc', icon: Receipt, labelKey: 'ipcGenerator' },
  { href: '/dashboard/sub-contractors', icon: Users, labelKey: 'subContractors' },
  { href: '/dashboard/settings', icon: Settings, labelKey: 'settings' },
];

const SUB_CONTRACTOR_NAV: NavProfileItem[] = [
  { href: '/dashboard/tasks', icon: ListTodo, labelKey: 'myTasks' },
  { href: '/dashboard/sync', icon: RefreshCw, labelKey: 'syncQueue' },
  { href: '/dashboard/projects', icon: FolderKanban, labelKey: 'projects' },
  { href: '/dashboard/settings', icon: Settings, labelKey: 'settings' },
];

const LABORATORY_NAV: NavProfileItem[] = [
  { href: '/dashboard/laboratory', icon: FlaskConical, labelKey: 'laboratoryPortal' },
  { href: '/dashboard/tasks', icon: ListTodo, labelKey: 'myFieldTasks' },
  { href: '/dashboard/tasks/new', icon: FileText, labelKey: 'newForm' },
  { href: '/dashboard/sync', icon: RefreshCw, labelKey: 'offlineSyncStatus' },
];

export function getNavForWorkspace(
  workspace: Workspace,
  user?: AuthUser | null,
): NavProfileItem[] {
  if (
    (workspace === 'main_contractor' || workspace === 'sub_contractor') &&
    user &&
    isFieldEngineer(user)
  ) {
    return FIELD_ENGINEER_NAV;
  }

  switch (workspace) {
    case 'super_admin':
      return SUPER_ADMIN_NAV;
    case 'client':
      return CLIENT_NAV;
    case 'consultant':
      return CONSULTANT_NAV;
    case 'main_contractor':
      return CONTRACTOR_NAV;
    case 'sub_contractor':
      return SUB_CONTRACTOR_NAV;
    case 'laboratory':
      return LABORATORY_NAV;
    default:
      return CLIENT_NAV;
  }
}

export function getWorkspaceBrand(workspace: Workspace): {
  titleKey: string;
  accentClass: string;
} {
  switch (workspace) {
    case 'super_admin':
      return { titleKey: 'brandSuperAdmin', accentClass: 'bg-violet-600' };
    case 'client':
      return { titleKey: 'brandClient', accentClass: 'bg-indigo-600' };
    case 'consultant':
      return { titleKey: 'brandConsultant', accentClass: 'bg-indigo-600' };
    case 'main_contractor':
    case 'sub_contractor':
      return { titleKey: 'brandContractor', accentClass: 'bg-indigo-700' };
    case 'laboratory':
      return { titleKey: 'brandLaboratory', accentClass: 'bg-indigo-600' };
    default:
      return { titleKey: 'brandClient', accentClass: 'bg-primary' };
  }
}

export { Shield };
