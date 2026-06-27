import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TenantScopeService } from '../../common/services/tenant-scope.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  ContractorRejectionStats,
  PortfolioDashboardKpis,
  ProjectDashboardKpis,
} from './interfaces/dashboard-kpis.interface';

interface KpiRow {
  project_id: string;
  total_billed: Prisma.Decimal | null;
  approved_ipc_count: bigint;
  open_ncr_count: bigint;
  sla_breach_count: bigint;
  pending_wir_count: bigint;
  liability_red_alert_count: bigint;
  pending_external_count: bigint;
  open_escalations_count: bigint;
}

interface RejectionRow {
  organization_id: string;
  organization_name: string;
  wir_rejected: bigint;
  wir_finalized: bigint;
  mir_rejected: bigint;
  mir_finalized: bigint;
}

/**
 * Single round-trip raw SQL per portfolio — avoids N+1 aggregate queries.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  async getPortfolioDashboard(
    user: AuthenticatedUser,
  ): Promise<PortfolioDashboardKpis> {
    const projectIds = await this.tenantScope.getClientOwnedProjectIds(user);

    if (projectIds.length === 0) {
      return {
        projectCount: 0,
        totals: {
          totalBilled: '0',
          openNcrs: 0,
          slaBreaches: 0,
          pendingWirs: 0,
          liabilityRedAlerts: 0,
          openEscalations: 0,
        },
        projects: [],
        contractorRejectionRates: [],
      };
    }

    const [rows, contractorRejectionRates] = await Promise.all([
      this.fetchKpiRows(projectIds),
      this.fetchContractorRejectionRates(projectIds),
    ]);
    const projects = rows.map((row) => this.mapRow(row));

    const totals = projects.reduce(
      (acc, p) => ({
        totalBilled: (
          parseFloat(acc.totalBilled) + parseFloat(p.totalBilled)
        ).toFixed(4),
        openNcrs: acc.openNcrs + p.openNcrCount,
        slaBreaches: acc.slaBreaches + p.slaBreachCount,
        pendingWirs: acc.pendingWirs + p.pendingWirCount,
        liabilityRedAlerts:
          acc.liabilityRedAlerts + p.liabilityRedAlertCount,
        openEscalations: acc.openEscalations + p.openEscalationsCount,
      }),
      {
        totalBilled: '0',
        openNcrs: 0,
        slaBreaches: 0,
        pendingWirs: 0,
        liabilityRedAlerts: 0,
        openEscalations: 0,
      },
    );

    return {
      projectCount: projects.length,
      totals,
      projects,
      contractorRejectionRates,
    };
  }

  async getProjectDashboard(
    user: AuthenticatedUser,
    projectId: string,
  ): Promise<ProjectDashboardKpis> {
    await this.tenantScope.assertClientProjectAccess(user, projectId);
    const rows = await this.fetchKpiRows([projectId]);
    if (rows.length === 0) {
      return {
        projectId,
        totalBilled: '0',
        approvedIpcCount: 0,
        openNcrCount: 0,
        slaBreachCount: 0,
        pendingWirCount: 0,
        liabilityRedAlertCount: 0,
        pendingExternalApprovalCount: 0,
        openEscalationsCount: 0,
      };
    }
    return this.mapRow(rows[0]);
  }

  private async fetchKpiRows(projectIds: string[]): Promise<KpiRow[]> {
    return this.prisma.$queryRaw<KpiRow[]>`
      WITH project_set AS (
        SELECT unnest(${projectIds}::uuid[]) AS project_id
      )
      SELECT
        ps.project_id,
        COALESCE((
          SELECT SUM(ipc.subtotal_amount)
          FROM interim_payment_certificates ipc
          WHERE ipc.project_id = ps.project_id
            AND ipc.status = 'APPROVED'
            AND ipc.deleted_at IS NULL
        ), 0) AS total_billed,
        COALESCE((
          SELECT COUNT(*)::bigint
          FROM interim_payment_certificates ipc
          WHERE ipc.project_id = ps.project_id
            AND ipc.status = 'APPROVED'
            AND ipc.deleted_at IS NULL
        ), 0) AS approved_ipc_count,
        COALESCE((
          SELECT COUNT(*)::bigint
          FROM form_instances fi
          INNER JOIN form_templates ft ON ft.id = fi.template_id
          WHERE fi.project_id = ps.project_id
            AND fi.deleted_at IS NULL
            AND ft.code = 'NCR'
            AND fi.status NOT IN ('APPROVED', 'REJECTED', 'ARCHIVED')
        ), 0) AS open_ncr_count,
        COALESCE((
          SELECT COUNT(*)::bigint
          FROM form_instances fi
          WHERE fi.project_id = ps.project_id
            AND fi.deleted_at IS NULL
            AND fi.sla_breached = true
        ), 0) AS sla_breach_count,
        COALESCE((
          SELECT COUNT(*)::bigint
          FROM form_instances fi
          INNER JOIN form_templates ft ON ft.id = fi.template_id
          WHERE fi.project_id = ps.project_id
            AND fi.deleted_at IS NULL
            AND ft.code = 'WIR'
            AND fi.status = 'APPROVED'
            AND fi.is_billed = false
        ), 0) AS pending_wir_count,
        COALESCE((
          SELECT COUNT(*)::bigint
          FROM form_instances fi
          WHERE fi.project_id = ps.project_id
            AND fi.deleted_at IS NULL
            AND fi.liability_shift_red_alert = true
        ), 0) AS liability_red_alert_count,
        COALESCE((
          SELECT COUNT(*)::bigint
          FROM form_instances fi
          WHERE fi.project_id = ps.project_id
            AND fi.deleted_at IS NULL
            AND fi.status IN ('PENDING_EXTERNAL_APPROVAL', 'SLA_BREACHED')
        ), 0) AS pending_external_count,
        COALESCE((
          SELECT COUNT(*)::bigint
          FROM sla_escalations se
          WHERE se.project_id = ps.project_id
            AND se.acknowledged = false
        ), 0) AS open_escalations_count
      FROM project_set ps
    `;
  }

  private mapRow(row: KpiRow): ProjectDashboardKpis {
    return {
      projectId: row.project_id,
      totalBilled: String(row.total_billed ?? '0'),
      approvedIpcCount: Number(row.approved_ipc_count),
      openNcrCount: Number(row.open_ncr_count),
      slaBreachCount: Number(row.sla_breach_count),
      pendingWirCount: Number(row.pending_wir_count),
      liabilityRedAlertCount: Number(row.liability_red_alert_count),
      pendingExternalApprovalCount: Number(row.pending_external_count),
      openEscalationsCount: Number(row.open_escalations_count),
    };
  }

  private async fetchContractorRejectionRates(
    projectIds: string[],
  ): Promise<ContractorRejectionStats[]> {
    const rows = await this.prisma.$queryRaw<RejectionRow[]>`
      SELECT
        o.id AS organization_id,
        o.name AS organization_name,
        COUNT(*) FILTER (
          WHERE ft.code = 'WIR' AND fi.status = 'REJECTED'
        )::bigint AS wir_rejected,
        COUNT(*) FILTER (
          WHERE ft.code = 'WIR' AND fi.status IN ('APPROVED', 'REJECTED')
        )::bigint AS wir_finalized,
        COUNT(*) FILTER (
          WHERE ft.code = 'MIR' AND fi.status = 'REJECTED'
        )::bigint AS mir_rejected,
        COUNT(*) FILTER (
          WHERE ft.code = 'MIR' AND fi.status IN ('APPROVED', 'REJECTED')
        )::bigint AS mir_finalized
      FROM form_instances fi
      INNER JOIN form_templates ft ON ft.id = fi.template_id
      INNER JOIN organizations o ON o.id = fi.organization_id
      WHERE fi.project_id = ANY(${projectIds}::uuid[])
        AND fi.deleted_at IS NULL
        AND ft.code IN ('WIR', 'MIR')
        AND fi.status IN ('APPROVED', 'REJECTED')
        AND o.type IN ('MAIN_CONTRACTOR', 'SUB_CONTRACTOR')
      GROUP BY o.id, o.name
      HAVING COUNT(*) FILTER (WHERE fi.status = 'REJECTED') > 0
      ORDER BY
        COUNT(*) FILTER (WHERE fi.status = 'REJECTED') DESC,
        o.name ASC
      LIMIT 10
    `;

    return rows.map((row) => {
      const wirRejected = Number(row.wir_rejected);
      const wirFinalized = Number(row.wir_finalized);
      const mirRejected = Number(row.mir_rejected);
      const mirFinalized = Number(row.mir_finalized);
      const rejected = wirRejected + mirRejected;
      const finalized = wirFinalized + mirFinalized;
      const rejectionRatePercent =
        finalized > 0 ? Math.round((rejected / finalized) * 1000) / 10 : 0;

      return {
        organizationId: row.organization_id,
        organizationName: row.organization_name,
        wirRejected,
        wirFinalized,
        mirRejected,
        mirFinalized,
        rejectionRatePercent,
      };
    });
  }
}
