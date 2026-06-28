import { ProjectAuditClient } from '@/components/projects/project-audit-client';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectAuditPage({ params }: PageProps) {
  const { projectId } = await params;
  return <ProjectAuditClient projectId={projectId} />;
}
