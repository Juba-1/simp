import { apiFetch } from './client';

export interface ContractorRejectionStats {
  organizationId: string;
  organizationName: string;
  wirRejected: number;
  wirFinalized: number;
  mirRejected: number;
  mirFinalized: number;
  rejectionRatePercent: number;
}

export interface PortfolioDashboardKpis {
  projectCount: number;
  totals: {
    totalBilled: string;
    openNcrs: number;
    slaBreaches: number;
    pendingWirs: number;
    liabilityRedAlerts: number;
    openEscalations: number;
  };
  projects: ProjectDashboardKpis[];
  contractorRejectionRates: ContractorRejectionStats[];
}

export interface ProjectDashboardKpis {
  projectId: string;
  totalBilled: string;
  approvedIpcCount: number;
  openNcrCount: number;
  slaBreachCount: number;
  pendingWirCount: number;
  liabilityRedAlertCount: number;
  pendingExternalApprovalCount: number;
  openEscalationsCount: number;
}

export function fetchPortfolioDashboard(token: string) {
  return apiFetch<PortfolioDashboardKpis>('/analytics/dashboard', { token });
}

export function fetchProjectDashboard(token: string, projectId: string) {
  return apiFetch<ProjectDashboardKpis>(
    `/analytics/dashboard/project/${projectId}`,
    { token },
  );
}
