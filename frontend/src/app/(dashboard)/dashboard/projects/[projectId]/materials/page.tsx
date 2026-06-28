import { ProjectMaterialsClient } from '@/components/materials/project-materials-client';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectMaterialsPage({ params }: PageProps) {
  const { projectId } = await params;
  return <ProjectMaterialsClient projectId={projectId} />;
}
