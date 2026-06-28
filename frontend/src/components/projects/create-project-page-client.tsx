'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createProject } from '@/lib/api/projects';
import {
  createProjectSchema,
  type CreateProjectFormValues,
} from '@/lib/projects/schemas';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

export function CreateProjectPageClient() {
  const { t } = useTranslation();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [isLoading, setIsLoading] = useState(false);

  const canCreate =
    user?.organization.type === 'CLIENT' && user.isOrgAdmin;

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: '', nameAr: '', code: '', description: '' },
  });

  async function onSubmit(values: CreateProjectFormValues) {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const project = await createProject(accessToken, {
        name: values.name,
        nameAr: values.nameAr || undefined,
        code: values.code.toUpperCase(),
        description: values.description || undefined,
        status: 'ACTIVE',
      });
      toast.success(t.projects.createSuccess);
      router.push(`/dashboard/projects/${project.id}`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t.projects.createError,
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (!canCreate) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>{t.projects.createTitle}</CardTitle>
          <CardDescription>{t.projects.onlyClientAdmin}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/dashboard/projects">
              <ArrowLeft className="me-2 size-4" />
              {t.projects.backToProjects}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/projects">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t.projects.createTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t.projects.createSubtitle}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.projects.fieldName}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Highway Expansion Phase 2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nameAr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.projects.fieldNameAr}</FormLabel>
                    <FormControl>
                      <Input {...field} dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.projects.fieldCode}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="HWY-PH2"
                        className="font-mono uppercase"
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.projects.fieldDescription}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="me-2 size-4 animate-spin" />
                    {t.common.loading}
                  </>
                ) : (
                  t.projects.createProject
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
