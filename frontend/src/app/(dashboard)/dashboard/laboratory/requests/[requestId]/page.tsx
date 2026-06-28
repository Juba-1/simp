import { LabRequestPerformClient } from '@/components/laboratory/lab-request-perform-client';

interface PageProps {
  params: Promise<{ requestId: string }>;
}

export default async function LabRequestPerformPage({ params }: PageProps) {
  const { requestId } = await params;
  return <LabRequestPerformClient requestId={requestId} />;
}
