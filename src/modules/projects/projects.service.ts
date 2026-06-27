import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  OrganizationType,
  Prisma,
  ProjectOrganizationRole,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TenantScopeService } from '../../common/services/tenant-scope.service';
import { AuditService } from '../../common/services/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  buildPaginatedResult,
  PaginationDto,
} from '../../common/dto/pagination.dto';
import {
  CreateProjectDto,
  UpdateProjectDto,
  InviteProjectOrganizationDto,
  InviteSubContractorDto,
  AssignProjectUserDto,
  OnboardVendorDto,
  ProvisionSubContractorDto,
  VendorOrgType,
} from './dto/project.dto';
import { ResetPasswordDto } from '../users/dto/user.dto';
import { FormTemplatesService } from '../forms/form-templates.service';
import { DEFAULT_ORG_ROLES } from '../users/default-roles';
import {
  buildFieldWorkerEmail,
  normalizeUsername,
  splitFullName,
} from '../users/dto/user.dto';

const BCRYPT_ROUNDS = 12;

const VENDOR_ROLE_MAP: Record<VendorOrgType, ProjectOrganizationRole> = {
  CONSULTANT: ProjectOrganizationRole.CONSULTANT,
  MAIN_CONTRACTOR: ProjectOrganizationRole.MAIN_CONTRACTOR,
  LABORATORY: ProjectOrganizationRole.LABORATORY,
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
    private readonly audit: AuditService,
    private readonly formTemplates: FormTemplatesService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateProjectDto) {
    if (user.organizationType !== OrganizationType.CLIENT) {
      throw new ForbiddenException('Only Client organizations can create projects');
    }

    this.tenantScope.assertOrgAdmin(user);

    const duplicate = await this.prisma.project.findFirst({
      where: {
        ownerOrgId: user.organizationId,
        code: dto.code,
        deletedAt: null,
      },
    });

    if (duplicate) {
      throw new ConflictException('Project code already exists for this client');
    }

    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name: dto.name,
          nameAr: dto.nameAr,
          code: dto.code,
          description: dto.description,
          status: dto.status,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          settings: (dto.settings ?? {}) as Prisma.InputJsonValue,
          ownerOrgId: user.organizationId,
        },
      });

      await tx.projectOrganization.create({
        data: {
          projectId: created.id,
          organizationId: user.organizationId,
          role: ProjectOrganizationRole.OWNER,
        },
      });

      return created;
    });

    await this.formTemplates.seedStandardTemplates(user, project.id, {
      metadata: { trigger: 'PROJECT_CREATE' },
    });

    return project;
  }

  async findAll(user: AuthenticatedUser, pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = this.tenantScope.projectWhereForUser(user);

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          ownerOrg: {
            select: { id: true, name: true, type: true },
          },
          _count: {
            select: {
              organizations: { where: { deletedAt: null } },
            },
          },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(user: AuthenticatedUser, id: string) {
    await this.tenantScope.assertProjectAccess(user, id);

    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        ownerOrg: {
          select: { id: true, name: true, type: true, slug: true },
        },
        organizations: {
          where: { deletedAt: null },
          include: {
            organization: {
              select: { id: true, name: true, nameAr: true, type: true },
            },
          },
        },
        subContractorLinks: {
          where: { deletedAt: null },
          include: {
            subContractor: {
              select: { id: true, name: true, type: true },
            },
            mainContractor: {
              select: { id: true, name: true, type: true },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateProjectDto) {
    await this.tenantScope.assertProjectAccess(user, id);

    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (
      project.ownerOrgId !== user.organizationId &&
      !user.isOrgAdmin
    ) {
      throw new ForbiddenException('Only project owner org admins can update');
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
        description: dto.description,
        status: dto.status,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        settings: dto.settings as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerOrgId !== user.organizationId) {
      throw new ForbiddenException('Only the owning Client can delete a project');
    }

    this.tenantScope.assertOrgAdmin(user);

    return this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
  }

  /** Client invites Consultant, Main Contractor, or Laboratory to a project */
  async inviteOrganization(
    user: AuthenticatedUser,
    projectId: string,
    dto: InviteProjectOrganizationDto,
  ) {
    const project = await this.assertProjectOwner(user, projectId);

    if (dto.role === ProjectOrganizationRole.OWNER) {
      throw new BadRequestException('Cannot invite as OWNER');
    }

    if (dto.role === ProjectOrganizationRole.SUB_CONTRACTOR) {
      throw new BadRequestException(
        'Sub-contractors must be invited by the Main Contractor',
      );
    }

    const org = await this.prisma.organization.findFirst({
      where: { id: dto.organizationId, deletedAt: null },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    this.validateOrgTypeForRole(org.type, dto.role);

    const existing = await this.prisma.projectOrganization.findFirst({
      where: {
        projectId: project.id,
        organizationId: dto.organizationId,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('Organization already on this project');
    }

    return this.prisma.projectOrganization.create({
      data: {
        projectId: project.id,
        organizationId: dto.organizationId,
        role: dto.role,
        invitedByOrgId: user.organizationId,
      },
      include: {
        organization: {
          select: { id: true, name: true, type: true },
        },
      },
    });
  }

  /** Main Contractor invites Sub-contractor; data rolls up to Main Contractor */
  async inviteSubContractor(
    user: AuthenticatedUser,
    projectId: string,
    dto: InviteSubContractorDto,
  ) {
    if (user.organizationType !== OrganizationType.MAIN_CONTRACTOR) {
      throw new ForbiddenException('Only Main Contractors can invite sub-contractors');
    }

    this.tenantScope.assertOrgAdmin(user);
    await this.tenantScope.assertProjectAccess(user, projectId);

    const membership = await this.prisma.projectOrganization.findFirst({
      where: {
        projectId,
        organizationId: user.organizationId,
        role: ProjectOrganizationRole.MAIN_CONTRACTOR,
        deletedAt: null,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Your organization is not the Main Contractor on this project');
    }

    const subOrg = await this.prisma.organization.findFirst({
      where: {
        id: dto.subContractorOrgId,
        type: OrganizationType.SUB_CONTRACTOR,
        deletedAt: null,
      },
    });

    if (!subOrg) {
      throw new NotFoundException('Sub-contractor organization not found');
    }

    const existingLink = await this.prisma.subContractorLink.findFirst({
      where: {
        projectId,
        subContractorId: dto.subContractorOrgId,
        deletedAt: null,
      },
    });

    if (existingLink) {
      throw new ConflictException('Sub-contractor already linked to this project');
    }

    const link = await this.prisma.$transaction(async (tx) => {
      const created = await tx.subContractorLink.create({
        data: {
          projectId,
          mainContractorId: user.organizationId,
          subContractorId: dto.subContractorOrgId,
          invitedByUserId: user.id,
        },
        include: {
          subContractor: {
            select: { id: true, name: true, type: true },
          },
        },
      });

      const existingMembership = await tx.projectOrganization.findFirst({
        where: {
          projectId,
          organizationId: dto.subContractorOrgId,
          deletedAt: null,
        },
      });

      if (!existingMembership) {
        await tx.projectOrganization.create({
          data: {
            projectId,
            organizationId: dto.subContractorOrgId,
            role: ProjectOrganizationRole.SUB_CONTRACTOR,
            invitedByOrgId: user.organizationId,
          },
        });
      }

      return created;
    });

    await this.audit.record({
      entityType: 'Organization',
      entityId: dto.subContractorOrgId,
      action: 'SUB_CONTRACTOR_LINKED',
      newData: { projectId, subContractorOrgId: dto.subContractorOrgId },
      context: this.audit.buildContext(user, { projectId }),
    });

    return link;
  }

  /** All sub-contractors linked to this Main Contractor across projects */
  async listMySubContractors(user: AuthenticatedUser) {
    if (user.organizationType !== OrganizationType.MAIN_CONTRACTOR) {
      throw new ForbiddenException('Only Main Contractors can list sub-contractors');
    }
    this.tenantScope.assertOrgAdmin(user);

    const links = await this.prisma.subContractorLink.findMany({
      where: {
        mainContractorId: user.organizationId,
        deletedAt: null,
        project: { deletedAt: null },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        subContractor: {
          select: { id: true, name: true, nameAr: true, type: true, isActive: true },
        },
        project: {
          select: { id: true, name: true, nameAr: true, code: true },
        },
      },
    });

    return links.map((link) => ({
      id: link.id,
      projectId: link.projectId,
      projectName: link.project.name,
      projectNameAr: link.project.nameAr,
      projectCode: link.project.code,
      subContractor: link.subContractor,
      createdAt: link.createdAt,
    }));
  }

  /** Main Contractor org admin resets a managed sub-contractor org admin password */
  async resetManagedSubContractorAdminPassword(
    user: AuthenticatedUser,
    subContractorOrgId: string,
    dto: ResetPasswordDto,
  ) {
    if (user.organizationType !== OrganizationType.MAIN_CONTRACTOR) {
      throw new ForbiddenException(
        'Only Main Contractors can reset sub-contractor admin passwords',
      );
    }
    this.tenantScope.assertOrgAdmin(user);

    const link = await this.prisma.subContractorLink.findFirst({
      where: {
        mainContractorId: user.organizationId,
        subContractorId: subContractorOrgId,
        deletedAt: null,
      },
    });

    if (!link) {
      throw new NotFoundException('Sub-contractor not managed by your organization');
    }

    const admin = await this.prisma.user.findFirst({
      where: {
        organizationId: subContractorOrgId,
        isOrgAdmin: true,
        deletedAt: null,
      },
    });

    if (!admin) {
      throw new NotFoundException('Sub-contractor admin account not found');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash },
    });

    await this.audit.record({
      entityType: 'User',
      entityId: admin.id,
      action: 'PASSWORD_RESET',
      context: this.audit.buildContext(user, {
        organizationId: subContractorOrgId,
      }),
    });

    return { success: true, adminId: admin.id, username: admin.username };
  }

  /** Provision a new sub-contractor org + admin and link to project */
  async provisionSubContractor(
    user: AuthenticatedUser,
    projectId: string,
    dto: ProvisionSubContractorDto,
  ) {
    if (user.organizationType !== OrganizationType.MAIN_CONTRACTOR) {
      throw new ForbiddenException('Only Main Contractors can provision sub-contractors');
    }
    this.tenantScope.assertOrgAdmin(user);
    await this.tenantScope.assertProjectAccess(user, projectId);

    const membership = await this.prisma.projectOrganization.findFirst({
      where: {
        projectId,
        organizationId: user.organizationId,
        role: ProjectOrganizationRole.MAIN_CONTRACTOR,
        deletedAt: null,
      },
    });
    if (!membership) {
      throw new ForbiddenException('Your organization is not the Main Contractor on this project');
    }

    const username = normalizeUsername(dto.adminUsername);
    const slug = this.generateSlug(dto.name);

    const usernameTaken = await this.prisma.user.findFirst({
      where: { username, deletedAt: null },
    });
    if (usernameTaken) {
      throw new ConflictException('Username already taken');
    }

    const { firstName, lastName } = splitFullName(dto.adminFullName);
    const passwordHash = await bcrypt.hash(dto.adminPassword, BCRYPT_ROUNDS);

    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.name,
          nameAr: dto.nameAr,
          slug,
          type: OrganizationType.SUB_CONTRACTOR,
        },
      });

      for (const def of DEFAULT_ORG_ROLES) {
        await tx.role.create({
          data: {
            organizationId: organization.id,
            name: def.name,
            nameAr: def.nameAr,
            permissions: [...def.permissions],
            isSystem: def.isSystem,
          },
        });
      }

      const adminRole = await tx.role.findFirst({
        where: { organizationId: organization.id, name: 'Org Admin' },
      });

      const adminUser = await tx.user.create({
        data: {
          email: buildFieldWorkerEmail(username, organization.id),
          username,
          passwordHash,
          firstName,
          lastName,
          organizationId: organization.id,
          roleId: adminRole?.id,
          isOrgAdmin: true,
        },
      });

      const link = await tx.subContractorLink.create({
        data: {
          projectId,
          mainContractorId: user.organizationId,
          subContractorId: organization.id,
          invitedByUserId: user.id,
        },
        include: {
          subContractor: {
            select: { id: true, name: true, nameAr: true, type: true },
          },
        },
      });

      await tx.projectOrganization.create({
        data: {
          projectId,
          organizationId: organization.id,
          role: ProjectOrganizationRole.SUB_CONTRACTOR,
          invitedByOrgId: user.organizationId,
        },
      });

      return { organization, adminUser, link };
    });

    await this.audit.record({
      entityType: 'Organization',
      entityId: result.organization.id,
      action: 'SUB_CONTRACTOR_PROVISION',
      newData: { projectId, adminUsername: username },
      context: this.audit.buildContext(user, { projectId }),
    });

    return {
      organization: result.organization,
      admin: {
        id: result.adminUser.id,
        loginId: username,
        firstName: result.adminUser.firstName,
        lastName: result.adminUser.lastName,
      },
      linkId: result.link.id,
    };
  }

  async unassignOrganization(
    user: AuthenticatedUser,
    projectId: string,
    membershipId: string,
  ) {
    await this.assertProjectOwner(user, projectId);

    const membership = await this.prisma.projectOrganization.findFirst({
      where: {
        id: membershipId,
        projectId,
        deletedAt: null,
      },
    });

    if (!membership) {
      throw new NotFoundException('Project assignment not found');
    }

    if (membership.role === ProjectOrganizationRole.OWNER) {
      throw new BadRequestException('Cannot remove project owner');
    }

    return this.prisma.projectOrganization.update({
      where: { id: membershipId },
      data: { deletedAt: new Date() },
    });
  }

  // ─── User ↔ Project access matrix (Smart Bridging) ──────────────────────────

  /**
   * Lists the requesting admin's own organization members alongside whether each is
   * assigned to this project. Org admins use this to bridge specific engineers onto
   * specific projects.
   */
  async getProjectTeam(user: AuthenticatedUser, projectId: string) {
    await this.tenantScope.assertProjectAccess(user, projectId);
    this.tenantScope.assertOrgAdmin(user);

    const [ownOrgUsers, projectAssignments, mcOnProject] = await Promise.all([
      this.prisma.user.findMany({
        where: { organizationId: user.organizationId, deletedAt: null },
        include: {
          role: true,
          organization: {
            select: { id: true, name: true, nameAr: true, type: true },
          },
        },
        orderBy: [{ isOrgAdmin: 'desc' }, { firstName: 'asc' }],
      }),
      this.prisma.projectUser.findMany({
        where: { projectId, deletedAt: null },
        include: {
          user: {
            include: {
              role: true,
              organization: {
                select: { id: true, name: true, nameAr: true, type: true },
              },
            },
          },
        },
      }),
      this.prisma.projectOrganization.findFirst({
        where: {
          projectId,
          organizationId: user.organizationId,
          role: ProjectOrganizationRole.MAIN_CONTRACTOR,
          deletedAt: null,
        },
      }),
    ]);

    const assignedIds = new Set(projectAssignments.map((a) => a.userId));
    const canLinkSubContractor =
      user.organizationType === OrganizationType.MAIN_CONTRACTOR &&
      Boolean(mcOnProject);

    const mapMember = (
      m: (typeof ownOrgUsers)[number],
      assigned: boolean,
      locked: boolean,
    ) => {
      const sameOrg = m.organizationId === user.organizationId;
      return {
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        username: m.username,
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        organizationNameAr: m.organization.nameAr,
        organizationType: m.organization.type,
        isOrgAdmin: m.isOrgAdmin,
        isActive: m.isActive,
        roleName: m.role?.name ?? null,
        roleNameAr: m.role?.nameAr ?? null,
        assigned,
        locked,
        canManage: sameOrg && !locked,
      };
    };

    const rosterById = new Map<string, ReturnType<typeof mapMember>>();

    for (const assignment of projectAssignments) {
      const m = assignment.user;
      rosterById.set(
        m.id,
        mapMember(m, true, m.isOrgAdmin),
      );
    }

    for (const m of ownOrgUsers) {
      if (m.isOrgAdmin && !rosterById.has(m.id)) {
        rosterById.set(m.id, mapMember(m, true, true));
      }
    }

    const availableToAssign = ownOrgUsers
      .filter((m) => !m.isOrgAdmin && !assignedIds.has(m.id))
      .map((m) => mapMember(m, false, false));

    return {
      roster: Array.from(rosterById.values()).sort((a, b) =>
        `${a.organizationName} ${a.firstName}`.localeCompare(
          `${b.organizationName} ${b.firstName}`,
        ),
      ),
      availableToAssign,
      permissions: {
        canAssignMembers: true,
        canLinkSubContractor,
      },
    };
  }

  async assignUserToProject(
    user: AuthenticatedUser,
    projectId: string,
    dto: AssignProjectUserDto,
  ) {
    await this.assertOrgParticipatesInProject(user, projectId);

    const target = await this.prisma.user.findFirst({
      where: {
        id: dto.userId,
        organizationId: user.organizationId,
        deletedAt: null,
      },
    });

    if (!target) {
      throw new NotFoundException('Team member not found in your organization');
    }

    const existing = await this.prisma.projectUser.findUnique({
      where: { projectId_userId: { projectId, userId: dto.userId } },
    });

    const record = existing
      ? await this.prisma.projectUser.update({
          where: { id: existing.id },
          data: { deletedAt: null },
        })
      : await this.prisma.projectUser.create({
          data: { projectId, userId: dto.userId },
        });

    await this.audit.record({
      entityType: 'ProjectUser',
      entityId: record.id,
      action: 'PROJECT_ACCESS_GRANT',
      newData: { projectId, userId: dto.userId },
      context: this.audit.buildContext(user, { projectId }),
    });

    return { success: true, assigned: true };
  }

  async removeUserFromProject(
    user: AuthenticatedUser,
    projectId: string,
    userId: string,
  ) {
    await this.assertOrgParticipatesInProject(user, projectId);

    const target = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, organizationId: true, isOrgAdmin: true },
    });

    if (!target) {
      throw new NotFoundException('Team member not found');
    }

    if (target.organizationId !== user.organizationId) {
      throw new ForbiddenException(
        'You can only revoke access for members of your own organization',
      );
    }

    if (target.isOrgAdmin) {
      throw new BadRequestException('Cannot revoke org admin access');
    }

    const existing = await this.prisma.projectUser.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (existing && !existing.deletedAt) {
      await this.prisma.projectUser.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      });

      await this.audit.record({
        entityType: 'ProjectUser',
        entityId: existing.id,
        action: 'PROJECT_ACCESS_REVOKE',
        previousData: { projectId, userId },
        context: this.audit.buildContext(user, { projectId }),
      });
    }

    return { success: true, assigned: false };
  }

  // ─── Client-driven vendor onboarding (B2B ecosystem) ─────────────────────────

  /**
   * A Client owner provisions a brand-new vendor organization (Consultant, Main
   * Contractor, or Laboratory) together with its first admin user, and links it to
   * the project in a single atomic flow.
   */
  async onboardVendor(
    user: AuthenticatedUser,
    projectId: string,
    dto: OnboardVendorDto,
  ) {
    const project = await this.assertProjectOwner(user, projectId);

    const role = VENDOR_ROLE_MAP[dto.type];
    const orgType = OrganizationType[dto.type];
    const username = normalizeUsername(dto.adminUsername);
    const slug = this.generateSlug(dto.name);

    const usernameTaken = await this.prisma.user.findFirst({
      where: { username, deletedAt: null },
    });
    if (usernameTaken) {
      throw new ConflictException('Username already taken');
    }

    const { firstName, lastName } = splitFullName(dto.adminFullName);
    const passwordHash = await bcrypt.hash(dto.adminPassword, BCRYPT_ROUNDS);

    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: dto.name, nameAr: dto.nameAr, slug, type: orgType },
      });

      for (const def of DEFAULT_ORG_ROLES) {
        await tx.role.create({
          data: {
            organizationId: organization.id,
            name: def.name,
            nameAr: def.nameAr,
            permissions: [...def.permissions],
            isSystem: def.isSystem,
          },
        });
      }

      const adminRole = await tx.role.findFirst({
        where: { organizationId: organization.id, name: 'Org Admin' },
      });

      const adminUser = await tx.user.create({
        data: {
          email: buildFieldWorkerEmail(username, organization.id),
          username,
          passwordHash,
          firstName,
          lastName,
          organizationId: organization.id,
          roleId: adminRole?.id,
          isOrgAdmin: true,
        },
      });

      const membership = await tx.projectOrganization.create({
        data: {
          projectId: project.id,
          organizationId: organization.id,
          role,
          invitedByOrgId: user.organizationId,
        },
      });

      return { organization, adminUser, membership };
    });

    await this.audit.record({
      entityType: 'Organization',
      entityId: result.organization.id,
      action: 'VENDOR_ONBOARD',
      newData: {
        projectId,
        type: orgType,
        role,
        adminUsername: username,
      },
      context: this.audit.buildContext(user, { projectId }),
    });

    return {
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        type: result.organization.type,
        slug: result.organization.slug,
      },
      admin: {
        id: result.adminUser.id,
        loginId: username,
        firstName: result.adminUser.firstName,
        lastName: result.adminUser.lastName,
      },
      membershipId: result.membership.id,
    };
  }

  /**
   * Ensures the requesting admin's own organization actually participates in the
   * project before they bridge their users onto it.
   */
  private async assertOrgParticipatesInProject(
    user: AuthenticatedUser,
    projectId: string,
  ) {
    this.tenantScope.assertOrgAdmin(user);
    await this.tenantScope.assertProjectAccess(user, projectId);

    const orgProjectIds = await this.tenantScope.getOrgProjectIds(
      user.organizationId,
      user.organizationType,
    );

    if (!orgProjectIds.includes(projectId)) {
      throw new ForbiddenException(
        'Your organization does not participate in this project',
      );
    }
  }

  private async assertProjectOwner(user: AuthenticatedUser, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerOrgId !== user.organizationId) {
      throw new ForbiddenException('Only the owning Client can invite organizations');
    }

    this.tenantScope.assertOrgAdmin(user);
    return project;
  }

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const suffix = Math.random().toString(36).slice(2, 8);
    return `${base}-${suffix}`;
  }

  private validateOrgTypeForRole(
    orgType: OrganizationType,
    role: ProjectOrganizationRole,
  ): void {
    const mapping: Partial<Record<ProjectOrganizationRole, OrganizationType>> = {
      [ProjectOrganizationRole.CONSULTANT]: OrganizationType.CONSULTANT,
      [ProjectOrganizationRole.MAIN_CONTRACTOR]: OrganizationType.MAIN_CONTRACTOR,
      [ProjectOrganizationRole.LABORATORY]: OrganizationType.LABORATORY,
    };

    const expected = mapping[role];
    if (expected && orgType !== expected) {
      throw new BadRequestException(
        `Organization type ${orgType} does not match role ${role}`,
      );
    }
  }
}
