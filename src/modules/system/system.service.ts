import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  CreatePlatformOrganizationDto,
  UpdatePlatformOrganizationDto,
} from './dto/system.dto';
import { splitFullName, normalizeUsername } from '../users/dto/user.dto';
import { DEFAULT_ORG_ROLES } from '../users/default-roles';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class SystemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listOrganizations() {
    const orgs = await this.prisma.organization.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: { deletedAt: null, isOrgAdmin: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            users: { where: { deletedAt: null } },
            projectMemberships: { where: { deletedAt: null } },
          },
        },
      },
    });

    return orgs.map((org) => {
      const admin = org.users[0] ?? null;
      return {
        id: org.id,
        name: org.name,
        nameAr: org.nameAr,
        slug: org.slug,
        type: org.type,
        isActive: org.isActive,
        createdAt: org.createdAt,
        userCount: org._count.users,
        projectCount: org._count.projectMemberships,
        admin: admin
          ? {
              id: admin.id,
              username: admin.username,
              firstName: admin.firstName,
              lastName: admin.lastName,
              isActive: admin.isActive,
            }
          : null,
      };
    });
  }

  async updateOrganization(id: string, dto: UpdatePlatformOrganizationDto) {
    const org = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return this.prisma.organization.update({
      where: { id },
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
      },
    });
  }

  async suspendOrganization(actor: AuthenticatedUser, id: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id },
        data: { isActive: false },
      });
      await tx.user.updateMany({
        where: { organizationId: id, deletedAt: null },
        data: { isActive: false },
      });
    });

    await this.audit.record({
      entityType: 'Organization',
      entityId: id,
      action: 'ORG_SUSPEND',
      context: this.audit.buildContext(actor),
    });

    return { success: true, suspended: true };
  }

  async deleteOrganization(actor: AuthenticatedUser, id: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });
      await tx.user.updateMany({
        where: { organizationId: id, deletedAt: null },
        data: { isActive: false, deletedAt: new Date() },
      });
    });

    await this.audit.record({
      entityType: 'Organization',
      entityId: id,
      action: 'ORG_DELETE',
      context: this.audit.buildContext(actor),
    });

    return { success: true, deleted: true };
  }

  async createOrganization(
    actor: AuthenticatedUser,
    dto: CreatePlatformOrganizationDto,
  ) {
    const username = normalizeUsername(dto.adminUsername);
    const slug = this.generateSlug(dto.name);

    const [slugExists, usernameExists] = await Promise.all([
      this.prisma.organization.findFirst({
        where: { slug, deletedAt: null },
      }),
      this.prisma.user.findFirst({
        where: { username, deletedAt: null },
      }),
    ]);

    if (slugExists) {
      throw new ConflictException('Organization slug conflict');
    }
    if (usernameExists) {
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
          type: dto.type,
        },
      });

      const adminEmail = `${username}@${organization.id}.simp.local`;

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
        where: {
          organizationId: organization.id,
          name: 'Org Admin',
        },
      });

      const adminUser = await tx.user.create({
        data: {
          email: adminEmail,
          username,
          passwordHash,
          firstName,
          lastName,
          organizationId: organization.id,
          roleId: adminRole?.id,
          isOrgAdmin: true,
        },
      });

      return { organization, adminUser };
    });

    await this.audit.record({
      entityType: 'Organization',
      entityId: result.organization.id,
      action: 'PLATFORM_CREATE',
      newData: {
        name: dto.name,
        type: dto.type,
        adminUsername: username,
      },
      context: this.audit.buildContext(actor),
    });

    return {
      organization: result.organization,
      admin: {
        id: result.adminUser.id,
        username: result.adminUser.username,
        firstName: result.adminUser.firstName,
        lastName: result.adminUser.lastName,
        loginId: username,
      },
    };
  }

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const suffix = Math.random().toString(36).slice(2, 8);
    return `${base}-${suffix}`;
  }
}
