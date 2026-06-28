import { ProjectOverviewClient } from '@/components/projects/project-overview-client';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const { projectId } = await params;
  return <ProjectOverviewClient projectId={projectId} />;
}
