export interface ContractorRejectionStats {
  organizationId: string;
  organizationName: string;
  wirRejected: number;
  wirFinalized: number;
  mirRejected: number;
  mirFinalized: number;
  /** Combined WIR+MIR rejection rate (0–100). */
  rejectionRatePercent: number;
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
