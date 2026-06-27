import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationType, Prisma, ProjectOrganizationRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Central tenant-scoping logic — the platform's RLS-style enforcement layer.
 *
 * Two tiers of isolation:
 *   1. ORG tier  — which projects an organization participates in (owner / member / sub-link).
 *   2. USER tier — which of those projects an individual non-admin user is explicitly
 *                  assigned to via the ProjectUser "access matrix".
 *
 * Org admins implicitly see every project their org touches. Regular users only see the
 * intersection of (org projects) ∩ (their ProjectUser assignments). Super admins see all.
 */
@Injectable()
export class TenantScopeService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Org-tier project resolution ───────────────────────────────────────────

  /** Project IDs an ORGANIZATION participates in, regardless of individual user assignment. */
  async getOrgProjectIds(
    organizationId: string,
    organizationType: OrganizationType,
  ): Promise<string[]> {
    if (organizationType === OrganizationType.CLIENT) {
      const owned = await this.prisma.project.findMany({
        where: { ownerOrgId: organizationId, deletedAt: null },
        select: { id: true },
      });
      return owned.map((p) => p.id);
    }

    if (
      organizationType === OrganizationType.CONSULTANT ||
      organizationType === OrganizationType.MAIN_CONTRACTOR ||
      organizationType === OrganizationType.LABORATORY
    ) {
      const memberships = await this.prisma.projectOrganization.findMany({
        where: {
          organizationId,
          deletedAt: null,
          role: { not: ProjectOrganizationRole.OWNER },
          project: { deletedAt: null },
        },
        select: { projectId: true },
      });
      return memberships.map((m) => m.projectId);
    }

    if (organizationType === OrganizationType.SUB_CONTRACTOR) {
      const [subLinks, memberships] = await Promise.all([
        this.prisma.subContractorLink.findMany({
          where: {
            subContractorId: organizationId,
            deletedAt: null,
            project: { deletedAt: null },
          },
          select: { projectId: true },
        }),
        this.prisma.projectOrganization.findMany({
          where: {
            organizationId,
            deletedAt: null,
            project: { deletedAt: null },
          },
          select: { projectId: true },
        }),
      ]);

      return [
        ...new Set([
          ...subLinks.map((l) => l.projectId),
          ...memberships.map((m) => m.projectId),
        ]),
      ];
    }

    return [];
  }

  /** Project IDs a specific user has been explicitly assigned to (the access matrix). */
  async getUserAssignedProjectIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.projectUser.findMany({
      where: { userId, deletedAt: null, project: { deletedAt: null } },
      select: { projectId: true },
    });
    return rows.map((r) => r.projectId);
  }

  // ─── User-tier (effective) project resolution ───────────────────────────────

  /**
   * Project IDs the authenticated user can actually reach.
   * Super admin → all. Org admin → all org projects. Regular user → org ∩ assigned.
   */
  async getAccessibleProjectIds(user: AuthenticatedUser): Promise<string[]> {
    if (user.isSuperAdmin) {
      const all = await this.prisma.project.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });
      return all.map((p) => p.id);
    }

    const orgProjectIds = await this.getOrgProjectIds(
      user.organizationId,
      user.organizationType,
    );

    if (user.isOrgAdmin) {
      return orgProjectIds;
    }

    const assigned = new Set(await this.getUserAssignedProjectIds(user.id));
    return orgProjectIds.filter((id) => assigned.has(id));
  }

  /** Organization IDs visible to the current tenant (co-participants on shared projects) */
  async getAccessibleOrganizationIds(
    user: AuthenticatedUser,
  ): Promise<string[]> {
    const projectIds = await this.getAccessibleProjectIds(user);

    const coParticipants = await this.prisma.projectOrganization.findMany({
      where: {
        projectId: { in: projectIds },
        deletedAt: null,
      },
      select: { organizationId: true },
    });

    const subLinks = await this.prisma.subContractorLink.findMany({
      where: {
        projectId: { in: projectIds },
        deletedAt: null,
      },
      select: {
        mainContractorId: true,
        subContractorId: true,
      },
    });

    const ids = new Set<string>([user.organizationId]);

    for (const p of coParticipants) {
      ids.add(p.organizationId);
    }

    for (const link of subLinks) {
      ids.add(link.mainContractorId);
      ids.add(link.subContractorId);
    }

    return Array.from(ids);
  }

  async assertOrganizationAccess(
    user: AuthenticatedUser,
    organizationId: string,
  ): Promise<void> {
    if (user.isSuperAdmin) return;
    const accessible = await this.getAccessibleOrganizationIds(user);
    if (!accessible.includes(organizationId)) {
      throw new NotFoundException('Organization not found');
    }
  }

  /**
   * Hard RLS gate: throws 404 if the user cannot reach this project.
   * Used by every project-scoped controller (forms, materials, IPC, audit, …).
   */
  async assertProjectAccess(
    user: AuthenticatedUser,
    projectId: string,
  ): Promise<void> {
    const accessible = await this.getAccessibleProjectIds(user);
    if (!accessible.includes(projectId)) {
      throw new NotFoundException('Project not found');
    }
  }

  assertOrgAdmin(user: AuthenticatedUser): void {
    if (!user.isOrgAdmin) {
      throw new ForbiddenException('Organization admin privileges required');
    }
  }

  assertSuperAdmin(user: AuthenticatedUser): void {
    if (!user.isSuperAdmin) {
      throw new ForbiddenException('Super admin access required');
    }
  }

  /**
   * Dashboard, search, and reports portfolio aggregates are restricted to
   * Client organization admins viewing their owned projects only.
   */
  assertClientAdmin(user: AuthenticatedUser): void {
    if (user.organizationType !== OrganizationType.CLIENT) {
      throw new ForbiddenException(
        'Client organization admin access required',
      );
    }
    this.assertOrgAdmin(user);
  }

  async getClientOwnedProjectIds(user: AuthenticatedUser): Promise<string[]> {
    this.assertClientAdmin(user);

    const owned = await this.prisma.project.findMany({
      where: { ownerOrgId: user.organizationId, deletedAt: null },
      select: { id: true },
    });

    return owned.map((p) => p.id);
  }

  async assertClientProjectAccess(
    user: AuthenticatedUser,
    projectId: string,
  ): Promise<void> {
    const owned = await this.getClientOwnedProjectIds(user);
    if (!owned.includes(projectId)) {
      throw new NotFoundException('Project not found');
    }
  }

  // ─── Prisma where-builders ───────────────────────────────────────────────────

  /** Base org-tier project filter (ignores individual user assignment). */
  private orgProjectWhere(user: AuthenticatedUser): Prisma.ProjectWhereInput {
    if (user.organizationType === OrganizationType.CLIENT) {
      return { deletedAt: null, ownerOrgId: user.organizationId };
    }

    if (
      user.organizationType === OrganizationType.CONSULTANT ||
      user.organizationType === OrganizationType.MAIN_CONTRACTOR ||
      user.organizationType === OrganizationType.LABORATORY
    ) {
      return {
        deletedAt: null,
        organizations: {
          some: {
            organizationId: user.organizationId,
            deletedAt: null,
            role: { not: ProjectOrganizationRole.OWNER },
          },
        },
      };
    }

    if (user.organizationType === OrganizationType.SUB_CONTRACTOR) {
      return {
        deletedAt: null,
        OR: [
          {
            organizations: {
              some: {
                organizationId: user.organizationId,
                deletedAt: null,
              },
            },
          },
          {
            subContractorLinks: {
              some: {
                subContractorId: user.organizationId,
                deletedAt: null,
              },
            },
          },
        ],
      };
    }

    return { deletedAt: null, id: { in: [] } };
  }

  /**
   * Effective project filter for list queries — folds the user-tier access matrix
   * into the org-tier filter so regular users only ever see their assigned projects.
   */
  projectWhereForUser(user: AuthenticatedUser): Prisma.ProjectWhereInput {
    if (user.isSuperAdmin) {
      return { deletedAt: null };
    }

    const base = this.orgProjectWhere(user);

    if (user.isOrgAdmin) {
      return base;
    }

    return {
      AND: [
        base,
        {
          userAssignments: {
            some: { userId: user.id, deletedAt: null },
          },
        },
      ],
    };
  }

  organizationWhereForUser(
    user: AuthenticatedUser,
    accessibleIds: string[],
  ): Prisma.OrganizationWhereInput {
    return {
      deletedAt: null,
      id: { in: accessibleIds },
    };
  }
}
