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
import { register as registerApi } from '@/lib/api/auth';
import { registerSchema, type RegisterFormValues } from '@/lib/auth/schemas';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';
import { ApiError } from '@/lib/api/client';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export function RegisterForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      organizationName: '',
      organizationNameAr: '',
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setIsLoading(true);
    try {
      const data = await registerApi({
        ...values,
        organizationType: 'CLIENT',
      });
      setSession(data.accessToken, data.user);
      toast.success(t.auth.registerSuccess);
      router.push('/dashboard');
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t.auth.registerError;
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

      <div className="mx-auto w-full max-w-md flex-1 px-6 py-10 lg:py-12">
        <div className="mb-8 lg:hidden">
          <h1 className="text-2xl font-bold text-primary">{t.common.appName}</h1>
          <p className="text-sm text-muted-foreground">{t.common.appTagline}</p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight">
            {t.auth.registerTitle}
          </h2>
          <p className="mt-1 text-muted-foreground">{t.auth.registerSubtitle}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.auth.firstName}</FormLabel>
                    <FormControl>
                      <Input className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.auth.lastName}</FormLabel>
                    <FormControl>
                      <Input className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="organizationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.auth.organizationName}</FormLabel>
                  <FormControl>
                    <Input className="h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="organizationNameAr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.auth.organizationNameAr}</FormLabel>
                  <FormControl>
                    <Input className="h-11" dir="rtl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.auth.email}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
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
                      autoComplete="new-password"
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
              {t.auth.signUp}
            </Button>
          </form>
        </Form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {t.auth.hasAccount}{' '}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t.auth.loginLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
