import { ProjectFormsListClient } from '@/components/forms/project-forms-list-client';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectFormsListPage({ params }: PageProps) {
  const { projectId } = await params;
  return <ProjectFormsListClient projectId={projectId} />;
}
