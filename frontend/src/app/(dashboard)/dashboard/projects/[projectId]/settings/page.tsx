import { ProjectSettingsClient } from '@/components/projects/project-settings-client';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectSettingsPage({ params }: PageProps) {
  const { projectId } = await params;
  return <ProjectSettingsClient projectId={projectId} />;
}
