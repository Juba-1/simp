'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { RoleSidebar } from '@/components/layout/role-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/auth-store';
import {
  getDefaultHomePath,
  isPathAllowedForWorkspace,
  resolveWorkspace,
} from '@/lib/workspace';

export function SystemShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    if (!user?.isSuperAdmin) {
      router.replace(getDefaultHomePath(resolveWorkspace(user) ?? 'client'));
    }
  }, [hydrated, isAuthenticated, user, router]);

  if (!hydrated || !user?.isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50/80 dark:bg-background">
      <div className="hidden lg:block">
        <RoleSidebar
          workspace="super_admin"
          className="fixed inset-y-0 start-0 z-40"
        />
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <RoleSidebar
            workspace="super_admin"
            onNavigate={() => setMobileOpen(false)}
            className="w-full border-0"
          />
        </SheetContent>
      </Sheet>
      <div className="flex min-h-screen flex-1 flex-col lg:ps-64">
        <AppHeader onMenuClick={() => setMobileOpen(true)} variant="system" />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function TenantShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const workspace = resolveWorkspace(user);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated || !user) return;
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    if (user.isSuperAdmin) {
      router.replace('/dashboard/system');
      return;
    }
    if (!workspace) return;
    if (!isPathAllowedForWorkspace(pathname, workspace, user)) {
      router.replace(getDefaultHomePath(workspace));
    }
  }, [hydrated, isAuthenticated, user, workspace, pathname, router]);

  if (!hydrated || !workspace || user?.isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50/80 dark:bg-background">
      <div className="hidden lg:block">
        <RoleSidebar
          workspace={workspace}
          className="fixed inset-y-0 start-0 z-40"
        />
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <RoleSidebar
            workspace={workspace}
            onNavigate={() => setMobileOpen(false)}
            className="w-full border-0"
          />
        </SheetContent>
      </Sheet>
      <div className="flex min-h-screen flex-1 flex-col lg:ps-64">
        <AppHeader onMenuClick={() => setMobileOpen(true)} variant={workspace} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
