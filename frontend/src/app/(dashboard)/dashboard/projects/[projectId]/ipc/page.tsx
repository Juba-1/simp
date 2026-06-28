import { ProjectIpcClient } from '@/components/ipc/project-ipc-client';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectIpcPage({ params }: PageProps) {
  const { projectId } = await params;
  return <ProjectIpcClient projectId={projectId} />;
}
