import { Suspense } from 'react';
import { NewFormPageClient } from '@/components/forms/new-form-page-client';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function NewFormPage({ params }: PageProps) {
  const { projectId } = await params;

  return (
    <Suspense fallback={null}>
      <NewFormPageClient projectId={projectId} />
    </Suspense>
  );
}
