import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../../common/interfaces/authenticated-user.interface';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  isFieldWorkerEmail,
  normalizeUsername,
} from '../users/dto/user.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });

    if (existing) {
      throw new UnauthorizedException('Email already registered');
    }

    const slug = this.generateSlug(dto.organizationName);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName,
          nameAr: dto.organizationNameAr,
          slug,
          type: dto.organizationType,
        },
      });

      const adminRole = await tx.role.create({
        data: {
          organizationId: organization.id,
          name: 'Org Admin',
          nameAr: 'مدير المؤسسة',
          permissions: ['*'],
          isSystem: true,
        },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          firstNameAr: dto.firstNameAr,
          lastNameAr: dto.lastNameAr,
          organizationId: organization.id,
          roleId: adminRole.id,
          isOrgAdmin: true,
        },
        include: {
          organization: true,
          role: true,
        },
      });

      return { organization, user };
    });

    const token = this.signToken(result.user);

    return {
      accessToken: token,
      user: this.sanitizeUser(result.user),
      organization: result.organization,
    };
  }

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim();
    const isEmail = identifier.includes('@');

    const user = isEmail
      ? await this.prisma.user.findFirst({
          where: {
            email: identifier.toLowerCase(),
            deletedAt: null,
            isActive: true,
            organization: { deletedAt: null, isActive: true },
          },
          include: { organization: true, role: true },
        })
      : await this.prisma.user.findFirst({
          where: {
            username: normalizeUsername(identifier),
            deletedAt: null,
            isActive: true,
            organization: { deletedAt: null, isActive: true },
          },
          include: { organization: true, role: true },
        });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken: this.signToken(user),
      user: this.sanitizeUser(user),
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        organization: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.sanitizeUser(user);
  }

  signToken(user: {
    id: string;
    email: string;
    organizationId: string;
    isOrgAdmin: boolean;
    isSuperAdmin: boolean;
    organization: { type: AuthenticatedUser['organizationType'] };
  }): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      organizationType: user.organization.type,
      isOrgAdmin: user.isOrgAdmin,
      isSuperAdmin: user.isSuperAdmin,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('app.jwtSecret'),
      expiresIn: this.configService.getOrThrow<string>('app.jwtExpiresIn') as `${number}d`,
    });
  }

  private sanitizeUser(user: {
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
    isSuperAdmin?: boolean;
    avatarUrl?: string | null;
    preferences?: unknown;
    lastLoginAt: Date | null;
    organization: {
      id: string;
      name: string;
      nameAr: string | null;
      type: string;
      slug: string;
    };
    role: {
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
      isSuperAdmin: user.isSuperAdmin,
      avatarUrl: user.avatarUrl ?? null,
      preferences: user.preferences ?? {},
      lastLoginAt: user.lastLoginAt,
      organization: user.organization,
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

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const suffix = Math.random().toString(36).slice(2, 8);
    return `${base}-${suffix}`;
  }
}
