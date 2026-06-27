import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { OrganizationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TenantScopeService } from '../../common/services/tenant-scope.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  buildPaginatedResult,
  PaginationDto,
} from '../../common/dto/pagination.dto';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationDirectoryQueryDto,
} from './dto/organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateOrganizationDto) {
    this.tenantScope.assertOrgAdmin(user);

    const slug = this.generateSlug(dto.name);

    const existing = await this.prisma.organization.findFirst({
      where: { slug, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException('Organization slug conflict');
    }

    return this.prisma.organization.create({
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
        slug,
        type: dto.type,
        settings: (dto.settings ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  /** Client admins search platform org directory when assigning stakeholders */
  async searchDirectory(
    user: AuthenticatedUser,
    query: OrganizationDirectoryQueryDto,
  ) {
    if (user.organizationType !== OrganizationType.CLIENT) {
      throw new ForbiddenException('Only Client organizations can browse the org directory');
    }
    this.tenantScope.assertOrgAdmin(user);

    const q = query.q?.trim();

    return this.prisma.organization.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        type: query.type,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { nameAr: { contains: q, mode: 'insensitive' } },
                { slug: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: 25,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        nameAr: true,
        type: true,
        slug: true,
      },
    });
  }

  async findAll(user: AuthenticatedUser, pagination: PaginationDto) {
    const accessibleIds =
      await this.tenantScope.getAccessibleOrganizationIds(user);

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = this.tenantScope.organizationWhereForUser(
      user,
      accessibleIds,
    );

    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(user: AuthenticatedUser, id: string) {
    await this.tenantScope.assertOrganizationAccess(user, id);

    const org = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            users: { where: { deletedAt: null } },
            projectMemberships: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateOrganizationDto) {
    if (id !== user.organizationId) {
      this.tenantScope.assertOrgAdmin(user);
      await this.tenantScope.assertOrganizationAccess(user, id);
    } else {
      this.tenantScope.assertOrgAdmin(user);
    }

    const existing = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Organization not found');
    }

    return this.prisma.organization.update({
      where: { id },
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
        isActive: dto.isActive,
        settings: dto.settings as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    this.tenantScope.assertOrgAdmin(user);

    if (id !== user.organizationId) {
      await this.tenantScope.assertOrganizationAccess(user, id);
    }

    const existing = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Organization not found');
    }

    if (id === user.organizationId) {
      throw new ForbiddenException('Cannot delete your own organization');
    }

    return this.prisma.organization.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
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
