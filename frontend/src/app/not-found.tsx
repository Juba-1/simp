'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Building2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/stores/locale-store';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md text-center"
      >
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          <Building2 className="size-10" />
        </div>
        <p className="font-mono text-6xl font-bold text-muted-foreground/30">404</p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          {t.notFound.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{t.notFound.subtitle}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/">
              <Home className="size-4" />
              {t.notFound.backHome}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">{t.notFound.backDashboard}</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
