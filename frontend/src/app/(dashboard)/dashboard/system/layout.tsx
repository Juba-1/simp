import { SystemShell } from '@/components/layout/workspace-shells';

export default function SystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SystemShell>{children}</SystemShell>;
}
