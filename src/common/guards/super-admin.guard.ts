import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user?.isSuperAdmin) {
      throw new ForbiddenException('Super admin access required');
    }

    return true;
  }
}
