import type { AuthUser } from '@/stores/auth-store';
import { isFieldEngineer } from '@/lib/auth/field-engineer';

export type Workspace =
  | 'super_admin'
  | 'client'
  | 'consultant'
  | 'main_contractor'
  | 'sub_contractor'
  | 'laboratory';

export function resolveWorkspace(user: AuthUser | null): Workspace | null {
  if (!user) return null;
  if (user.isSuperAdmin) return 'super_admin';
  const type = user.organization.type;
  switch (type) {
    case 'CLIENT':
      return 'client';
    case 'CONSULTANT':
      return 'consultant';
    case 'MAIN_CONTRACTOR':
      return 'main_contractor';
    case 'SUB_CONTRACTOR':
      return 'sub_contractor';
    case 'LABORATORY':
      return 'laboratory';
    default:
      return 'client';
  }
}

export function getDefaultHomePath(workspace: Workspace): string {
  switch (workspace) {
    case 'super_admin':
      return '/dashboard/system';
    case 'consultant':
      return '/dashboard/approvals';
    case 'main_contractor':
    case 'sub_contractor':
      return '/dashboard/tasks';
    case 'laboratory':
      return '/dashboard/laboratory';
    default:
      return '/dashboard';
  }
}

/** Paths allowed per workspace (prefix match) */
export function isPathAllowedForWorkspace(
  pathname: string,
  workspace: Workspace,
  user?: AuthUser | null,
): boolean {
  if (workspace === 'super_admin') {
    return pathname.startsWith('/dashboard/system');
  }

  if (pathname.startsWith('/dashboard/system')) {
    return false;
  }

  if (workspace === 'laboratory') {
    return isFieldWorkerPathAllowed(pathname, true);
  }

  if (
    (workspace === 'main_contractor' || workspace === 'sub_contractor') &&
    user &&
    isFieldEngineer(user)
  ) {
    return isFieldWorkerPathAllowed(pathname, false);
  }

  const allowedPrefixes: Record<Exclude<Workspace, 'super_admin'>, string[]> = {
    client: [
      '/dashboard',
      '/dashboard/projects',
      '/dashboard/ipc',
      '/dashboard/audit',
      '/dashboard/settings',
    ],
    consultant: [
      '/dashboard/approvals',
      '/dashboard/projects',
      '/dashboard/reports',
      '/dashboard/settings',
    ],
    main_contractor: [
      '/dashboard/tasks',
      '/dashboard/projects',
      '/dashboard/internal-review',
      '/dashboard/audit',
      '/dashboard/ipc',
      '/dashboard/sub-contractors',
      '/dashboard/sync',
      '/dashboard/settings',
    ],
    sub_contractor: [
      '/dashboard/tasks',
      '/dashboard/sync',
      '/dashboard/projects',
      '/dashboard/settings',
    ],
    laboratory: [
      '/dashboard/tasks',
      '/dashboard/sync',
      '/dashboard/laboratory',
      '/dashboard/settings',
    ],
  };

  const prefixes = allowedPrefixes[workspace];
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isFieldWorkerPathAllowed(pathname: string, includeLab: boolean): boolean {
  const globalAllowed = ['/dashboard/tasks', '/dashboard/sync', '/dashboard/settings'];
  if (includeLab) {
    globalAllowed.push('/dashboard/laboratory');
  }
  if (globalAllowed.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }

  const projectMatch = pathname.match(/^\/dashboard\/projects\/([^/]+)(\/.*)?$/);
  if (!projectMatch) return false;

  const subPath = projectMatch[2] ?? '';
  if (subPath === '' || subPath === '/') return true;
  if (subPath.startsWith('/forms')) return true;

  return false;
}
