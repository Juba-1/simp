'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { login } from '@/lib/api/auth';
import { loginSchema, type LoginFormValues } from '@/lib/auth/schemas';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';
import { ApiError } from '@/lib/api/client';
import { getDefaultHomePath, resolveWorkspace } from '@/lib/workspace';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export function LoginForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    try {
      const data = await login(values);
      setSession(data.accessToken, data.user);
      toast.success(t.auth.loginSuccess);
      const home = getDefaultHomePath(resolveWorkspace(data.user) ?? 'client');
      router.push(home);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t.auth.loginError;
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col">
      <div className="mb-8 flex items-center justify-end gap-1 lg:absolute lg:end-6 lg:top-6">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="mx-auto w-full max-w-md flex-1 px-6 py-10 lg:py-16">
        <div className="mb-8 lg:hidden">
          <h1 className="text-2xl font-bold text-primary">{t.common.appName}</h1>
          <p className="text-sm text-muted-foreground">{t.common.appTagline}</p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight">{t.auth.loginTitle}</h2>
          <p className="mt-1 text-muted-foreground">{t.auth.loginSubtitle}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.auth.identifier}</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      autoComplete="username"
                      placeholder="admin@company.com or ahmed.h"
                      className="h-11"
                      dir="ltr"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {t.auth.identifierHint}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.auth.password}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="h-11 w-full text-base font-medium"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              {t.auth.signIn}
            </Button>
          </form>
        </Form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {t.auth.noAccount}{' '}
          <Link
            href="/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t.auth.registerLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
