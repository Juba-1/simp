'use client';

import { Menu, LogOut, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { GlobalSyncIndicator } from '@/components/layout/global-sync-indicator';
import { CommandPalette } from '@/components/layout/command-palette';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';
import Link from 'next/link';

interface AppHeaderProps {
  onMenuClick?: () => void;
  variant?: string;
}

function settingsPath(variant?: string): string {
  if (variant === 'system' || variant === 'super_admin') {
    return '/dashboard/system/settings';
  }
  return '/dashboard/settings';
}

export function AppHeader({ onMenuClick, variant }: AppHeaderProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '?';

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  return (
    <>
      <CommandPalette />
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur-md sm:px-6 dark:border-slate-700 dark:bg-background/95">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </Button>

        <Button
          variant="outline"
          className="hidden h-10 w-full max-w-xs justify-start gap-2 border-2 border-slate-300 text-slate-700 sm:flex"
          onClick={() => {
            document.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }),
            );
          }}
        >
          <Search className="size-4" />
          <span className="text-sm">{t.commandPalette.placeholder}</span>
          <kbd className="pointer-events-none ms-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 lg:inline">
            Ctrl+K
          </kbd>
        </Button>

        <div className="flex-1 sm:hidden" />

        <div className="flex items-center gap-1">
          <GlobalSyncIndicator />
          <LanguageToggle />
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative ms-2 h-10 gap-2 px-2">
                <Avatar className="size-8">
                  {user?.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={user.firstName} />
                  ) : null}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline">
                  {user?.firstName} {user?.lastName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="truncate text-xs text-muted-foreground" dir="ltr">
                  {user?.loginId ?? user?.username ?? user?.email}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.organization.name}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={settingsPath(variant)}>{t.nav.settings}</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} variant="destructive">
                <LogOut className="size-4" />
                {t.nav.logout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
