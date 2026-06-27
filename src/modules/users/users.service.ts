import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TenantScopeService } from '../../common/services/tenant-scope.service';
import { AuditService } from '../../common/services/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  CreateUserDto,
  ResetPasswordDto,
  SetMemberProjectsDto,
  UpdateProfileDto,
  UpdateTeamMemberDto,
  buildFieldWorkerEmail,
  isFieldWorkerEmail,
  normalizeUsername,
  splitFullName,
} from './dto/user.dto';
import { DEFAULT_ORG_ROLES } from './default-roles';
import { SupabaseStorageService } from './supabase-storage.service';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
    private readonly audit: AuditService,
    private readonly supabaseStorage: SupabaseStorageService,
  ) {}

  findById(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { organization: true, role: true },
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

  findByUsername(username: string) {
    return this.prisma.user.findFirst({
      where: { username: normalizeUsername(username), deletedAt: null },
    });
  }

  async ensureDefaultRoles(organizationId: string) {
    for (const def of DEFAULT_ORG_ROLES) {
      await this.prisma.role.upsert({
        where: {
          organizationId_name: {
            organizationId,
            name: def.name,
          },
        },
        create: {
          organizationId,
          name: def.name,
          nameAr: def.nameAr,
          permissions: [...def.permissions],
          isSystem: true,
        },
        update: {},
      });
    }
  }

  async listOrganizationMembers(user: AuthenticatedUser) {
    this.tenantScope.assertOrgAdmin(user);
    await this.ensureDefaultRoles(user.organizationId);

    const members = await this.prisma.user.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      include: { role: true },
      orderBy: [{ isOrgAdmin: 'desc' }, { createdAt: 'asc' }],
    });

    return members.map((m) => this.sanitizeMember(m));
  }

  async listOrganizationRoles(user: AuthenticatedUser) {
    this.tenantScope.assertOrgAdmin(user);
    await this.ensureDefaultRoles(user.organizationId);

    return this.prisma.role.findMany({
      where: { organizationId: user.organizationId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async createMember(user: AuthenticatedUser, dto: CreateUserDto) {
    this.tenantScope.assertOrgAdmin(user);

    const username = normalizeUsername(dto.username);
    const existingUsername = await this.findByUsername(username);
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    const internalEmail = buildFieldWorkerEmail(username, user.organizationId);
    const existingEmail = await this.findByEmail(internalEmail);
    if (existingEmail) {
      throw new ConflictException('Username already taken');
    }

    await this.ensureDefaultRoles(user.organizationId);

    let roleId = dto.roleId;
    if (!roleId) {
      const engineer = await this.prisma.role.findFirst({
        where: {
          organizationId: user.organizationId,
          name: 'Engineer',
          deletedAt: null,
        },
      });
      roleId = engineer?.id;
    }

    const { firstName, lastName } = splitFullName(dto.fullName);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const created = await this.prisma.user.create({
      data: {
        email: internalEmail,
        username,
        passwordHash,
        firstName,
        lastName,
        organizationId: user.organizationId,
        roleId,
        isOrgAdmin: dto.isOrgAdmin ?? false,
      },
      include: { role: true },
    });

    await this.audit.record({
      entityType: 'User',
      entityId: created.id,
      action: 'CREATE',
      newData: { username, roleId, isOrgAdmin: created.isOrgAdmin },
      context: this.audit.buildContext(user),
    });

    return { user: this.sanitizeMember(created) };
  }

  async resetMemberPassword(
    user: AuthenticatedUser,
    memberId: string,
    dto: ResetPasswordDto,
  ) {
    this.tenantScope.assertOrgAdmin(user);

    const member = await this.prisma.user.findFirst({
      where: {
        id: memberId,
        organizationId: user.organizationId,
        deletedAt: null,
      },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: memberId },
      data: { passwordHash },
    });

    await this.audit.record({
      entityType: 'User',
      entityId: memberId,
      action: 'PASSWORD_RESET',
      context: this.audit.buildContext(user),
    });

    return { success: true };
  }

  /**
   * Super-admin-only password reset across any organization.
   * Enforces the Independence Law: tenants cannot reset vendor org admin passwords.
   */
  async resetAnyUserPassword(
    actor: AuthenticatedUser,
    targetUserId: string,
    dto: ResetPasswordDto,
  ) {
    this.tenantScope.assertSuperAdmin(actor);

    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, deletedAt: null },
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { passwordHash },
    });

    await this.audit.record({
      entityType: 'User',
      entityId: targetUserId,
      action: 'PASSWORD_RESET_SUPER_ADMIN',
      context: this.audit.buildContext(actor, {
        organizationId: target.organizationId,
      }),
    });

    return { success: true };
  }

  async updateMember(
    user: AuthenticatedUser,
    memberId: string,
    dto: UpdateTeamMemberDto,
  ) {
    this.tenantScope.assertOrgAdmin(user);

    const member = await this.prisma.user.findFirst({
      where: {
        id: memberId,
        organizationId: user.organizationId,
        deletedAt: null,
      },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    if (member.id === user.id && dto.isActive === false) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    const updated = await this.prisma.user.update({
      where: { id: memberId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: dto.roleId,
        isOrgAdmin: dto.isOrgAdmin,
        isActive: dto.isActive,
      },
      include: { role: true },
    });

    return this.sanitizeMember(updated);
  }

  /**
   * Returns every project the admin's organization participates in, flagged with
   * whether the given member is currently assigned (the access-matrix view).
   */
  async getMemberProjectAccess(user: AuthenticatedUser, memberId: string) {
    this.tenantScope.assertOrgAdmin(user);

    const member = await this.prisma.user.findFirst({
      where: {
        id: memberId,
        organizationId: user.organizationId,
        deletedAt: null,
      },
    });
    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    const orgProjectIds = await this.tenantScope.getOrgProjectIds(
      user.organizationId,
      user.organizationType,
    );

    const [projects, assignments] = await Promise.all([
      this.prisma.project.findMany({
        where: { id: { in: orgProjectIds }, deletedAt: null },
        select: { id: true, name: true, nameAr: true, code: true, status: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.projectUser.findMany({
        where: { userId: memberId, deletedAt: null },
        select: { projectId: true },
      }),
    ]);

    const assignedIds = new Set(assignments.map((a) => a.projectId));

    return {
      memberId,
      isOrgAdmin: member.isOrgAdmin,
      projects: projects.map((p) => ({
        ...p,
        // Admins implicitly reach all org projects.
        assigned: member.isOrgAdmin || assignedIds.has(p.id),
      })),
    };
  }

  /**
   * Bulk-reconciles a member's project assignments. Validates the requested project
   * IDs against the org's actual participation, then diffs create / soft-delete rows.
   */
  async setMemberProjectAccess(
    user: AuthenticatedUser,
    memberId: string,
    dto: SetMemberProjectsDto,
  ) {
    this.tenantScope.assertOrgAdmin(user);

    const member = await this.prisma.user.findFirst({
      where: {
        id: memberId,
        organizationId: user.organizationId,
        deletedAt: null,
      },
    });
    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    if (member.isOrgAdmin) {
      throw new BadRequestException(
        'Organization admins already have access to all projects',
      );
    }

    const orgProjectIds = new Set(
      await this.tenantScope.getOrgProjectIds(
        user.organizationId,
        user.organizationType,
      ),
    );

    const requested = [...new Set(dto.projectIds)];
    const invalid = requested.filter((id) => !orgProjectIds.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException(
        'One or more projects are not accessible to your organization',
      );
    }

    const existing = await this.prisma.projectUser.findMany({
      where: { userId: memberId },
    });
    const existingByProject = new Map(existing.map((e) => [e.projectId, e]));
    const requestedSet = new Set(requested);

    await this.prisma.$transaction(async (tx) => {
      for (const projectId of requested) {
        const row = existingByProject.get(projectId);
        if (!row) {
          await tx.projectUser.create({ data: { projectId, userId: memberId } });
        } else if (row.deletedAt) {
          await tx.projectUser.update({
            where: { id: row.id },
            data: { deletedAt: null },
          });
        }
      }

      for (const row of existing) {
        if (!requestedSet.has(row.projectId) && !row.deletedAt) {
          await tx.projectUser.update({
            where: { id: row.id },
            data: { deletedAt: new Date() },
          });
        }
      }
    });

    await this.audit.record({
      entityType: 'User',
      entityId: memberId,
      action: 'PROJECT_ACCESS_SET',
      newData: { projectIds: requested },
      context: this.audit.buildContext(user),
    });

    return { success: true, count: requested.length };
  }

  async updateProfile(user: AuthenticatedUser, dto: UpdateProfileDto) {
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        firstNameAr: dto.firstNameAr,
        lastNameAr: dto.lastNameAr,
        avatarUrl: dto.avatarUrl,
        preferences: dto.preferences as Prisma.InputJsonValue | undefined,
      },
      include: { organization: true, role: true },
    });

    return this.sanitizeMember(updated);
  }

  async uploadAvatar(
    user: AuthenticatedUser,
    file: Express.Multer.File,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Image file is required');
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WebP, or GIF images are allowed');
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException('Image must be 5 MB or smaller');
    }

    const avatarUrl = await this.supabaseStorage.uploadAvatar(
      user.id,
      file.buffer,
      file.mimetype,
    );

    return this.updateProfile(user, { avatarUrl });
  }

  sanitizeMember(user: {
    id: string;
    email: string;
    username?: string | null;
    firstName: string;
    lastName: string;
    firstNameAr: string | null;
    lastNameAr: string | null;
    organizationId: string;
    isOrgAdmin: boolean;
    isActive: boolean;
    avatarUrl?: string | null;
    preferences?: unknown;
    lastLoginAt: Date | null;
    createdAt: Date;
    role?: {
      id: string;
      name: string;
      nameAr: string | null;
      permissions: unknown;
    } | null;
  }) {
    const fieldAccount = isFieldWorkerEmail(user.email);

    return {
      id: user.id,
      username: user.username ?? null,
      email: fieldAccount ? null : user.email,
      loginId: fieldAccount
        ? (user.username ?? null)
        : user.email,
      isFieldAccount: fieldAccount,
      firstName: user.firstName,
      lastName: user.lastName,
      firstNameAr: user.firstNameAr,
      lastNameAr: user.lastNameAr,
      organizationId: user.organizationId,
      isOrgAdmin: user.isOrgAdmin,
      isActive: user.isActive,
      avatarUrl: user.avatarUrl ?? null,
      preferences: user.preferences ?? {},
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      role: user.role
        ? {
            id: user.role.id,
            name: user.role.name,
            nameAr: user.role.nameAr,
            permissions: user.role.permissions,
          }
        : null,
    };
  }
}
