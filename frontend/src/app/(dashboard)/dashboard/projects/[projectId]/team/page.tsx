import { ProjectTeamClient } from '@/components/projects/project-team-client';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectTeamPage({ params }: PageProps) {
  const { projectId } = await params;
  return <ProjectTeamClient projectId={projectId} />;
}
