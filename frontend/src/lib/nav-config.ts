import type { OrganizationType } from '@/lib/org-types';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  RefreshCw,
  Package,
  Receipt,
  FlaskConical,
  Settings,
  Shield,
} from 'lucide-react';

export type NavKey =
  | 'dashboard'
  | 'projects'
  | 'forms'
  | 'sync'
  | 'materials'
  | 'ipc'
  | 'laboratory'
  | 'settings'
  | 'system';

export interface NavItem {
  href: string;
  icon: LucideIcon;
  key: NavKey;
  /** If set, only these org types see this item */
  orgTypes?: OrganizationType[];
  /** Hide from these org types */
  hideFor?: OrganizationType[];
  /** Only super admins */
  superAdminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { href: '/dashboard/projects', icon: FolderKanban, key: 'projects' },
  { href: '/dashboard/forms', icon: FileText, key: 'forms' },
  {
    href: '/dashboard/sync',
    icon: RefreshCw,
    key: 'sync',
    hideFor: ['CLIENT', 'CONSULTANT', 'LABORATORY'],
  },
  { href: '/dashboard/materials', icon: Package, key: 'materials' },
  {
    href: '/dashboard/ipc',
    icon: Receipt,
    key: 'ipc',
    orgTypes: ['CLIENT'],
  },
  {
    href: '/dashboard/laboratory',
    icon: FlaskConical,
    key: 'laboratory',
    orgTypes: ['LABORATORY'],
  },
  { href: '/dashboard/settings', icon: Settings, key: 'settings' },
  {
    href: '/dashboard/system',
    icon: Shield,
    key: 'system',
    superAdminOnly: true,
  },
];

export function getNavItemsForOrg(
  orgType: string,
  isSuperAdmin = false,
): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.superAdminOnly && !isSuperAdmin) {
      return false;
    }
    if (item.orgTypes && !item.orgTypes.includes(orgType as OrganizationType)) {
      return false;
    }
    if (item.hideFor?.includes(orgType as OrganizationType)) {
      return false;
    }
    return true;
  });
}
