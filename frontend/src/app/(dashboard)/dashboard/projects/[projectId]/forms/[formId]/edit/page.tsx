import { EditFormPageClient } from '@/components/forms/edit-form-page-client';

interface PageProps {
  params: Promise<{ projectId: string; formId: string }>;
}

export default async function EditFormPage({ params }: PageProps) {
  const { projectId, formId } = await params;
  return <EditFormPageClient projectId={projectId} formId={formId} />;
}
