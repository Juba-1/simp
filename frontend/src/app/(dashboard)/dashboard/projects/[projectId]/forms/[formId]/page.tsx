import { FormDetailClient } from '@/components/forms/form-detail-client';

interface PageProps {
  params: Promise<{ projectId: string; formId: string }>;
}

export default async function FormDetailPage({ params }: PageProps) {
  const { projectId, formId } = await params;
  return <FormDetailClient projectId={projectId} formId={formId} />;
}
