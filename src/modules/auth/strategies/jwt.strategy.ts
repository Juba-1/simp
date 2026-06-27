import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../../../common/interfaces/authenticated-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('app.jwtSecret');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        deletedAt: null,
        isActive: true,
        organization: { deletedAt: null, isActive: true },
      },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('User session is no longer valid');
    }

    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      organizationType: user.organization.type,
      isOrgAdmin: user.isOrgAdmin,
      isSuperAdmin: user.isSuperAdmin,
    };
  }
}
